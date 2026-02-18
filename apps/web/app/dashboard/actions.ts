"use server";

import { cookies } from "next/headers";

export async function isTenantAdminAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token || token === "undefined") {
    return false;
  }

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://localhost:4000";
    const response = await fetch(`${apiUrl}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return [];

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/clientes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return [];

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
  origenCliente?: string | null;
  tipoInteresId?: string | null;
  razonSocial?: string | null;
  nit?: string | null;
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

export async function createClienteAction(payload: ClienteDTO) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) throw new Error("No session found");

  try {
    const apiUrl = process.env.NESTJS_API_URL || "http://127.0.0.1:4000";
    const response = await fetch(`${apiUrl}/clientes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Error al crear el cliente");
    }

    return result.data || result;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Ocurrió un error inesperado");
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
    throw new Error("Ocurrió un error inesperado");
  }
}
