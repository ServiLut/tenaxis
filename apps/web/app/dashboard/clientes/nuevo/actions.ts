"use server";

import { cookies } from "next/headers";

const apiUrl = process.env.API_URL || "http://127.0.0.1:4000";

async function getAuthToken() {
  const cookieStore = await cookies();
  return (await cookieStore).get("access_token")?.value;
}

export async function getDepartments() {
  const token = await getAuthToken();
  if (!token) return [];

  try {
    const res = await fetch(`${apiUrl}/geo/departments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    // NestJS TransformInterceptor envuelve en .data
    return Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
  } catch (e) {
    console.error("Error fetching departments", e);
    return [];
  }
}

export async function getMunicipalities() {
  const token = await getAuthToken();
  if (!token) return [];

  try {
    const res = await fetch(`${apiUrl}/geo/municipalities`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    return Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
  } catch (e) {
    console.error("Error fetching municipalities", e);
    return [];
  }
}

export async function getClientForMigration(token: string, id: number) {
  return null;
}

export async function getServilutionClientForMigration(token: string, id: number) {
  return null;
}
