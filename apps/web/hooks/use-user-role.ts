"use client";

import { useEffect, useState } from "react";

export function useUserRole() {
  const [userData, setUserData] = useState<{ tenantId: number | null } | null>(null);

  useEffect(() => {
    const data = localStorage.getItem("user");
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setUserData({ tenantId: parsed.tenantId ? Number(parsed.tenantId) : null });
      } catch {
        setUserData({ tenantId: null });
      }
    }
  }, []);

  return { tenantId: userData?.tenantId };
}
