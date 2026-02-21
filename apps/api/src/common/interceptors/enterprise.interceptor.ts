import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EnterpriseInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const enterpriseId = request.headers['x-enterprise-id'];
    const testRole = request.headers['x-test-role'];

    // Modo desarrollo: Permitir sobreescribir el rol para pruebas
    if (user && testRole && process.env.NODE_ENV !== 'production') {
      user.role = testRole;
    }

    if (user && enterpriseId) {
      const tenantId = user.tenantId;
      const userId = user.sub;

      // Validar que el usuario tenga acceso a esta empresa dentro de su tenant
      const membership = await this.prisma.tenantMembership.findUnique({
        where: {
          userId_tenantId: {
            userId,
            tenantId,
          },
        },
        include: {
          empresaMemberships: {
            where: {
              empresaId: enterpriseId as string,
              deletedAt: null,
            },
          },
        },
      });

      // Si es SU_ADMIN o ADMIN del tenant, puede ver cualquier empresa de su tenant
      // Si es otro rol, debe tener el membership específico
      const isAdmin = user.role === 'SU_ADMIN' || user.role === 'ADMIN';
      const hasMembership =
        membership?.empresaMemberships &&
        membership.empresaMemberships.length > 0;

      if (isAdmin || hasMembership) {
        // Inyectar la empresa validada en el objeto user
        request.user.empresaId = enterpriseId;
      } else {
        // Si intenta acceder a una empresa sin permiso
        console.warn(
          `User ${userId} attempted unauthorized access to enterprise ${enterpriseId}`,
        );
      }
    }

    return next.handle();
  }
}
