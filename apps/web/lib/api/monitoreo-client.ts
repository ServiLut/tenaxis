import { apiFetch } from "./base-client";

interface MonitoringParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

const buildQuery = (params: MonitoringParams) => {
  const q = new URLSearchParams();
  if (params.date) q.append("date", params.date);
  if (params.startDate) q.append("startDate", params.startDate);
  if (params.endDate) q.append("endDate", params.endDate);
  if (params.page) q.append("page", params.page.toString());
  if (params.limit) q.append("limit", params.limit.toString());
  const str = q.toString();
  return str ? `?${str}` : "";
};

export const monitoringClient = {
  async getSessions(params: MonitoringParams = {}): Promise<unknown[]> {
    return apiFetch<unknown[]>(`/monitoring/sessions${buildQuery(params)}`);
  },
  async getStats(params: MonitoringParams = {}): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>(`/monitoring/stats${buildQuery(params)}`);
  },
  async getAlerts(params: MonitoringParams = {}): Promise<unknown[]> {
    return apiFetch<unknown[]>(`/monitoring/alerts${buildQuery(params)}`);
  },
  async getMetrics(params: MonitoringParams = {}): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>(`/monitoring/metrics${buildQuery(params)}`);
  },
  async getExecutiveAudit(params: MonitoringParams = {}): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>(`/monitoring/executive-audit${buildQuery(params)}`);
  },
  async getAudits(params: MonitoringParams = {}): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>(`/monitoring/audits${buildQuery(params)}`);
  },
  async getRecentLogs(params: MonitoringParams = {}): Promise<unknown[]> {
    return apiFetch<unknown[]>(`/monitoring/recent-logs${buildQuery(params)}`);
  },
  async getPayrollPreview(params: MonitoringParams = {}): Promise<Record<string, unknown>> {
    return apiFetch<Record<string, unknown>>(`/monitoring/payroll-preview${buildQuery(params)}`);
  },
  async getLogsByMembership(membershipId: string, params: MonitoringParams = {}): Promise<unknown[]> {
    return apiFetch<unknown[]>(`/monitoring/logs/${membershipId}${buildQuery(params)}`);
  },
  async trackEvent(data: Record<string, unknown>) {
    return apiFetch("/monitoring/event", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async sendHeartbeat(inactiveMinutes: number = 0) {
    return apiFetch("/monitoring/heartbeat", {
      method: "POST",
      body: JSON.stringify({ inactiveMinutes }),
    });
  }
};
