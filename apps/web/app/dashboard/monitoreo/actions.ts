"use server";

import { monitoringClient } from "@/lib/api/monitoreo-client";
import { 
  ApiResponse, 
  Session, 
  MonitoringStats, 
  MonitoringAlert, 
  MonitoringMetrics, 
  ExecutiveAuditMetrics,
  Audit,
  Log
} from "./types";

export async function getMonitoringSessions(): Promise<ApiResponse<Session[]>> {
  try {
    const data = await monitoringClient.getSessions() as Session[];
    return { data, message: "Success" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { data: [], message: msg };
  }
}

export async function getMonitoringStats(): Promise<ApiResponse<MonitoringStats>> {
  try {
    const data = await monitoringClient.getStats() as unknown as MonitoringStats;
    return { data, message: "Success" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { data: { totalEvents: 0, activeSessions: 0, totalInactivity: 0 }, message: msg };
  }
}

export async function getMonitoringAlerts(): Promise<ApiResponse<MonitoringAlert[]>> {
  try {
    const data = await monitoringClient.getAlerts() as MonitoringAlert[];
    return { data, message: "Success" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { data: [], message: msg };
  }
}

export async function getMonitoringMetrics(): Promise<ApiResponse<MonitoringMetrics>> {
  try {
    const data = await monitoringClient.getMetrics() as unknown as MonitoringMetrics;
    return { data, message: "Success" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { data: { avgActiveTimeMin: 0, totalInactivityMin: 0, topInactivity: [], mttfeSec: 0, userCount: 0 }, message: msg };
  }
}

export async function getExecutiveAuditMetrics(): Promise<ApiResponse<ExecutiveAuditMetrics>> {
  try {
    const data = await monitoringClient.getExecutiveAudit() as unknown as ExecutiveAuditMetrics;
    return { data, message: "Success" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { 
      data: { 
        today: { created: 0, updated: 0, deleted: 0, total: 0 }, 
        week: { created: 0, updated: 0, deleted: 0, total: 0 },
        topEntities: [],
        topUsers: [],
        successRate: 0
      }, 
      message: msg 
    };
  }
}

export async function getAudits(page: number = 1, limit: number = 20): Promise<ApiResponse<Audit[]>> {
  try {
    const result = await monitoringClient.getAudits(page, limit) as Record<string, unknown>;
    return {
      data: (result.results || result.data || result) as Audit[],
      meta: (result.meta || { total: 0, page, limit }) as Record<string, unknown>,
      message: "Success"
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { data: [], message: msg };
  }
}

export async function getRecentLogs(): Promise<ApiResponse<Log[]>> {
  try {
    const data = await monitoringClient.getRecentLogs() as Log[];
    return { data, message: "Success" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { data: [], message: msg };
  }
}

export async function getMemberLogs(membershipId: string): Promise<ApiResponse<Log[]>> {
  try {
    const data = await monitoringClient.getLogsByMembership(membershipId) as Log[];
    return { data, message: "Success" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { data: [], message: msg };
  }
}

export async function trackEventAction(tipo: string, descripcion?: string, ruta?: string) {
  try {
    return await monitoringClient.trackEvent({ tipo, descripcion, ruta });
  } catch (_error) {
    return null;
  }
}

export async function heartbeatAction() {
  try {
    return await monitoringClient.sendHeartbeat();
  } catch (_error) {
    return null;
  }
}
