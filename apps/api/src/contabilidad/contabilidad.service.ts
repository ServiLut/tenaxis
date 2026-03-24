import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  EstadoConsignacion, 
  EstadoOrden, 
  EstadoPagoOrden,
  MetodoPagoBase
} from '../generated/client/client';
import { GenerateMonitoringPayrollDto } from './generate-monitoring-payroll.dto';
import {
  addBogotaDaysUtc,
  parseBogotaDateToUtcEnd,
  parseBogotaDateToUtcStart,
  startOfBogotaMonthUtc,
  endOfBogotaMonthUtc,
  startOfPreviousBogotaMonthUtc,
  endOfPreviousBogotaMonthUtc,
} from '../common/utils/timezone.util';

interface DesglosePagoItem {
  metodo: MetodoPagoBase;
  monto: number;
}

@Injectable()
export class ContabilidadService {
  constructor(private prisma: PrismaService) {}

  private normalizeDateRange(fechaInicio: string, fechaFin: string) {
    const start =
      parseBogotaDateToUtcStart(fechaInicio.slice(0, 10)) ||
      new Date(fechaInicio);
    const endInclusive =
      parseBogotaDateToUtcEnd(fechaFin.slice(0, 10)) || new Date(fechaFin);
    const parsedEndStart =
      parseBogotaDateToUtcStart(fechaFin.slice(0, 10)) || new Date(fechaFin);
    const endExclusive =
      fechaFin.length <= 10
        ? addBogotaDaysUtc(parsedEndStart, 1)
        : new Date(endInclusive.getTime() + 1);

    return { start, endInclusive, endExclusive };
  }

  private getSessionDurationMinutes(session: {
    fechaInicio: Date;
    fechaFin: Date | null;
    duracionMin: number | null;
    updatedAt?: Date;
  }) {
    if (
      session.fechaFin &&
      typeof session.duracionMin === 'number' &&
      session.duracionMin >= 0
    ) {
      return session.duracionMin;
    }

    const endReference = session.fechaFin || session.updatedAt || new Date();

    return Math.max(
      0,
      Math.round(
        (endReference.getTime() - session.fechaInicio.getTime()) / 60000,
      ),
    );
  }

  private mapNominaDecimalFields<
    T extends {
      totalValorPagado: unknown;
      totalRepuestos: unknown;
      totalIva: unknown;
      baseComisionable: unknown;
      porcentajeAplicado: unknown;
      salarioFijo: unknown;
      totalComisiones: unknown;
      totalPagar: unknown;
    },
  >(nomina: T) {
    return {
      ...nomina,
      totalValorPagado: Number(nomina.totalValorPagado || 0),
      totalRepuestos: Number(nomina.totalRepuestos || 0),
      totalIva: Number(nomina.totalIva || 0),
      baseComisionable: Number(nomina.baseComisionable || 0),
      porcentajeAplicado:
        nomina.porcentajeAplicado === null ||
        nomina.porcentajeAplicado === undefined
          ? null
          : Number(nomina.porcentajeAplicado),
      salarioFijo:
        nomina.salarioFijo === null || nomina.salarioFijo === undefined
          ? null
          : Number(nomina.salarioFijo),
      totalComisiones: Number(nomina.totalComisiones || 0),
      totalPagar: Number(nomina.totalPagar || 0),
    };
  }

  private async buildMonitoringPayrollItems(
    tenantId: string,
    empresaId: string,
    start: Date,
    endExclusive: Date,
    membershipIds?: string[],
  ) {
    const sessions = await this.prisma.sesionActividad.findMany({
      where: {
        tenantId,
        empresaId,
        fechaInicio: { gte: start, lt: endExclusive },
        ...(membershipIds?.length
          ? { membershipId: { in: membershipIds } }
          : {}),
      },
      include: {
        membership: {
          include: {
            user: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
            cuentasPago: {
              where: {
                tenantId,
                empresaId,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
      orderBy: [{ membershipId: 'asc' }, { fechaInicio: 'asc' }],
    });

    const groups = new Map<
      string,
      {
        membershipId: string;
        empresaId: string;
        role: string;
        nombre: string;
        apellido: string;
        valorHora: number | null;
        sesionesCerradas: number;
        sesionesAbiertas: number;
        minutosBrutos: number;
        minutosInactivos: number;
        minutosPagables: number;
      }
    >();

    sessions.forEach((session) => {
      const current = groups.get(session.membershipId) || {
        membershipId: session.membershipId,
        empresaId: session.empresaId,
        role: session.membership.role,
        nombre: session.membership.user.nombre,
        apellido: session.membership.user.apellido,
        valorHora:
          session.membership.cuentasPago[0]?.valorHora !== null &&
          session.membership.cuentasPago[0]?.valorHora !== undefined
            ? Number(session.membership.cuentasPago[0].valorHora)
            : null,
        sesionesCerradas: 0,
        sesionesAbiertas: 0,
        minutosBrutos: 0,
        minutosInactivos: 0,
        minutosPagables: 0,
      };

      const duracionMin = this.getSessionDurationMinutes(session);
      const minutosPagables = Math.max(0, duracionMin - session.tiempoInactivo);

      if (session.fechaFin) {
        current.sesionesCerradas += 1;
      } else {
        current.sesionesAbiertas += 1;
      }

      current.minutosBrutos += duracionMin;
      current.minutosInactivos += session.tiempoInactivo;
      current.minutosPagables += minutosPagables;

      groups.set(session.membershipId, current);
    });

    return Array.from(groups.values()).map((item) => {
      const horasPagables = Number((item.minutosPagables / 60).toFixed(2));
      const pagoEstimado =
        item.valorHora !== null
          ? Number((horasPagables * item.valorHora).toFixed(2))
          : 0;
      const estado =
        item.sesionesCerradas === 0
          ? 'SIN_SESIONES_CERRADAS'
          : item.valorHora === null
            ? 'SIN_VALOR_HORA'
            : 'OK';

      return {
        ...item,
        horasPagables,
        pagoEstimado,
        estado,
      };
    });
  }

  async getRecaudoTecnicos(tenantId: string, empresaId?: string) {
    // 1. Buscar órdenes en efectivo que ya pasaron su fecha y NO han sido declaradas (deuda implícita)
    // Esto asegura que si un técnico no cierra la orden, administración igual vea la deuda.
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Hasta el final de hoy

    const ordenesNoDeclaradas = await this.prisma.ordenServicio.findMany({
      where: {
        tenantId,
        empresaId: empresaId || undefined,
        tecnicoId: { not: null },
        fechaVisita: { lte: today },
        estadoPago: { in: ['PENDIENTE', 'PARCIAL'] },
        // No deben tener declaración asociada todavía
        declaracionEfectivo: null,
      },
      select: {
        id: true,
        tecnicoId: true,
        fechaVisita: true,
        desglosePago: true,
      },
    });

    // Procesar montos de órdenes no declaradas
    const deudasImplicitasPorTecnico = new Map<
      string,
      Array<{ ordenId: string; valor: number; fecha: Date | null }>
    >();

    ordenesNoDeclaradas.forEach((orden) => {
      if (!orden.desglosePago || !Array.isArray(orden.desglosePago)) return;

      const breakdown = orden.desglosePago as any[];
      const cashAmount = breakdown
        .filter(
          (l) => l.metodo === 'EFECTIVO' || l.metodo === 'EFECTIVO_AVANCE',
        )
        .reduce((sum, l) => sum + Number(l.monto || 0), 0);

      if (cashAmount > 0 && orden.tecnicoId) {
        const current = deudasImplicitasPorTecnico.get(orden.tecnicoId) || [];
        current.push({
          ordenId: orden.id,
          valor: cashAmount,
          fecha: orden.fechaVisita,
        });
        deudasImplicitasPorTecnico.set(orden.tecnicoId, current);
      }
    });

    // 2. Buscar todos los técnicos (TenantMembership con rol OPERADOR)
    const tecnicos = await this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        role: 'OPERADOR',
        activo: true,
        // Si hay empresaId, filtrar por los que pertenecen a esa empresa
        empresaMemberships: empresaId
          ? { some: { empresaId, activo: true } }
          : undefined,
      },
      include: {
        user: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
        // Obtener declaraciones de efectivo pendientes (no conciliadas aún)
        declaracionesEfectivo: {
          where: {
            consignado: false,
            empresaId: empresaId || undefined,
          },
          select: {
            valorDeclarado: true,
            fechaDeclaracion: true,
            ordenId: true,
          },
        },
        // Obtener la última consignación realizada para saber la fecha
        consignacionesTecnico: {
          where: {
            empresaId: empresaId || undefined,
          },
          orderBy: {
            fechaConsignacion: 'desc',
          },
          take: 1,
          select: {
            fechaConsignacion: true,
          },
        },
      },
    });

    return tecnicos.map((t) => {
      // Unificar declaraciones explícitas con deudas implícitas
      const implicitas = deudasImplicitasPorTecnico.get(t.id) || [];

      const todasLasDeclaraciones = [
        ...t.declaracionesEfectivo.map((d) => ({
          ordenId: d.ordenId,
          valorDeclarado: Number(d.valorDeclarado),
          fechaDeclaracion: d.fechaDeclaracion,
          tipo: 'DECLARADO',
        })),
        ...implicitas.map((i) => ({
          ordenId: i.ordenId,
          valorDeclarado: i.valor,
          fechaDeclaracion: i.fecha,
          tipo: 'IMPLICITO', // Indica que es un recaudo detectado por fecha, no por declaración
        })),
      ];

      const saldoPendiente = todasLasDeclaraciones.reduce(
        (sum, d) => sum + d.valorDeclarado,
        0,
      );

      // Calcular días de atraso basados en la declaración más vieja pendiente
      let diasSinTransferir = 0;
      const declaracionesConFecha = todasLasDeclaraciones.filter(
        (d) => d.fechaDeclaracion,
      );

      if (declaracionesConFecha.length > 0) {
        const fechas = declaracionesConFecha.map((d) =>
          new Date(d.fechaDeclaracion!).getTime(),
        );
        const fechaMasVieja = Math.min(...fechas);
        diasSinTransferir = Math.floor(
          (new Date().getTime() - fechaMasVieja) / (1000 * 3600 * 24),
        );
      }

      return {
        id: t.id,
        nombre: t.user.nombre,
        apellido: t.user.apellido,
        saldoPendiente,
        ordenesPendientesCount: todasLasDeclaraciones.length,
        ordenesIds: todasLasDeclaraciones.map((d) => d.ordenId),
        declaraciones: todasLasDeclaraciones,
        ultimaTransferencia:
          t.consignacionesTecnico[0]?.fechaConsignacion || null,
        diasSinTransferir,
      };
    });
  }

  async registrarConsignacion(
    tenantId: string,
    creadoPorId: string,
    data: {
      tecnicoId: string;
      empresaId: string;
      valorConsignado: number;
      referenciaBanco: string;
      comprobantePath: string;
      ordenIds: string[];
      fechaConsignacion: string;
      observacion?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear la consignación global
      const consignacion = await tx.consignacionEfectivo.create({
        data: {
          tenantId,
          empresaId: data.empresaId,
          tecnicoId: data.tecnicoId,
          creadoPorId: creadoPorId,
          valorConsignado: data.valorConsignado,
          referenciaBanco: data.referenciaBanco,
          comprobantePath: data.comprobantePath,
          fechaConsignacion: new Date(data.fechaConsignacion),
          estado: EstadoConsignacion.PENDIENTE,
          observacion: data.observacion,
        },
      });

      // 2. Vincular con cada orden y actualizar declaración
      for (const ordenId of data.ordenIds) {
        await tx.consignacionOrden.create({
          data: {
            tenantId,
            empresaId: data.empresaId,
            consignacionId: consignacion.id,
            ordenId: ordenId,
          },
        });

        // Marcar declaración como consignada (o crearla si no existía por ser deuda implícita)
        const existingDecl = await tx.declaracionEfectivo.findUnique({
          where: { ordenId: ordenId },
        });

        if (existingDecl) {
          await tx.declaracionEfectivo.update({
            where: { ordenId: ordenId },
            data: { consignado: true },
          });
        } else {
          // Obtener la orden para sacar el monto correcto si es implícita
          const orden = await tx.ordenServicio.findUnique({
            where: { id: ordenId },
            select: {
              tenantId: true,
              empresaId: true,
              tecnicoId: true,
              desglosePago: true,
            },
          });

          if (orden && orden.tecnicoId) {
            const breakdown = (orden.desglosePago || []) as any[];
            const cashAmount = breakdown
              .filter(
                (l) =>
                  l.metodo === 'EFECTIVO' || l.metodo === 'EFECTIVO_AVANCE',
              )
              .reduce((sum, l) => sum + Number(l.monto || 0), 0);

            await tx.declaracionEfectivo.create({
              data: {
                tenantId: orden.tenantId,
                empresaId: orden.empresaId,
                ordenId: ordenId,
                tecnicoId: orden.tecnicoId,
                valorDeclarado: cashAmount,
                evidenciaPath: 'CONCILIADO_SIN_DECLARACION_PREVIA',
                observacion: `Conciliación directa desde administración (no declarada por técnico)`,
                consignado: true,
              },
            });
          }
        }

        // --- GESTIÓN DE COMPROBANTES JSON ---
        const ordenData = await tx.ordenServicio.findUnique({
          where: { id: ordenId },
          select: { comprobantePago: true },
        });

        let soportes: any[] = [];
        if (ordenData?.comprobantePago) {
          if (Array.isArray(ordenData.comprobantePago)) {
            soportes = ordenData.comprobantePago as any[];
          } else if (typeof ordenData.comprobantePago === 'string') {
            // Migración al vuelo de string a array
            soportes = [
              {
                tipo: 'TRANSFERENCIA_CLIENTE_LEGACY',
                path: ordenData.comprobantePago,
                fecha: new Date(),
              },
            ];
          }
        }

        // Agregar el nuevo comprobante de consignación técnica
        if (data.comprobantePath) {
          soportes.push({
            tipo: 'CONSIGNACION_TECNICO',
            path: data.comprobantePath,
            fecha: new Date(),
            referencia: data.referenciaBanco,
          });
        }

        // Actualizar estado de la orden a CONCILIADO y LIQUIDADO (Cierre total financiero y operativo)
        await tx.ordenServicio.update({
          where: { id: ordenId },
          data: {
            estadoPago: EstadoPagoOrden.CONCILIADO,
            estadoServicio: EstadoOrden.LIQUIDADO,
            liquidadoAt: new Date(),
            liquidadoPorId: creadoPorId,
            comprobantePago: soportes, // Guardamos el array actualizado
          },
        });
      }

      return consignacion;
    });
  }

  async getAccountingBalance(tenantId: string, empresaId?: string) {
    const now = new Date();

    const startOfMonth = startOfBogotaMonthUtc(now);
    const endOfMonth = endOfBogotaMonthUtc(now);

    const startOfPrevMonth = startOfPreviousBogotaMonthUtc(now);
    const endOfPrevMonth = endOfPreviousBogotaMonthUtc(now);

    const commonWhere = {
      tenantId,
      ...(empresaId && { empresaId }),
    };

    const [
      ingresosActual,
      ingresosPrev,
      egresosActual,
      egresosPrev,
      egresosPorCategoria,
      totalNominas,
    ] = await Promise.all([
      // 1. Ingresos Mes Actual (Matched with DashboardService)
      this.prisma.ordenServicio.aggregate({
        where: {
          ...commonWhere,
          estadoServicio: 'LIQUIDADO',
          fechaVisita: { gte: startOfMonth, lte: endOfMonth },
          OR: [
            { estadoPago: { in: ['PAGADO', 'CONCILIADO'] } },
            { valorPagado: { gt: 0 } },
          ],
        },
        _sum: { valorPagado: true },
      }),
      // 2. Ingresos Mes Anterior (Matched with DashboardService)
      this.prisma.ordenServicio.aggregate({
        where: {
          ...commonWhere,
          estadoServicio: 'LIQUIDADO',
          fechaVisita: { gte: startOfPrevMonth, lte: endOfPrevMonth },
          OR: [
            { estadoPago: { in: ['PAGADO', 'CONCILIADO'] } },
            { valorPagado: { gt: 0 } },
          ],
        },
        _sum: { valorPagado: true },
      }),
      this.prisma.egresos.aggregate({
        where: {
          ...commonWhere,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { monto: true },
      }),
      this.prisma.egresos.aggregate({
        where: {
          ...commonWhere,
          createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        },
        _sum: { monto: true },
      }),
      this.prisma.egresos.groupBy({
        by: ['categoria'],
        where: {
          ...commonWhere,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { monto: true },
      }),
      this.prisma.nomina.aggregate({
        where: {
          ...commonWhere,
          fechaGeneracion: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { totalPagar: true },
      }),
    ]);

    const totalIngresos = Number(ingresosActual._sum.valorPagado || 0);
    const totalIngresosPrev = Number(ingresosPrev._sum.valorPagado || 0);
    const totalEgresosEfectivos = Number(egresosActual._sum.monto || 0);
    const totalNominasMonto = Number(totalNominas._sum.totalPagar || 0);

    const totalEgresos = totalEgresosEfectivos + totalNominasMonto;
    const totalEgresosPrev = Number(egresosPrev._sum.monto || 0); // Note: Simple comparison for now

    const ingresosChange =
      totalIngresosPrev > 0
        ? ((totalIngresos - totalIngresosPrev) / totalIngresosPrev) * 100
        : 0;

    const egresosChange =
      totalEgresosPrev > 0
        ? ((totalEgresos - totalEgresosPrev) / totalEgresosPrev) * 100
        : 0;

    // Build category breakdown
    const categories: { label: string; value: number; color: string }[] = [];

    if (totalNominasMonto > 0) {
      categories.push({
        label: 'Nómina',
        value:
          totalEgresos > 0
            ? Math.round((totalNominasMonto / totalEgresos) * 100)
            : 0,
        color: 'bg-primary',
      });
    }

    const colors = [
      'bg-amber-500',
      'bg-emerald-500',
      'bg-blue-500',
      'bg-purple-500',
    ];
    egresosPorCategoria.forEach((group, index) => {
      const monto = Number(group._sum?.monto || 0);
      if (monto > 0) {
        categories.push({
          label: group.categoria || 'General',
          value:
            totalEgresos > 0 ? Math.round((monto / totalEgresos) * 100) : 0,
          color: colors[index % colors.length],
        });
      }
    });

    // Ensure it sums to something if empty
    if (categories.length === 0) {
      categories.push({ label: 'Sin Gastos', value: 0, color: 'bg-muted' });
    }

    return {
      ingresos: {
        total: totalIngresos,
        change: Math.round(ingresosChange * 10) / 10,
      },
      egresos: {
        total: totalEgresos,
        change: Math.round(egresosChange * 10) / 10,
      },
      utilidad: {
        total: totalIngresos - totalEgresos,
        change: Math.round((ingresosChange - egresosChange) * 10) / 10,
      },
      categorias: categories,
    };
  }

  async getEgresos(tenantId: string, empresaId?: string) {
    return this.prisma.egresos.findMany({
      where: {
        tenantId,
        ...(empresaId && { empresaId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        membership: {
          include: {
            user: { select: { nombre: true, apellido: true } },
          },
        },
      },
    });
  }

  async getNominas(tenantId: string, empresaId?: string) {
    const nominas = await this.prisma.nomina.findMany({
      where: {
        tenantId,
        ...(empresaId && { empresaId }),
      },
      orderBy: { fechaGeneracion: 'desc' },
      include: {
        membership: {
          include: {
            user: { select: { nombre: true, apellido: true } },
          },
        },
      },
    });

    return nominas.map((nomina) => this.mapNominaDecimalFields(nomina));
  }

  async getAnticipos(tenantId: string, empresaId?: string) {
    return this.prisma.anticipos.findMany({
      where: {
        tenantId,
        ...(empresaId && { empresaId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        membership: {
          include: {
            user: { select: { nombre: true, apellido: true } },
          },
        },
      },
    });
  }

  async createEgreso(
    tenantId: string,
    data: {
      titulo: string;
      monto: number;
      razon: string;
      categoria: string;
      membershipId?: string;
      empresaId: string;
    },
  ) {
    return this.prisma.egresos.create({
      data: {
        tenantId,
        empresaId: data.empresaId,
        titulo: data.titulo,
        monto: data.monto,
        razon: data.razon,
        categoria: data.categoria || 'GENERAL',
        membershipId: data.membershipId || null,
      },
    });
  }

  async createAnticipo(
    tenantId: string,
    data: {
      membershipId: string;
      monto: number;
      razon: string;
      empresaId: string;
    },
  ) {
    return this.prisma.anticipos.create({
      data: {
        tenantId,
        empresaId: data.empresaId,
        membershipId: data.membershipId,
        monto: data.monto,
        razon: data.razon,
      },
    });
  }

  async generatePayrollFromMonitoring(
    tenantId: string,
    dto: GenerateMonitoringPayrollDto,
  ) {
    const { start, endInclusive, endExclusive } = this.normalizeDateRange(
      dto.fechaInicio,
      dto.fechaFin,
    );
    const requestedMembershipIds =
      dto.includeAllEligible || !dto.membershipIds?.length
        ? undefined
        : dto.membershipIds;

    const previewItems = await this.buildMonitoringPayrollItems(
      tenantId,
      dto.empresaId,
      start,
      endExclusive,
      requestedMembershipIds,
    );

    const eligibleItems = previewItems.filter((item) => item.estado === 'OK');

    if (eligibleItems.length === 0) {
      throw new BadRequestException(
        'No hay colaboradores elegibles para generar nómina desde monitoreo',
      );
    }

    const targetItems = requestedMembershipIds?.length
      ? eligibleItems.filter((item) =>
          requestedMembershipIds.includes(item.membershipId),
        )
      : eligibleItems;

    if (targetItems.length === 0) {
      throw new BadRequestException(
        'Los membershipIds enviados no tienen sesiones cerradas con valorHora configurado',
      );
    }

    const existingPayrolls = await this.prisma.nomina.findMany({
      where: {
        tenantId,
        empresaId: dto.empresaId,
        membershipId: {
          in: targetItems.map((item) => item.membershipId),
        },
        fechaInicio: start,
        fechaFin: endInclusive,
      },
      select: {
        id: true,
        membershipId: true,
      },
    });

    if (existingPayrolls.length > 0) {
      throw new ConflictException({
        message:
          'Ya existen nóminas para algunos colaboradores en el rango seleccionado',
        duplicates: existingPayrolls,
      });
    }

    const observaciones = dto.observaciones?.trim()
      ? dto.observaciones.trim()
      : `Generada desde monitoreo para el rango ${dto.fechaInicio} - ${dto.fechaFin}`;

    const createdPayrolls = await this.prisma.$transaction(async (tx) => {
      const created: Array<ReturnType<typeof this.mapNominaDecimalFields>> = [];

      for (const item of targetItems) {
        const payroll = await tx.nomina.create({
          data: {
            tenantId,
            empresaId: dto.empresaId,
            membershipId: item.membershipId,
            fechaInicio: start,
            fechaFin: endInclusive,
            totalServicios: item.sesionesCerradas,
            totalValorPagado: item.pagoEstimado,
            totalRepuestos: 0,
            totalIva: 0,
            baseComisionable: item.pagoEstimado,
            porcentajeAplicado: null,
            salarioFijo: null,
            totalComisiones: 0,
            totalPagar: item.pagoEstimado,
            estado: 'BORRADOR',
            observaciones,
          },
          include: {
            membership: {
              include: {
                user: {
                  select: { nombre: true, apellido: true },
                },
              },
            },
          },
        });

        created.push(this.mapNominaDecimalFields(payroll));
      }

      return created;
    });

    return {
      success: true,
      generated: createdPayrolls,
      summary: {
        total: createdPayrolls.length,
        totalPagar: Number(
          createdPayrolls
            .reduce((acc, payroll) => acc + payroll.totalPagar, 0)
            .toFixed(2),
        ),
      },
    };
  }
}
