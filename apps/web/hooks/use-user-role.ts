"use client";

import { useEffect, useState } from "react";
import { UserRole, hasPermission, PermissionKey } from "@/lib/rbac";

export type UserData = {
  tenantId: string | null;
  role: UserRole | null;
  id: string | null;
  nombre: string | null;
  email: string | null;
  isGlobalSuAdmin: boolean;
};

export function useUserRole() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const data = localStorage.getItem("user");
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setTimeout(() => {
          setUserData({
            tenantId: parsed.tenantId || null,
            role: parsed.role || null,
            id: parsed.id || null,
            nombre: parsed.nombre || null,
            email: parsed.email || null,
            isGlobalSuAdmin: !!parsed.isGlobalSuAdmin,
          });
          setIsLoading(false);
        }, 0);
      } catch {
        setTimeout(() => {
          setUserData(null);
          setIsLoading(false);
        }, 0);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkPermission = (action: PermissionKey) => {
    return hasPermission(userData?.role, action);
  };

  return { 
    ...userData,
    tenantId: userData?.tenantId,
    isLoading,
    checkPermission,
    hasRole: !!userData?.role
  };
}
