import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitoringService {
  constructor(private prisma: PrismaService) {}

  async startSession(tenantId: string, membershipId: string, ip?: string, dispositivo?: string) {
    // 1. Intentar buscar empresa vinculada a la membresía
    let empresaMembership = await this.prisma.empresaMembership.findFirst({
      where: { membershipId },
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

  async findAllSessions(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await this.prisma.sesionActividad.findMany({
      where: {
        tenantId,
        fechaInicio: {
          gte: today,
        },
      },
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
          // Guardamos el inicio original del día
          originalInicio: s.fechaInicio,
          // Guardamos el fin más reciente
          originalFin: s.fechaFin,
        });
      } else {
        const group = userGroups.get(userId);
        // Si esta sesión es más antigua, es el verdadero inicio del día
        if (s.fechaInicio < group.originalInicio) {
          group.originalInicio = s.fechaInicio;
        }
        // Si esta sesión tiene un fin más reciente (o es nulo, lo que significa activo)
        if (s.fechaFin === null || (group.originalFin !== null && s.fechaFin > group.originalFin)) {
          group.originalFin = s.fechaFin;
        }
      }
    });

    const result = Array.from(userGroups.values()).map(group => ({
      ...group,
      fechaInicio: group.originalInicio,
      fechaFin: group.originalFin,
    }));

    return result;
  }

  async getMemberLogs(tenantId: string, membershipId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.logEvento.findMany({
      where: {
        tenantId,
        sesion: {
          membershipId,
          fechaInicio: {
            gte: today,
          },
        },
      },
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

  async getGlobalStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalEvents, activeSessions, totalInactivity] = await Promise.all([
      this.prisma.logEvento.count({
        where: { tenantId, createdAt: { gte: today } }
      }),
      this.prisma.sesionActividad.count({
        where: { tenantId, fechaInicio: { gte: today }, fechaFin: null }
      }),
      this.prisma.sesionActividad.aggregate({
        where: { tenantId, fechaInicio: { gte: today } },
        _sum: { tiempoInactivo: true }
      })
    ]);

    return {
      totalEvents,
      activeSessions,
      totalInactivity: totalInactivity._sum.tiempoInactivo || 0,
      timestamp: new Date()
    };
  }

  async findAllAudits(tenantId: string) {
    return this.prisma.auditoria.findMany({
      where: {
        tenantId,
      },
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
      take: 100, // Limitamos a los últimos 100 por rendimiento
    });
  }

  async findRecentLogs(tenantId: string) {
    return this.prisma.logEvento.findMany({
      where: { tenantId },
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
