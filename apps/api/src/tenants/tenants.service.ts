import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Role } from '../generated/client/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const { nombre, slug, correo, nit, numero, pagina, ownerEmail, ownerPassword, ownerNombre, ownerApellido } = dto;

    // 1. Verificar si el slug ya existe
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    if (existingTenant) {
      throw new ConflictException('El slug del tenant ya está en uso');
    }

    // 2. Verificar si el owner existe o necesita ser creado
    let owner = await this.prisma.user.findUnique({
      where: { email: ownerEmail },
    });

    return this.prisma.$transaction(async (tx) => {
      if (!owner) {
        if (!ownerPassword) {
          throw new ConflictException('El usuario no existe y no se proporcionó contraseña para crearlo.');
        }
        const hashedPassword = await bcrypt.hash(ownerPassword, 10);
        owner = await tx.user.create({
          data: {
            email: ownerEmail,
            password: hashedPassword,
            nombre: ownerNombre || 'Owner',
            apellido: ownerApellido || 'Tenant',
            role: Role.SU_ADMIN,
          },
        });
      } else {
        // Si ya existe, aseguramos que tenga rol SU_ADMIN para este nuevo contexto si es necesario, 
        // aunque el rol global en User es nuevo.
        await tx.user.update({
          where: { id: owner.id },
          data: { role: Role.SU_ADMIN }
        });
      }

      // 3. Crear el Tenant
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

      // 4. Crear Empresa por defecto
      const empresa = await tx.empresa.create({
        data: {
          nombre: 'Sede Principal',
          tenantId: tenant.id,
        },
      });

      // 5. Crear Membresía para el dueño (SU_ADMIN del Conglomerado)
      const membership = await tx.tenantMembership.create({
        data: {
          userId: owner.id,
          tenantId: tenant.id,
          role: Role.SU_ADMIN,
          activo: true,
          aprobado: true,
        },
      });

      // 6. Vincular con la empresa
      await tx.empresaMembership.create({
        data: {
          tenantId: tenant.id,
          membershipId: membership.id,
          empresaId: empresa.id,
        },
      });

      // 7. Crear suscripción inicial (Plan FREE o similar)
      let plan = await tx.plan.findFirst();
      if (!plan) {
        plan = await tx.plan.create({
          data: {
            nombre: 'Plan Básico',
            durationDays: 30,
            maxUsers: 5,
            maxOperators: 10,
            maxEmpresas: 1,
            price: 0,
          },
        });
      }

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      });

      return tenant;
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true, empresas: true },
        },
      },
    });
  }
}
