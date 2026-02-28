import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateOrdenServicioDto } from './dto/create-orden-servicio.dto';
import sharp from 'sharp';
import {
  ClasificacionCliente,
  EstadoOrden,
  NivelInfestacion,
  Prisma,
} from '../generated/client/client';

type LocalDiaSemana =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

interface LocalEmpresaMembership {
  id: string;
  membershipId: string;
  empresaId: string;
  zonaId: string | null;
  activo: boolean;
}

interface LocalTenantMembership {
  id: string;
  role: string;
  activo: boolean;
  municipioId: string | null;
  placa: string | null;
  moto: boolean | null;
}

interface LocalPicoPlaca {
  numeroUno: number;
  numeroDos: number;
}

type CandidateWithMembership = LocalEmpresaMembership & {
  membership: LocalTenantMembership;
};

@Injectable()
export class OrdenesServicioService {
  private readonly logger = new Logger(OrdenesServicioService.name);

  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
  ) {}

  async create(tenantId: string, createDto: CreateOrdenServicioDto) {
    this.logger.log(`CREATE: Starting order creation for tenant: ${tenantId}`);
    // 1. Validar que la empresa exista
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: createDto.empresaId },
    });
    if (!empresa) {
      throw new BadRequestException('La empresa especificada no existe');
    }

    // 2. Obtener dirección y texto
    let direccionId = createDto.direccionId;
    let direccionTexto = createDto.direccionTexto || 'Sin dirección';

    if (!direccionId) {
      // Intentar obtener la primera dirección activa del cliente si no se proporcionó una
      const clienteDirecciones = await this.prisma.direccion.findMany({
        where: { clienteId: createDto.clienteId, activa: true },
        take: 1,
      });
      if (clienteDirecciones[0]) {
        direccionId = clienteDirecciones[0].id;
        direccionTexto = clienteDirecciones[0].direccion;
        this.logger.log(`CREATE: Using client default address: ${direccionId}`);
      }
    } else {
      const dir = await this.prisma.direccion.findUnique({
        where: { id: direccionId },
      });
      if (dir) {
        direccionTexto = dir.direccion;
      }
    }

    // Calcular horaFin basado en horaInicio y duracionMinutos
    const horaInicioDate = createDto.horaInicio
      ? new Date(createDto.horaInicio)
      : null;
    let horaFinDate: Date | null = null;
    if (horaInicioDate && createDto.duracionMinutos) {
      horaFinDate = new Date(
        horaInicioDate.getTime() + createDto.duracionMinutos * 60000,
      );
    }

    // 3.5 Obtener o crear el servicio específico
    let servicio = await this.prisma.servicio.findFirst({
      where: {
        tenantId,
        empresaId: createDto.empresaId,
        nombre: createDto.servicioEspecifico,
      },
    });

    if (!servicio) {
      servicio = await this.prisma.servicio.create({
        data: {
          tenantId,
          empresaId: createDto.empresaId,
          nombre: createDto.servicioEspecifico,
          activo: true,
        },
      });
    }

    // 4. Crear la orden
    const dtoWithAddress = { ...createDto, direccionId };
    const tecnicoId =
      createDto.tecnicoId ||
      (await this.autoAssignTechnician(
        tenantId,
        dtoWithAddress,
        horaInicioDate,
        horaFinDate,
      ));

    this.logger.log(
      `CREATE: Final tecnicoId for the order: ${tecnicoId ?? 'NULL'}`,
    );

    const nuevaOrden = await this.prisma.ordenServicio.create({
      data: {
        tenantId,
        empresaId: createDto.empresaId,
        clienteId: createDto.clienteId,
        servicioId: servicio.id,
        tecnicoId,
        direccionId,
        direccionTexto,
        estadoServicio: createDto.estadoServicio ?? 'NUEVO',
        observacion: createDto.observacion,
        nivelInfestacion: createDto.nivelInfestacion,
        urgencia: createDto.urgencia,
        tipoVisita: createDto.tipoVisita,
        frecuenciaSugerida: createDto.frecuenciaSugerida,
        tipoFacturacion: createDto.tipoFacturacion,
        valorCotizado: createDto.valorCotizado,
        metodoPagoId: createDto.metodoPagoId,
        estadoPago: createDto.estadoPago || 'PENDIENTE',
        fechaVisita: createDto.fechaVisita
          ? new Date(createDto.fechaVisita)
          : null,
        horaInicio: horaInicioDate,
        horaFin: horaFinDate,
      },
      include: {
        cliente: true,
        servicio: true,
        tecnico: {
          include: { user: true },
        },
      },
    });

    if (nuevaOrden.estadoServicio === (EstadoOrden.LIQUIDADO as EstadoOrden)) {
      await this.recalculateClientStatus(nuevaOrden.clienteId);
    }

    return nuevaOrden;
  }

  private async autoAssignTechnician(
    tenantId: string,
    dto: CreateOrdenServicioDto,
    inicio: Date | null,
    fin: Date | null,
  ): Promise<string | null> {
    this.logger.log(
      `AUTO-ASSIGN: Starting process for client ${dto.clienteId} in empresa ${dto.empresaId}`,
    );
    this.logger.log(
      `AUTO-ASSIGN: Time range: ${inicio?.toISOString()} to ${fin?.toISOString()}`,
    );

    if (!inicio || !fin) {
      this.logger.warn('AUTO-ASSIGN: Missing dates, skipping.');
      return null;
    }

    let targetDireccionId = dto.direccionId;

    // 1. Si no hay direcciónId, intentar obtener la primera dirección activa del cliente
    if (!targetDireccionId) {
      this.logger.log(
        'AUTO-ASSIGN: No direccionId in DTO, looking for client default...',
      );
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: dto.clienteId },
        include: { direcciones: { where: { activa: true }, take: 1 } },
      });
      if (cliente?.direcciones?.[0]) {
        targetDireccionId = cliente.direcciones[0].id;
        this.logger.log(
          `AUTO-ASSIGN: Using client default address: ${targetDireccionId}`,
        );
      }
    }

    if (!targetDireccionId) {
      this.logger.error(
        'AUTO-ASSIGN: FAILED - No address available for auto-assignment',
      );
      return null;
    }

    // 2. Obtener datos geográficos de la dirección
    const direccion = await this.prisma.direccion.findUnique({
      where: { id: targetDireccionId },
      select: {
        zonaId: true,
        municipioId: true,
        municipio: true,
        barrio: true,
      },
    });

    if (!direccion) {
      this.logger.error(
        `AUTO-ASSIGN: FAILED - Address record not found in DB: ${targetDireccionId}`,
      );
      return null;
    }

    this.logger.log(
      `AUTO-ASSIGN: Address details found: ${JSON.stringify(direccion)}`,
    );

    // Diagnóstico: ¿Existen operadores en esta empresa?
    const totalOps = await this.prisma.empresaMembership.count({
      where: {
        empresaId: dto.empresaId,
        activo: true,
        membership: { role: 'OPERADOR', activo: true },
      },
    });
    this.logger.log(
      `AUTO-ASSIGN: Total active OPERADORS in this empresa: ${totalOps}`,
    );

    // 3. Obtener candidatos: Técnicos (OPERADOR) de la misma empresa y municipio/zona
    let candidatos: CandidateWithMembership[] = [];

    // Intento 1: Por Zona
    if (direccion.zonaId) {
      this.logger.log(
        `AUTO-ASSIGN: Searching candidates by Zona: ${direccion.zonaId}`,
      );
      candidatos = (await this.prisma.empresaMembership.findMany({
        where: {
          empresaId: dto.empresaId,
          zonaId: direccion.zonaId,
          activo: true,
          membership: {
            role: 'OPERADOR',
            activo: true,
          },
        },
        include: { membership: true },
      })) as CandidateWithMembership[];
      this.logger.log(
        `AUTO-ASSIGN: Found ${candidatos.length} candidates by Zona`,
      );
    }

    // Intento 2: Por Municipio
    if (candidatos.length === 0 && direccion.municipioId) {
      this.logger.log(
        `AUTO-ASSIGN: Searching candidates by Municipio: ${direccion.municipioId}`,
      );
      candidatos = (await this.prisma.empresaMembership.findMany({
        where: {
          empresaId: dto.empresaId,
          activo: true,
          membership: {
            role: 'OPERADOR',
            activo: true,
            municipioId: direccion.municipioId,
          },
        },
        include: { membership: true },
      })) as CandidateWithMembership[];
      this.logger.log(
        `AUTO-ASSIGN: Found ${candidatos.length} candidates by Municipio`,
      );
    }

    if (candidatos.length === 0) {
      this.logger.warn(
        'AUTO-ASSIGN: FAILED - No candidates found in this area.',
      );
      return null;
    }

    const dias = [
      'DOMINGO',
      'LUNES',
      'MARTES',
      'MIERCOLES',
      'JUEVES',
      'VIERNES',
      'SABADO',
    ];
    const diaSemana = dias[inicio.getDay()] as LocalDiaSemana;
    this.logger.log(`AUTO-ASSIGN: Day of week: ${diaSemana}`);

    const delegate = this.prisma.picoPlaca as {
      findFirst: (args: any) => Promise<unknown>;
    };

    const reglasPicoPlaca = (await delegate.findFirst({
      where: {
        empresaId: dto.empresaId,
        dia: diaSemana,
        activo: true,
      },
    })) as LocalPicoPlaca | null;

    if (reglasPicoPlaca) {
      this.logger.log(
        `AUTO-ASSIGN: Pico y Placa rules found: ${JSON.stringify(reglasPicoPlaca)}`,
      );
    }

    const viables: string[] = [];

    for (const c of candidatos) {
      const placa = c.membership?.placa;
      const esMoto = c.membership?.moto;
      this.logger.log(
        `AUTO-ASSIGN: Testing candidate ${c.membershipId} (Placa: ${placa ?? 'N/A'}, Moto: ${esMoto ?? 'N/A'})`,
      );

      // 4. Validar Pico y Placa
      if (reglasPicoPlaca && placa) {
        const digitoInteres = esMoto ? placa.charAt(0) : placa.slice(-1);
        const numDigito = parseInt(digitoInteres);

        if (
          numDigito === reglasPicoPlaca.numeroUno ||
          numDigito === reglasPicoPlaca.numeroDos
        ) {
          this.logger.log(
            `AUTO-ASSIGN: SKIPPED - Technician ${c.membershipId} has Pico y Placa (${placa})`,
          );
          continue;
        }
      }

      // 5. Validar Disponibilidad
      this.logger.log(
        `AUTO-ASSIGN: Checking overlaps for ${c.membershipId}...`,
      );
      const traslapes = await this.prisma.ordenServicio.count({
        where: {
          tecnicoId: c.membershipId,
          OR: [
            { horaInicio: { lte: inicio }, horaFin: { gt: inicio } },
            { horaInicio: { lt: fin }, horaFin: { gte: fin } },
            { horaInicio: { gte: inicio }, horaFin: { lte: fin } },
          ],
        },
      });

      if (traslapes === 0) {
        this.logger.log(`AUTO-ASSIGN: Candidate ${c.membershipId} is VIABLE`);
        viables.push(c.membershipId);
      } else {
        this.logger.log(
          `AUTO-ASSIGN: SKIPPED - Candidate ${c.membershipId} has ${traslapes} overlaps.`,
        );
      }
    }

    if (viables.length === 0) {
      this.logger.warn(
        'AUTO-ASSIGN: FAILED - All candidates are busy or restricted.',
      );
      return null;
    }

    // 6. Balanceo
    this.logger.log(
      `AUTO-ASSIGN: Balancing load between ${viables.length} viable technicians...`,
    );

    // Preparar rango de fecha para conteo
    const startOfDay = new Date(inicio);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const conteos = await Promise.all(
      viables.map(async (id) => {
        const count = await this.prisma.ordenServicio.count({
          where: {
            tecnicoId: id,
            horaInicio: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
        });
        return { id, count };
      }),
    );

    conteos.sort((a, b) => a.count - b.count);
    const selected = conteos[0]?.id || null;
    this.logger.log(
      `AUTO-ASSIGN: SUCCESS! Selected technician: ${selected} with ${conteos[0]?.count} orders today.`,
    );
    return selected;
  }

  async findAll(tenantId: string, empresaId?: string, userRole?: string) {
    // Treat string literals "undefined", "null", "all" or invalid UUIDs as undefined
    const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const cleanEmpresaId = (empresaId && isUUID(empresaId)) ? empresaId : undefined;
    
    let whereClause: Prisma.OrdenServicioWhereInput = {};

    if (userRole === 'SU_ADMIN') {
      // SU_ADMIN ve todo sin filtros
      whereClause = {};
    } else if (userRole === 'ADMIN') {
      // ADMIN ve todo su tenant
      whereClause = {
        tenantId,
      };
      // Si ademÃ¡s filtrÃ³ por empresa, se aplica
      if (cleanEmpresaId) {
        whereClause.empresaId = cleanEmpresaId;
      }
    } else if (cleanEmpresaId) {
      // Otros roles requieren empresaId
      whereClause = {
        tenantId,
        empresaId: cleanEmpresaId,
      };
    } else {
      // Si no es admin y no hay empresa, no ve nada (igual que en clientes)
      return [];
    }

    const ordenes = await this.prisma.ordenServicio.findMany({
      where: whereClause,
      include: {
        cliente: true,
        tecnico: {
          include: {
            user: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
          },
        },
        servicio: true,
        creadoPor: {
          include: {
            user: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
          },
        },
        metodoPago: true,
        empresa: true,
        zona: true,
        direccion: true,
        vehiculo: true,
        evidencias: true,
        geolocalizaciones: {
          include: {
            membership: {
              include: {
                user: {
                  select: {
                    nombre: true,
                    apellido: true,
                  },
                },
              },
            },
          },
          orderBy: { llegada: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(ordenes.map((o) => this.processSignedUrls(o)));
  }

  async findOne(tenantId: string, id: string) {
    const orden = await this.prisma.ordenServicio.findFirst({
      where: { id, tenantId },
      include: {
        cliente: {
          include: {
            direcciones: true,
          },
        },
        tecnico: {
          include: { user: true },
        },
        servicio: true,
        evidencias: true,
        geolocalizaciones: {
          include: {
            membership: {
              include: {
                user: {
                  select: {
                    nombre: true,
                    apellido: true,
                  },
                },
              },
            },
          },
          orderBy: { llegada: 'desc' },
        },
      },
    });

    if (!orden) {
      throw new BadRequestException('La orden especificada no existe');
    }

    return this.processSignedUrls(orden);
  }

  async addEvidence(
    tenantId: string,
    id: string,
    files: Array<{ buffer: Buffer; mimetype: string; originalname: string }>,
  ) {
    const orden = await this.prisma.ordenServicio.findFirst({
      where: { id, tenantId },
    });

    if (!orden) {
      throw new BadRequestException('La orden especificada no existe');
    }

    const uploadedEvidences: any[] = [];

    for (const file of files) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `EvidenciaOrdenServicio/${id}/${fileName}`;

      let finalBuffer = file.buffer;
      let finalMimeType = file.mimetype;

      // Compress only images
      if (file.mimetype.startsWith('image/')) {
        try {
          finalBuffer = await sharp(file.buffer)
            .resize(1280, 1280, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 80 })
            .toBuffer();
          finalMimeType = 'image/jpeg';
        } catch (error) {
          this.logger.error(`Error compressing image ${file.originalname}: ${error.message}`);
          // Fallback to original buffer if compression fails
          finalBuffer = file.buffer;
        }
      }

      const uploadedPath = await this.supabase.uploadFile(
        filePath,
        finalBuffer,
        finalMimeType,
      );

      if (uploadedPath) {
        const evidence = await this.prisma.evidenciaServicio.create({
          data: {
            tenantId,
            ordenServicioId: id,
            path: uploadedPath,
          },
        });
        uploadedEvidences.push(evidence);
      }
    }

    return uploadedEvidences;
  }

  private async processSignedUrls(orden: any) {
    const fieldsToSign = [
      'facturaPath',
      'facturaElectronica',
      'comprobantePago',
      'evidenciaPath',
    ];

    for (const field of fieldsToSign) {
      if (orden[field] && !orden[field].startsWith('http')) {
        const signedUrl = await this.supabase.getSignedUrl(orden[field]);
        if (signedUrl) {
          orden[field] = signedUrl;
        }
      }
    }

    // Sign multiple evidences if they exist
    if (orden.evidencias) {
      for (const evidence of orden.evidencias) {
        if (evidence.path && !evidence.path.startsWith('http')) {
          const signedUrl = await this.supabase.getSignedUrl(evidence.path);
          if (signedUrl) {
            evidence.path = signedUrl;
          }
        }
      }
    }

    // Also sign photos in geolocalizaciones
    if (orden.geolocalizaciones) {
      for (const geo of orden.geolocalizaciones) {
        if (geo.fotoLlegada && !geo.fotoLlegada.startsWith('http')) {
          geo.fotoLlegada = await this.supabase.getSignedUrl(geo.fotoLlegada);
        }
        if (geo.fotoSalida && !geo.fotoSalida.startsWith('http')) {
          geo.fotoSalida = await this.supabase.getSignedUrl(geo.fotoSalida);
        }
      }
    }

    return orden;
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: Partial<CreateOrdenServicioDto>,
  ) {
    // Validar que la orden pertenezca al tenant
    const orden = await this.prisma.ordenServicio.findFirst({
      where: { id, tenantId },
    });

    if (!orden) {
      throw new BadRequestException('La orden especificada no existe');
    }

    const data: Prisma.OrdenServicioUpdateInput = {
      tecnico: updateDto.tecnicoId
        ? { connect: { id: updateDto.tecnicoId } }
        : undefined,
      observacion: updateDto.observacion ?? undefined,
      nivelInfestacion: updateDto.nivelInfestacion ?? undefined,
      urgencia: updateDto.urgencia ?? undefined,
      tipoVisita: updateDto.tipoVisita ?? undefined,
      frecuenciaSugerida: updateDto.frecuenciaSugerida ?? undefined,
      tipoFacturacion: updateDto.tipoFacturacion ?? undefined,
      valorCotizado: updateDto.valorCotizado ?? undefined,
      metodoPago: updateDto.metodoPagoId
        ? { connect: { id: updateDto.metodoPagoId } }
        : undefined,
      estadoPago: updateDto.estadoPago ?? undefined,
      estadoServicio: updateDto.estadoServicio ?? undefined,
      facturaPath: updateDto.facturaPath ?? undefined,
      facturaElectronica: updateDto.facturaElectronica ?? undefined,
      comprobantePago: updateDto.comprobantePago ?? undefined,
      evidenciaPath: updateDto.evidenciaPath ?? undefined,
    };

    if (updateDto.fechaVisita) {
      data.fechaVisita = new Date(updateDto.fechaVisita);
    }

    if (updateDto.horaInicio) {
      const horaInicio = new Date(updateDto.horaInicio);
      data.horaInicio = horaInicio;
      if (updateDto.duracionMinutos) {
        data.horaFin = new Date(
          horaInicio.getTime() + updateDto.duracionMinutos * 60000,
        );
      }
    }

    if (updateDto.servicioEspecifico) {
      let servicio = await this.prisma.servicio.findFirst({
        where: {
          tenantId,
          empresaId: orden.empresaId,
          nombre: updateDto.servicioEspecifico,
        },
      });

      if (!servicio) {
        servicio = await this.prisma.servicio.create({
          data: {
            tenantId,
            empresaId: orden.empresaId,
            nombre: updateDto.servicioEspecifico,
            activo: true,
          },
        });
      }
      data.servicio = { connect: { id: servicio.id } };
    }

    const updatedOrden = await this.prisma.ordenServicio.update({
      where: { id },
      data,
      include: {
        cliente: true,
        servicio: true,
        tecnico: {
          include: { user: true },
        },
      },
    });

    // Recalcular status si el estado actual es LIQUIDADO o si el estado anterior lo era
    // (para manejar reversiones de estado y que el score sea siempre preciso)
    if (
      updatedOrden.estadoServicio === (EstadoOrden.LIQUIDADO as EstadoOrden) ||
      orden.estadoServicio === (EstadoOrden.LIQUIDADO as EstadoOrden)
    ) {
      await this.recalculateClientStatus(updatedOrden.clienteId);
    }

    return updatedOrden;
  }

  private async recalculateClientStatus(clienteId: string): Promise<void> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        ordenesServicio: {
          where: { estadoServicio: EstadoOrden.LIQUIDADO as EstadoOrden },
          orderBy: { fechaVisita: 'desc' },
        },
      },
    });

    if (!cliente) return;

    let score = 0;
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const orders = cliente.ordenesServicio;

    // 1. Basic score: +10 per liquidated order
    score += orders.length * 10;

    // 2. Ticket bonus: +5 if value > 1,000,000
    score +=
      orders.filter((o) => Number(o.valorCotizado || 0) > 1000000).length * 5;

    // 3. Fidelity bonus: +20 if at least 5 in last 6 months
    const recentOrders = orders.filter(
      (o) => o.fechaVisita && new Date(o.fechaVisita) >= sixMonthsAgo,
    );
    if (recentOrders.length >= 5) {
      score += 20;
    }

    // 4. Determine Classification
    let clasificacion: ClasificacionCliente =
      ClasificacionCliente.BRONCE as ClasificacionCliente;

    // RIESGO logic:
    // a. Technical Risk: last order infestation is CRITICO or ALTO
    const lastOrder = orders[0];
    const isTechnicalRisk =
      lastOrder &&
      (lastOrder.nivelInfestacion ===
        (NivelInfestacion.CRITICO as NivelInfestacion) ||
        lastOrder.nivelInfestacion ===
          (NivelInfestacion.ALTO as NivelInfestacion));

    // b. Commercial Risk: 45 days since last visit if frequency is 30
    const lastVisitDate = lastOrder?.fechaVisita
      ? new Date(lastOrder.fechaVisita)
      : null;
    const daysSinceLastVisit = lastVisitDate
      ? (now.getTime() - lastVisitDate.getTime()) / (1000 * 3600 * 24)
      : null;

    // Get frequency from client or default to 30
    const frequency = cliente.frecuenciaServicio || 30;
    const isCommercialRisk =
      daysSinceLastVisit !== null &&
      daysSinceLastVisit > (frequency === 30 ? 45 : frequency * 1.5);

    if (isTechnicalRisk || isCommercialRisk) {
      clasificacion = ClasificacionCliente.RIESGO as ClasificacionCliente;
    } else {
      if (score > 500) {
        clasificacion = ClasificacionCliente.ORO as ClasificacionCliente;
      } else if (score > 100) {
        clasificacion = ClasificacionCliente.PLATA as ClasificacionCliente;
      } else {
        clasificacion = ClasificacionCliente.BRONCE as ClasificacionCliente;
      }
    }

    await this.prisma.cliente.update({
      where: { id: clienteId },
      data: {
        score,
        clasificacion,
        ultimaVisita: lastVisitDate,
      },
    });
  }
}
