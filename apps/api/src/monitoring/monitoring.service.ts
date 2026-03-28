import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MonitoringScope } from './types';
import { Prisma } from '../generated/client/client';
import {
  MonitoringPayrollPreviewItem,
  MonitoringPayrollPreviewResponse,
} from './payroll.types';
import {
  addBogotaDaysUtc,
  startOfBogotaDayUtc,
  parseBogotaDateToUtcStart,
} from '../common/utils/timezone.util';

type SessionWithUser = Prisma.SesionActividadGetPayload<{
  include: {
    membership: {
      include: {
        user: {
          select: {
            nombre: true;
            apellido: true;
            email: true;
          };
        };
      };
    };
    logs: true;
  };
}>;

interface GroupedSession extends SessionWithUser {
  originalInicio: Date;
  originalFin: Date | null;
}

type PayrollSession = Prisma.SesionActividadGetPayload<{
  include: {
    membership: {
      include: {
        user: {
          select: {
            nombre: true;
            apellido: true;
          };
        };
        cuentasPago: true;
      };
    };
  };
}>;

@Injectable()
export class MonitoringService {
  constructor(private prisma: PrismaService) {}

  private buildTenantWhere(scope: MonitoringScope) {
    return scope.tenantId ? { tenantId: scope.tenantId } : {};
  }

  private getDateRange(dateStr?: string, startDate?: string, endDate?: string) {
    if (startDate && endDate) {
      const start = parseBogotaDateToUtcStart(startDate);
      const parsedEnd = parseBogotaDateToUtcStart(endDate);
      if (start && parsedEnd) {
        return { start, end: addBogotaDaysUtc(parsedEnd, 1) };
      }
    }

    if (dateStr) {
      const start = parseBogotaDateToUtcStart(dateStr);
      if (start) {
        const end = addBogotaDaysUtc(start, 1);
        return { start, end };
      }
    }
    const start = startOfBogotaDayUtc(new Date());
    const end = addBogotaDaysUtc(start, 1);
    return { start, end };
  }

  private buildSessionWhere(
    scope: MonitoringScope,
    start: Date,
    end: Date,
  ): Prisma.SesionActividadWhereInput {
    const where: Prisma.SesionActividadWhereInput = {
      ...this.buildTenantWhere(scope),
      fechaInicio: { gte: start, lt: end },
    };

    if (scope.empresaIds?.length) {
      where.empresaId = { in: scope.empresaIds };
    }

    if (scope.zonaIds?.length) {
      where.membership = {
        empresaMemberships: {
          some: { zonaId: { in: scope.zonaIds } },
        },
      };
    }

    return where;
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

  private buildPayrollPreview(
    sessions: PayrollSession[],
    date: string,
  ): MonitoringPayrollPreviewResponse {
    const groups = new Map<string, MonitoringPayrollPreviewItem>();

    sessions.forEach((session) => {
      const key = `${session.tenantId}:${session.membershipId}:${session.empresaId}`;
      const cuentaPago =
        session.membership.cuentasPago.find(
          (cuenta) =>
            cuenta.tenantId === session.tenantId &&
            cuenta.empresaId === session.empresaId,
        ) ||
        session.membership.cuentasPago.find(
          (cuenta) =>
            cuenta.tenantId === session.tenantId && cuenta.valorHora !== null,
        );
      const valorHora =
        cuentaPago?.valorHora !== null && cuentaPago?.valorHora !== undefined
          ? Number(cuentaPago.valorHora)
          : null;

      const current = groups.get(key) || {
        membershipId: session.membershipId,
        empresaId: session.empresaId,
        role: session.membership.role,
        nombre: session.membership.user.nombre,
        apellido: session.membership.user.apellido,
        valorHora,
        sesionesCerradas: 0,
        sesionesAbiertas: 0,
        minutosBrutos: 0,
        minutosInactivos: 0,
        minutosPagables: 0,
        horasPagables: 0,
        pagoEstimado: 0,
        estado: 'SIN_SESIONES_CERRADAS' as const,
      };

      if (current.valorHora === null && valorHora !== null) {
        current.valorHora = valorHora;
      }

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

      groups.set(key, current);
    });

    const items = Array.from(groups.values())
      .map((item) => {
        const horasPagables = Number((item.minutosPagables / 60).toFixed(2));
        const pagoEstimado =
          item.valorHora !== null
            ? Number((horasPagables * item.valorHora).toFixed(2))
            : 0;
        const estado: MonitoringPayrollPreviewItem['estado'] =
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
      })
      .sort((a, b) =>
        `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`),
      );

    const elegibles = items.filter((item) => item.estado === 'OK');

    return {
      date,
      items,
      summary: {
        totalPersonas: items.length,
        elegibles: elegibles.length,
        conIncidencias: items.length - elegibles.length,
        horasPagables: Number(
          elegibles
            .reduce((acc, item) => acc + item.horasPagables, 0)
            .toFixed(2),
        ),
        totalEstimado: Number(
          elegibles
            .reduce((acc, item) => acc + item.pagoEstimado, 0)
            .toFixed(2),
        ),
      },
    };
  }

  async startSession(
    tenantId: string,
    membershipId: string,
    ip?: string,
    dispositivo?: string,
  ) {
    // 1. Intentar buscar empresa vinculada a la membresía (filtrando por tenant)
    const empresaMembership = await this.prisma.empresaMembership.findFirst({
      where: {
        membershipId,
        empresa: { tenantId },
      },
      select: { empresaId: true },
    });

    let empresaId = empresaMembership?.empresaId;

    // 2. Si no hay vínculo (común en SU_ADMIN), buscar la primera empresa del Tenant
    if (!empresaId) {
      const fallbackEmpresa = await this.prisma.empresa.findFirst({
        where: { tenantId },
        select: { id: true },
      });
      empresaId = fallbackEmpresa?.id;
    }

    if (!empresaId) {
      return null;
    }

    return this.prisma.sesionActividad.create({
      data: {
        tenantId,
        membershipId,
        empresaId,
        ip: ip || 'unknown',
        dispositivo: dispositivo || 'unknown',
        fechaInicio: new Date(),
      },
    });
  }

  async endSession(sesionId: string) {
    return this.prisma.sesionActividad.update({
      where: { id: sesionId },
      data: {
        fechaFin: new Date(),
      },
    });
  }

  async recordEvent(
    sesionId: string,
    tipo: string,
    descripcion?: string,
    ruta?: string,
  ) {
    const session = await this.prisma.sesionActividad.findUnique({
      where: { id: sesionId },
    });

    if (!session) return null;

    return this.prisma.logEvento.create({
      data: {
        tenantId: session.tenantId,
        empresaId: session.empresaId,
        sesionId,
        tipo,
        descripcion,
        ruta,
      },
    });
  }

  async updateInactivityTime(sesionId: string, minutes: number) {
    return this.prisma.sesionActividad.update({
      where: { id: sesionId },
      data: {
        tiempoInactivo: {
          increment: minutes,
        },
        updatedAt: new Date(),
      },
    });
  }

  async refreshSession(sesionId: string) {
    return this.prisma.sesionActividad.update({
      where: { id: sesionId },
      data: {
        updatedAt: new Date(),
      },
    });
  }

  async getPayrollPreview(
    scope: MonitoringScope,
    date?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<MonitoringPayrollPreviewResponse> {
    const { start, end } = this.getDateRange(date, startDate, endDate);
    const sessions = await this.prisma.sesionActividad.findMany({
      where: this.buildSessionWhere(scope, start, end),
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
              ...(scope.tenantId
                ? {
                    where: {
                      tenantId: scope.tenantId,
                    },
                  }
                : {}),
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
      orderBy: [{ membershipId: 'asc' }, { fechaInicio: 'asc' }],
    });

    return this.buildPayrollPreview(
      sessions as PayrollSession[],
      date || startDate || start.toISOString().slice(0, 10),
    );
  }

  async getAlerts(
    scope: MonitoringScope,
    date?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { start, end } = this.getDateRange(date, startDate, endDate);

    const commonWhere: Prisma.SesionActividadWhereInput = {
      ...this.buildTenantWhere(scope),
      fechaInicio: { gte: start, lt: end },
    };

    if (scope.empresaIds?.length) {
      commonWhere.empresaId = { in: scope.empresaIds };
    }

    const [inactiveUsers, unexpectedClosures] = await Promise.all([
      // 1. Usuarios con inactividad > 30 min
      this.prisma.sesionActividad.count({
        where: {
          ...commonWhere,
          fechaFin: null,
          tiempoInactivo: { gte: 30 },
        },
      }),
      // 2. Sesiones cerradas inesperadamente (timeouts registrados hoy)
      this.prisma.logEvento.count({
        where: {
          ...this.buildTenantWhere(scope),
          tipo: 'SESSION_TIMEOUT',
          createdAt: { gte: start, lt: end },
          ...(scope.empresaIds?.length
            ? { empresaId: { in: scope.empresaIds } }
            : {}),
        },
      }),
    ]);

    const alerts: {
      id: string;
      type: string;
      title: string;
      severity: string;
    }[] = [];

    if (inactiveUsers > 0) {
      alerts.push({
        id: 'inactivity',
        type: 'warning',
        title: `${inactiveUsers} usuario(s) con inactividad > 30 min`,
        severity: inactiveUsers > 5 ? 'alta' : 'media',
      });
    }

    if (unexpectedClosures > 0) {
      alerts.push({
        id: 'closures',
        type: 'danger',
        title: `${unexpectedClosures} sesiones cerradas por inactividad ${date || (startDate && endDate) ? 'en el rango' : 'hoy'}`,
        severity: 'baja',
      });
    }

    // Nota: Intentos fallidos de login y IP inusual requerirían rastreo adicional
    // que no está implementado en la lógica actual de auth.service.

    return alerts;
  }

  async getOperationMetrics(
    scope: MonitoringScope,
    date?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { start, end } = this.getDateRange(date, startDate, endDate);

    const where = this.buildSessionWhere(scope, start, end);

    const sessions = await this.prisma.sesionActividad.findMany({
      where,
      include: {
        membership: {
          include: {
            user: { select: { nombre: true, apellido: true } },
          },
        },
        logs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const now = new Date();
    const userMetrics = new Map<
      string,
      { activeMs: number; inactiveMin: number; name: string }
    >();
    let totalTimeToFirstEventMs = 0;
    let sessionsWithEvents = 0;

    sessions.forEach((session) => {
      const end = session.fechaFin || now;
      const durationMs = end.getTime() - session.fechaInicio.getTime();
      const activeMs = Math.max(
        0,
        durationMs - session.tiempoInactivo * 60 * 1000,
      );

      const userId = session.membershipId;
      const current = userMetrics.get(userId) || {
        activeMs: 0,
        inactiveMin: 0,
        name: `${session.membership.user.nombre} ${session.membership.user.apellido}`,
      };

      current.activeMs += activeMs;
      current.inactiveMin += session.tiempoInactivo;
      userMetrics.set(userId, current);

      // MTTFE: Primer evento que no sea LOGIN
      const firstRealEvent = session.logs.find((l) => l.tipo !== 'LOGIN');
      if (firstRealEvent) {
        totalTimeToFirstEventMs +=
          firstRealEvent.createdAt.getTime() - session.fechaInicio.getTime();
        sessionsWithEvents++;
      }
    });

    const userMetricsList = Array.from(userMetrics.values());
    const avgActiveTimeMin =
      userMetricsList.length > 0
        ? userMetricsList.reduce((acc, curr) => acc + curr.activeMs, 0) /
          userMetricsList.length /
          (1000 * 60)
        : 0;

    const topInactivity = userMetricsList
      .sort((a, b) => b.inactiveMin - a.inactiveMin)
      .slice(0, 5)
      .map((u) => ({ name: u.name, minutes: u.inactiveMin }));

    const mttfeSec =
      sessionsWithEvents > 0
        ? totalTimeToFirstEventMs / sessionsWithEvents / 1000
        : 0;

    return {
      avgActiveTimeMin: Math.round(avgActiveTimeMin),
      totalInactivityMin: userMetricsList.reduce(
        (acc, curr) => acc + curr.inactiveMin,
        0,
      ),
      topInactivity,
      mttfeSec: Math.round(mttfeSec),
      userCount: userMetricsList.length,
    };
  }

  async getExecutiveAuditMetrics(
    scope: MonitoringScope,
    date?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { start, end } = this.getDateRange(date, startDate, endDate);
    const sevenDaysAgo = startDate ? start : addBogotaDaysUtc(start, -7);

    const commonWhere: Prisma.AuditoriaWhereInput = {
      ...this.buildTenantWhere(scope),
      createdAt: { gte: sevenDaysAgo, lt: end },
    };

    if (scope.empresaIds?.length) {
      commonWhere.empresaId = { in: scope.empresaIds };
    }

    const audits = await this.prisma.auditoria.findMany({
      where: commonWhere,
      include: {
        membership: {
          include: {
            user: { select: { nombre: true, apellido: true } },
          },
        },
      },
    });

    const metrics = {
      today: { created: 0, updated: 0, deleted: 0, total: 0 },
      week: { created: 0, updated: 0, deleted: 0, total: 0 },
      topEntities: new Map<string, number>(),
      topUsers: new Map<string, { count: number; name: string }>(),
      successRate: 100, // Default to 100 if we don't track failures explicitly in logs
    };

    audits.forEach((audit) => {
      const isToday = audit.createdAt >= start;
      const accion = audit.accion.toUpperCase();

      // Count by action
      if (
        accion.includes('CREATE') ||
        accion.includes('CREAR') ||
        accion.includes('CREA')
      ) {
        metrics.week.created++;
        if (isToday) metrics.today.created++;
      } else if (
        accion.includes('UPDATE') ||
        accion.includes('ACTUALIZAR') ||
        accion.includes('EDIT') ||
        accion.includes('ACTUA')
      ) {
        metrics.week.updated++;
        if (isToday) metrics.today.updated++;
      } else if (
        accion.includes('DELETE') ||
        accion.includes('ELIMINAR') ||
        accion.includes('BORRAR') ||
        accion.includes('ELIMIN')
      ) {
        metrics.week.deleted++;
        if (isToday) metrics.today.deleted++;
      }
      metrics.week.total++;
      if (isToday) metrics.today.total++;

      // Count by entity
      const entity = audit.entidad;
      metrics.topEntities.set(
        entity,
        (metrics.topEntities.get(entity) || 0) + 1,
      );

      // Count by user
      if (audit.membership) {
        const userId = audit.membershipId!;
        const userData = metrics.topUsers.get(userId) || {
          count: 0,
          name: `${audit.membership.user.nombre} ${audit.membership.user.apellido}`,
        };
        userData.count++;
        metrics.topUsers.set(userId, userData);
      }
    });

    return {
      today: metrics.today,
      week: metrics.week,
      topEntities: Array.from(metrics.topEntities.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      topUsers: Array.from(metrics.topUsers.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      successRate: metrics.successRate,
    };
  }

  async findAllSessions(
    scope: MonitoringScope,
    date?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { start, end } = this.getDateRange(date, startDate, endDate);

    const where = this.buildSessionWhere(scope, start, end);

    const sessions = (await this.prisma.sesionActividad.findMany({
      where,
      include: {
        membership: {
          include: {
            user: {
              select: {
                nombre: true,
                apellido: true,
                email: true,
              },
            },
          },
        },
        logs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        fechaInicio: 'desc',
      },
    })) as SessionWithUser[];

    const userGroups = new Map<string, GroupedSession>();
    const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
    const now = Date.now();

    sessions.forEach((s) => {
      const userId = s.membershipId;
      const currentGroup = userGroups.get(userId);

      if (!currentGroup) {
        userGroups.set(userId, {
          ...s,
          originalInicio: s.fechaInicio,
          originalFin: s.fechaFin,
        });
      } else {
        if (s.fechaInicio < currentGroup.originalInicio) {
          currentGroup.originalInicio = s.fechaInicio;
        }

        // Lógica para determinar el fin de la conexión consolidada:
        // 1. Si el grupo ya está marcado como activo (originalFin === null), lo dejamos así.
        // 2. Si el grupo está marcado como cerrado, pero esta sesión antigua está abierta:
        //    Solo lo volvemos a marcar como activo si la sesión antigua NO es "stale" (inactiva por mucho tiempo).
        if (currentGroup.originalFin !== null) {
          if (s.fechaFin === null) {
            const isStale = now - s.updatedAt.getTime() > STALE_THRESHOLD_MS;
            if (!isStale) {
              currentGroup.originalFin = null;
            }
          } else if (s.fechaFin > currentGroup.originalFin) {
            currentGroup.originalFin = s.fechaFin;
          }
        }
      }
    });

    return Array.from(userGroups.values()).map((group) => ({
      ...group,
      fechaInicio: group.originalInicio,
      fechaFin: group.originalFin,
    }));
  }

  async getMemberLogs(
    scope: MonitoringScope,
    membershipId: string,
    date?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { start, end } = this.getDateRange(date, startDate, endDate);

    const where: Prisma.LogEventoWhereInput = {
      ...this.buildTenantWhere(scope),
      sesion: {
        membershipId,
        fechaInicio: { gte: start, lt: end },
      },
    };

    if (scope.empresaIds?.length) {
      where.empresaId = { in: scope.empresaIds };
    }

    if (scope.zonaIds?.length) {
      where.sesion = {
        ...(where.sesion as Prisma.SesionActividadWhereInput),
        membership: {
          empresaMemberships: {
            some: { zonaId: { in: scope.zonaIds } },
          },
        },
      };
    }

    return this.prisma.logEvento.findMany({
      where,
      include: {
        sesion: {
          select: {
            ip: true,
            dispositivo: true,
            fechaInicio: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getGlobalStats(
    scope: MonitoringScope,
    date?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { start, end } = this.getDateRange(date, startDate, endDate);

    const commonWhere = this.buildSessionWhere(scope, start, end);

    const eventsWhere: Prisma.LogEventoWhereInput = {
      ...this.buildTenantWhere(scope),
      createdAt: { gte: start, lt: end },
    };

    if (scope.empresaIds?.length) {
      eventsWhere.empresaId = { in: scope.empresaIds };
    }

    if (scope.zonaIds?.length) {
      eventsWhere.sesion = {
        membership: {
          empresaMemberships: {
            some: { zonaId: { in: scope.zonaIds } },
          },
        },
      };
    }

    const activeThreshold = new Date(Date.now() - 5 * 60 * 1000);

    const [totalEvents, activeSessionsGroup, totalInactivity] =
      await Promise.all([
        this.prisma.logEvento.count({
          where: eventsWhere,
        }),
        this.prisma.sesionActividad.groupBy({
          by: ['membershipId'],
          where: {
            ...commonWhere,
            fechaFin: null,
            updatedAt: { gte: activeThreshold },
          },
        }),
        this.prisma.sesionActividad.aggregate({
          where: commonWhere,
          _sum: { tiempoInactivo: true },
        }),
      ]);

    return {
      totalEvents,
      activeSessions: activeSessionsGroup.length,
      totalInactivity: totalInactivity._sum.tiempoInactivo || 0,
      timestamp: new Date(),
    };
  }

  async findAllAudits(
    scope: MonitoringScope,
    page: number = 1,
    limit: number = 20,
    date?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;
    const { start, end } = this.getDateRange(date, startDate, endDate);

    const where: Prisma.AuditoriaWhereInput = {
      ...this.buildTenantWhere(scope),
      createdAt:
        date || (startDate && endDate) ? { gte: start, lt: end } : undefined,
    };

    if (scope.empresaIds?.length) {
      where.empresaId = { in: scope.empresaIds };
    }

    if (scope.zonaIds?.length) {
      where.membership = {
        empresaMemberships: {
          some: { zonaId: { in: scope.zonaIds } },
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        include: {
          membership: {
            include: {
              user: {
                select: {
                  nombre: true,
                  apellido: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.auditoria.count({
        where,
      }),
    ]);

    return {
      results: data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findRecentLogs(
    scope: MonitoringScope,
    date?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { start, end } = this.getDateRange(date, startDate, endDate);
    const where: Prisma.LogEventoWhereInput = {
      ...this.buildTenantWhere(scope),
      createdAt:
        date || (startDate && endDate) ? { gte: start, lt: end } : undefined,
    };

    if (scope.empresaIds?.length) {
      where.empresaId = { in: scope.empresaIds };
    }

    if (scope.zonaIds?.length) {
      where.sesion = {
        ...(where.sesion as Prisma.SesionActividadWhereInput),
        membership: {
          empresaMemberships: {
            some: { zonaId: { in: scope.zonaIds } },
          },
        },
      };
    }

    return this.prisma.logEvento.findMany({
      where,
      include: {
        sesion: {
          include: {
            membership: {
              include: {
                user: {
                  select: { nombre: true, apellido: true, email: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
