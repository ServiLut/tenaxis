"use client";

import { createClient } from "@/utils/supabase/client";

export interface ClienteDTO {
  id?: string;
  tipoCliente: "EMPRESA" | "PERSONA";
  razonSocial?: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  telefono2?: string;
  correo?: string;
  numeroDocumento?: string;
  tipoDocumento?: string;
  nit?: string;
  segmento?: string;
  subsegmento?: string;
  nivelRiesgo?: string;
  clasificacion?: string;
  actividadEconomica?: string;
  representanteLegal?: string;
  score?: number;
  origenCliente?: string;
  frecuenciaServicio?: number;
  ticketPromedio?: number;
  ultimaVisita?: string;
  proximaVisita?: string;
}

export interface ServiciosKpis {
  total: number;
  programadosHoy: number;
  enCurso: number;
  vencidosSla: number;
  cumplimientoSlaPct: number;
  porcentajeLiquidacion: number;
  recaudoHoy: number;
  ticketPromedio: number;
  sinEvidencia: number;
}

export interface FollowUpStatusItem {
  id: string;
  dueAt: string;
  followUpType: string;
  ordenServicioId: string;
  cliente: string;
  servicio: string;
}

export interface FollowUpStatusResponse {
  blocked: boolean;
  overdueCount: number;
  overdueItems: FollowUpStatusItem[];
  activeOverride: {
    id: string;
    startsAt: string;
    endsAt: string;
    reason?: string | null;
  } | null;
}

export interface CompleteFollowUpPayload {
  contactedAt: string;
  channel: string;
  outcome: string;
  resolution: "ACEPTADO" | "RECHAZADO";
  notes: string;
  nextActionAt?: string;
}

export interface OperatorDTO {
  id: string;
  nombre?: string;
  telefono?: string;
  user?: {
    nombre?: string;
    apellido?: string;
  };
}

type ApiOptions = RequestInit & {
  enterpriseId?: string;
};

type UploadKind = "facturaElectronica" | "comprobantePago" | "evidencias";

const getCookie = (name: string) => {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
};

const getDefaultHeaders = (enterpriseId?: string) => {
  const token = getCookie("access_token");
  const cookieEnterprise = getCookie("x-enterprise-id");
  const effectiveEnterpriseId = enterpriseId || cookieEnterprise;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (effectiveEnterpriseId) headers["x-enterprise-id"] = effectiveEnterpriseId;
  return headers;
};

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

async function apiFetch<T>(path: string, options: ApiOptions = {}) {
  const { enterpriseId, headers, ...rest } = options;
  const defaultHeaders = getDefaultHeaders(enterpriseId);

  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      ...defaultHeaders,
      ...(headers || {}),
    },
  });

  return unwrapData<T>(res);
}

export async function getOrdenesServicio(empresaId?: string) {
  const params = new URLSearchParams();
  if (empresaId) params.set("empresaId", empresaId);
  const query = params.toString();
  return apiFetch<Record<string, unknown>[]>(`/ordenes-servicio${query ? `?${query}` : ""}`);
}

export async function createOrdenServicio(body: object) {
  return apiFetch<Record<string, unknown>>("/ordenes-servicio", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function getMyFollowUpStatus(empresaId?: string) {
  const params = new URLSearchParams();
  if (empresaId) params.set("empresaId", empresaId);
  const query = params.toString();
  return apiFetch<FollowUpStatusResponse>(
    `/ordenes-servicio/follow-ups/my-status${query ? `?${query}` : ""}`,
  );
}

export async function completeFollowUp(
  id: string,
  body: CompleteFollowUpPayload,
) {
  return apiFetch<Record<string, unknown>>(`/ordenes-servicio/follow-ups/${id}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function getServiciosKpis(
  query: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && value !== "all") {
      params.set(key, value);
    }
  }
  const queryString = params.toString();
  return apiFetch<ServiciosKpis>(
    `/ordenes-servicio/kpis${queryString ? `?${queryString}` : ""}`,
  );
}

export async function getEstadoServicios(empresaId?: string) {
  const params = new URLSearchParams();
  if (empresaId) params.set("empresaId", empresaId);
  try {
    return await apiFetch<{ id: string; nombre: string }[]>(
      `/config-clientes/estados-servicio?${params.toString()}`,
    );
  } catch {
    return [];
  }
}

export async function getOperators(empresaId: string) {
  return apiFetch<OperatorDTO[]>(`/enterprise/${empresaId}/operators`);
}

export async function getMetodosPago(empresaId?: string) {
  const params = new URLSearchParams();
  if (empresaId) params.set("empresaId", empresaId);
  return apiFetch<{ id: string; nombre: string }[]>(
    `/config-clientes/metodos-pago?${params.toString()}`,
  );
}

export async function getMunicipalities() {
  return apiFetch<Array<{ id: string; name: string }>>("/geo/municipalities");
}

export async function updateOrdenServicio(id: string, body: object) {
  return apiFetch<Record<string, unknown>>(`/ordenes-servicio/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function createSignedUploadUrl(
  id: string,
  kind: UploadKind,
  fileName: string,
) {
  return apiFetch<{ signedUrl: string; token: string; path: string }>(
    `/ordenes-servicio/${id}/uploads/signed-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ kind, fileName }),
    },
  );
}

export async function uploadToSupabaseSignedUrl(
  path: string,
  token: string,
  file: File,
) {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("tenaxis-docs")
    .uploadToSignedUrl(path, token, file);

  if (error) {
    throw error;
  }
}

export async function confirmOrdenUpload(
  id: string,
  kind: UploadKind,
  paths: string[],
) {
  return apiFetch<Record<string, unknown>>(`/ordenes-servicio/${id}/uploads/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ kind, paths }),
  });
}

export async function notifyLiquidationWebhook(data: {
  telefono: string;
  cliente: string;
  fecha: string;
  servicio: string;
}) {
  return apiFetch<{ success: boolean; error?: string }>(
    "/ordenes-servicio/notifications/liquidation",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );
}

export async function notifyServiceOperatorWebhook(data: {
  telefonoOperador: string;
  numeroOrden: string;
  cliente: string;
  servicio: string;
  programacion: string;
  tecnico: string;
  estado: string;
  urgencia: string;
  direccion: string;
  linkMaps: string;
  municipio: string;
  barrio: string;
  detalles: string;
  valorCotizado: string;
  metodosPago: string;
  observaciones: string;
  idServicio: string;
}) {
  return apiFetch<{ success: boolean; error?: string }>(
    "/ordenes-servicio/notifications/operator",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );
}
