import { apiFetch } from "./base-client";

export const monitoringClient = {
  async getSessions(): Promise<any[]> {
    return apiFetch<any[]>("/monitoring/sessions");
  },
  async getStats(): Promise<any> {
    return apiFetch<any>("/monitoring/stats");
  },
  async getAlerts(): Promise<any[]> {
    return apiFetch<any[]>("/monitoring/alerts");
  },
  async getMetrics(): Promise<any> {
    return apiFetch<any>("/monitoring/metrics");
  },
  async getExecutiveAudit(): Promise<any> {
    return apiFetch<any>("/monitoring/executive-audit");
  },
  async getAudits(page: number = 1, limit: number = 10): Promise<any> {
    return apiFetch<any>(`/monitoring/audits?page=${page}&limit=${limit}`);
  },
  async getRecentLogs(): Promise<any[]> {
    return apiFetch<any[]>("/monitoring/recent-logs");
  },
  async getLogsByMembership(membershipId: string): Promise<any[]> {
    return apiFetch<any[]>(`/monitoring/logs/${membershipId}`);
  },
  async trackEvent(data: any) {
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
