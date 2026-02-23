import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto';
import { UpdateEnterpriseDto } from './dto/update-enterprise.dto';

@Injectable()
export class EnterpriseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createEnterpriseDto: CreateEnterpriseDto,
    userId: string,
    tenantId: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required.');
    }

    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: userId,
          tenantId: tenantId,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'User is not an active member of this tenant.',
      );
    }

    const { id: membershipId, role } = membership;

    if (role !== 'SU_ADMIN' && role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can create new enterprises.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!tenant) {
      // This check is somewhat redundant if a membership exists, but good for safety.
      throw new ForbiddenException('Tenant not found.');
    }

    if (tenant.subscription?.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        'Tenant does not have an active subscription.',
      );
    }

    if (!tenant.subscription.plan) {
      throw new UnprocessableEntityException(
        'Tenant does not have a plan associated with the subscription.',
      );
    }

    const maxEmpresas = tenant.subscription.plan.maxEmpresas;
    const currentEmpresas = await this.prisma.empresa.count({
      where: {
        tenantId,
        deletedAt: null,
      },
    });

    if (currentEmpresas >= maxEmpresas) {
      throw new UnprocessableEntityException(
        'Maximum number of enterprises for the current plan has been reached.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          nombre: createEnterpriseDto.nombre,
          activo: createEnterpriseDto.activo ?? true,
          tenant: {
            connect: { id: tenantId },
          },
        },
      });

      await tx.empresaMembership.create({
        data: {
          tenant: { connect: { id: tenantId } },
          empresa: { connect: { id: empresa.id } },
          membership: { connect: { id: membershipId } },
          role: 'SU_ADMIN',
          activo: true,
        },
      });

      // Seed estados de servicio base
      const defaultStatuses = ['PROGRAMADO', 'EN PROCESO', 'FINALIZADO', 'CANCELADO'];
      await tx.estadoServicio.createMany({
        data: defaultStatuses.map(nombre => ({
          nombre,
          tenantId,
          empresaId: empresa.id,
          activo: true,
        }))
      });

      // Seed métodos de pago base
      const defaultPayments = ['EFECTIVO', 'TRANSFERENCIA', 'QR', 'TARJETA'];
      await tx.metodoPago.createMany({
        data: defaultPayments.map(nombre => ({
          nombre,
          tenantId,
          empresaId: empresa.id,
          activo: true,
        }))
      });

      return empresa;
    });
  }

  async findAll(userId: string, tenantId: string, role?: string) {
    let enterprises: Awaited<ReturnType<typeof this.prisma.empresa.findMany>> = [];
    let maxEmpresas = 0;

    if (role === 'SU_ADMIN') {
      enterprises = await this.prisma.empresa.findMany({
        where: { deletedAt: null },
        include: { tenant: true },
      });
    } else {
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required for this role.');
      }

      const membership = await this.prisma.tenantMembership.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
      });

      if (!membership || membership.status !== 'ACTIVE') {
        throw new ForbiddenException('User is not an active member of this tenant.');
      }

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { subscription: { include: { plan: true } } },
      });
      maxEmpresas = tenant?.subscription?.plan?.maxEmpresas || 0;

      if (role === 'ADMIN') {
        enterprises = await this.prisma.empresa.findMany({
          where: { tenantId, deletedAt: null },
        });
      } else {
        // COORDINADOR, ASESOR, etc.
        const memberships = await this.prisma.empresaMembership.findMany({
          where: { membershipId: membership.id, deletedAt: null },
          include: { empresa: true },
        });
        enterprises = memberships.map((m) => m.empresa);
      }
    }

    return {
      items: enterprises,
      maxEmpresas,
      count: enterprises.length,
    };
  }

  async findOperators(tenantId: string, empresaId: string) {
    const operators = await this.prisma.empresaMembership.findMany({
      where: {
        tenantId,
        empresaId,
        activo: true,
        deletedAt: null,
        membership: {
          role: 'OPERADOR',
          activo: true,
        },
      },
      include: {
        membership: {
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
      },
    });

    return operators.map((om) => ({
      id: om.membership.id, // El ID de la membresía es el que se usa como tecnicoId
      nombre: `${om.membership.user.nombre} ${om.membership.user.apellido}`,
      email: om.membership.user.email,
    }));
  }

  async update(
    enterpriseId: string,
    updateEnterpriseDto: UpdateEnterpriseDto,
    userId: string,
    tenantId: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required.');
    }

    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: userId,
          tenantId: tenantId,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'User is not an active member of this tenant.',
      );
    }

    if (membership.role !== 'SU_ADMIN') {
      throw new ForbiddenException('Only admins can update enterprises.');
    }

    const enterprise = await this.prisma.empresa.findFirst({
      where: {
        id: enterpriseId,
        tenantId: tenantId,
        deletedAt: null,
      },
    });

    if (!enterprise) {
      throw new NotFoundException(
        'Enterprise not found or does not belong to this tenant.',
      );
    }

    return this.prisma.empresa.update({
      where: {
        id: enterpriseId,
      },
      data: {
        ...updateEnterpriseDto,
      },
    });
  }

  async remove(enterpriseId: string, userId: string, tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required.');
    }

    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: userId,
          tenantId: tenantId,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'User is not an active member of this tenant.',
      );
    }

    if (membership.role !== 'SU_ADMIN') {
      throw new ForbiddenException('Only admins can delete enterprises.');
    }

    const enterprise = await this.prisma.empresa.findFirst({
      where: {
        id: enterpriseId,
        tenantId: tenantId,
        deletedAt: null,
      },
    });

    if (!enterprise) {
      throw new NotFoundException(
        'Enterprise not found or does not belong to this tenant.',
      );
    }

    return this.prisma.empresa.update({
      where: {
        id: enterpriseId,
      },
      data: {
        deletedAt: new Date(),
        activo: false,
      },
    });
  }
}
