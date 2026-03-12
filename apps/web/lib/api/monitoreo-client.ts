import { apiFetch } from "./base-client";

export const monitoringClient = {
  async getSessions(date?: string): Promise<unknown[]> {
    const query = date ? `?date=${date}` : "";
    return apiFetch<unknown[]>(`/monitoring/sessions${query}`);
  },
  async getStats(date?: string): Promise<Record<string, unknown>> {
    const query = date ? `?date=${date}` : "";
    return apiFetch<Record<string, unknown>>(`/monitoring/stats${query}`);
  },
  async getAlerts(date?: string): Promise<unknown[]> {
    const query = date ? `?date=${date}` : "";
    return apiFetch<unknown[]>(`/monitoring/alerts${query}`);
  },
  async getMetrics(date?: string): Promise<Record<string, unknown>> {
    const query = date ? `?date=${date}` : "";
    return apiFetch<Record<string, unknown>>(`/monitoring/metrics${query}`);
  },
  async getExecutiveAudit(date?: string): Promise<Record<string, unknown>> {
    const query = date ? `?date=${date}` : "";
    return apiFetch<Record<string, unknown>>(`/monitoring/executive-audit${query}`);
  },
  async getAudits(page: number = 1, limit: number = 10, date?: string): Promise<Record<string, unknown>> {
    const dateQuery = date ? `&date=${date}` : "";
    return apiFetch<Record<string, unknown>>(`/monitoring/audits?page=${page}&limit=${limit}${dateQuery}`);
  },
  async getRecentLogs(date?: string): Promise<unknown[]> {
    const query = date ? `?date=${date}` : "";
    return apiFetch<unknown[]>(`/monitoring/recent-logs${query}`);
  },
  async getLogsByMembership(membershipId: string, date?: string): Promise<unknown[]> {
    const query = date ? `?date=${date}` : "";
    return apiFetch<unknown[]>(`/monitoring/logs/${membershipId}${query}`);
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
