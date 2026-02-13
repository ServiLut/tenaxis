"use server";

import { cookies } from "next/headers";

export async function isTenantAdminAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token || token === "undefined") {
    return false;
  }

  try {
    const apiUrl = process.env.API_URL || "http://localhost:4000";
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
    const apiUrl = process.env.API_URL || "http://127.0.0.1:4000";
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
    const apiUrl = process.env.API_URL || "http://127.0.0.1:4000";
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
