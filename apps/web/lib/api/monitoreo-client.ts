import { apiFetch } from "./base-client";

export const monitoringClient = {
  async getSessions(): Promise<unknown[]> {
    return apiFetch<unknown[]>("/monitoring/sessions");
  },
  async getStats(): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>("/monitoring/stats");
  },
  async getAlerts(): Promise<unknown[]> {
    return apiFetch<unknown[]>("/monitoring/alerts");
  },
  async getMetrics(): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>("/monitoring/metrics");
  },
  async getExecutiveAudit(): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>("/monitoring/executive-audit");
  },
  async getAudits(page: number = 1, limit: number = 10): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>(`/monitoring/audits?page=${page}&limit=${limit}`);
  },
  async getRecentLogs(): Promise<unknown[]> {
    return apiFetch<unknown[]>("/monitoring/recent-logs");
  },
  async getLogsByMembership(membershipId: string): Promise<unknown[]> {
    return apiFetch<unknown[]>(`/monitoring/logs/${membershipId}`);
  },
  async trackEvent(data: Record<string, unknown>) {
    return apiFetch("/monitoring/event", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async sendHeartbeat() {
    return apiFetch("/monitoring/heartbeat", {
      method: "POST",
    });
  }
};
