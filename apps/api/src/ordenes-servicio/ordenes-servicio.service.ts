import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrdenServicioDto } from './dto/create-orden-servicio.dto';

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

  constructor(private prisma: PrismaService) {}

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

    // 3. Obtener el estado default o crear uno si no existe
    let estadoDefault = await this.prisma.estadoServicio.findFirst({
      where: { tenantId, empresaId: createDto.empresaId, activo: true },
    });

    if (!estadoDefault) {
      // Crear un estado inicial por defecto si la empresa no tiene ninguno
      estadoDefault = await this.prisma.estadoServicio.create({
        data: {
          tenantId,
          empresaId: createDto.empresaId,
          nombre: 'PROGRAMADO',
          activo: true,
        },
      });
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

    return this.prisma.ordenServicio.create({
      data: {
        tenantId,
        empresaId: createDto.empresaId,
        clienteId: createDto.clienteId,
        servicioId: servicio.id,
        tecnicoId,
        direccionId,
        direccionTexto,
        estadoServicioId: estadoDefault.id,
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
        estadoServicio: true,
        servicio: true,
        tecnico: {
          include: { user: true },
        },
      },
    });
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

    const queryResult = (await this.prisma.picoPlaca.findFirst({
      where: {
        empresaId: dto.empresaId,
        dia: diaSemana as unknown as any,
        activo: true,
      },
    })) as unknown;

    const reglasPicoPlaca = queryResult as LocalPicoPlaca | null;

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

  async findAll(tenantId: string, empresaId?: string) {
    return this.prisma.ordenServicio.findMany({
      where: {
        tenantId,
        ...(empresaId ? { empresaId } : {}),
      },
      include: {
        cliente: true,
        estadoServicio: true,
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
      },
      orderBy: { createdAt: 'desc' },
    });
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
        estadoServicio: true,
        tecnico: {
          include: { user: true },
        },
        servicio: true,
      },
    });

    if (!orden) {
      throw new BadRequestException('La orden especificada no existe');
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

    const data: any = {
      tecnicoId: updateDto.tecnicoId,
      estadoServicioId: updateDto.estadoServicioId,
      observacion: updateDto.observacion,
      nivelInfestacion: updateDto.nivelInfestacion,
      urgencia: updateDto.urgencia,
      tipoVisita: updateDto.tipoVisita,
      frecuenciaSugerida: updateDto.frecuenciaSugerida,
      tipoFacturacion: updateDto.tipoFacturacion,
      valorCotizado: updateDto.valorCotizado,
      metodoPagoId: updateDto.metodoPagoId,
      estadoPago: updateDto.estadoPago,
    };

    if (updateDto.fechaVisita) {
      data.fechaVisita = new Date(updateDto.fechaVisita);
    }

    if (updateDto.horaInicio) {
      data.horaInicio = new Date(updateDto.horaInicio);
      if (updateDto.duracionMinutos) {
        data.horaFin = new Date(
          data.horaInicio.getTime() + updateDto.duracionMinutos * 60000,
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
      data.servicioId = servicio.id;
    }

    return this.prisma.ordenServicio.update({
      where: { id },
      data,
      include: {
        cliente: true,
        estadoServicio: true,
        servicio: true,
        tecnico: {
          include: { user: true },
        },
      },
    });
  }
}
