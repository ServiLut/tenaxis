import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;

    const methodsToAudit = ['POST', 'PATCH', 'PUT', 'DELETE'];
    if (!methodsToAudit.includes(method) || !user) {
      return next.handle();
    }

    if (url.includes('/monitoring') || url.includes('/auth/login')) {
      return next.handle();
    }

    // Mapeo de nombres legibles
    const actionMap: Record<string, string> = {
      'POST': 'CREACIÓN',
      'PATCH': 'ACTUALIZACIÓN',
      'PUT': 'ACTUALIZACIÓN',
      'DELETE': 'ELIMINACIÓN'
    };

    return next.handle().pipe(
      tap(async (response) => {
        await this.createAuditRecord(request, response, 'SUCCESS', actionMap[method] || method);
      }),
      catchError((error) => {
        this.createAuditRecord(request, error, 'FAILED', actionMap[method] || method).catch(console.error);
        return throwError(() => error);
      }),
    );
  }

  private async createAuditRecord(request: any, result: any, status: string, actionLabel: string) {
    try {
      const { method, url, body, user, params } = request;
      
      const urlParts = url.split('/').filter((p: string) => p && p !== 'api');
      const entidad = urlParts[0]?.toUpperCase() || 'SYSTEM';
      const entidadId = body?.id || params?.id || params?.membershipId || 'N/A';

      if (!user.tenantId) return;

      // Intentar obtener el valor anterior si es UPDATE o DELETE
      let valorAnterior = null;
      if ((method === 'PATCH' || method === 'PUT' || method === 'DELETE') && entidadId !== 'N/A') {
        try {
          // Mapeo simple de URL a modelo de Prisma
          const modelName = this.getPrismaModelName(entidad);
          if (modelName) {
            valorAnterior = await (this.prisma as any)[modelName].findUnique({
              where: { id: entidadId }
            });
          }
        } catch (e) {
          // Silencioso si no se puede obtener el anterior
        }
      }

      const sanitizedBody = this.sanitizeData(body);
      const sanitizedPrevious = this.sanitizeData(valorAnterior);

      await this.prisma.auditoria.create({
        data: {
          tenantId: user.tenantId,
          membershipId: user.membershipId,
          empresaId: user.empresaId,
          accion: `${actionLabel}_${status}`,
          entidad: entidad,
          entidadId: String(entidadId),
          detalles: {
            anterior: sanitizedPrevious,
            nuevo: method === 'DELETE' ? null : sanitizedBody
          },
          metadata: {
            path: url,
            method: method,
            status: status,
            ip: request.ip || request.headers['x-forwarded-for'],
            userAgent: request.headers['user-agent'],
          }
        },
      });
    } catch (e) {
      console.error('Error creating audit record:', e);
    }
  }

  private getPrismaModelName(entidad: string): string | null {
    const map: Record<string, string> = {
      'CLIENTES': 'cliente',
      'SERVICIOS': 'servicio',
      'EMPRESAS': 'empresa',
      'ORDENES-SERVICIO': 'ordenServicio',
      'USUARIOS': 'user',
      'TENANTS': 'tenant'
    };
    return map[entidad] || null;
  }

  private sanitizeData(data: any) {
    if (!data) return null;
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'access_token', 'secret', 'createdAt', 'updatedAt', 'deletedAt', 'tenantId'];
    sensitiveFields.forEach(field => delete sanitized[field]);
    return sanitized;
  }
}
