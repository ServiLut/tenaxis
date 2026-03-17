import { Role } from '../../generated/client/client';
import { JwtPayload } from '../../auth/jwt-payload.interface';

export interface PrismaAccessFilter {
  tenantId?: string;
  empresaId?: string | { in: string[] };
}

/**
 * Genera el filtro de Prisma (where clause) basado en la jerarquía estricta de permisos:
 * 1. SU_ADMIN (Global): Ve todos los tenants y todas las empresas.
 * 2. ADMIN (Tenant): Ve su tenant y TODAS las empresas dentro de él.
 * 3. COORDINADOR: Ve su tenant y solo la(s) empresa(s) que tenga asignada(s).
 * 4. ASESOR / OPERADOR: Ve su tenant y solo la empresa que tenga asignada.
 */
export function getPrismaAccessFilter(
  user: JwtPayload,
  requestedEmpresaId?: string,
): PrismaAccessFilter {
  // 1. SU_ADMIN (Global)
  if (user.isGlobalSuAdmin) {
    return {
      ...(requestedEmpresaId ? { empresaId: requestedEmpresaId } : {}),
      ...(user.tenantId ? { tenantId: user.tenantId } : {}), // Opcional: si quiere filtrar por un tenant específico
    };
  }

  // 2. ADMIN / SU_ADMIN (del Tenant)
  if (user.role === Role.ADMIN || user.role === Role.SU_ADMIN) {
    return {
      tenantId: user.tenantId,
      ...(requestedEmpresaId ? { empresaId: requestedEmpresaId } : {}),
      // No filtramos empresaId por defecto -> Ve todas las del tenant
    };
  }

  // 3 y 4. COORDINADOR, ASESOR, OPERADOR (Basado en asignación específica)
  const allowedIds = user.empresaIds || [];

  if (requestedEmpresaId) {
    // Validación de seguridad: debe estar en su lista de asignadas
    if (!allowedIds.includes(requestedEmpresaId)) {
      return {
        tenantId: user.tenantId,
        empresaId: '00000000-0000-0000-0000-000000000000', // Bloqueo total
      };
    }
    return {
      tenantId: user.tenantId,
      empresaId: requestedEmpresaId,
    };
  }

  // Para listas generales, filtrar por todas sus empresas asignadas
  return {
    tenantId: user.tenantId,
    empresaId: {
      in:
        allowedIds.length > 0
          ? allowedIds
          : ['00000000-0000-0000-0000-000000000000'],
    },
  };
}
