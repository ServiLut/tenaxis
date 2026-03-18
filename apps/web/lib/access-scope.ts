export type ScopedRole =
  | "SU_ADMIN"
  | "ADMIN"
  | "COORDINADOR"
  | "ASESOR"
  | "OPERADOR";

export interface ScopeAwareUser {
  role?: string | null;
  isGlobalSuAdmin?: boolean | null;
  tenantId?: string | null;
  empresaId?: string | null;
  empresaIds?: string[] | null;
}

export type AccessScopeMode = "global" | "tenant" | "empresa";

export interface AccessScope {
  role: ScopedRole | null;
  mode: AccessScopeMode;
  canSeeAllTenants: boolean;
  canSeeTenantWide: boolean;
  isEmpresaLocked: boolean;
  tenantId: string | null;
  empresaId: string | null;
  empresaIds: string[];
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

export function resolveAccessScope(user?: ScopeAwareUser | null): AccessScope {
  const role = getScopedRole(user?.role);
  const isGlobalSuAdmin = role === "SU_ADMIN" && !!user?.isGlobalSuAdmin;
  const canSeeTenantWide = !!role && (role === "SU_ADMIN" || role === "ADMIN" || role === "COORDINADOR");
  const empresaIds = resolveAvailableEmpresaIds(user);
  const isEmpresaLocked = isEmpresaSelectionLocked(user);

  return {
    role,
    mode: isGlobalSuAdmin ? "global" : isEmpresaLocked ? "empresa" : "tenant",
    canSeeAllTenants: isGlobalSuAdmin,
    canSeeTenantWide,
    isEmpresaLocked,
    tenantId: user?.tenantId ?? null,
    empresaId: user?.empresaId ?? null,
    empresaIds,
  };
}
