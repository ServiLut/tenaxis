import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MonitoringScope } from './types';
import { Prisma } from '../generated/client/client';

@Injectable()
export class MonitoringService {
  constructor(private prisma: PrismaService) {}

  async startSession(tenantId: string, membershipId: string, ip?: string, dispositivo?: string) {
    // 1. Intentar buscar empresa vinculada a la membresía (filtrando por tenant)
    let empresaMembership = await this.prisma.empresaMembership.findFirst({
      where: { 
        membershipId,
        empresa: { tenantId }
      },
      select: { empresaId: true },
    });

    let empresaId = empresaMembership?.empresaId;

    // 2. Si no hay vínculo (común en SU_ADMIN), buscar la primera empresa del Tenant
    if (!empresaId) {
      const fallbackEmpresa = await this.prisma.empresa.findFirst({
        where: { tenantId },
        select: { id: true }
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

  async recordEvent(sesionId: string, tipo: string, descripcion?: string, ruta?: string) {
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
      },
    });
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
            zonaId: { in: scope.zonaIds }
          }
        }
      };
    }

    const sessions = await this.prisma.sesionActividad.findMany({
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
    });

    const userGroups = new Map();

    sessions.forEach(s => {
      const userId = s.membershipId;
      if (!userGroups.has(userId)) {
        userGroups.set(userId, {
          ...s,
          originalInicio: s.fechaInicio,
          originalFin: s.fechaFin,
        });
      } else {
        const group = userGroups.get(userId);
        if (s.fechaInicio < group.originalInicio) {
          group.originalInicio = s.fechaInicio;
        }
        if (s.fechaFin === null || (group.originalFin !== null && s.fechaFin > group.originalFin)) {
          group.originalFin = s.fechaFin;
        }
      }
    });

    return Array.from(userGroups.values()).map(group => ({
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
        ...(where.sesion as any),
        membership: {
          empresaMemberships: {
            some: { zonaId: { in: scope.zonaIds } }
          }
        }
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
          }
        }
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
          some: { zonaId: { in: scope.zonaIds } }
        }
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
            some: { zonaId: { in: scope.zonaIds } }
          }
        }
      };
    }

    const [totalEvents, activeSessionsGroup, totalInactivity] = await Promise.all([
      this.prisma.logEvento.count({
        where: eventsWhere
      }),
      this.prisma.sesionActividad.groupBy({
        by: ['membershipId'],
        where: { 
          ...commonWhere,
          fechaFin: null 
        }
      }),
      this.prisma.sesionActividad.aggregate({
        where: commonWhere,
        _sum: { tiempoInactivo: true }
      })
    ]);

    return {
      totalEvents,
      activeSessions: activeSessionsGroup.length,
      totalInactivity: totalInactivity._sum.tiempoInactivo || 0,
      timestamp: new Date()
    };
  }

  async findAllAudits(scope: MonitoringScope, page: number = 1, limit: number = 20) {
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
          some: { zonaId: { in: scope.zonaIds } }
        }
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
        ...(where.sesion as any),
        membership: {
          empresaMemberships: {
            some: { zonaId: { in: scope.zonaIds } }
          }
        }
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
                  select: { nombre: true, apellido: true, email: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }
}
