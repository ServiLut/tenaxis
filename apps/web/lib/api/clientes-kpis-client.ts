import { apiFetch } from "./base-client";

export interface ClientesDashboardKpisResponse {
  segmentacion: {
    riesgoFuga: { count: number };
    upsellPotencial: { count: number };
    dormidos: { count: number };
    operacionEstable: { count: number };
  } | null;
  overview: {
    total: number;
    empresas: number;
    oro: number;
    riesgoCritico: number;
    avgScore: number;
  } | null;
}

export const clientesKpisClient = {
  async getDashboardKpis(
    options?: { refresh?: boolean },
  ): Promise<ClientesDashboardKpisResponse> {
    const params = new URLSearchParams();
    if (options?.refresh) {
      params.set("refresh", "true");
    }

    return apiFetch<ClientesDashboardKpisResponse>(
      `/clientes/dashboard-kpis${params.toString() ? `?${params.toString()}` : ""}`,
      {
      cache: "no-store",
      includeEnterpriseId: true,
      },
    );
  },
};
