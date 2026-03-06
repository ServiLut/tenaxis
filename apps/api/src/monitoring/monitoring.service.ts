import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MonitoringScope } from './types';
import { Prisma } from '../generated/client/client';

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

@Injectable()
export class MonitoringService {
  constructor(private prisma: PrismaService) {}

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

  async getAlerts(scope: MonitoringScope) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const commonWhere: Prisma.SesionActividadWhereInput = {
      tenantId: scope.tenantId,
      fechaInicio: { gte: today },
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
          tenantId: scope.tenantId,
          tipo: 'SESSION_TIMEOUT',
          createdAt: { gte: today },
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
        title: `${unexpectedClosures} sesiones cerradas por inactividad hoy`,
        severity: 'baja',
      });
    }

    // Nota: Intentos fallidos de login y IP inusual requerirían rastreo adicional
    // que no está implementado en la lógica actual de auth.service.

    return alerts;
  }

  async getOperationMetrics(scope: MonitoringScope) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: Prisma.SesionActividadWhereInput = {
      tenantId: scope.tenantId,
      fechaInicio: { gte: today },
    };

    if (scope.empresaIds?.length) {
      where.empresaId = { in: scope.empresaIds };
    }

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

  async getExecutiveAuditMetrics(scope: MonitoringScope) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const commonWhere: Prisma.AuditoriaWhereInput = {
      tenantId: scope.tenantId,
      createdAt: { gte: sevenDaysAgo },
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
      const isToday = audit.createdAt >= today;
      const accion = audit.accion.toUpperCase();

      // Count by action
      if (accion.includes('CREATE') || accion.includes('CREAR')) {
        metrics.week.created++;
        if (isToday) metrics.today.created++;
      } else if (
        accion.includes('UPDATE') ||
        accion.includes('ACTUALIZAR') ||
        accion.includes('EDIT')
      ) {
        metrics.week.updated++;
        if (isToday) metrics.today.updated++;
      } else if (
        accion.includes('DELETE') ||
        accion.includes('ELIMINAR') ||
        accion.includes('BORRAR')
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

  async findAllSessions(scope: MonitoringScope) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: Prisma.SesionActividadWhereInput = {
      tenantId: scope.tenantId,
      fechaInicio: { gte: today },
    };

    if (scope.empresaIds?.length) {
      where.empresaId = { in: scope.empresaIds };
    }

    if (scope.zonaIds?.length) {
      where.membership = {
        empresaMemberships: {
          some: {
            zonaId: { in: scope.zonaIds },
          },
        },
      };
    }

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
        if (
          s.fechaFin === null ||
          (currentGroup.originalFin !== null &&
            s.fechaFin > currentGroup.originalFin)
        ) {
          currentGroup.originalFin = s.fechaFin;
        }
      }
    });

    return Array.from(userGroups.values()).map((group) => ({
      ...group,
      fechaInicio: group.originalInicio,
      fechaFin: group.originalFin,
    }));
  }

  async getMemberLogs(scope: MonitoringScope, membershipId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: Prisma.LogEventoWhereInput = {
      tenantId: scope.tenantId,
      sesion: {
        membershipId,
        fechaInicio: { gte: today },
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

  async getGlobalStats(scope: MonitoringScope) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const commonWhere: Prisma.SesionActividadWhereInput = {
      tenantId: scope.tenantId,
      fechaInicio: { gte: today },
    };

    if (scope.empresaIds?.length) {
      commonWhere.empresaId = { in: scope.empresaIds };
    }

    if (scope.zonaIds?.length) {
      commonWhere.membership = {
        empresaMemberships: {
          some: { zonaId: { in: scope.zonaIds } },
        },
      };
    }

    const eventsWhere: Prisma.LogEventoWhereInput = {
      tenantId: scope.tenantId,
      createdAt: { gte: today },
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
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.AuditoriaWhereInput = {
      tenantId: scope.tenantId,
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

  async findRecentLogs(scope: MonitoringScope) {
    const where: Prisma.LogEventoWhereInput = {
      tenantId: scope.tenantId,
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
