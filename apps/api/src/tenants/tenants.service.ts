import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JoinTenantDto } from './dto/join-tenant.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { Role } from '../generated/client/client';
import * as bcrypt from 'bcrypt';

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

      // 9. Seed de Configuración Dinámica (Segmentos y Riesgos por defecto)
      await tx.segmentoNegocio.createMany({
        data: [
          {
            tenantId: tenant.id,
            nombre: 'Restaurante',
            descripcion: 'Establecimientos de comida y bebida',
            frecuenciaSugerida: 15,
            riesgoSugerido: 'ALTO',
          },
          {
            tenantId: tenant.id,
            nombre: 'IPS / Salud',
            descripcion: 'Clínicas, hospitales y consultorios',
            frecuenciaSugerida: 30,
            riesgoSugerido: 'ALTO',
          },
          {
            tenantId: tenant.id,
            nombre: 'Panadería',
            descripcion: 'Producción y venta de panadería',
            frecuenciaSugerida: 15,
            riesgoSugerido: 'ALTO',
          },
          {
            tenantId: tenant.id,
            nombre: 'Colegio',
            descripcion: 'Instituciones educativas',
            frecuenciaSugerida: 60,
            riesgoSugerido: 'MEDIO',
          },
          {
            tenantId: tenant.id,
            nombre: 'PH / Residencial',
            descripcion: 'Propiedad horizontal y edificios',
            frecuenciaSugerida: 90,
            riesgoSugerido: 'BAJO',
          },
          {
            tenantId: tenant.id,
            nombre: 'Bodega',
            descripcion: 'Almacenamiento y logística',
            frecuenciaSugerida: 30,
            riesgoSugerido: 'MEDIO',
          },
          {
            tenantId: tenant.id,
            nombre: 'Industria Alimentos',
            descripcion: 'Plantas de procesamiento',
            frecuenciaSugerida: 15,
            riesgoSugerido: 'CRITICO',
          },
        ],
      });

      await tx.nivelRiesgoOperativo.createMany({
        data: [
          { tenantId: tenant.id, nombre: 'Bajo', color: 'emerald', valor: 1 },
          { tenantId: tenant.id, nombre: 'Medio', color: 'amber', valor: 2 },
          { tenantId: tenant.id, nombre: 'Alto', color: 'orange', valor: 3 },
          { tenantId: tenant.id, nombre: 'Crítico', color: 'red', valor: 4 },
        ],
      });

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

  async updateMembership(membershipId: string, data: UpdateMembershipDto) {
    console.log('UPDATING MEMBERSHIP:', membershipId, JSON.stringify(data, null, 2));
    
    return this.prisma.tenantMembership.update({
      where: { id: membershipId },
      data: {
        placa: data.placa || null,
        moto: data.moto,
        direccion: data.direccion || null,
        municipioId: data.municipioId || null,
        role: data.role,
        activo: data.activo,
      },
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

  async findAllMemberships(tenantId: string) {
    return this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        aprobado: true,
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
}
