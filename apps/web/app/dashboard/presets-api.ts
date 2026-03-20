"use client";

import { getBrowserAuthHeaders } from "@/lib/api/browser-client";

export type DashboardPresetModule = "SERVICIOS" | "CLIENTES";
export type DashboardPresetColorToken =
  | "slate"
  | "red"
  | "orange"
  | "amber"
  | "emerald"
  | "teal"
  | "sky"
  | "blue"
  | "indigo"
  | "pink";

export interface DashboardPreset {
  id: string;
  module: DashboardPresetModule;
  name: string;
  colorToken: DashboardPresetColorToken;
  isShared: boolean;
  filters: Record<string, unknown>;
  createdByMembershipId: string;
  createdAt: string;
  updatedAt: string;
}

const unwrapData = async <T>(res: Response): Promise<T> => {
  const contentType = res.headers.get("content-type");
  let data: unknown;

  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${text || res.statusText}`);
    }
    data = text;
  }

  if (!res.ok) {
    const message = ((data as Record<string, unknown>)?.message as string) || ((data as Record<string, unknown>)?.error as string) || "Error de API";
    throw new Error(message);
  }
  return ((data as Record<string, unknown>)?.data ?? data) as T;
};

export async function listDashboardPresets(module: DashboardPresetModule) {
  const params = new URLSearchParams({ module });
  const res = await fetch(`/api/dashboard-presets?${params.toString()}`, {
    headers: getBrowserAuthHeaders(),
  });
  return unwrapData<DashboardPreset[]>(res);
}

export async function createDashboardPreset(input: {
  module: DashboardPresetModule;
  name: string;
  colorToken: DashboardPresetColorToken;
  isShared: boolean;
  filters: Record<string, unknown>;
}) {
  const res = await fetch("/api/dashboard-presets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getBrowserAuthHeaders(),
    },
    body: JSON.stringify(input),
  });
  return unwrapData<DashboardPreset>(res);
}

export async function updateDashboardPreset(
  id: string,
  input: Partial<{
    name: string;
    colorToken: DashboardPresetColorToken;
    isShared: boolean;
    filters: Record<string, unknown>;
  }>,
) {
  const res = await fetch(`/api/dashboard-presets/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getBrowserAuthHeaders(),
    },
    body: JSON.stringify(input),
  });
  return unwrapData<DashboardPreset>(res);
}

export async function deleteDashboardPreset(id: string) {
  const res = await fetch(`/api/dashboard-presets/${id}`, {
    method: "DELETE",
    headers: getBrowserAuthHeaders(),
  });
  return unwrapData<{ success: boolean }>(res);
}

export const PRESET_COLOR_STYLES: Record<DashboardPresetColorToken, string> = {
  slate: "border-slate-300 bg-slate-50 text-slate-700",
  red: "border-red-300 bg-red-50 text-red-700",
  orange: "border-orange-300 bg-orange-50 text-orange-700",
  amber: "border-amber-300 bg-amber-50 text-amber-700",
  emerald: "border-emerald-300 bg-emerald-50 text-emerald-700",
  teal: "border-teal-300 bg-teal-50 text-teal-700",
  sky: "border-sky-300 bg-sky-50 text-sky-700",
  blue: "border-blue-300 bg-blue-50 text-blue-700",
  indigo: "border-indigo-300 bg-indigo-50 text-indigo-700",
  pink: "border-pink-300 bg-pink-50 text-pink-700",
};
