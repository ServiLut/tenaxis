"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout, JoinOrganization } from "@/components/dashboard";
import { DashboardProviders } from "./components/DashboardProviders";
import { DashboardContent } from "./components/DashboardContent";

export default function DashboardPage() {
  const [hasTenant, setHasTenant] = useState<boolean | null>(null);
  const [enterpriseId, setEnterpriseId] = useState<string | undefined>();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    let tenantExists = false;
    let entId: string | undefined;

    if (userData && userData !== "undefined") {
      try {
        const user = JSON.parse(userData);
        tenantExists = !!user.tenantId;

        if (user.tenantId) {
          const cookieEntries = document.cookie.split('; ');
          const hasTenantCookie = cookieEntries.some(row => row.startsWith('tenant-id='));
          if (!hasTenantCookie) {
            document.cookie = `tenant-id=${user.tenantId}; path=/; max-age=86400; SameSite=Lax`;
          }
          entId = cookieEntries.find(row => row.startsWith('x-enterprise-id='))?.split('=')[1];
        }
      } catch {
        tenantExists = false;
      }
    }

    setHasTenant(tenantExists);
    setEnterpriseId(entId);
  }, []);

  if (hasTenant === null) return null;

  if (!hasTenant) {
    return (
      <DashboardLayout>
        <JoinOrganization />
      </DashboardLayout>
    );
  }

  return (
    <DashboardProviders>
      <DashboardLayout>
        <DashboardContent enterpriseId={enterpriseId} />
      </DashboardLayout>
    </DashboardProviders>
  );
}
