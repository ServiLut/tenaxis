import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateOrdenServicioDto } from './dto/create-orden-servicio.dto';
import { CompleteFollowUpDto } from './dto/complete-follow-up.dto';
import { CreateFollowUpOverrideDto } from './dto/create-follow-up-override.dto';
import { JwtPayload } from '../auth/auth.service';
import {
  QueryOrdenesServicioDto,
  ServiciosPreset,
  applyPresetRange,
  normalizeSearchToken,
  toDayBoundsFromIso,
  toLocalDayRange,
} from './dto/query-ordenes-servicio.dto';
import {
  addBogotaDaysUtc,
  parseFlexibleDateTimeToUtc,
  startOfBogotaDayUtc,
} from '../common/utils/timezone.util';
import {
  ConfirmUploadedFilesDto,
  CreateSignedUploadUrlDto,
  OrdenUploadKind,
} from './dto/upload-orden-servicio.dto';
import {
  NotifyLiquidationDto,
  NotifyOperatorDto,
} from './dto/notify-webhook.dto';
import sharp from 'sharp';
import {
  OrdenServicio,
  Geolocalizacion,
  EvidenciaServicio,
  ClasificacionCliente,
  EstadoPermiso,
  EstadoOrden,
  EstadoPagoOrden,
  MetodoPagoBase,
  NivelInfestacion,
  Prisma,
  Role,
  TipoFacturacion,
  TipoPermiso,
  UrgenciaOrden,
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

interface DesglosePagoItem {
  metodo: MetodoPagoBase;
  monto: number;
}

type CandidateWithMembership = LocalEmpresaMembership & {
  membership: LocalTenantMembership;
};

type OrdenWithGeolocalizaciones = OrdenServicio & {
  geolocalizaciones?: Geolocalizacion[];
  evidencias?: EvidenciaServicio[];
};

type SignableField =
  | 'facturaPath'
  | 'facturaElectronica'
  | 'comprobantePago'
  | 'evidenciaPath';

export interface ServiciosKpiPayload {
  total: number;
  programadosHoy: number;
  enCurso: number;
  vencidosSla: number;
  cumplimientoSlaPct: number;
  porcentajeLiquidacion: number;
  recaudoHoy: number;
  ticketPromedio: number;
  sinEvidencia: number;
}

@Injectable()
export class OrdenesServicioService {
  private readonly logger = new Logger(OrdenesServicioService.name);

  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
  ) {}

  async create(
    tenantId: string,
    createDto: CreateOrdenServicioDto,
    performingUser?: JwtPayload,
  ) {
    this.logger.log(`CREATE: Starting order creation for tenant: ${tenantId}`);
    // 1. Validar que la empresa exista
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: createDto.empresaId },
    });
    if (!empresa) {
      throw new BadRequestException('La empresa especificada no existe');
    }

    if (performingUser?.membershipId) {
      createDto.creadoPorId = performingUser.membershipId;
    }

    await this.assertCanAssignServices(
      tenantId,
      performingUser,
      createDto.empresaId,
    );

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

    const fechaVisitaDate = createDto.fechaVisita
      ? parseFlexibleDateTimeToUtc(createDto.fechaVisita, {
          dateOnlyAsBogotaStart: true,
        })
      : null;
    if (createDto.fechaVisita && !fechaVisitaDate) {
      throw new BadRequestException('fechaVisita inválida');
    }

    // Calcular horaFin basado en horaInicio y duracionMinutos
    const horaInicioDate = createDto.horaInicio
      ? parseFlexibleDateTimeToUtc(createDto.horaInicio)
      : null;
    if (createDto.horaInicio && !horaInicioDate) {
      throw new BadRequestException('horaInicio inválida');
    }
    let horaFinDate: Date | null = null;
    if (horaInicioDate && createDto.duracionMinutos) {
      horaFinDate = new Date(
        horaInicioDate.getTime() + createDto.duracionMinutos * 60000,
      );
    }

    // 3.5 Obtener o crear el servicio específico
    let servicio =
      (createDto.servicioId
        ? await this.prisma.servicio.findFirst({
            where: {
              id: createDto.servicioId,
              tenantId,
              empresaId: createDto.empresaId,
            },
          })
        : null) ||
      (await this.prisma.servicio.findFirst({
        where: {
          tenantId,
          empresaId: createDto.empresaId,
          nombre: createDto.servicioEspecifico,
        },
      }));

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

    let estadoPago =
      (createDto.estadoPago as EstadoPagoOrden) || EstadoPagoOrden.PENDIENTE;
    let valorPagado = createDto.valorPagado || 0;

    // Calcular estado y valor si hay desglose
    if (createDto.desglosePago && Array.isArray(createDto.desglosePago)) {
      const totals = this.calculateBreakdownTotals(
        createDto.desglosePago as unknown as DesglosePagoItem[],
        Number(createDto.valorCotizado || 0),
      );
      estadoPago = totals.estadoPago;
      valorPagado = totals.valorPagado;
    }

    const nuevaOrden = await this.prisma.ordenServicio.create({
      data: {
        tenantId,
        empresaId: createDto.empresaId,
        clienteId: createDto.clienteId,
        servicioId: servicio.id,
        creadoPorId: createDto.creadoPorId,
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
        valorPagado,
        metodoPagoId: createDto.metodoPagoId,
        desglosePago: createDto.desglosePago
          ? (createDto.desglosePago as unknown as Prisma.InputJsonValue)
          : undefined,
        estadoPago,
        fechaVisita: fechaVisitaDate,
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

    // Recalcular estado del cliente (score, clasificación, ultima/proxima visita)
    await this.recalculateClientStatus(nuevaOrden.clienteId);
    await this.createAutomaticFollowUps(
      tenantId,
      nuevaOrden,
      servicio,
      fechaVisitaDate,
    );

    return this.processSignedUrls(nuevaOrden as OrdenWithGeolocalizaciones);
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
      findFirst: (args: Prisma.PicoPlacaFindFirstArgs) => Promise<unknown>;
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
    const startOfDay = startOfBogotaDayUtc(inicio);
    const endOfDay = addBogotaDaysUtc(startOfDay, 1);

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

  private isUUID(id?: string): boolean {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );
  }

  private buildWhereClause(
    tenantId: string,
    empresaId: string | undefined,
    userRole: string | undefined,
    filters?: QueryOrdenesServicioDto,
  ): Prisma.OrdenServicioWhereInput | null {
    const cleanEmpresaId = this.isUUID(empresaId) ? empresaId : undefined;

    let whereClause: Prisma.OrdenServicioWhereInput = {};

    if (userRole === 'SU_ADMIN') {
      whereClause = {};
    } else if (userRole === 'ADMIN') {
      whereClause = { tenantId };
      if (cleanEmpresaId) {
        whereClause.empresaId = cleanEmpresaId;
      }
    } else if (cleanEmpresaId) {
      whereClause = {
        tenantId,
        empresaId: cleanEmpresaId,
      };
    } else {
      return null;
    }

    whereClause.ordenPadreId = null;

    if (!filters) return whereClause;

    if (this.isUUID(filters.clienteId)) {
      whereClause.clienteId = filters.clienteId;
    }

    if (this.isUUID(filters.tecnicoId)) {
      whereClause.tecnicoId = filters.tecnicoId;
    }

    if (this.isUUID(filters.creadorId)) {
      whereClause.creadoPorId = filters.creadorId;
    }

    if (this.isUUID(filters.metodoPagoId)) {
      whereClause.metodoPagoId = filters.metodoPagoId;
    }

    if (filters.estado) {
      whereClause.estadoServicio = filters.estado;
    }

    if (filters.urgencia) {
      whereClause.urgencia = filters.urgencia;
    }

    if (filters.municipio) {
      whereClause.municipio = {
        equals: filters.municipio.trim(),
        mode: 'insensitive',
      };
    }

    if (filters.tipoVisita) {
      whereClause.tipoVisita = filters.tipoVisita;
    }

    const searchToken = normalizeSearchToken(filters.search);
    if (searchToken) {
      whereClause.OR = [
        { numeroOrden: { contains: searchToken, mode: 'insensitive' } },
        { direccionTexto: { contains: searchToken, mode: 'insensitive' } },
        { barrio: { contains: searchToken, mode: 'insensitive' } },
        { cliente: { nombre: { contains: searchToken, mode: 'insensitive' } } },
        {
          cliente: {
            apellido: { contains: searchToken, mode: 'insensitive' },
          },
        },
        {
          cliente: {
            razonSocial: { contains: searchToken, mode: 'insensitive' },
          },
        },
        {
          servicio: { nombre: { contains: searchToken, mode: 'insensitive' } },
        },
      ];
    }

    const dateStart = toDayBoundsFromIso(filters.fechaInicio)?.start;
    const dateEnd = toDayBoundsFromIso(filters.fechaFin)?.end;
    const presetRange = applyPresetRange(filters.preset);

    const gte =
      dateStart ||
      (presetRange && 'start' in presetRange ? presetRange.start : undefined);
    const lte = dateEnd || (presetRange ? presetRange.end : undefined);

    if (gte || lte) {
      whereClause.fechaVisita = {
        ...(gte ? { gte } : {}),
        ...(lte ? { lte } : {}),
      };
    }

    if (filters.preset === ServiciosPreset.SIN_TECNICO) {
      whereClause.tecnicoId = null;
    }

    if (filters.preset === ServiciosPreset.PENDIENTES_LIQUIDAR) {
      whereClause.estadoServicio = EstadoOrden.TECNICO_FINALIZO as EstadoOrden;
    }

    if (filters.preset === ServiciosPreset.VENCIDOS) {
      const todayStart = toLocalDayRange(new Date()).start;
      const fechaVisitaFilter =
        whereClause.fechaVisita &&
        typeof whereClause.fechaVisita === 'object' &&
        !Array.isArray(whereClause.fechaVisita)
          ? whereClause.fechaVisita
          : {};
      whereClause.fechaVisita = {
        ...fechaVisitaFilter,
        lt: todayStart,
      };
      whereClause.NOT = {
        estadoServicio: {
          in: [
            EstadoOrden.LIQUIDADO,
            EstadoOrden.CANCELADO,
            EstadoOrden.SIN_CONCRETAR,
          ],
        },
      };
    }

    return whereClause;
  }

  async findAll(
    tenantId: string,
    empresaId?: string,
    userRole?: string,
    filters?: QueryOrdenesServicioDto,
  ) {
    const whereClause = this.buildWhereClause(
      tenantId,
      empresaId,
      userRole,
      filters,
    );

    if (!whereClause) {
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
        entidadFinanciera: true,
        liquidadoPor: {
          include: {
            user: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
          },
        },
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
        ordenesHijas: {
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
            entidadFinanciera: true,
            liquidadoPor: {
              include: {
                user: {
                  select: {
                    nombre: true,
                    apellido: true,
                  },
                },
              },
            },
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
          orderBy: { fechaVisita: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      ordenes.map((o) =>
        this.processSignedUrls(o as OrdenWithGeolocalizaciones),
      ),
    );
  }

  async getKpis(
    tenantId: string,
    empresaId?: string,
    userRole?: string,
    filters?: QueryOrdenesServicioDto,
  ): Promise<ServiciosKpiPayload> {
    const whereClause = this.buildWhereClause(
      tenantId,
      empresaId,
      userRole,
      filters,
    );

    if (!whereClause) {
      return {
        total: 0,
        programadosHoy: 0,
        enCurso: 0,
        vencidosSla: 0,
        cumplimientoSlaPct: 0,
        porcentajeLiquidacion: 0,
        recaudoHoy: 0,
        ticketPromedio: 0,
        sinEvidencia: 0,
      };
    }

    const todayRange = toLocalDayRange(new Date());

    const rows = await this.prisma.ordenServicio.findMany({
      where: whereClause,
      select: {
        estadoServicio: true,
        fechaVisita: true,
        fechaPago: true,
        valorPagado: true,
        valorCotizado: true,
        evidenciaPath: true,
        _count: {
          select: {
            evidencias: true,
            geolocalizaciones: true,
          },
        },
      },
    });

    const total = rows.length;
    let programadosHoy = 0;
    let enCurso = 0;
    let vencidosSla = 0;
    let liquidado = 0;
    let tecnicoFinalizado = 0;
    let recaudoHoy = 0;
    let sumLiquidado = 0;
    let sinEvidencia = 0;

    for (const row of rows) {
      const estado = row.estadoServicio;
      const visitDate = row.fechaVisita ? new Date(row.fechaVisita) : null;
      const payDate = row.fechaPago ? new Date(row.fechaPago) : null;

      if (
        estado === (EstadoOrden.PROGRAMADO as EstadoOrden) &&
        visitDate &&
        visitDate >= todayRange.start &&
        visitDate <= todayRange.end
      ) {
        programadosHoy += 1;
      }

      if (estado === (EstadoOrden.PROCESO as EstadoOrden)) {
        enCurso += 1;
      }

      if (
        visitDate &&
        visitDate < todayRange.start &&
        estado !== (EstadoOrden.LIQUIDADO as EstadoOrden) &&
        estado !== (EstadoOrden.CANCELADO as EstadoOrden) &&
        estado !== (EstadoOrden.SIN_CONCRETAR as EstadoOrden)
      ) {
        vencidosSla += 1;
      }

      if (estado === (EstadoOrden.LIQUIDADO as EstadoOrden)) {
        liquidado += 1;
        sumLiquidado += Number(row.valorCotizado || 0);
      }

      if (estado === (EstadoOrden.TECNICO_FINALIZO as EstadoOrden)) {
        tecnicoFinalizado += 1;
      }

      if (payDate && payDate >= todayRange.start && payDate <= todayRange.end) {
        recaudoHoy += Number(row.valorPagado || 0);
      }

      if (
        !row.evidenciaPath &&
        Number(row._count.evidencias || 0) === 0 &&
        Number(row._count.geolocalizaciones || 0) === 0
      ) {
        sinEvidencia += 1;
      }
    }

    const cumplimientoSlaPct =
      total > 0
        ? Number((((total - vencidosSla) / total) * 100).toFixed(2))
        : 0;

    const liquidationBase = liquidado + tecnicoFinalizado;
    const porcentajeLiquidacion =
      liquidationBase > 0
        ? Number(((liquidado / liquidationBase) * 100).toFixed(2))
        : 0;

    const ticketPromedio =
      liquidado > 0 ? Number((sumLiquidado / liquidado).toFixed(2)) : 0;

    return {
      total,
      programadosHoy,
      enCurso,
      vencidosSla,
      cumplimientoSlaPct,
      porcentajeLiquidacion,
      recaudoHoy,
      ticketPromedio,
      sinEvidencia,
    };
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
        entidadFinanciera: true,
        liquidadoPor: {
          include: { user: true },
        },
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

    return this.processSignedUrls(orden as OrdenWithGeolocalizaciones);
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

    const uploadedEvidences: EvidenciaServicio[] = [];

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
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Error compressing image ${file.originalname}: ${errorMessage}`,
          );
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

        // Generar URL firmada/pública para la respuesta inmediata
        const signedUrl = await this.supabase.getSignedUrl(evidence.path);
        if (signedUrl) {
          evidence.path = signedUrl;
        }

        uploadedEvidences.push(evidence);
      }
    }

    return uploadedEvidences;
  }

  private buildStoragePath(
    tenantId: string,
    ordenId: string,
    kind: OrdenUploadKind,
    fileName: string,
  ) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const random = Math.random().toString(36).slice(2, 8);
    const finalName = `${Date.now()}-${random}-${safeName}`;
    return `${tenantId}/ordenes-servicio/${ordenId}/${kind}/${finalName}`;
  }

  async createSignedUploadUrl(
    tenantId: string,
    ordenId: string,
    dto: CreateSignedUploadUrlDto,
  ) {
    const orden = await this.prisma.ordenServicio.findFirst({
      where: { id: ordenId, tenantId },
      select: { id: true },
    });

    if (!orden) {
      throw new BadRequestException('La orden especificada no existe');
    }

    const path = this.buildStoragePath(
      tenantId,
      ordenId,
      dto.kind,
      dto.fileName,
    );
    const signed = await this.supabase.createSignedUploadUrl(path);

    if (!signed) {
      throw new BadRequestException(
        'No fue posible generar URL firmada para la carga',
      );
    }

    return signed;
  }

  async confirmUploadedFiles(
    tenantId: string,
    ordenId: string,
    dto: ConfirmUploadedFilesDto,
  ) {
    const orden = await this.prisma.ordenServicio.findFirst({
      where: { id: ordenId, tenantId },
      select: { id: true },
    });

    if (!orden) {
      throw new BadRequestException('La orden especificada no existe');
    }

    if (dto.kind === OrdenUploadKind.EVIDENCIAS) {
      const evidencias = await this.prisma.$transaction(
        dto.paths.map((path) =>
          this.prisma.evidenciaServicio.create({
            data: {
              tenantId,
              ordenServicioId: ordenId,
              path,
            },
          }),
        ),
      );
      return Promise.all(
        evidencias.map(async (item) => {
          const signedUrl = await this.supabase.getSignedUrl(item.path);
          return {
            ...item,
            path: signedUrl || item.path,
          };
        }),
      );
    }

    const field =
      dto.kind === OrdenUploadKind.FACTURA_ELECTRONICA
        ? 'facturaElectronica'
        : 'comprobantePago';

    const updated = await this.prisma.ordenServicio.update({
      where: { id: ordenId },
      data: {
        [field]: dto.paths[0],
      },
    });

    return this.processSignedUrls(updated as OrdenWithGeolocalizaciones);
  }

  async notifyLiquidationWebhook(dto: NotifyLiquidationDto) {
    const webhookUrl = process.env.N8N_LIQUIDADO_WEBHOOK_URL;
    if (!webhookUrl) {
      this.logger.error('Webhook URL N8N_LIQUIDADO_WEBHOOK_URL not found');
      return { success: false, error: 'Webhook configuration missing' };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...dto,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Liquidation webhook failed: ${response.status} ${errorText}`,
        );
        return { success: false, error: `Failed: ${response.status}` };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error triggering liquidation webhook: ${message}`);
      return { success: false, error: 'Error triggering webhook' };
    }
  }

  async notifyOperatorWebhook(dto: NotifyOperatorDto) {
    const webhookUrl = process.env.N8N_NOTIFICAR_SERVICIO;
    if (!webhookUrl) {
      this.logger.error('Webhook URL N8N_NOTIFICAR_SERVICIO not found');
      return { success: false, error: 'Webhook configuration missing' };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...dto,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Operator webhook failed: ${response.status} ${errorText}`,
        );
        return { success: false, error: `Failed: ${response.status}` };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error triggering operator webhook: ${message}`);
      return { success: false, error: 'Error triggering webhook' };
    }
  }

  private async processSignedUrls(
    orden: OrdenWithGeolocalizaciones,
  ): Promise<OrdenWithGeolocalizaciones> {
    const fieldsToSign: SignableField[] = [
      'facturaPath',
      'facturaElectronica',
      'comprobantePago',
      'evidenciaPath',
    ];

    for (const field of fieldsToSign) {
      const value = orden[field];
      if (value && typeof value === 'string' && !value.startsWith('http')) {
        const signedUrl = await this.supabase.getSignedUrl(value);
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
          const signedUrl = await this.supabase.getSignedUrl(geo.fotoLlegada);
          if (signedUrl) {
            geo.fotoLlegada = signedUrl;
          }
        }
        if (geo.fotoSalida && !geo.fotoSalida.startsWith('http')) {
          const signedUrl = await this.supabase.getSignedUrl(geo.fotoSalida);
          if (signedUrl) {
            geo.fotoSalida = signedUrl;
          }
        }
      }
    }

    return orden;
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: Partial<CreateOrdenServicioDto>,
    performingUser?: JwtPayload,
  ) {
    // Validar que la orden pertenezca al tenant
    const orden = await this.prisma.ordenServicio.findFirst({
      where: { id, tenantId },
    });

    if (!orden) {
      throw new BadRequestException('La orden especificada no existe');
    }

    // Intentar resolver el membershipId si no viene en el token (retrocompatibilidad)
    let membershipId = performingUser?.membershipId;
    if (!membershipId && performingUser?.sub && tenantId) {
      const membership = await this.prisma.tenantMembership.findUnique({
        where: {
          userId_tenantId: {
            userId: performingUser.sub,
            tenantId: tenantId,
          },
        },
      });
      membershipId = membership?.id;
    }

    const fechaPagoDate = updateDto.fechaPago
      ? parseFlexibleDateTimeToUtc(updateDto.fechaPago, {
          dateOnlyAsBogotaStart: true,
        })
      : undefined;
    if (updateDto.fechaPago && !fechaPagoDate) {
      throw new BadRequestException('fechaPago inválida');
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
      valorPagado: updateDto.valorPagado ?? undefined,
      observacionFinal: updateDto.observacionFinal ?? undefined,
      referenciaPago: updateDto.referenciaPago ?? undefined,
      liquidadoPor:
        updateDto.estadoServicio === (EstadoOrden.LIQUIDADO as EstadoOrden) &&
        (membershipId || updateDto.liquidadoPorId)
          ? { connect: { id: membershipId || updateDto.liquidadoPorId } }
          : undefined,
      liquidadoAt:
        updateDto.estadoServicio === (EstadoOrden.LIQUIDADO as EstadoOrden)
          ? new Date()
          : undefined,
      fechaPago: fechaPagoDate,
      desglosePago: updateDto.desglosePago
        ? (updateDto.desglosePago as unknown as Prisma.InputJsonValue)
        : undefined,
    };

    // Lógica automática basada en el desglose de pago
    if (updateDto.desglosePago && Array.isArray(updateDto.desglosePago)) {
      const valorCotizado = Number(
        updateDto.valorCotizado || orden.valorCotizado || 0,
      );
      const totals = this.calculateBreakdownTotals(
        updateDto.desglosePago as unknown as DesglosePagoItem[],
        valorCotizado,
      );
      data.valorPagado = totals.valorPagado;
      data.estadoPago = totals.estadoPago;
    }

    if (updateDto.entidadFinancieraNombre) {
      let entidad = await this.prisma.entidadFinanciera.findFirst({
        where: {
          empresaId: orden.empresaId,
          nombre: {
            equals: updateDto.entidadFinancieraNombre,
            mode: 'insensitive',
          },
        },
      });

      if (!entidad) {
        entidad = await this.prisma.entidadFinanciera.create({
          data: {
            tenantId,
            empresaId: orden.empresaId,
            nombre: updateDto.entidadFinancieraNombre,
          },
        });
      }
      data.entidadFinanciera = { connect: { id: entidad.id } };
    }

    if (updateDto.fechaVisita) {
      const fechaVisita = parseFlexibleDateTimeToUtc(updateDto.fechaVisita, {
        dateOnlyAsBogotaStart: true,
      });
      if (!fechaVisita) {
        throw new BadRequestException('fechaVisita inválida');
      }
      data.fechaVisita = fechaVisita;
    }

    if (updateDto.horaInicio) {
      const horaInicio = parseFlexibleDateTimeToUtc(updateDto.horaInicio);
      if (!horaInicio) {
        throw new BadRequestException('horaInicio inválida');
      }
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

    // Nueva lógica: Si la orden se liquidó y tiene efectivo, crear Declaración de Efectivo
    if (
      updatedOrden.estadoServicio === (EstadoOrden.LIQUIDADO as EstadoOrden) &&
      updatedOrden.desglosePago &&
      Array.isArray(updatedOrden.desglosePago)
    ) {
      const breakdown =
        updatedOrden.desglosePago as unknown as DesglosePagoItem[];
      const cashLine = breakdown.find(
        (l) => l.metodo === MetodoPagoBase.EFECTIVO,
      );

      if (cashLine && Number(cashLine.monto) > 0 && updatedOrden.tecnicoId) {
        // Verificar si ya existe una declaración para esta orden
        const existingDecl = await this.prisma.declaracionEfectivo.findUnique({
          where: { ordenId: updatedOrden.id },
        });

        if (!existingDecl) {
          await this.prisma.declaracionEfectivo.create({
            data: {
              tenantId: updatedOrden.tenantId,
              empresaId: updatedOrden.empresaId,
              ordenId: updatedOrden.id,
              tecnicoId: updatedOrden.tecnicoId,
              valorDeclarado: Number(cashLine.monto),
              evidenciaPath: updatedOrden.comprobantePago || 'POR_CONSIGNAR',
              observacion: `Recaudo automático por liquidación de orden #${updatedOrden.id}`,
              consignado: false,
            },
          });
        }
      }
    }

    // Recalcular status si el estado actual es LIQUIDADO o si el estado anterior lo era
    // (para manejar reversiones de estado y que el score sea siempre preciso)
    if (
      updatedOrden.estadoServicio === (EstadoOrden.LIQUIDADO as EstadoOrden) ||
      orden.estadoServicio === (EstadoOrden.LIQUIDADO as EstadoOrden)
    ) {
      await this.recalculateClientStatus(updatedOrden.clienteId);
    }

    return this.processSignedUrls(updatedOrden as OrdenWithGeolocalizaciones);
  }

  private calculateBreakdownTotals(
    breakdown: DesglosePagoItem[],
    valorCotizado: number,
  ): { valorPagado: number; estadoPago: EstadoPagoOrden } {
    // 1. Dinero real recibido (Lo que entra a caja/banco)
    const valorPagado = breakdown
      .filter(
        (l) =>
          l.metodo === MetodoPagoBase.EFECTIVO ||
          l.metodo === MetodoPagoBase.TRANSFERENCIA,
      )
      .reduce((sum, l) => sum + Number(l.monto || 0), 0);

    // 2. Valor cubierto por métodos no monetarios (Bonos, Cortesías)
    const valorDescuentos = breakdown
      .filter(
        (l) =>
          l.metodo === MetodoPagoBase.BONO ||
          l.metodo === MetodoPagoBase.CORTESIA,
      )
      .reduce((sum, l) => sum + Number(l.monto || 0), 0);

    // 3. Valor a crédito (Deuda pendiente)
    const valorCredito = breakdown
      .filter((l) => l.metodo === MetodoPagoBase.CREDITO)
      .reduce((sum, l) => sum + Number(l.monto || 0), 0);

    // 4. Total cubierto (Suma de todo para ver si la orden está cerrada)
    const totalCubierto = valorPagado + valorDescuentos + valorCredito;

    // Determinar estado de pago
    const hasCredito = valorCredito > 0;
    const hasCortesia = breakdown.some(
      (l) => l.metodo === MetodoPagoBase.CORTESIA,
    );

    let estadoPago: EstadoPagoOrden = EstadoPagoOrden.PENDIENTE;

    // Si todo está cubierto y no hay crédito, está PAGADO (o es CORTESIA total)
    if (totalCubierto >= valorCotizado && !hasCredito) {
      estadoPago =
        hasCortesia && valorPagado === 0
          ? EstadoPagoOrden.CORTESIA
          : EstadoPagoOrden.PAGADO;
    }
    // Si hay algún movimiento pero no llega al total o hay crédito
    else if (totalCubierto > 0) {
      estadoPago = EstadoPagoOrden.PARCIAL;
    }

    return { valorPagado, estadoPago };
  }

  private async recalculateClientStatus(clienteId: string): Promise<void> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        ordenesServicio: {
          where: {
            estadoServicio: {
              not: EstadoOrden.CANCELADO as EstadoOrden,
            },
          },
          orderBy: { fechaVisita: 'desc' },
        },
      },
    });

    if (!cliente) return;

    let score = 0;
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const liquidatedOrders = cliente.ordenesServicio.filter(
      (o) => o.estadoServicio === (EstadoOrden.LIQUIDADO as EstadoOrden),
    );

    // 1. Basic score: +10 per liquidated order
    score += liquidatedOrders.length * 10;

    // 2. Ticket bonus: +5 if value > 1,000,000
    score +=
      liquidatedOrders.filter((o) => Number(o.valorCotizado || 0) > 1000000)
        .length * 5;

    // 3. Fidelity bonus: +20 if at least 5 in last 6 months
    const recentOrders = liquidatedOrders.filter(
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
    const lastOrder = liquidatedOrders[0];
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

    // Proxima Visita: La fecha más cercana en el futuro de una orden NO cancelada
    const futureOrders = cliente.ordenesServicio
      .filter((o) => o.fechaVisita && new Date(o.fechaVisita) >= now)
      .sort(
        (a, b) =>
          new Date(a.fechaVisita!).getTime() -
          new Date(b.fechaVisita!).getTime(),
      );

    const proximaVisita = futureOrders[0]?.fechaVisita || null;

    await this.prisma.cliente.update({
      where: { id: clienteId },
      data: {
        score,
        clasificacion,
        ultimaVisita: lastVisitDate,
        proximaVisita: proximaVisita,
      },
    });
  }

  async getMyFollowUpStatus(
    tenantId: string,
    user: JwtPayload,
    empresaId?: string,
  ) {
    if (!user.membershipId || this.isPrivilegedRole(user.role)) {
      return {
        blocked: false,
        overdueCount: 0,
        overdueItems: [],
        activeOverride: null,
      };
    }

    const now = new Date();
    const overdueThreshold = startOfBogotaDayUtc(now);
    const activeOverride = await this.getActiveFollowUpOverride(
      tenantId,
      user.membershipId,
      empresaId,
      now,
    );
    const overdueCount = await this.prisma.ordenServicioSeguimiento.count({
      where: {
        tenantId,
        empresaId: empresaId || undefined,
        createdByMembershipId: user.membershipId,
        status: 'PENDIENTE',
        completedAt: null,
        dueAt: { lt: overdueThreshold },
      },
    });

    const overdueItems = await this.prisma.ordenServicioSeguimiento.findMany({
      where: {
        tenantId,
        empresaId: empresaId || undefined,
        createdByMembershipId: user.membershipId,
        status: 'PENDIENTE',
        completedAt: null,
        dueAt: { lt: overdueThreshold },
      },
      include: {
        ordenServicio: {
          include: {
            cliente: true,
            servicio: true,
          },
        },
      },
      orderBy: { dueAt: 'asc' },
      take: 10,
    });

    return {
      blocked: !activeOverride && overdueCount > 0,
      overdueCount,
      overdueItems: overdueItems.map((item) => ({
        id: item.id,
        dueAt: item.dueAt,
        followUpType: item.followUpType,
        ordenServicioId: item.ordenServicioId,
        cliente:
          item.ordenServicio.cliente.tipoCliente === 'EMPRESA'
            ? item.ordenServicio.cliente.razonSocial
            : `${item.ordenServicio.cliente.nombre || ''} ${item.ordenServicio.cliente.apellido || ''}`.trim(),
        servicio: item.ordenServicio.servicio.nombre,
      })),
      activeOverride: activeOverride
        ? {
            id: activeOverride.id,
            startsAt: activeOverride.fechaAprobacion,
            endsAt: activeOverride.fechaExpiracion,
            reason: activeOverride.motivo,
          }
        : null,
    };
  }

  async completeFollowUp(
    tenantId: string,
    followUpId: string,
    dto: CompleteFollowUpDto,
    user: JwtPayload,
  ) {
    if (!user.membershipId) {
      throw new ForbiddenException('No se pudo resolver la membresía actual');
    }

    const followUp = await this.prisma.ordenServicioSeguimiento.findFirst({
      where: { id: followUpId, tenantId },
    });

    if (!followUp) {
      throw new BadRequestException('Seguimiento no encontrado');
    }

    const canManage =
      followUp.createdByMembershipId === user.membershipId ||
      this.isPrivilegedRole(user.role) ||
      user.role === Role.COORDINADOR;

    if (!canManage) {
      throw new ForbiddenException(
        'No tienes permisos para completar este seguimiento',
      );
    }

    const contactedAt = parseFlexibleDateTimeToUtc(dto.contactedAt);
    if (!contactedAt) {
      throw new BadRequestException('contactedAt inválido');
    }

    const updated = await this.prisma.ordenServicioSeguimiento.update({
      where: { id: followUpId },
      data: {
        status: 'COMPLETADO',
        contactedAt,
        channel: dto.channel,
        outcome: dto.outcome,
        notes: dto.notes,
        completedAt: new Date(),
        completedByMembershipId: user.membershipId,
      },
    });

    if (dto.nextActionAt) {
      const nextActionAt = parseFlexibleDateTimeToUtc(dto.nextActionAt, {
        dateOnlyAsBogotaStart: true,
      });

      if (nextActionAt) {
        await this.prisma.ordenServicioSeguimiento.create({
          data: {
            tenantId,
            empresaId: followUp.empresaId,
            ordenServicioId: followUp.ordenServicioId,
            createdByMembershipId: followUp.createdByMembershipId,
            followUpType: 'ADICIONAL',
            dueAt: nextActionAt,
            status: 'PENDIENTE',
          },
        });
      }
    }

    return updated;
  }

  async listFollowUpOverrides(
    tenantId: string,
    user: JwtPayload,
    empresaId?: string,
    membershipId?: string,
  ) {
    if (!user.membershipId) {
      throw new ForbiddenException('No se pudo resolver la membresía actual');
    }

    const targetMembershipId = this.isPrivilegedRole(user.role)
      ? membershipId
      : user.membershipId;

    return this.prisma.permiso.findMany({
      where: {
        tenantId,
        empresaId: empresaId || undefined,
        membershipId: targetMembershipId || undefined,
        tipo: TipoPermiso.DESBLOQUEO_ASIGNACION_SERVICIOS,
      },
      orderBy: { fechaSolicitud: 'desc' },
      take: 50,
    });
  }

  async createFollowUpOverride(
    tenantId: string,
    user: JwtPayload,
    empresaId: string | undefined,
    dto: CreateFollowUpOverrideDto,
  ) {
    if (!user.membershipId) {
      throw new ForbiddenException('No se pudo resolver la membresía actual');
    }

    if (!this.isPrivilegedRole(user.role)) {
      throw new ForbiddenException(
        'Solo ADMIN y SU_ADMIN pueden otorgar desbloqueos temporales',
      );
    }

    if (!empresaId) {
      throw new BadRequestException('empresaId es obligatorio');
    }

    const startsAt = parseFlexibleDateTimeToUtc(dto.startsAt);
    const endsAt = parseFlexibleDateTimeToUtc(dto.endsAt);
    if (!startsAt || !endsAt || endsAt <= startsAt) {
      throw new BadRequestException(
        'La ventana del desbloqueo temporal es inválida',
      );
    }

    return this.prisma.permiso.create({
      data: {
        tenantId,
        empresaId,
        membershipId: dto.membershipId,
        adminId: user.membershipId,
        tipo: TipoPermiso.DESBLOQUEO_ASIGNACION_SERVICIOS,
        motivo: dto.reason,
        estado: EstadoPermiso.APROBADO,
        fechaAprobacion: startsAt,
        fechaExpiracion: endsAt,
      },
    });
  }

  private async assertCanAssignServices(
    tenantId: string,
    user: JwtPayload | undefined,
    empresaId: string,
  ) {
    if (!user?.membershipId || this.isPrivilegedRole(user.role)) {
      return;
    }

    const now = new Date();
    const overdueThreshold = startOfBogotaDayUtc(now);
    const activeOverride = await this.getActiveFollowUpOverride(
      tenantId,
      user.membershipId,
      empresaId,
      now,
    );

    if (activeOverride) {
      return;
    }

    const overdueCount = await this.prisma.ordenServicioSeguimiento.count({
      where: {
        tenantId,
        empresaId,
        createdByMembershipId: user.membershipId,
        status: 'PENDIENTE',
        completedAt: null,
        dueAt: { lt: overdueThreshold },
      },
    });

    if (overdueCount > 0) {
      throw new ForbiddenException(
        'Tienes seguimientos vencidos pendientes. Completa las llamadas antes de asignar más servicios.',
      );
    }
  }

  private async createAutomaticFollowUps(
    tenantId: string,
    orden: {
      id: string;
      empresaId: string;
      clienteId: string;
      servicioId: string;
      creadoPorId: string | null;
      direccionId: string | null;
      direccionTexto: string;
      tipoFacturacion: TipoFacturacion | null;
      nivelInfestacion: NivelInfestacion | null;
      urgencia: UrgenciaOrden | null;
    },
    servicio: {
      empresaId: string;
      requiereSeguimiento: boolean;
      primerSeguimientoDias: number | null;
      requiereSeguimientoTresMeses: boolean;
    },
    fechaBase: Date | null,
  ) {
    if (!orden.creadoPorId || !servicio.requiereSeguimiento) {
      return;
    }

    const esContrato =
      !!orden.tipoFacturacion &&
      orden.tipoFacturacion !== TipoFacturacion.UNICO;

    if (esContrato) {
      return;
    }

    const baseDate = startOfBogotaDayUtc(fechaBase || new Date());
    const followUpBlueprints: Array<{
      followUpType: string;
      dueAt: Date;
      observacion: string;
    }> = [];

    if (servicio.primerSeguimientoDias) {
      followUpBlueprints.push({
        followUpType: 'INICIAL',
        dueAt: addBogotaDaysUtc(baseDate, servicio.primerSeguimientoDias),
        observacion: `Seguimiento automático inicial programado a ${servicio.primerSeguimientoDias} días.`,
      });
    }

    if (servicio.requiereSeguimientoTresMeses) {
      const threeMonthsLater = new Date(baseDate);
      threeMonthsLater.setUTCMonth(threeMonthsLater.getUTCMonth() + 3);

      followUpBlueprints.push({
        followUpType: 'TRES_MESES',
        dueAt: threeMonthsLater,
        observacion: 'Seguimiento automático programado a 3 meses.',
      });
    }

    for (const blueprint of followUpBlueprints) {
      const ordenSeguimiento = await this.prisma.ordenServicio.create({
        data: {
          tenantId,
          empresaId: orden.empresaId,
          clienteId: orden.clienteId,
          servicioId: orden.servicioId,
          creadoPorId: orden.creadoPorId,
          direccionId: orden.direccionId,
          direccionTexto: orden.direccionTexto,
          estadoServicio: EstadoOrden.NUEVO,
          observacion: blueprint.observacion,
          nivelInfestacion: orden.nivelInfestacion || undefined,
          urgencia: orden.urgencia || undefined,
          tipoVisita: 'SEGUIMIENTO',
          tipoFacturacion: TipoFacturacion.UNICO,
          fechaVisita: blueprint.dueAt,
          ordenPadreId: orden.id,
        },
      });

      await this.prisma.ordenServicioSeguimiento.create({
        data: {
          tenantId,
          empresaId: servicio.empresaId,
          ordenServicioId: ordenSeguimiento.id,
          createdByMembershipId: orden.creadoPorId,
          followUpType: blueprint.followUpType,
          dueAt: blueprint.dueAt,
          status: 'PENDIENTE',
        },
      });
    }
  }

  private async getActiveFollowUpOverride(
    tenantId: string,
    membershipId: string,
    empresaId: string | undefined,
    now: Date,
  ) {
    return this.prisma.permiso.findFirst({
      where: {
        tenantId,
        empresaId: empresaId || undefined,
        membershipId,
        tipo: TipoPermiso.DESBLOQUEO_ASIGNACION_SERVICIOS,
        estado: EstadoPermiso.APROBADO,
        fechaAprobacion: { lte: now },
        OR: [{ fechaExpiracion: null }, { fechaExpiracion: { gte: now } }],
      },
      orderBy: { fechaExpiracion: 'desc' },
    });
  }

  private isPrivilegedRole(role?: Role) {
    return role === Role.ADMIN || role === Role.SU_ADMIN;
  }

  async remove(tenantId: string, id: string) {
    const orden = await this.prisma.ordenServicio.findFirst({
      where: { id, tenantId },
    });

    if (!orden) {
      throw new BadRequestException('La orden especificada no existe');
    }

    return this.prisma.ordenServicio.delete({
      where: { id },
    });
  }
}
