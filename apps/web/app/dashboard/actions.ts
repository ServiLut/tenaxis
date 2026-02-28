"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const enterpriseId = cookieStore.get("x-enterprise-id")?.value;
  const testRole = cookieStore.get("x-test-role")?.value;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (enterpriseId) {
    headers["x-enterprise-id"] = enterpriseId;
  }

  if (testRole) {
    headers["x-test-role"] = testRole;
  }

  return headers;
}

export async function isTenantAdminAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token || token === "undefined") {
    return false;
  }

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://localhost:4000";
    const headers = await getHeaders();
    const response = await fetch(`${apiUrl}/auth/profile`, {
      headers,
    });

    if (!response.ok) return false;

    const result = await response.json();

    // El interceptor de NestJS envuelve la respuesta en { data: { ... } }
    const data = result.data || result;
    return !!data.isTenantAdmin;
  } catch (error) {
    console.error("Error checking tenant admin status:", error);
    return false;
  }
}

export async function getTenantsAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/tenants`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return [];

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return [];
  }
}

export async function getTenantDetailAction(tenantId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) throw new Error("No session found");

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/tenants/${tenantId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error fetching tenant detail");
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching tenant detail:", error);
    throw error;
  }
}

export async function getPlansAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/plans`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return [];

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching plans:", error);
    return [];
  }
}

export async function getClientesAction() {
  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const headers = await getHeaders();
    console.log("FETCHING CLIENTES FROM /list WITH HEADERS", headers);
    const response = await fetch(`${apiUrl}/clientes/list`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("getClientesAction: response not ok", response.status);
      return [];
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}

export async function getSegmentosAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/config-clientes/segmentos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching segments:", error);
    return [];
  }
}

export async function getRiesgosAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/config-clientes/riesgos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching risks:", error);
    return [];
  }
}

export async function getTiposInteresAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/config-clientes/intereses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching interest types:", error);
    return [];
  }
}

export async function getTiposServicioAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const empresaId = cookieStore.get("x-enterprise-id")?.value;
  if (!token || !empresaId) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/config-clientes/tipos-servicio?empresaId=${empresaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching service types:", error);
    return [];
  }
}

export async function getMetodosPagoAction(empresaId?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const targetEmpresaId = empresaId || cookieStore.get("x-enterprise-id")?.value;
  
  if (!token || !targetEmpresaId) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/config-clientes/metodos-pago?empresaId=${targetEmpresaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return [];
  }
}

export async function getOperatorsAction(empresaId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token || !empresaId) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/enterprise/${empresaId}/operators`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching operators:", error);
    return [];
  }
}

export async function getMunicipalitiesAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/geo/municipalities`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching municipalities:", error);
    return [];
  }
}

export async function getDepartmentsAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/geo/departments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching departments:", error);
    return [];
  }
}

export async function getZonasAction(empresaId?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const targetEmpresaId = empresaId || cookieStore.get("x-enterprise-id")?.value;
  
  if (!token || !targetEmpresaId) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/config-clientes/zonas?empresaId=${targetEmpresaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching zones:", error);
    return [];
  }
}

export async function getServiciosAction(empresaId?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const targetEmpresaId = empresaId || cookieStore.get("x-enterprise-id")?.value;
  
  if (!token) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const url = targetEmpresaId 
      ? `${apiUrl}/config-clientes/servicios?empresaId=${targetEmpresaId}`
      : `${apiUrl}/config-clientes/servicios`;
      
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

export interface SegmentoNegocioDTO {
  nombre: string;
  descripcion?: string | null;
  frecuenciaSugerida?: number | null;
  riesgoSugerido?: string | null;
  activo?: boolean;
}

export interface NivelRiesgoOperativoDTO {
  nombre: string;
  color?: string | null;
  valor?: number;
  activo?: boolean;
}

export interface TipoInteresDTO {
  nombre: string;
  descripcion?: string | null;
  frecuenciaSugerida?: number | null;
  riesgoSugerido?: string | null;
  activo?: boolean;
}

export interface ServicioDTO {
  nombre: string;
  empresaId: string;
  activo?: boolean;
}

export interface DireccionDTO {
  direccion: string;
  piso?: string | null;
  bloque?: string | null;
  unidad?: string | null;
  barrio?: string | null;
  municipio?: string | null;
  linkMaps?: string | null;
  cargoContacto?: string | null;
  clasificacionPunto?: string | null;
  departmentId?: string | null;
  horarioFin?: string | null;
  horarioInicio?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  motivoBloqueo?: string | null;
  municipioId?: string | null;
  nombreContacto?: string | null;
  nombreSede?: string | null;
  precisionGPS?: number | null;
  restricciones?: string | null;
  telefonoContacto?: string | null;
  tipoUbicacion?: string | null;
  validadoPorSistema?: boolean;
}

export interface ClienteDTO {
  tipoCliente: "PERSONA" | "EMPRESA";
  nombre?: string | null;
  apellido?: string | null;
  telefono: string;
  telefono2?: string | null;
  correo?: string | null;
  origenCliente?: string | null;
  tipoInteresId?: string | null;
  razonSocial?: string | null;
  nit?: string | null;
  numeroDocumento?: string | null;
  tipoDocumento?: string | null;
  actividadEconomica?: string | null;
  metrajeTotal?: number | null;
  segmentoId?: string | null;
  riesgoId?: string | null;
  direcciones?: DireccionDTO[];
}

export async function createSegmentoAction(data: SegmentoNegocioDTO) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) throw new Error("No session found");

  const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
  const response = await fetch(`${apiUrl}/config-clientes/segmentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateSegmentoAction(id: string, data: Partial<SegmentoNegocioDTO>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) throw new Error("No session found");

  const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
  const response = await fetch(`${apiUrl}/config-clientes/segmentos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createRiesgoAction(data: NivelRiesgoOperativoDTO) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) throw new Error("No session found");

  const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
  const response = await fetch(`${apiUrl}/config-clientes/riesgos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateRiesgoAction(id: string, data: Partial<NivelRiesgoOperativoDTO>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) throw new Error("No session found");

  const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
  const response = await fetch(`${apiUrl}/config-clientes/riesgos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createTipoInteresAction(data: TipoInteresDTO) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) throw new Error("No session found");

  const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
  const response = await fetch(`${apiUrl}/config-clientes/intereses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateTipoInteresAction(id: string, data: Partial<TipoInteresDTO>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) throw new Error("No session found");

  const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
  const response = await fetch(`${apiUrl}/config-clientes/intereses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createServicioAction(data: ServicioDTO) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) throw new Error("No session found");

  const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
  const response = await fetch(`${apiUrl}/config-clientes/servicios`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateServicioAction(id: string, data: Partial<ServicioDTO>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) throw new Error("No session found");

  const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
  const response = await fetch(`${apiUrl}/config-clientes/servicios/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteServicioAction(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) throw new Error("No session found");

  const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
  const response = await fetch(`${apiUrl}/config-clientes/servicios/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

// --- Acciones de ConfiguraciÃ³n Operativa ---
export async function getClienteConfigsAction(clienteId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/config-clientes/operativa/${clienteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching client configs:", error);
    return [];
  }
}

export interface ElementoPredefinido {
  nombre: string;
  tipo: string;
  ubicacion: string;
}

export interface ConfiguracionOperativa {
  id: string;
  empresaId?: string;
  protocoloServicio?: string;
  observacionesFijas?: string;
  requiereFirmaDigital: boolean;
  requiereFotosEvidencia: boolean;
  duracionEstimada?: number;
  frecuenciaSugerida?: number;
  elementosPredefinidos?: ElementoPredefinido[];
  direccionId?: string;
  direccion?: {
    id: string;
    direccion: string;
  };
}

export interface UpsertClienteConfigPayload {
  clienteId: string;
  empresaId: string;
  direccionId: string | null;
  protocoloServicio: string;
  observacionesFijas: string;
  requiereFirmaDigital: boolean;
  requiereFotosEvidencia: boolean;
  duracionEstimada: number;
  frecuenciaSugerida: number;
  elementosPredefinidos: ElementoPredefinido[];
}

export async function upsertClienteConfigAction(payload: UpsertClienteConfigPayload) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return { success: false, error: "No session found" };

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/config-clientes/operativa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) return { success: false, error: result.message || "Error al guardar configuraciÃ³n" };

    revalidatePath("/dashboard/clientes");
    return { success: true, data: result.data || result };
  } catch (_error) {
    return { success: false, error: "OcurriÃ³ un error inesperado" };
  }
}

export async function createClienteAction(payload: ClienteDTO) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return { success: false, error: "No session found" };

  // Sanitize UUID fields: convert empty strings to null to avoid Prisma validation errors
  const sanitizedPayload = {
    ...payload,
    tipoInteresId: payload.tipoInteresId || null,
    segmentoId: payload.segmentoId || null,
    riesgoId: payload.riesgoId || null,
  };

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/clientes/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(sanitizedPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.message || "Error al crear el cliente" };
    }

    revalidatePath("/dashboard/clientes");
    return { success: true, data: result.data || result };
  } catch (error) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "OcurriÃ³ un error inesperado" };
  }
}

export async function getClienteByIdAction(id: string) {
  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const headers = await getHeaders();
    const response = await fetch(`${apiUrl}/clientes/${id}`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching client by id:", error);
    return null;
  }
}

export async function updateClienteAction(id: string, payload: Partial<ClienteDTO>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return { success: false, error: "No session found" };

  const sanitizedPayload = {
    ...payload,
    tipoInteresId: payload.tipoInteresId || null,
    segmentoId: payload.segmentoId || null,
    riesgoId: payload.riesgoId || null,
  };

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/clientes/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(sanitizedPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.message || "Error al actualizar el cliente" };
    }

    revalidatePath("/dashboard/clientes");
    return { success: true, data: result.data || result };
  } catch (error) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "OcurriÃ³ un error inesperado" };
  }
}

export async function deleteClienteAction(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return { success: false, error: "No session found" };

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/clientes/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const result = await response.json();
      return { success: false, error: result.message || "Error al eliminar el cliente" };
    }

    revalidatePath("/dashboard/clientes");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "OcurriÃ³ un error inesperado" };
  }
}


export async function createEnterpriseAction(data: { nombre: string }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) throw new Error("No session found");

  const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
  const response = await fetch(`${apiUrl}/enterprise/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Error al crear la empresa");
  }
  return result;
}

export async function updateEnterpriseAction(id: string, data: { nombre?: string; activo?: boolean }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) throw new Error("No session found");

  const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
  const response = await fetch(`${apiUrl}/enterprise/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Error al actualizar la empresa");
  }
  return result;
}

export async function deleteEnterpriseAction(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) throw new Error("No session found");

  const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
  const response = await fetch(`${apiUrl}/enterprise/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Error al eliminar la empresa");
  }
  return result;
}

export async function getEnterprisesAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/enterprise`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching enterprises:", error);
    return [];
  }
}

export async function createTenantAction(formData: {
  nombre: string;
  slug: string;
  ownerEmail: string;
  ownerPassword?: string;
  ownerNombre?: string;
  ownerApellido?: string;
  nit?: string;
  correo?: string;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) throw new Error("No session found");

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/tenants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Error al crear el tenant");
    }

    return result.data || result;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("OcurriÃ³ un error inesperado");
  }
}

export async function getOrdenesServicioAction(empresaId?: string) {
  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const headers = await getHeaders();
    
    // Si empresaId es "undefined", "null" o "all" como string, tratar como undefined
    const cleanEmpresaId = (empresaId === "undefined" || empresaId === "null" || empresaId === "all" || !empresaId) ? undefined : empresaId;
    
    const url = cleanEmpresaId 
      ? `${apiUrl}/ordenes-servicio?empresaId=${cleanEmpresaId}`
      : `${apiUrl}/ordenes-servicio`;
      
    const response = await fetch(url, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) return [];

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching service orders:", error);
    return [];
  }
}

export async function getOrdenesServicioByClienteAction(clienteId: string) {
  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const headers = await getHeaders();
    const response = await fetch(`${apiUrl}/ordenes-servicio?clienteId=${clienteId}`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) return [];

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching client service orders:", error);
    return [];
  }
}

export async function getOrdenServicioByIdAction(id: string) {
  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const headers = await getHeaders();
    const response = await fetch(`${apiUrl}/ordenes-servicio/${id}`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching order by id:", error);
    return null;
  }
}

export interface CreateOrdenServicioDTO {
  clienteId: string;
  empresaId: string;
  direccionId?: string;
  tecnicoId?: string;
  servicioEspecifico: string;
  urgencia?: string;
  observacion?: string;
  nivelInfestacion?: string;
  tipoVisita?: string;
  frecuenciaSugerida?: number;
  tipoFacturacion?: string;
  valorCotizado?: number;
  metodoPagoId?: string;
  entidadFinancieraNombre?: string;
  estadoPago?: string;
  estadoServicio?: string;
  fechaVisita?: string;
  horaInicio?: string;
  duracionMinutos?: number;
  facturaPath?: string;
  facturaElectronica?: string;
  comprobantePago?: string;
  evidenciaPath?: string;
  desglosePago?: any[];
  observacionFinal?: string;
  valorPagado?: number;
  referenciaPago?: string;
  fechaPago?: string;
  liquidadoPorId?: string;
}

export async function createOrdenServicioAction(
  payload: CreateOrdenServicioDTO,
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) return { success: false, error: 'No session found' };

  try {
    const apiUrl = process.env.NESTJS_API_URL || 'http://127.0.0.1:4000';
    const response = await fetch(`${apiUrl}/ordenes-servicio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.message || 'Error al crear la orden de servicio' };
    }

    revalidatePath('/dashboard/servicios');
    return { success: true, data: result.data || result };
  } catch (error) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: 'Ocurrió un error inesperado' };
  }
}

export async function updateOrdenServicioAction(
  id: string,
  payload: Partial<CreateOrdenServicioDTO>,
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) return { success: false, error: 'No session found' };

  try {
    const apiUrl = process.env.NESTJS_API_URL || 'http://127.0.0.1:4000';
    const response = await fetch(`${apiUrl}/ordenes-servicio/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.message || 'Error al actualizar la orden de servicio' };
    }

    revalidatePath('/dashboard/servicios');
    return { success: true, data: result.data || result };
  } catch (error) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: 'Ocurrió un error inesperado' };
  }
}

export async function getEstadoServiciosAction(empresaId?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const targetEmpresaId = empresaId || cookieStore.get("x-enterprise-id")?.value;
  
  if (!token || !targetEmpresaId) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/config-clientes/estados-servicio?empresaId=${targetEmpresaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching service states:", error);
    return [];
  }
}

export interface UpdateMembershipDTO {
  placa?: string;
  moto?: boolean;
  direccion?: string;
  municipioId?: string;
  role?: string;
  activo?: boolean;
  empresaIds?: string[];
}

export async function updateMembershipAction(
  membershipId: string,
  data: UpdateMembershipDTO,
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) throw new Error("No session found");

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/tenants/memberships/${membershipId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Error al actualizar membresía");
    
    revalidatePath("/dashboard/equipo-trabajo");
    return { success: true, data: result.data || result };
  } catch (error) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Ocurrió un error inesperado" };
  }
}

export async function addOrdenServicioEvidenciasAction(
  id: string,
  formData: FormData
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return { success: false, error: "No session found" };

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/ordenes-servicio/${id}/evidencias`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.message || "Error al subir las evidencias" };
    }

    revalidatePath("/dashboard/servicios");
    return { success: true, data: result.data || result };
  } catch (error) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Ocurrió un error inesperado" };
  }
}

export async function getRecaudoTecnicosAction(empresaId?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const url = empresaId 
      ? `${apiUrl}/contabilidad/recaudo-tecnicos?empresaId=${empresaId}`
      : `${apiUrl}/contabilidad/recaudo-tecnicos`;
      
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) return [];
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error("Error fetching technician collection:", error);
    return [];
  }
}

export async function registrarConsignacionAction(data: {
  tecnicoId: string;
  empresaId: string;
  valorConsignado: number;
  referenciaBanco: string;
  comprobantePath: string;
  ordenIds: string[];
  fechaConsignacion: string;
  observacion?: string;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return { success: false, error: "No session found" };

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/contabilidad/registrar-consignacion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.message || "Error al registrar consignación" };
    }

    revalidatePath("/dashboard/contabilidad");
    return { success: true, data: result.data || result };
  } catch (error) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Ocurrió un error inesperado" };
  }
}
