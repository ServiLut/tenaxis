import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/jwt-payload.interface';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  async findStock(user: JwtPayload) {
    if (!user.tenantId || !user.empresaId) {
      return [];
    }

    return this.prisma.producto.findMany({
      where: {
        tenantId: user.tenantId,
        empresaId: user.empresaId,
      },
      include: {
        proveedor: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  async findSolicitudes(user: JwtPayload) {
    if (!user.tenantId || !user.empresaId) {
      return [];
    }

    return this.prisma.productoSolicitado.findMany({
      where: {
        tenantId: user.tenantId,
        empresaId: user.empresaId,
      },
      include: {
        producto: true,
        membership: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findProveedores(user: JwtPayload) {
    if (!user.tenantId || !user.empresaId) {
      return [];
    }

    return this.prisma.proveedores.findMany({
      where: {
        tenantId: user.tenantId,
        empresaId: user.empresaId,
      },
      orderBy: {
        nombre: 'asc',
      },
    });
  }
}
