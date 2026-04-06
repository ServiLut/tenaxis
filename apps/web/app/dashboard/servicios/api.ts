"use client";

import { apiFetch } from "@/lib/api/base-client";
import { createClient } from "@/utils/supabase/client";

export type UploadKind = "facturaElectronica" | "comprobantePago" | "evidencias";

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

export interface OrdenServicioPayload {
  [key: string]: unknown;
  clienteId: string;
  empresaId: string;
  tecnicoId?: string;
  direccionId?: string;
  creadoPorId?: string;
  servicioId?: string;
  servicioEspecifico?: string;
  serviciosSeleccionados?: string[];
  urgencia?: string;
  nivelInfestacion?: string;
  tipoVisita?: string;
  frecuenciaSugerida?: number;
  tipoFacturacion?: string;
  valorCotizado?: number;
  confirmarMovimientoFinanciero?: boolean;
  desglosePago?: Array<{
    metodo: string;
    monto: number;
    banco?: string;
    referencia?: string;
  }>;
  estadoServicio?: string;
  fechaVisita?: string;
  horaInicio?: string;
  duracionMinutos?: number;
  observacion?: string;
  observacionFinal?: string;
  diagnosticoTecnico?: string;
  intervencionRealizada?: string;
  hallazgosEstructurales?: string;
  recomendacionesObligatorias?: string;
  huboSellamiento?: boolean;
  huboRecomendacionEstructural?: boolean;
  horaInicioReal?: string;
  horaFinReal?: string;
}

export interface OrdenServicioDetail extends Record<string, unknown> {
  id: string;
  numeroOrden?: string;
  clienteId: string;
  empresaId: string;
  tecnicoId?: string | null;
  direccionId?: string | null;
  serviciosSeleccionados?: string[] | null;
  fechaVisita?: string | null;
  horaInicio?: string | null;
  horaInicioReal?: string | null;
  horaFinReal?: string | null;
  duracionRealMinutos?: number;
  duracionMinutos?: number;
  servicio?: { nombre?: string | null };
  tipoVisita?: string | null;
  nivelInfestacion?: string | null;
  frecuenciaSugerida?: number | string | null;
  urgencia?: string | null;
  observacion?: string | null;
  observacionFinal?: string | null;
  diagnosticoTecnico?: string | null;
  intervencionRealizada?: string | null;
  hallazgosEstructurales?: string | null;
  recomendacionesObligatorias?: string | null;
  huboSellamiento?: boolean | null;
  huboRecomendacionEstructural?: boolean | null;
  valorCotizado?: number | null;
  desglosePago?: DesglosePagoItem[];
  tipoFacturacion?: string | null;
  estadoServicio?: string | null;
}

export interface DesglosePagoItem {
  metodo: string;
  monto: number;
  banco?: string | null;
  referencia?: string | null;
  observacion?: string | null;
}

export interface ComprobantePagoItem {
  path: string;
  tipo?: string | null;
  monto?: number;
  fecha?: string | null;
  referenciaPago?: string | null;
  fechaPago?: string | null;
  banco?: string | null;
  observacion?: string | null;
}

export interface GeolocalizacionItem {
  id: string;
  llegada?: string | null;
  salida?: string | null;
  latitud?: number | string | null;
  longitud?: number | string | null;
  linkMaps?: string | null;
  fotoLlegada?: string | null;
  fotoSalida?: string | null;
  membership?: {
    user?: {
      nombre?: string | null;
      apellido?: string | null;
    } | null;
  } | null;
}

export interface SeguimientoItem {
  id: string;
  status?: string;
  dueAt?: string;
  contactedAt?: string | null;
  completedAt?: string | null;
  followUpType?: string;
  channel?: string | null;
  outcome?: string | null;
  notes?: string | null;
}

export interface OrdenServicioRaw {
  id: string;
  hallazgosEstructurales?: string | null;
  numeroOrden?: string;
  ordenPadreId?: string | null;
  cliente: ClienteDTO;
  clienteId: string;
  empresaId: string;
  empresa?: { id: string; nombre: string };
  servicio?: { id: string; nombre: string };
  servicioId?: string;
  serviciosSeleccionados?: string[] | null;
  tecnicoId?: string;
  fechaVisita?: string;
  horaInicio?: string;
  horaFin?: string;
  tecnico?: { id: string; user?: { nombre: string; apellido: string } };
  creadoPor?: { id: string; user?: { nombre: string; apellido: string } };
  urgencia?: string;
  observacion?: string;
  observacionFinal?: string;
  huboSellamiento?: boolean;
  huboRecomendacionEstructural?: boolean;
  diagnosticoTecnico?: string | null;
  intervencionRealizada?: string | null;
  recomendacionesObligatorias?: string | null;
  recomendacionesSugeridas?: string | null;
  nivelInfestacion?: string;
  condicionesHigiene?: string;
  condicionesLocal?: string;
  tipoVisita?: string;
  frecuenciaSugerida?: number;
  tipoFacturacion?: string;
  valorCotizado?: number;
  valorPagado?: number;
  valorRepuestos?: number;
  valorRepuestosTecnico?: number;
  metodoPagoId?: string;
  metodoPago?: { id: string; nombre: string };
  entidadFinanciera?: { id: string; nombre: string };
  liquidadoPor?: { user: { nombre: string; apellido: string } };
  liquidadoAt?: string;
  desglosePago?: DesglosePagoItem[];
  estadoPago?: string;
  estadoServicio?: string;
  createdAt: string;
  updatedAt?: string;
  direccionTexto?: string;
  barrio?: string;
  municipio?: string;
  departamento?: string;
  piso?: string;
  bloque?: string;
  unidad?: string;
  zona?: { id: string; nombre: string };
  vehiculoId?: string;
  vehiculo?: {
    placa: string;
    marca?: string | null;
    modelo?: string | null;
    color?: string | null;
    tipo?: string | null;
  };
  facturaPath?: string | null;
  facturaElectronica?: string | null;
  financialLock?: boolean;
  comprobantePago?: ComprobantePagoItem[] | string | null;
  referenciaPago?: string | null;
  fechaPago?: string | null;
  linkMaps?: string | null;
  evidenciaPath?: string | null;
  evidencias?: { id: string; path: string }[];
  geolocalizaciones?: GeolocalizacionItem[];
  seguimientos?: SeguimientoItem[];
  ordenesHijas?: OrdenServicioRaw[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ExportOrdenesServicioPayload {
  empresaIds?: string[];
  includeAllEmpresas?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  preset?:
    | "HOY"
    | "MANANA"
    | "SEMANA"
    | "SEGUIMIENTOS"
    | "VENCIDOS"
    | "SIN_TECNICO"
    | "PENDIENTES_LIQUIDAR"
    | "RECHAZADOS";
}

export interface ServicioExportRow {
  numeroOrden: string;
  empresa: string;
  cliente: string;
  servicio: string;
  fechaVisita: string | null;
  horaInicio: string | null;
  tecnico: string;
  tipoVisita: string | null;
  estadoServicio: string | null;
  estadoPago: string | null;
  urgencia: string | null;
  valorCotizado: number;
  valorPagado: number;
  metodoPago: string;
  municipio: string | null;
  departamento: string | null;
  direccion: string | null;
  creador: string;
  creadaEn: string;
}

export async function getOrdenesServicio(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "all" && value !== "") {
      params.set(key, String(value));
    }
  }
  const queryString = params.toString();
  return apiFetch<PaginatedResponse<OrdenServicioRaw>>(
    `/ordenes-servicio${queryString ? `?${queryString}` : ""}`,
  );
}

export async function exportOrdenesServicio(body: ExportOrdenesServicioPayload) {
  return apiFetch<ServicioExportRow[]>("/ordenes-servicio/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function getOrdenServicio(id: string) {
  return apiFetch<OrdenServicioDetail>(`/ordenes-servicio/${id}`);
}

export async function createOrdenServicio(body: OrdenServicioPayload) {
  return apiFetch<OrdenServicioDetail>("/ordenes-servicio", {
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

export async function getOperators(empresaId?: string) {
  const url = empresaId ? `/enterprise/${empresaId}/operators` : '/enterprise/operators';
  return apiFetch<OperatorDTO[]>(url);
}

export interface TenantMembershipDTO {
  id: string;
  role: string;
  user: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
}

export interface DepartmentDTO {
  id: string;
  name: string;
}

export interface MunicipalityDTO {
  id: string;
  name: string;
  departmentId: string;
}

export async function getTenantMemberships(tenantId: string) {
  return apiFetch<TenantMembershipDTO[]>(`/tenants/${tenantId}/memberships`);
}

export async function getMetodosPago(empresaId?: string) {
  const params = new URLSearchParams();
  if (empresaId) params.set("empresaId", empresaId);
  return apiFetch<{ id: string; nombre: string }[]>(
    `/config-clientes/metodos-pago?${params.toString()}`,
  );
}

export async function getDepartments() {
  return apiFetch<DepartmentDTO[]>("/geo/departments");
}

export async function getMunicipalities(departmentId?: string) {
  const params = new URLSearchParams();
  if (departmentId) params.set("departmentId", departmentId);
  return apiFetch<MunicipalityDTO[]>(
    `/geo/municipalities${params.toString() ? `?${params.toString()}` : ""}`,
  );
}

export async function updateOrdenServicio(id: string, body: Partial<OrdenServicioPayload>) {
  return apiFetch<OrdenServicioDetail>(`/ordenes-servicio/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function deleteOrdenServicio(id: string, reason: string) {
  return apiFetch<Record<string, unknown>>(`/ordenes-servicio/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
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
  idServicio: string;
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

export async function triggerReinforcementsJob() {
  return apiFetch<{ procesadas: number }>("/ordenes-servicio/trigger-reinforcements-job", {
    method: "POST",
  });
}
