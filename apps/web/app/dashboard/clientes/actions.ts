"use server";

import { cookies } from "next/headers";

export async function createCliente(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return { error: "No se encontró sesión activa" };
  }

  const apiUrl = process.env.API_URL || "http://127.0.0.1:4000";
  
  // Extract primitive data
  const nombre = formData.get("nombre") as string;
  const apellido = formData.get("apellido") as string;
  const tipoDocumento = formData.get("tipoDocumento") as string;
  const numeroDocumento = formData.get("numeroDocumento") as string;
  const telefono = formData.get("telefono") as string;
  const telefono2 = formData.get("telefono2") as string;
  const correo = formData.get("correo") as string;
  
  // Parse JSON data for multiple entities
  const direccionesStr = formData.get("direcciones") as string;
  const vehiculosStr = formData.get("vehiculos") as string;
  
  let direcciones = [];
  let vehiculos = [];
  
  try {
    if (direccionesStr) direcciones = JSON.parse(direccionesStr);
    if (vehiculosStr) vehiculos = JSON.parse(vehiculosStr);
  } catch (e) {
    console.error("Error parsing JSON data from form", e);
  }

  // Clean data to match DTO (remove temporary IDs used in the UI)
  const cleanedDirecciones = direcciones.map(({ id, ...rest }: any) => rest);
  const cleanedVehiculos = vehiculos.map(({ id, ...rest }: any) => rest);

  const payload = {
    tipoCliente: "PERSONA",
    nombre,
    apellido,
    tipoDocumento,
    numeroDocumento,
    telefono,
    telefono2,
    correo,
    direcciones: cleanedDirecciones,
    vehiculos: cleanedVehiculos,
  };

  try {
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
      return { error: result.message || "Error al crear el cliente" };
    }

    return { 
      message: "Cliente creado exitosamente", 
      clienteId: result.data?.id || result.id 
    };
  } catch (error) {
    return { error: "Ocurrió un error inesperado" };
  }
}

export async function updateCliente(id: number, formData: FormData) {
  // Similarly update updateCliente if implemented
  return { error: "Actualización no implementada aún" };
}
