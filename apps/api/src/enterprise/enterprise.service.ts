import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto';

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

    if (role !== 'SU_ADMIN') {
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
        _count: {
          select: {
            empresas: true,
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
    const currentEmpresas = tenant._count.empresas;

    if (currentEmpresas >= maxEmpresas) {
      throw new UnprocessableEntityException(
        'Maximum number of enterprises for the current plan has been reached.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          nombre: createEnterpriseDto.nombre,
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
          isActive: true,
        },
      });

      return empresa;
    });
  }

  async findAll(userId: string, tenantId: string) {
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
      throw new ForbiddenException('User is not an active member of this tenant.');
    }

    return this.prisma.empresa.findMany({
      where: {
        tenantId: tenantId,
      },
    });
  }
}
