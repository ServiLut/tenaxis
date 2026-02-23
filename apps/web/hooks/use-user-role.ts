"use client";

import { useEffect, useState } from "react";

export function useUserRole() {
  const [userData, setUserData] = useState<{ tenantId: string | null } | null>(null);

  useEffect(() => {
    const data = localStorage.getItem("user");
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setTimeout(() => {
          setUserData({ tenantId: parsed.tenantId || null });
        }, 0);
      } catch {
        setTimeout(() => {
          setUserData({ tenantId: null });
        }, 0);
      }
    }
  }, []);

  return { tenantId: userData?.tenantId };
}
