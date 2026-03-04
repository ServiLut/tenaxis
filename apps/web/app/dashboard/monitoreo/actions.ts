"use server";

import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function getMonitoringSessions() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch(`${API_URL}/monitoring/sessions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 60 }, // Revalidate every minute
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch monitoring sessions");
  }

  const result = await response.json();
  return result.data || result;
}

export async function getMonitoringStats() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch(`${API_URL}/monitoring/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 30 }, // Revalidate every 30 seconds
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch stats");
  }

  const result = await response.json();
  return result.data || result;
}

export async function getAudits() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch(`${API_URL}/monitoring/audits`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch audits");
  }

  const result = await response.json();
  return result.data || result;
}

export async function getRecentLogs() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch(`${API_URL}/monitoring/recent-logs`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch recent logs");
  }

  const result = await response.json();
  return result.data || result;
}

export async function getMemberLogs(membershipId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch(`${API_URL}/monitoring/logs/${membershipId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch logs");
  }

  const result = await response.json();
  return result.data || result;
}
