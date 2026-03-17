import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ContratosClienteService } from '../contratos-cliente/contratos-cliente.service';
import { CreateOrdenServicioDto } from './dto/create-orden-servicio.dto';
import { CompleteFollowUpDto } from './dto/complete-follow-up.dto';
import { CreateFollowUpOverrideDto } from './dto/create-follow-up-override.dto';
import { JwtPayload } from '../auth/jwt-payload.interface';
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
import { getPrismaAccessFilter } from '../common/utils/access-control.util';
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
  TipoVisita,
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
    private contratosClienteService: ContratosClienteService,
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

    this.assertCanAssignServices();

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

    // 3.5 Obtener o crear el(los) servicio(s) específico(s)
    const nombresServicios =
      createDto.serviciosSeleccionados &&
      createDto.serviciosSeleccionados.length > 0
        ? createDto.serviciosSeleccionados
        : createDto.servicioEspecifico
          ? [createDto.servicioEspecifico]
          : [];

    if (nombresServicios.length === 0 && !createDto.servicioId) {
      throw new BadRequestException('Debe especificar al menos un servicio');
    }

    let servicioPrincipal: {
      id: string;
      empresaId: string;
      requiereSeguimiento: boolean;
      primerSeguimientoDias: number | null;
      requiereSeguimientoTresMeses: boolean;
    } | null = null;

    if (createDto.servicioId) {
      servicioPrincipal = await this.prisma.servicio.findFirst({
        where: {
          id: createDto.servicioId,
          tenantId,
          empresaId: createDto.empresaId,
        },
      });
    }

    const serviciosProcesados: string[] = [];
    for (const nombreServicio of nombresServicios) {
      let svc = await this.prisma.servicio.findFirst({
        where: {
          tenantId,
          empresaId: createDto.empresaId,
          nombre: nombreServicio,
        },
      });

      if (!svc) {
        svc = await this.prisma.servicio.create({
          data: {
            tenantId,
            empresaId: createDto.empresaId,
            nombre: nombreServicio,
            activo: true,
          },
        });
      }
      serviciosProcesados.push(svc.nombre); // Guardar los nombres para el JSONB

      if (!servicioPrincipal) {
        servicioPrincipal = svc;
      }
    }

    if (!servicioPrincipal) {
      throw new BadRequestException(
        'No se pudo determinar un servicio principal',
      );
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

    const contratoActivo =
      await this.contratosClienteService.getActiveByCliente(
        tenantId,
        createDto.clienteId,
        createDto.empresaId,
      );
    const tipoVisitaResuelta = createDto.tipoVisita;
    const esGarantia = this.isGarantiaVisitType(tipoVisitaResuelta);

    if (esGarantia) {
      await this.assertGuaranteeEligibility(tenantId, createDto.clienteId);
    }

    const tipoFacturacionResuelta = esGarantia
      ? TipoFacturacion.UNICO
      : contratoActivo?.tipoFacturacion ||
        createDto.tipoFacturacion ||
        TipoFacturacion.UNICO;
    const valorCotizadoResuelto = esGarantia ? 0 : createDto.valorCotizado;
    const desglosePagoResuelto = esGarantia ? [] : createDto.desglosePago;

    let estadoPago =
      (createDto.estadoPago as EstadoPagoOrden) || EstadoPagoOrden.PENDIENTE;
    let valorPagado = esGarantia ? 0 : createDto.valorPagado || 0;

    // Calcular estado y valor si hay desglose
    if (desglosePagoResuelto && Array.isArray(desglosePagoResuelto)) {
      const totals = this.calculateBreakdownTotals(
        desglosePagoResuelto as unknown as DesglosePagoItem[],
        Number(valorCotizadoResuelto || 0),
      );
      estadoPago = totals.estadoPago;
      valorPagado = totals.valorPagado;
    }

    const nuevaOrden = await this.prisma.ordenServicio.create({
      data: {
        tenantId,
        empresaId: createDto.empresaId,
        clienteId: createDto.clienteId,
        servicioId: servicioPrincipal.id,
        serviciosSeleccionados:
          serviciosProcesados as unknown as Prisma.InputJsonValue,
        creadoPorId: createDto.creadoPorId,
        tecnicoId,
        direccionId,
        direccionTexto,
        estadoServicio: createDto.estadoServicio ?? 'NUEVO',
        observacion: createDto.observacion,
        nivelInfestacion: createDto.nivelInfestacion,
        urgencia: createDto.urgencia,
        tipoVisita: tipoVisitaResuelta,
        frecuenciaSugerida: createDto.frecuenciaSugerida,
        tipoFacturacion: tipoFacturacionResuelta,
        contratoClienteId: contratoActivo?.id,
        valorCotizado: valorCotizadoResuelto,
        valorPagado,
        metodoPagoId: createDto.metodoPagoId,
        desglosePago: desglosePagoResuelto
          ? (desglosePagoResuelto as unknown as Prisma.InputJsonValue)
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
      servicioPrincipal,
      fechaVisitaDate,
      contratoActivo,
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
    user: JwtPayload,
    reqEmpresaId: string | undefined,
    filters?: QueryOrdenesServicioDto,
  ): Prisma.OrdenServicioWhereInput {
    const accessFilter = getPrismaAccessFilter(user, reqEmpresaId);

    const whereClause: Prisma.OrdenServicioWhereInput = {
      ...accessFilter,
      ordenPadreId: null,
    };

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
    user: JwtPayload,
    empresaId?: string,
    filters?: QueryOrdenesServicioDto,
  ) {
    const whereClause = this.buildWhereClause(user, empresaId, filters);

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
        seguimientos: {
          orderBy: { createdAt: 'desc' },
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
            seguimientos: {
              orderBy: { createdAt: 'desc' },
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
    user: JwtPayload,
    empresaId?: string,
    filters?: QueryOrdenesServicioDto,
  ): Promise<ServiciosKpiPayload> {
    const whereClause = this.buildWhereClause(user, empresaId, filters);

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

  async findOne(user: JwtPayload, id: string) {
    const accessFilter = getPrismaAccessFilter(user);

    const orden = await this.prisma.ordenServicio.findFirst({
      where: { id, ...accessFilter },
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
      throw new BadRequestException(
        'La orden especificada no existe o no tienes acceso',
      );
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

  async notifyLiquidationWebhook(tenantId: string, dto: NotifyLiquidationDto) {
    // Validate that the order exists and belongs to the tenant
    const orden = await this.prisma.ordenServicio.findUnique({
      where: { id: dto.idServicio, tenantId },
      include: { cliente: true },
    });

    if (!orden) {
      throw new ForbiddenException(
        'Servicio no encontrado o no pertenece al tenant',
      );
    }

    // Validate that the phone number matches the stored client data
    if (orden.cliente.telefono !== dto.telefono) {
      this.logger.warn(
        `Security alert: Phone number mismatch in liquidation notification for service ${dto.idServicio}. Expected ${orden.cliente.telefono}, got ${dto.telefono}`,
      );
      throw new ForbiddenException(
        'El teléfono no coincide con el cliente del servicio',
      );
    }

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

  async notifyOperatorWebhook(tenantId: string, dto: NotifyOperatorDto) {
    // Validate that the order exists and belongs to the tenant
    const orden = await this.prisma.ordenServicio.findUnique({
      where: { id: dto.idServicio, tenantId },
      include: { tecnico: { include: { user: true } } },
    });

    if (!orden) {
      throw new ForbiddenException(
        'Servicio no encontrado o no pertenece al tenant',
      );
    }

    // Validate that the phone number matches the stored technical data (if assigned)
    if (
      orden.tecnico?.user?.telefono &&
      orden.tecnico.user.telefono !== dto.telefonoOperador
    ) {
      this.logger.warn(
        `Security alert: Phone number mismatch in operator notification for service ${dto.idServicio}. Expected ${orden.tecnico.user.telefono}, got ${dto.telefonoOperador}`,
      );
      throw new ForbiddenException(
        'El teléfono no coincide con el técnico asignado al servicio',
      );
    }

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

    const pathsToSign: string[] = [];

    for (const field of fieldsToSign) {
      const value = orden[field];
      if (value && typeof value === 'string' && !value.startsWith('http')) {
        pathsToSign.push(value);
      }
    }

    if (orden.evidencias) {
      for (const evidence of orden.evidencias) {
        if (evidence.path && !evidence.path.startsWith('http')) {
          pathsToSign.push(evidence.path);
        }
      }
    }

    if (orden.geolocalizaciones) {
      for (const geo of orden.geolocalizaciones) {
        if (geo.fotoLlegada && !geo.fotoLlegada.startsWith('http')) {
          pathsToSign.push(geo.fotoLlegada);
        }
        if (geo.fotoSalida && !geo.fotoSalida.startsWith('http')) {
          pathsToSign.push(geo.fotoSalida);
        }
      }
    }

    if (pathsToSign.length === 0) return orden;

    const uniquePaths = [...new Set(pathsToSign)];
    const signedUrls = await this.supabase.getSignedUrls(uniquePaths);

    const urlMap = new Map<string, string>();
    uniquePaths.forEach((path, idx) => {
      if (signedUrls[idx]) {
        urlMap.set(path, signedUrls[idx]);
      }
    });

    // Map main fields
    for (const field of fieldsToSign) {
      const value = orden[field];
      if (value && typeof value === 'string' && urlMap.has(value)) {
        orden[field] = urlMap.get(value)!;
      }
    }

    // Map evidences
    if (orden.evidencias) {
      for (const evidence of orden.evidencias) {
        if (evidence.path && urlMap.has(evidence.path)) {
          evidence.path = urlMap.get(evidence.path)!;
        }
      }
    }

    // Map geolocalizaciones
    if (orden.geolocalizaciones) {
      for (const geo of orden.geolocalizaciones) {
        if (geo.fotoLlegada && urlMap.has(geo.fotoLlegada)) {
          geo.fotoLlegada = urlMap.get(geo.fotoLlegada)!;
        }
        if (geo.fotoSalida && urlMap.has(geo.fotoSalida)) {
          geo.fotoSalida = urlMap.get(geo.fotoSalida)!;
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

    const contratoActivo =
      await this.contratosClienteService.getActiveByCliente(
        tenantId,
        orden.clienteId,
        orden.empresaId,
      );
    const tipoVisitaResuelta =
      updateDto.tipoVisita ?? orden.tipoVisita ?? undefined;
    const esGarantia = this.isGarantiaVisitType(tipoVisitaResuelta);

    if (esGarantia) {
      await this.assertGuaranteeEligibility(
        tenantId,
        orden.clienteId,
        orden.id,
      );
    }

    const tipoFacturacionResuelta = esGarantia
      ? TipoFacturacion.UNICO
      : contratoActivo?.tipoFacturacion ||
        updateDto.tipoFacturacion ||
        orden.tipoFacturacion ||
        TipoFacturacion.UNICO;

    const data: Prisma.OrdenServicioUpdateInput = {
      tecnico: updateDto.tecnicoId
        ? { connect: { id: updateDto.tecnicoId } }
        : undefined,
      observacion: updateDto.observacion ?? undefined,
      nivelInfestacion: updateDto.nivelInfestacion ?? undefined,
      urgencia: updateDto.urgencia ?? undefined,
      tipoVisita: tipoVisitaResuelta ?? undefined,
      frecuenciaSugerida: updateDto.frecuenciaSugerida ?? undefined,
      tipoFacturacion: tipoFacturacionResuelta,
      contratoCliente: contratoActivo
        ? { connect: { id: contratoActivo.id } }
        : { disconnect: true },
      valorCotizado: esGarantia ? 0 : (updateDto.valorCotizado ?? undefined),
      metodoPago: updateDto.metodoPagoId
        ? { connect: { id: updateDto.metodoPagoId } }
        : undefined,
      estadoPago: updateDto.estadoPago ?? undefined,
      estadoServicio: updateDto.estadoServicio ?? undefined,
      facturaPath: updateDto.facturaPath ?? undefined,
      facturaElectronica: updateDto.facturaElectronica ?? undefined,
      comprobantePago: updateDto.comprobantePago ?? undefined,
      evidenciaPath: updateDto.evidenciaPath ?? undefined,
      valorPagado: esGarantia ? 0 : (updateDto.valorPagado ?? undefined),
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
      desglosePago: esGarantia
        ? ([] as unknown as Prisma.InputJsonValue)
        : updateDto.desglosePago
          ? (updateDto.desglosePago as unknown as Prisma.InputJsonValue)
          : undefined,
    };

    // Lógica automática basada en el desglose de pago
    if (esGarantia && updateDto.estadoServicio === EstadoOrden.LIQUIDADO) {
      data.estadoPago = EstadoPagoOrden.PAGADO;
      data.valorPagado = 0;
    } else if (
      updateDto.desglosePago &&
      Array.isArray(updateDto.desglosePago)
    ) {
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

    const resolvedFollowUp =
      followUp ||
      (await this.prisma.ordenServicioSeguimiento.findFirst({
        where: {
          tenantId,
          ordenServicioId: followUpId,
          status: 'PENDIENTE',
        },
        orderBy: { dueAt: 'asc' },
      }));

    if (!resolvedFollowUp) {
      throw new BadRequestException('Seguimiento no encontrado');
    }

    const canManage =
      resolvedFollowUp.createdByMembershipId === user.membershipId ||
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
      where: { id: resolvedFollowUp.id },
      data: {
        status: dto.resolution,
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
            empresaId: resolvedFollowUp.empresaId,
            ordenServicioId: resolvedFollowUp.ordenServicioId,
            createdByMembershipId: resolvedFollowUp.createdByMembershipId,
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

  private assertCanAssignServices() {
    // Se ha removido el bloqueo por seguimientos pendientes por solicitud
    return;
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
    contratoActivo: {
      id: string;
      tipoFacturacion: TipoFacturacion;
      frecuenciaServicio: number | null;
      serviciosComprometidos: number | null;
    } | null,
  ) {
    if (!orden.creadoPorId) {
      return;
    }

    const baseDate = startOfBogotaDayUtc(fechaBase || new Date());

    if (contratoActivo) {
      const frecuenciaContrato = contratoActivo.frecuenciaServicio;
      const totalServicios = Math.max(
        contratoActivo.serviciosComprometidos || 1,
        1,
      );

      if (!frecuenciaContrato || totalServicios <= 1) {
        return;
      }

      for (let index = 1; index < totalServicios; index += 1) {
        const dueAt = addBogotaDaysUtc(baseDate, frecuenciaContrato * index);

        await this.prisma.ordenServicio.create({
          data: {
            tenantId,
            empresaId: orden.empresaId,
            clienteId: orden.clienteId,
            servicioId: orden.servicioId,
            creadoPorId: orden.creadoPorId,
            direccionId: orden.direccionId,
            direccionTexto: orden.direccionTexto,
            estadoServicio: EstadoOrden.NUEVO,
            observacion: `Servicio programado automáticamente según contrato activo. Visita ${index + 1} de ${totalServicios}.`,
            nivelInfestacion: orden.nivelInfestacion || undefined,
            urgencia: orden.urgencia || undefined,
            tipoVisita: 'CITA_VERIFICACION' as TipoVisita,
            tipoFacturacion: contratoActivo.tipoFacturacion,
            contratoClienteId: contratoActivo.id,
            fechaVisita: dueAt,
            ordenPadreId: orden.id,
          },
        });
      }
      return;
    }

    if (!servicio.requiereSeguimiento) {
      return;
    }

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
          tipoVisita: 'CITA_VERIFICACION' as TipoVisita,
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

  private isGarantiaVisitType(tipoVisita?: TipoVisita | null) {
    return tipoVisita === ('GARANTIA' as TipoVisita);
  }

  private async assertGuaranteeEligibility(
    tenantId: string,
    clienteId: string,
    excludeOrderId?: string,
  ) {
    const whereBase = {
      tenantId,
      clienteId,
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
    };

    const [hasBaseService, hasChildService] = await Promise.all([
      this.prisma.ordenServicio.count({
        where: {
          ...whereBase,
          ordenPadreId: null,
        },
      }),
      this.prisma.ordenServicio.count({
        where: {
          ...whereBase,
          ordenPadreId: { not: null },
        },
      }),
    ]);

    if (!hasBaseService || !hasChildService) {
      throw new BadRequestException(
        'La garantía solo aplica para clientes con al menos un servicio previo y un refuerzo realizado.',
      );
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
