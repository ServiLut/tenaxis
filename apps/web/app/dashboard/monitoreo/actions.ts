"use server";

import { monitoringClient } from "@/lib/api/monitoreo-client";
import { ApiResponse } from "./types";

export async function getMonitoringSessions(): Promise<ApiResponse<any[]>> {
  try {
    const data = await monitoringClient.getSessions();
    return { data, message: "Success" };
  } catch (error: any) {
    return { data: [], message: error.message };
  }
}

export async function getMonitoringStats(): Promise<ApiResponse<any>> {
  try {
    const data = await monitoringClient.getStats();
    return { data, message: "Success" };
  } catch (error: any) {
    return { data: { totalEvents: 0, activeSessions: 0, totalInactivity: 0 }, message: error.message };
  }
}

export async function getMonitoringAlerts(): Promise<ApiResponse<any[]>> {
  try {
    const data = await monitoringClient.getAlerts();
    return { data, message: "Success" };
  } catch (error: any) {
    return { data: [], message: error.message };
  }
}

export async function getMonitoringMetrics(): Promise<ApiResponse<any>> {
  try {
    const data = await monitoringClient.getMetrics();
    return { data, message: "Success" };
  } catch (error: any) {
    return { data: { avgActiveTimeMin: 0, totalInactivityMin: 0, topInactivity: [], mttfeSec: 0, userCount: 0 }, message: error.message };
  }
}

export async function getExecutiveAuditMetrics(): Promise<ApiResponse<any>> {
  try {
    const data = await monitoringClient.getExecutiveAudit();
    return { data, message: "Success" };
  } catch (error: any) {
    return { 
      data: { 
        today: { created: 0, updated: 0, deleted: 0, total: 0 }, 
        week: { created: 0, updated: 0, deleted: 0, total: 0 },
        topEntities: [],
        topUsers: [],
        successRate: 0
      }, 
      message: error.message 
    };
  }
}

export async function getAudits(page: number = 1, limit: number = 20): Promise<ApiResponse<any[]>> {
  try {
    const result = await monitoringClient.getAudits(page, limit);
    return {
      data: result.results || result.data || result,
      meta: result.meta || { total: 0, page, limit },
      message: "Success"
    };
  } catch (error: any) {
    return { data: [], message: error.message };
  }
}

export async function getRecentLogs(): Promise<ApiResponse<any[]>> {
  try {
    const data = await monitoringClient.getRecentLogs();
    return { data, message: "Success" };
  } catch (error: any) {
    return { data: [], message: error.message };
  }
}

export async function getMemberLogs(membershipId: string): Promise<ApiResponse<any[]>> {
  try {
    const data = await monitoringClient.getLogsByMembership(membershipId);
    return { data, message: "Success" };
  } catch (error: any) {
    return { data: [], message: error.message };
  }
}

export async function trackEventAction(tipo: string, descripcion?: string, ruta?: string) {
  try {
    return await monitoringClient.trackEvent({ tipo, descripcion, ruta });
  } catch (error) {
    return null;
  }
}

export async function heartbeatAction() {
  try {
    return await monitoringClient.sendHeartbeat();
  } catch (error) {
    return null;
  }
}
