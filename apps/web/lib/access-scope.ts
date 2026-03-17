export type ScopedRole =
  | "SU_ADMIN"
  | "ADMIN"
  | "COORDINADOR"
  | "ASESOR"
  | "OPERADOR";

export interface ScopeAwareUser {
  role?: string | null;
  isGlobalSuAdmin?: boolean | null;
  empresaId?: string | null;
  empresaIds?: string[] | null;
}

const SINGLE_EMPRESA_ROLES = new Set<ScopedRole>(["ASESOR", "OPERADOR"]);

export function getScopedRole(role?: string | null): ScopedRole | null {
  if (
    role === "SU_ADMIN" ||
    role === "ADMIN" ||
    role === "COORDINADOR" ||
    role === "ASESOR" ||
    role === "OPERADOR"
  ) {
    return role;
  }

  return null;
}

export function canAccessTenantsView(user?: ScopeAwareUser | null): boolean {
  return getScopedRole(user?.role) === "SU_ADMIN" && !!user?.isGlobalSuAdmin;
}

export function isEmpresaSelectionLocked(user?: ScopeAwareUser | null): boolean {
  const role = getScopedRole(user?.role);
  return role ? SINGLE_EMPRESA_ROLES.has(role) : false;
}

export function resolveAvailableEmpresaIds(user?: ScopeAwareUser | null): string[] {
  const ids = user?.empresaIds?.filter(Boolean) ?? [];
  if (ids.length > 0) {
    return ids;
  }

  return user?.empresaId ? [user.empresaId] : [];
}
