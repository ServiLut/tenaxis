"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout, JoinOrganization } from "@/components/dashboard";
import { DashboardProviders } from "./components/DashboardProviders";
import { DashboardContent } from "./components/DashboardContent";

const USER_STORAGE_KEY = "user";
const TENANT_COOKIE_KEY = "tenant-id";
const ENTERPRISE_COOKIE_KEY = "x-enterprise-id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;
const COOKIE_PATH = "/";
const COOKIE_SAME_SITE = "Lax";

type StoredUser = {
  tenantId?: string;
};

function getCookieValue(cookieName: string): string | undefined {
  const cookieEntries = document.cookie.split("; ");
  const value = cookieEntries
    .find((row) => row.startsWith(`${cookieName}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : undefined;
}

function setCookie(cookieName: string, value: string) {
  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${cookieName}=${encodeURIComponent(value)}; path=${COOKIE_PATH}; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=${COOKIE_SAME_SITE}${secureFlag}`;
}

export default function DashboardPage() {
  const [hasTenant, setHasTenant] = useState<boolean | null>(null);
  const [enterpriseId, setEnterpriseId] = useState<string | undefined>();

  useEffect(() => {
    const userData = localStorage.getItem(USER_STORAGE_KEY);
    let tenantExists = false;
    let currentEnterpriseId: string | undefined;

    if (userData && userData !== "undefined") {
      try {
        const user = JSON.parse(userData) as StoredUser;
        tenantExists = !!user.tenantId;

        if (user.tenantId) {
          const hasTenantCookie = !!getCookieValue(TENANT_COOKIE_KEY);
          if (!hasTenantCookie) {
            setCookie(TENANT_COOKIE_KEY, user.tenantId);
          }
          currentEnterpriseId = getCookieValue(ENTERPRISE_COOKIE_KEY);
        }
      } catch (_e) {
        tenantExists = false;
      }
    }

    // Defer state updates to the next tick to avoid cascading renders warning
    const timer = setTimeout(() => {
      setHasTenant(tenantExists);
      setEnterpriseId(currentEnterpriseId);
    }, 0);

    return () => clearTimeout(timer);
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
