import {
  BadRequestException,
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JoinTenantDto } from './dto/join-tenant.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { JwtPayload } from '../auth/auth.service';
import {
  EstadoOrden,
  Prisma,
  Role,
  TipoVisita,
} from '../generated/client/client';
import * as bcrypt from 'bcrypt';
import {
  TeamPerformanceQueryDto,
  TeamScope,
} from './dto/team-performance-query.dto';
import { TeamMemberDetailQueryDto } from './dto/team-member-detail-query.dto';
import {
  endOfBogotaDayUtc,
  parseBogotaDateToUtcEnd,
  parseBogotaDateToUtcStart,
  startOfBogotaDayUtc,
} from '../common/utils/timezone.util';

const NEW_VISIT_TYPES = new Set<TipoVisita>([
  TipoVisita.DIAGNOSTICO,
  TipoVisita.CORRECTIVO,
  TipoVisita.PREVENTIVO,
]);

const OPERATIVE_ROLES = new Set<Role>([
  Role.COORDINADOR,
  Role.ASESOR,
  Role.OPERADOR,
]);

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

interface DateRange {
  from: Date;
  to: Date;
}

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async joinBySlug(userId: string, dto: JoinTenantDto) {
    const { slug } = dto;

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException('El conglomerado no existe');
    }

    const existingMembership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: tenant.id,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException(
        'Ya tienes una solicitud o membresía en este conglomerado',
      );
    }

    return this.prisma.tenantMembership.create({
      data: {
        userId,
        tenantId: tenant.id,
        role: Role.OPERADOR,
        activo: true,
        aprobado: false, // Esperando aprobación
      },
    });
  }

  async create(dto: CreateTenantDto) {
    const {
      nombre,
      slug,
      correo,
      nit,
      numero,
      pagina,
      ownerEmail,
      ownerPassword,
      ownerNombre,
      ownerApellido,
      planId,
      durationDays,
    } = dto;

    // 1. Verificar si el slug ya existe
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    if (existingTenant) {
      throw new ConflictException('El slug del tenant ya está en uso');
    }

    // 2. Verificar el plan
    const selectedPlan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!selectedPlan) {
      throw new ConflictException('El plan seleccionado no existe');
    }

    // 3. Verificar si el owner existe o necesita ser creado
    let owner = await this.prisma.user.findUnique({
      where: { email: ownerEmail },
    });

    return this.prisma.$transaction(async (tx) => {
      if (!owner) {
        if (!ownerPassword) {
          throw new ConflictException(
            'El usuario no existe y no se proporcionó contraseña para crearlo.',
          );
        }
        const hashedPassword = await bcrypt.hash(ownerPassword, 10);
        owner = await tx.user.create({
          data: {
            email: ownerEmail,
            password: hashedPassword,
            nombre: ownerNombre || 'Owner',
            apellido: ownerApellido || 'Tenant',
          },
        });
      }

      // 4. Crear el Tenant
      const tenant = await tx.tenant.create({
        data: {
          nombre,
          slug,
          correo,
          nit,
          numero,
          pagina,
        },
      });

      // 5. Crear Empresa por defecto
      const empresa = await tx.empresa.create({
        data: {
          nombre: 'Sede Principal',
          tenantId: tenant.id,
        },
      });

      // 6. Crear Membresía para el dueño (SU_ADMIN del Conglomerado)
      const membership = await tx.tenantMembership.create({
        data: {
          userId: owner.id,
          tenantId: tenant.id,
          role: Role.SU_ADMIN,
          activo: true,
          aprobado: true,
        },
      });

      // 7. Vincular con la empresa
      await tx.empresaMembership.create({
        data: {
          tenantId: tenant.id,
          membershipId: membership.id,
          empresaId: empresa.id,
        },
      });

      // 8. Crear suscripción inicial
      const finalDuration = durationDays || selectedPlan.durationDays;

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: selectedPlan.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + finalDuration * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      });

      // 9. Seed de Configuración Dinámica (Tipos de Interés por defecto)
      await tx.tipoInteres.createMany({
        data: [
          {
            tenantId: tenant.id,
            nombre: 'Fumigación PUNTUAL',
            descripcion: 'Servicio único de control de plagas',
            frecuenciaSugerida: 0,
            riesgoSugerido: 'BAJO',
          },
          {
            tenantId: tenant.id,
            nombre: 'Contrato MENSUAL',
            descripcion: 'Control preventivo recurrente',
            frecuenciaSugerida: 30,
            riesgoSugerido: 'MEDIO',
          },
          {
            tenantId: tenant.id,
            nombre: 'Diagnóstico Técnico',
            descripcion: 'Inspección inicial y levantamiento',
            frecuenciaSugerida: 0,
            riesgoSugerido: 'BAJO',
          },
          {
            tenantId: tenant.id,
            nombre: 'Auditoría INVIMA/Salud',
            descripcion: 'Preparación para entes de control',
            frecuenciaSugerida: 15,
            riesgoSugerido: 'ALTO',
          },
          {
            tenantId: tenant.id,
            nombre: 'Control Roedores',
            descripcion: 'Especializado en ratas y ratones',
            frecuenciaSugerida: 15,
            riesgoSugerido: 'ALTO',
          },
        ],
      });

      return tenant;
    });
  }

  async getPendingMemberships(tenantId: string) {
    return this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        aprobado: false,
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    });
  }

  async approveMembership(membershipId: string) {
    return this.prisma.tenantMembership.update({
      where: { id: membershipId },
      data: { aprobado: true },
    });
  }

  async rejectMembership(membershipId: string) {
    return this.prisma.tenantMembership.delete({
      where: { id: membershipId },
    });
  }

  async updateMembership(
    membershipId: string,
    tenantId: string,
    data: UpdateMembershipDto,
  ) {
    console.log(
      'UPDATING MEMBERSHIP:',
      membershipId,
      JSON.stringify(data, null, 2),
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener la membresía actual para saber el tenantId
      const current = await tx.tenantMembership.findUnique({
        where: { id: membershipId },
      });

      if (!current) {
        throw new NotFoundException('Membresía no encontrada');
      }
      if (current.tenantId !== tenantId) {
        throw new UnauthorizedException(
          'No tienes permisos para modificar esta membresía',
        );
      }

      // 2. Actualizar datos base de la membresía
      const updated = await tx.tenantMembership.update({
        where: { id: membershipId },
        data: {
          placa: data.placa !== undefined ? data.placa || null : undefined,
          moto: data.moto !== undefined ? data.moto : undefined,
          direccion:
            data.direccion !== undefined ? data.direccion || null : undefined,
          municipioId:
            data.municipioId !== undefined
              ? data.municipioId || null
              : undefined,
          role: data.role,
          activo: data.activo,
        },
      });

      // 3. Actualizar datos del usuario si se proporcionan
      if (
        data.nombre ||
        data.apellido ||
        data.email ||
        data.telefono !== undefined
      ) {
        // Separar nombre y apellido si solo se envía nombre (en el frontend a veces se envía completo)
        let nombre = data.nombre;
        let apellido = data.apellido;

        if (nombre && !apellido && nombre.includes(' ')) {
          const parts = nombre.trim().split(' ');
          nombre = parts[0];
          apellido = parts.slice(1).join(' ');
        }

        await tx.user.update({
          where: { id: current.userId },
          data: {
            nombre: nombre || undefined,
            apellido: apellido || undefined,
            email: data.email || undefined,
            telefono: data.telefono !== undefined ? data.telefono : undefined,
          },
        });
      }

      // 4. Sincronizar empresas si se proporcionan
      if (data.empresaIds) {
        // Eliminar vinculaciones previas
        await tx.empresaMembership.deleteMany({
          where: { membershipId },
        });

        // Crear nuevas vinculaciones
        if (data.empresaIds.length > 0) {
          await tx.empresaMembership.createMany({
            data: data.empresaIds.map((empresaId) => ({
              tenantId: current.tenantId,
              membershipId,
              empresaId,
              role: data.role || current.role, // Usar el nuevo rol o el actual
            })),
          });
        }
      }

      return updated;
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { memberships: true, empresas: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
              },
            },
          },
        },
        empresas: true,
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('El conglomerado no existe');
    }

    return tenant;
  }

  async findAllMemberships(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const parsedStart = startDate
      ? parseBogotaDateToUtcStart(startDate)
      : undefined;
    const parsedEnd = endDate
      ? parseBogotaDateToUtcEnd(endDate)
      : endOfBogotaDayUtc(new Date());
    if ((startDate && !parsedStart) || (endDate && !parsedEnd)) {
      throw new BadRequestException('Rango de fechas inválido');
    }
    const start = parsedStart;
    const end = parsedEnd as Date;

    const whereServicios: Prisma.OrdenServicioWhereInput = {
      fechaVisita: {
        lte: end,
        ...(start ? { gte: start } : {}),
      },
    };

    return this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        activo: true,
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            telefono: true,
          },
        },
        municipio: true,
        empresaMemberships: {
          select: {
            empresaId: true,
            empresa: {
              select: {
                nombre: true,
              },
            },
          },
        },
        serviciosCreados: {
          where: whereServicios,
          select: {
            id: true,
            numeroOrden: true,
            fechaVisita: true,
            valorPagado: true,
            estadoServicio: true,
            tipoVisita: true,
            cliente: {
              select: {
                nombre: true,
                apellido: true,
                razonSocial: true,
              },
            },
          },
        },
        serviciosAsignados: {
          where: whereServicios,
          select: {
            id: true,
            numeroOrden: true,
            fechaVisita: true,
            valorPagado: true,
            estadoServicio: true,
            tipoVisita: true,
            cliente: {
              select: {
                nombre: true,
                apellido: true,
                razonSocial: true,
              },
            },
          },
        },
        _count: {
          select: {
            serviciosAsignados: true,
          },
        },
      },
      orderBy: {
        user: {
          nombre: 'asc',
        },
      },
    });
  }

  async getTeamPerformance(
    tenantId: string,
    user: JwtPayload,
    query: TeamPerformanceQueryDto,
  ) {
    const range = this.parseRange(query.from, query.to);
    const previousRange = this.getPreviousRange(range);
    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const scope = query.scope || TeamScope.OPERATIVO;

    const access = await this.resolveAccessScope(tenantId, user);
    const empresaIds = this.resolveFilterIds(
      query.empresaId,
      access.allowedEmpresaIds,
      'empresa',
    );
    const zonaIds = this.resolveFilterIds(
      query.zonaId,
      access.allowedZonaIds,
      'zona',
    );

    const membershipWhere: Prisma.TenantMembershipWhereInput = {
      tenantId,
      aprobado: true,
      activo: true,
      ...(scope === TeamScope.OPERATIVO
        ? { role: { in: [...OPERATIVE_ROLES] } }
        : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.municipioId ? { municipioId: query.municipioId } : {}),
      ...(query.search
        ? {
            OR: [
              {
                user: {
                  nombre: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                user: {
                  apellido: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                user: {
                  email: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
      ...(access.onlyOwnMembershipId ? { id: access.onlyOwnMembershipId } : {}),
      ...(empresaIds || zonaIds
        ? {
            empresaMemberships: {
              some: {
                ...(empresaIds ? { empresaId: { in: empresaIds } } : {}),
                ...(zonaIds ? { zonaId: { in: zonaIds } } : {}),
              },
            },
          }
        : {}),
    };

    const [memberships, totalMembers] = await Promise.all([
      this.prisma.tenantMembership.findMany({
        where: membershipWhere,
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
              telefono: true,
            },
          },
          municipio: {
            select: {
              id: true,
              name: true,
            },
          },
          empresaMemberships: {
            where: {
              ...(empresaIds ? { empresaId: { in: empresaIds } } : {}),
              ...(zonaIds ? { zonaId: { in: zonaIds } } : {}),
            },
            select: {
              empresaId: true,
              zonaId: true,
              empresa: {
                select: {
                  nombre: true,
                },
              },
              zona: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
        },
        orderBy: [{ user: { nombre: 'asc' } }, { user: { apellido: 'asc' } }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tenantMembership.count({ where: membershipWhere }),
    ]);

    const membershipIds = memberships.map((m) => m.id);
    const ordersWhere: Prisma.OrdenServicioWhereInput = {
      tenantId,
      creadoPorId: {
        in: membershipIds.length > 0 ? membershipIds : [NIL_UUID],
      },
      fechaVisita: {
        gte: range.from,
        lte: range.to,
      },
      ...(empresaIds ? { empresaId: { in: empresaIds } } : {}),
      ...(zonaIds ? { zonaId: { in: zonaIds } } : {}),
    };

    const previousOrdersWhere: Prisma.OrdenServicioWhereInput = {
      ...ordersWhere,
      fechaVisita: {
        gte: previousRange.from,
        lte: previousRange.to,
      },
    };

    const [orders, previousOrders] = await Promise.all([
      this.prisma.ordenServicio.findMany({
        where: ordersWhere,
        select: {
          creadoPorId: true,
          estadoServicio: true,
          valorPagado: true,
          tipoVisita: true,
        },
      }),
      this.prisma.ordenServicio.findMany({
        where: previousOrdersWhere,
        select: {
          estadoServicio: true,
          valorPagado: true,
        },
      }),
    ]);

    const statsByMembership = new Map<
      string,
      {
        totalServicios: number;
        serviciosLiquidados: number;
        totalRecaudo: number;
        recaudoNuevos: number;
        recaudoRefuerzo: number;
        pendientes: number;
      }
    >();

    for (const membership of memberships) {
      statsByMembership.set(membership.id, {
        totalServicios: 0,
        serviciosLiquidados: 0,
        totalRecaudo: 0,
        recaudoNuevos: 0,
        recaudoRefuerzo: 0,
        pendientes: 0,
      });
    }

    for (const order of orders) {
      if (!order.creadoPorId) {
        continue;
      }

      const current = statsByMembership.get(order.creadoPorId);
      if (!current) {
        continue;
      }

      current.totalServicios += 1;
      const isLiquidated = order.estadoServicio === EstadoOrden.LIQUIDADO;
      const paid = this.toNumber(order.valorPagado);

      if (isLiquidated) {
        current.serviciosLiquidados += 1;
        current.totalRecaudo += paid;
        if (order.tipoVisita && NEW_VISIT_TYPES.has(order.tipoVisita)) {
          current.recaudoNuevos += paid;
        } else {
          current.recaudoRefuerzo += paid;
        }
      } else {
        current.pendientes += 1;
      }
    }

    const members = memberships.map((membership) => {
      const stats = statsByMembership.get(membership.id)!;
      const efectividad =
        stats.totalServicios > 0
          ? Math.round((stats.serviciosLiquidados / stats.totalServicios) * 100)
          : 0;

      return {
        id: membership.id,
        name: `${membership.user.nombre} ${membership.user.apellido}`.trim(),
        email: membership.user.email,
        phone: membership.user.telefono || 'Sin teléfono',
        role: membership.role,
        joinDate: membership.createdAt,
        placa: membership.placa,
        moto: membership.moto,
        direccion: membership.direccion,
        municipioId: membership.municipioId,
        municipioNombre: membership.municipio?.name || null,
        empresaIds: membership.empresaMemberships.map((em) => em.empresaId),
        empresaNombres: membership.empresaMemberships.map(
          (em) => em.empresa.nombre,
        ),
        zonaIds: membership.empresaMemberships
          .map((em) => em.zona?.id)
          .filter((id): id is string => !!id),
        zonaNombres: membership.empresaMemberships
          .map((em) => em.zona?.nombre)
          .filter((name): name is string => !!name),
        totalServicios: stats.totalServicios,
        serviciosLiquidados: stats.serviciosLiquidados,
        pendientes: stats.pendientes,
        totalRecaudo: stats.totalRecaudo,
        recaudoNuevos: stats.recaudoNuevos,
        recaudoRefuerzo: stats.recaudoRefuerzo,
        efectividad,
      };
    });

    members.sort((a, b) => b.totalRecaudo - a.totalRecaudo);

    const kpis = this.buildKpis(members);
    const previousKpis = this.buildKpisFromOrders(previousOrders);

    const alerts = {
      noActivity: members
        .filter((member) => member.totalServicios === 0)
        .slice(0, 8)
        .map((member) => ({
          membershipId: member.id,
          name: member.name,
          role: member.role,
        })),
      lowEffectiveness: members
        .filter(
          (member) => member.totalServicios >= 3 && member.efectividad < 60,
        )
        .slice(0, 8)
        .map((member) => ({
          membershipId: member.id,
          name: member.name,
          efectividad: member.efectividad,
        })),
      pendingLiquidation: members
        .filter((member) => member.pendientes >= 5)
        .slice(0, 8)
        .map((member) => ({
          membershipId: member.id,
          name: member.name,
          pendientes: member.pendientes,
        })),
    };

    return {
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      kpis: {
        ...kpis,
        comparison: {
          totalRecaudoChangePct: this.computePctChange(
            kpis.totalRecaudo,
            previousKpis.totalRecaudo,
          ),
          serviciosLiquidadosChangePct: this.computePctChange(
            kpis.serviciosLiquidados,
            previousKpis.serviciosLiquidados,
          ),
          efectividadChangePct: this.computePctChange(
            kpis.efectividadEquipo,
            previousKpis.efectividadEquipo,
          ),
        },
      },
      alerts,
      pagination: {
        page,
        pageSize,
        total: totalMembers,
        totalPages: Math.max(1, Math.ceil(totalMembers / pageSize)),
      },
      members,
    };
  }

  async getTeamMemberDetail(
    tenantId: string,
    membershipId: string,
    user: JwtPayload,
    query: TeamMemberDetailQueryDto,
  ) {
    const range = this.parseRange(query.from, query.to);
    const page = query.page || 1;
    const pageSize = query.pageSize || 15;

    const access = await this.resolveAccessScope(tenantId, user);
    const empresaIds = this.resolveFilterIds(
      query.empresaId,
      access.allowedEmpresaIds,
      'empresa',
    );
    const zonaIds = this.resolveFilterIds(
      query.zonaId,
      access.allowedZonaIds,
      'zona',
    );

    if (
      access.onlyOwnMembershipId &&
      access.onlyOwnMembershipId !== membershipId
    ) {
      throw new UnauthorizedException(
        'No tienes permisos para consultar el detalle de este usuario',
      );
    }

    const membership = await this.prisma.tenantMembership.findFirst({
      where: {
        id: membershipId,
        tenantId,
        aprobado: true,
        activo: true,
        ...(empresaIds || zonaIds
          ? {
              empresaMemberships: {
                some: {
                  ...(empresaIds ? { empresaId: { in: empresaIds } } : {}),
                  ...(zonaIds ? { zonaId: { in: zonaIds } } : {}),
                },
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            nombre: true,
            apellido: true,
            email: true,
            telefono: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Usuario no encontrado en el conglomerado');
    }

    const ordersWhere: Prisma.OrdenServicioWhereInput = {
      tenantId,
      creadoPorId: membershipId,
      fechaVisita: {
        gte: range.from,
        lte: range.to,
      },
      ...(empresaIds ? { empresaId: { in: empresaIds } } : {}),
      ...(zonaIds ? { zonaId: { in: zonaIds } } : {}),
    };

    const metricsWhere: Prisma.OrdenServicioWhereInput = {
      ...ordersWhere,
    };

    const [orders, total, metricOrders, clientesCreados] = await Promise.all([
      this.prisma.ordenServicio.findMany({
        where: ordersWhere,
        select: {
          id: true,
          numeroOrden: true,
          fechaVisita: true,
          estadoServicio: true,
          valorPagado: true,
          tipoVisita: true,
          cliente: {
            select: {
              nombre: true,
              apellido: true,
              razonSocial: true,
            },
          },
        },
        orderBy: {
          fechaVisita: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.ordenServicio.count({
        where: ordersWhere,
      }),
      this.prisma.ordenServicio.findMany({
        where: metricsWhere,
        select: {
          estadoServicio: true,
          valorPagado: true,
          tipoVisita: true,
        },
      }),
      this.prisma.cliente.count({
        where: {
          tenantId,
          creadoPorId: membershipId,
          createdAt: {
            gte: range.from,
            lte: range.to,
          },
          ...(empresaIds ? { empresaId: { in: empresaIds } } : {}),
        },
      }),
    ]);

    let totalServicios = 0;
    let serviciosLiquidados = 0;
    let totalRecaudo = 0;
    let recaudoNuevos = 0;
    let recaudoRefuerzo = 0;

    for (const order of metricOrders) {
      totalServicios += 1;
      if (order.estadoServicio === EstadoOrden.LIQUIDADO) {
        serviciosLiquidados += 1;
        const paid = this.toNumber(order.valorPagado);
        totalRecaudo += paid;
        if (order.tipoVisita && NEW_VISIT_TYPES.has(order.tipoVisita)) {
          recaudoNuevos += paid;
        } else {
          recaudoRefuerzo += paid;
        }
      }
    }

    return {
      member: {
        id: membership.id,
        name: `${membership.user.nombre} ${membership.user.apellido}`.trim(),
        email: membership.user.email,
        phone: membership.user.telefono || null,
        role: membership.role,
      },
      metrics: {
        clientesCreados,
        totalServicios,
        serviciosLiquidados,
        pendientes: Math.max(0, totalServicios - serviciosLiquidados),
        totalRecaudo,
        recaudoNuevos,
        recaudoRefuerzo,
        efectividad:
          totalServicios > 0
            ? Math.round((serviciosLiquidados / totalServicios) * 100)
            : 0,
      },
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.numeroOrden || 'N/A',
        date: order.fechaVisita,
        status: order.estadoServicio,
        paidValue: this.toNumber(order.valorPagado),
        type: order.tipoVisita,
        client:
          order.cliente.razonSocial ||
          `${order.cliente.nombre || ''} ${order.cliente.apellido || ''}`.trim(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  private parseRange(from?: string, to?: string): DateRange {
    const now = new Date();
    const end = to ? parseBogotaDateToUtcEnd(to) : endOfBogotaDayUtc(now);
    if (!end) {
      throw new BadRequestException('Rango de fechas inválido');
    }

    const start = from
      ? parseBogotaDateToUtcStart(from)
      : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
    if (!start) {
      throw new BadRequestException('Rango de fechas inválido');
    }
    const normalizedStart = from ? start : startOfBogotaDayUtc(start);

    if (
      Number.isNaN(normalizedStart.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      throw new BadRequestException('Rango de fechas inválido');
    }
    if (normalizedStart > end) {
      throw new BadRequestException(
        'La fecha inicial no puede ser mayor a la fecha final',
      );
    }

    return { from: normalizedStart, to: end };
  }

  private getPreviousRange(range: DateRange): DateRange {
    const length = range.to.getTime() - range.from.getTime();
    const prevTo = new Date(range.from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - length);
    return { from: prevFrom, to: prevTo };
  }

  private async resolveAccessScope(tenantId: string, user: JwtPayload) {
    if (user.role === Role.SU_ADMIN || user.role === Role.ADMIN) {
      return {
        onlyOwnMembershipId: null,
        allowedEmpresaIds: null as string[] | null,
        allowedZonaIds: null as string[] | null,
      };
    }

    if (!user.membershipId) {
      throw new UnauthorizedException(
        'No se pudo resolver la membresía del usuario',
      );
    }

    const selfMembership = await this.prisma.tenantMembership.findFirst({
      where: {
        id: user.membershipId,
        tenantId,
        aprobado: true,
        activo: true,
      },
      include: {
        empresaMemberships: {
          where: { activo: true, deletedAt: null },
          select: {
            empresaId: true,
            zonaId: true,
          },
        },
      },
    });

    if (!selfMembership) {
      throw new UnauthorizedException(
        'Membresía no válida para este conglomerado',
      );
    }

    const allowedEmpresaIds = [
      ...new Set(selfMembership.empresaMemberships.map((em) => em.empresaId)),
    ];
    const allowedZonaIds = [
      ...new Set(
        selfMembership.empresaMemberships
          .map((em) => em.zonaId)
          .filter((id): id is string => !!id),
      ),
    ];

    return {
      onlyOwnMembershipId:
        user.role === Role.OPERADOR ? selfMembership.id : null,
      allowedEmpresaIds,
      allowedZonaIds,
    };
  }

  private resolveFilterIds(
    requestedId: string | undefined,
    allowedIds: string[] | null,
    resource: 'empresa' | 'zona',
  ) {
    if (allowedIds === null) {
      return requestedId ? [requestedId] : undefined;
    }

    if (requestedId) {
      if (!allowedIds.includes(requestedId)) {
        throw new UnauthorizedException(
          `No tienes permisos sobre la ${resource} solicitada`,
        );
      }
      return [requestedId];
    }

    return allowedIds.length > 0 ? allowedIds : [NIL_UUID];
  }

  private buildKpis(
    members: Array<{
      totalRecaudo: number;
      totalServicios: number;
      serviciosLiquidados: number;
      pendientes: number;
    }>,
  ) {
    const totalRecaudo = members.reduce(
      (acc, member) => acc + member.totalRecaudo,
      0,
    );
    const totalServicios = members.reduce(
      (acc, member) => acc + member.totalServicios,
      0,
    );
    const serviciosLiquidados = members.reduce(
      (acc, member) => acc + member.serviciosLiquidados,
      0,
    );
    const serviciosPendientes = members.reduce(
      (acc, member) => acc + member.pendientes,
      0,
    );

    const efectividadEquipo =
      totalServicios > 0
        ? Math.round((serviciosLiquidados / totalServicios) * 100)
        : 0;

    const ticketPromedio =
      serviciosLiquidados > 0 ? totalRecaudo / serviciosLiquidados : 0;

    return {
      totalRecaudo,
      totalServicios,
      serviciosLiquidados,
      serviciosPendientes,
      efectividadEquipo,
      ticketPromedio,
    };
  }

  private buildKpisFromOrders(
    orders: Array<{
      estadoServicio: EstadoOrden;
      valorPagado: Prisma.Decimal | null;
    }>,
  ) {
    let totalRecaudo = 0;
    let serviciosLiquidados = 0;
    let totalServicios = 0;

    for (const order of orders) {
      totalServicios += 1;
      if (order.estadoServicio === EstadoOrden.LIQUIDADO) {
        serviciosLiquidados += 1;
        totalRecaudo += this.toNumber(order.valorPagado);
      }
    }

    return {
      totalRecaudo,
      serviciosLiquidados,
      efectividadEquipo:
        totalServicios > 0
          ? Math.round((serviciosLiquidados / totalServicios) * 100)
          : 0,
    };
  }

  private computePctChange(current: number, previous: number) {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) {
      return 0;
    }
    return Number(value) || 0;
  }
}
