import { UnauthorizedException } from '@nestjs/common';
import { Role } from '../../generated/client/client';
import { JwtPayload } from '../../auth/jwt-payload.interface';

export interface PrismaAccessFilter {
  tenantId?: string;
  empresaId?: string | { in: string[] };
}

const BLOCKED_EMPRESA_ID = '00000000-0000-0000-0000-000000000000';

export function hasTenantWideAccess(user: JwtPayload): boolean {
  if (user.isGlobalSuAdmin) {
    return true;
  }

  return (
    user.role === Role.SU_ADMIN ||
    user.role === Role.ADMIN ||
    user.role === Role.COORDINADOR
  );
}

export function resolveScopedEmpresaId(
  user: JwtPayload,
  requestedEmpresaId: string,
): string;
export function resolveScopedEmpresaId(
  user: JwtPayload,
  requestedEmpresaId?: string,
): string | undefined;
export function resolveScopedEmpresaId(
  user: JwtPayload,
  requestedEmpresaId?: string,
): string | undefined {
  if (user.isGlobalSuAdmin) {
    return requestedEmpresaId;
  }

  if (hasTenantWideAccess(user)) {
    return requestedEmpresaId;
  }

  const allowedIds = user.empresaIds || [];

  if (requestedEmpresaId) {
    if (!allowedIds.includes(requestedEmpresaId)) {
      throw new UnauthorizedException(
        'No tienes acceso a la empresa solicitada',
      );
    }

    return requestedEmpresaId;
  }

  if (user.empresaId && allowedIds.includes(user.empresaId)) {
    return user.empresaId;
  }

  return allowedIds[0];
}

/**
 * Genera el filtro de Prisma (where clause) basado en la jerarquía estricta de permisos:
 * 1. SU_ADMIN (Global): Ve todos los tenants y todas las empresas.
 * 2. ADMIN (Tenant): Ve su tenant y TODAS las empresas dentro de él.
 * 3. COORDINADOR: Ve su tenant y TODAS las empresas dentro de él.
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
    };
  }

  // 2. ADMIN / SU_ADMIN / COORDINADOR (del Tenant)
  if (hasTenantWideAccess(user)) {
    return {
      tenantId: user.tenantId,
      ...(requestedEmpresaId ? { empresaId: requestedEmpresaId } : {}),
      // No filtramos empresaId por defecto -> Ve todas las del tenant
    };
  }

  // 4. ASESOR / OPERADOR (Basado en asignación específica)
  const allowedIds = user.empresaIds || [];

  if (requestedEmpresaId) {
    // Validación de seguridad: debe estar en su lista de asignadas
    if (!allowedIds.includes(requestedEmpresaId)) {
      return {
        tenantId: user.tenantId,
        empresaId: BLOCKED_EMPRESA_ID, // Bloqueo total
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
      in: allowedIds.length > 0 ? allowedIds : [BLOCKED_EMPRESA_ID],
    },
  };
}
