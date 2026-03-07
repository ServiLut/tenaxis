"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import https from "https";
import { contabilidadClient } from "@/lib/api/contabilidad-client";
import { tenantsClient } from "@/lib/api/tenants-client";
import { clientesClient } from "@/lib/api/clientes-client";
import { configClient } from "@/lib/api/config-client";
import { enterpriseClient } from "@/lib/api/enterprise-client";
import { serviciosClient } from "@/lib/api/servicios-client";
import { authClient } from "@/lib/api/auth-client";
import { apiFetch } from "@/lib/api/base-client";
import { DashboardStatsSchema, type DashboardStatsType } from "./schemas/dashboard.schema";

export type DashboardStats = DashboardStatsType;
export type ClienteDTO = any;
export type ConfiguracionOperativa = any;
export type ElementoPredefinido = any;

// --- Auth Actions ---
export async function isTenantAdminAction() {
  try {
    const data = await authClient.getProfile();
    return !!data.isTenantAdmin;
  } catch (error) {
    console.error("Error checking tenant admin status:", error);
    return false;
  }
}

export async function updateTestRoleAction(role: string) {
  try {
    const result = await authClient.updateTestRole(role);
    const cookieStore = await cookies();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    cookieStore.set("x-test-role", role, { path: "/", expires, sameSite: "lax" });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

// --- Tenant Actions ---
export async function getTenantsAction() {
  try {
    return await tenantsClient.getAll();
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return [];
  }
}

export async function getTenantDetailAction(tenantId: string) {
  try {
    return await tenantsClient.getById(tenantId);
  } catch (error) {
    console.error("Error fetching tenant detail:", error);
    throw error;
  }
}

export async function getPendingMembershipsAction(tenantId: string) {
  try {
    return await tenantsClient.getPendingMemberships(tenantId);
  } catch (error) {
    console.error("Error fetching pending memberships:", error);
    return [];
  }
}

export async function approveMembershipAction(id: string) {
  try {
    await tenantsClient.approveMembership(id);
    revalidatePath("/dashboard/solicitudes");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export async function rejectMembershipAction(id: string) {
  try {
    await tenantsClient.rejectMembership(id);
    revalidatePath("/dashboard/solicitudes");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export async function createTenantAction(formData: any) {
  try {
    return await tenantsClient.createTenant(formData);
  } catch (error) {
    console.error("Error creating tenant:", error);
    throw error;
  }
}

export async function joinTenantAction(slug: string) {
  try {
    const result = await tenantsClient.join(slug);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export async function updateMembershipAction(membershipId: string, data: any) {
  try {
    const result = await tenantsClient.updateMembership(membershipId, data);
    revalidatePath("/dashboard/equipo-trabajo");
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export async function getTenantMembershipsAction() {
  try {
    const profile = await authClient.getProfile();
    const tenantId = profile.tenantId;
    if (!tenantId) return [];
    return await tenantsClient.getMemberships(tenantId);
  } catch (error) {
    console.error("Error fetching memberships:", error);
    return [];
  }
}

export async function inviteMemberAction(tenantId: string, data: any) {
  try {
    const result = await tenantsClient.inviteMember(tenantId, data);
    revalidatePath("/dashboard/equipo-trabajo");
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

// --- Plan Actions ---
export async function getPlansAction() {
  try {
    return await apiFetch<any[]>("/plans");
  } catch (error) {
    console.error("Error fetching plans:", error);
    return [];
  }
}

// --- Client Actions ---
export async function getClientesAction() {
  try {
    return await clientesClient.getAll();
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}

export async function getClienteByIdAction(id: string) {
  try {
    return await clientesClient.getById(id);
  } catch (error) {
    console.error("Error fetching client by id:", error);
    return null;
  }
}

export async function createClienteAction(payload: any) {
  try {
    const result = await clientesClient.create(payload);
    revalidatePath("/dashboard/clientes");
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export async function updateClienteAction(id: string, payload: any) {
  try {
    const result = await clientesClient.update(id, payload);
    revalidatePath("/dashboard/clientes");
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export async function deleteClienteAction(id: string) {
  try {
    await clientesClient.delete(id);
    revalidatePath("/dashboard/clientes");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

// --- Config Actions ---
export async function getSegmentosAction() {
  try {
    return await configClient.getSegmentos();
  } catch (error) {
    console.error("Error fetching segments:", error);
    return [];
  }
}

export async function createSegmentoAction(data: any) {
  try {
    return await apiFetch("/config-clientes/segmentos", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw error;
  }
}

export async function updateSegmentoAction(id: string, data: any) {
  try {
    return await apiFetch(`/config-clientes/segmentos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw error;
  }
}

export async function getRiesgosAction() {
  try {
    return await configClient.getRiesgos();
  } catch (error) {
    console.error("Error fetching risks:", error);
    return [];
  }
}

export async function createRiesgoAction(data: any) {
  try {
    return await apiFetch("/config-clientes/riesgos", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw error;
  }
}

export async function updateRiesgoAction(id: string, data: any) {
  try {
    return await apiFetch(`/config-clientes/riesgos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw error;
  }
}

export async function getTiposInteresAction() {
  try {
    return await configClient.getIntereses();
  } catch (error) {
    console.error("Error fetching interest types:", error);
    return [];
  }
}

export async function createTipoInteresAction(data: any) {
  try {
    return await apiFetch("/config-clientes/intereses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw error;
  }
}

export async function updateTipoInteresAction(id: string, data: any) {
  try {
    return await apiFetch(`/config-clientes/intereses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw error;
  }
}

export async function getTiposServicioAction(empresaId: string) {
  if (!empresaId) return [];
  try {
    return await configClient.getTiposServicio(empresaId);
  } catch (error) {
    console.error("Error fetching service types:", error);
    return [];
  }
}

export async function getMetodosPagoAction(empresaId: string) {
  if (!empresaId) return [];
  try {
    return await configClient.getMetodosPago(empresaId);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return [];
  }
}

export async function getZonasAction(empresaId: string) {
  if (!empresaId) return [];
  try {
    return await configClient.getZonas(empresaId);
  } catch (error) {
    console.error("Error fetching zones:", error);
    return [];
  }
}

export async function getServiciosAction(empresaId?: string) {
  try {
    return await configClient.getServicios(empresaId);
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

export async function createServicioAction(data: any) {
  try {
    return await apiFetch("/config-clientes/servicios", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw error;
  }
}

export async function updateServicioAction(id: string, data: any) {
  try {
    return await apiFetch(`/config-clientes/servicios/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw error;
  }
}

export async function deleteServicioAction(id: string) {
  try {
    return await apiFetch(`/config-clientes/servicios/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    throw error;
  }
}

export async function getClienteConfigsAction(clienteId: string) {
  try {
    return await configClient.getClienteOperativa(clienteId);
  } catch (error) {
    console.error("Error fetching client configs:", error);
    return [];
  }
}

export async function upsertClienteConfigAction(payload: any) {
  try {
    const result = await configClient.upsertOperativa(payload);
    revalidatePath("/dashboard/clientes");
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export async function getEstadoServiciosAction(empresaId: string) {
  if (!empresaId) return [];
  try {
    return await apiFetch<any[]>(`/config-clientes/estados-servicio?empresaId=${empresaId}`);
  } catch (error) {
    console.error("Error fetching service states:", error);
    return [];
  }
}

// --- Enterprise Actions ---
export async function getOperatorsAction(empresaId: string) {
  if (!empresaId) return [];
  try {
    return await enterpriseClient.getOperators(empresaId);
  } catch (error) {
    console.error("Error fetching operators:", error);
    return [];
  }
}

export async function getEnterprisesAction() {
  try {
    return await enterpriseClient.getAll();
  } catch (error) {
    console.error("Error fetching enterprises:", error);
    return [];
  }
}

export async function createEnterpriseAction(data: any) {
  try {
    return await enterpriseClient.create(data);
  } catch (error) {
    throw error;
  }
}

export async function updateEnterpriseAction(id: string, data: any) {
  try {
    return await enterpriseClient.update(id, data);
  } catch (error) {
    throw error;
  }
}

export async function deleteEnterpriseAction(id: string) {
  try {
    return await enterpriseClient.delete(id);
  } catch (error) {
    throw error;
  }
}

// --- Service Order Actions ---
export async function getOrdenesServicioAction(empresaId?: string) {
  try {
    const cleanId = (empresaId === "all" || empresaId === "undefined" || !empresaId) ? undefined : empresaId;
    return await serviciosClient.getAll(cleanId);
  } catch (error) {
    console.error("Error fetching service orders:", error);
    return [];
  }
}

export async function getOrdenesServicioByClienteAction(clienteId: string) {
  try {
    return await serviciosClient.getAll(undefined, clienteId);
  } catch (error) {
    console.error("Error fetching client service orders:", error);
    return [];
  }
}

export async function getOrdenServicioByIdAction(id: string) {
  try {
    return await serviciosClient.getById(id);
  } catch (error) {
    console.error("Error fetching order by id:", error);
    return null;
  }
}

export async function createOrdenServicioAction(payload: any) {
  try {
    const result = await serviciosClient.create(payload);
    revalidatePath('/dashboard/servicios');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' };
  }
}

export async function updateOrdenServicioAction(id: string, payload: any) {
  try {
    const result = await serviciosClient.update(id, payload);
    revalidatePath('/dashboard/servicios');
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' };
  }
}

export async function deleteOrdenServicioAction(id: string) {
  try {
    await serviciosClient.delete(id);
    revalidatePath('/dashboard/servicios');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' };
  }
}

export async function addOrdenServicioEvidenciasAction(id: string, formData: FormData) {
  try {
    const result = await serviciosClient.addEvidencias(id, formData);
    revalidatePath("/dashboard/servicios");
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

// --- Finance Actions (Using unified contabilidadClient) ---
export async function getRecaudoTecnicosAction(empresaId?: string) {
  try {
    return await contabilidadClient.getRecaudoTecnicos(empresaId);
  } catch (error) {
    console.error("Error fetching technician collection:", error);
    return [];
  }
}

export async function getAccountingBalanceAction(empresaId?: string) {
  try {
    return await contabilidadClient.getBalance(empresaId);
  } catch (error) {
    console.error("Error fetching balance:", error);
    return null;
  }
}

export async function getEgresosAction(empresaId?: string) {
  try {
    return await contabilidadClient.getEgresos(empresaId);
  } catch (error) {
    console.error("Error fetching egresos:", error);
    return [];
  }
}

export async function getNominasAction(empresaId?: string) {
  try {
    return await contabilidadClient.getNominas(empresaId);
  } catch (error) {
    console.error("Error fetching nominas:", error);
    return [];
  }
}

export async function getAnticiposAction(empresaId?: string) {
  try {
    return await contabilidadClient.getAnticipos(empresaId);
  } catch (error) {
    console.error("Error fetching anticipos:", error);
    return [];
  }
}

export async function getMovimientosAction(empresaId?: string) {
  try {
    return await contabilidadClient.getMovimientos(empresaId);
  } catch (error) {
    console.error("Error fetching movements:", error);
    return [];
  }
}

export async function createEgresoAction(data: any) {
  try {
    const result = await contabilidadClient.crearEgreso(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export async function createAnticipoAction(data: any) {
  try {
    const result = await contabilidadClient.crearAnticipo(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export async function registrarConsignacionAction(formData: FormData) {
  try {
    const result = await contabilidadClient.registrarConsignacion(formData);
    revalidatePath("/dashboard/contabilidad");
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

import { geoClient } from "@/lib/api/geo-client";

// --- Geo Actions ---
export async function getMunicipalitiesAction() {
  try {
    return await geoClient.getMunicipalities();
  } catch (error) {
    console.error("Error fetching municipalities:", error);
    return [];
  }
}

export async function getDepartmentsAction() {
  try {
    return await geoClient.getDepartments();
  } catch (error) {
    console.error("Error fetching departments:", error);
    return [];
  }
}

// --- Dashboard Actions ---
export async function getDashboardStatsAction(empresaId?: string): Promise<DashboardStats> {
  const fallbackStats: DashboardStats = {
    kpis: {
      ingresos: { current: 0, previous: 0, change: 0 },
      ordenes: { current: 0, previous: 0, change: 0 },
      sla: { value: 0 },
      cobranza: { total: 0 },
    },
    trends: {
      ingresosSemanales: [0, 0, 0, 0, 0, 0, 0],
      monthlyComparison: [
        { label: 'Anterior', value: 0 },
        { label: 'Actual', value: 0 }
      ]
    },
    actionable: {
      vencidas: 0,
      sinAsignacion: 0,
      alertas: 0
    }
  };

  try {
    const cleanId = (empresaId === "all" || empresaId === "undefined" || !empresaId) ? undefined : empresaId;
    const url = cleanId ? `/dashboard/stats?empresaId=${cleanId}` : "/dashboard/stats";
    const data = await apiFetch<any>(url, { cache: "no-store" });
    const parsed = DashboardStatsSchema.safeParse(data);
    if (!parsed.success) {
      console.error("getDashboardStatsAction: Zod parsing failed", parsed.error);
      return fallbackStats;
    }
    return parsed.data;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return fallbackStats;
  }
}

// --- Webhook Actions ---
export async function notifyLiquidationWebhookAction(data: {
  telefono: string;
  cliente: string;
  fecha: string;
  servicio: string;
}) {
  const webhookUrl = process.env.N8N_MENSAJES_CLIENTES;
  if (!webhookUrl) return { success: false, error: "Webhook configuration missing" };

  try {
    const url = new URL(webhookUrl);
    const postData = JSON.stringify({ ...data, timestamp: new Date().toISOString() });
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + (url.search || ""),
      method: "POST",
      headers: { "Content-Type": "application/json", "Host": url.hostname },
      agent: new https.Agent({ rejectUnauthorized: false }),
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        res.on("end", () => resolve({ success: res.statusCode && res.statusCode >= 200 && res.statusCode < 300 }));
      });
      req.on("error", () => resolve({ success: false, error: "Error triggering webhook" }));
      req.write(postData);
      req.end();
    });
  } catch (error) {
    return { success: false, error: "Error setting up webhook" };
  }
}

export async function notifyServiceOperatorWebhookAction(data: any) {
  const webhookUrl = process.env.N8N_NOTIFICAR_SERVICIO;
  if (!webhookUrl) return { success: false, error: "Webhook configuration missing" };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, timestamp: new Date().toISOString() }),
    });
    return { success: response.ok };
  } catch (error) {
    return { success: false, error: "Error triggering webhook" };
  }
}
