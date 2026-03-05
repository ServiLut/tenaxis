"use server";

import { cookies } from "next/headers";
import { ApiResponse, Session, MonitoringStats, Audit, Log } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function getAuthToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) throw new Error("No token found");
  return token;
}

export async function getMonitoringSessions(): Promise<ApiResponse<Session[]>> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/monitoring/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch monitoring sessions");
  }

  const result = await response.json();
  // Normalize response to { data, meta, message }
  return {
    data: result.data || result,
    meta: result.meta,
    message: result.message
  };
}

export async function getMonitoringStats(): Promise<ApiResponse<MonitoringStats>> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/monitoring/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch stats");
  }

  const result = await response.json();
  return {
    data: result.data || result,
    meta: result.meta,
    message: result.message
  };
}

export async function getAudits(page: number = 1, limit: number = 20): Promise<ApiResponse<Audit[]>> {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const token = await getAuthToken();
  
  const response = await fetch(`${API_URL}/monitoring/audits?page=${page}&limit=${safeLimit}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch audits");
  }

  const result = await response.json();
  
  // Smark extraction: look for the array in results, data.results, or data
  let auditsList: Audit[] = [];
  if (Array.isArray(result.results)) auditsList = result.results;
  else if (result.data && Array.isArray(result.data.results)) auditsList = result.data.results;
  else if (Array.isArray(result.data)) auditsList = result.data;
  else if (Array.isArray(result)) auditsList = result;

  return {
    data: auditsList,
    meta: result.meta || result.data?.meta || { total: auditsList.length, page, limit: safeLimit, totalPages: 1 },
    message: result.message
  };
}

export async function getRecentLogs(): Promise<ApiResponse<Log[]>> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/monitoring/recent-logs`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch recent logs");
  }

  const result = await response.json();
  return {
    data: result.data || result,
    meta: result.meta,
    message: result.message
  };
}

export async function getMemberLogs(membershipId: string): Promise<ApiResponse<Log[]>> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/monitoring/logs/${membershipId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch logs");
  }

  const result = await response.json();
  return {
    data: result.data || result,
    meta: result.meta,
    message: result.message
  };
}
