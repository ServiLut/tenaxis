"use client";

import { useEffect, useState } from "react";
import {
  AccessScope,
  ScopeAwareUser,
  resolveAccessScope,
} from "@/lib/access-scope";

const EMPTY_SCOPE: AccessScope = {
  role: null,
  mode: "tenant",
  canSeeAllTenants: false,
  canSeeTenantWide: false,
  isEmpresaLocked: false,
  tenantId: null,
  empresaId: null,
  empresaIds: [],
};

export function useAccessScope() {
  const [scope, setScope] = useState<AccessScope>(EMPTY_SCOPE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("user");

    if (!raw) {
      setScope(EMPTY_SCOPE);
      setIsLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ScopeAwareUser;
      setScope(resolveAccessScope(parsed));
    } catch {
      setScope(EMPTY_SCOPE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { scope, isLoading };
}
