import { apiFetch } from "./base-client";

export interface ConfigItem {
  id: string;
  nombre: string;
  descripcion?: string | null;
  frecuenciaSugerida?: number | null;
  riesgoSugerido?: string | null;
  activo?: boolean;
  [key: string]: unknown;
}

type ApiListResponse<T> = T[] | { data?: T[] };

const unwrapList = <T>(response: ApiListResponse<T>): T[] => {
  if (Array.isArray(response)) {
    return response;
  }

  return Array.isArray(response.data) ? response.data : [];
};

export const configClient = {
  async getSegmentos(): Promise<ConfigItem[]> {
    const res = await apiFetch<ApiListResponse<ConfigItem>>("/config-clientes/segmentos");
    return unwrapList(res);
  },
  async getRiesgos(): Promise<ConfigItem[]> {
    const res = await apiFetch<ApiListResponse<ConfigItem>>("/config-clientes/riesgos");
    return unwrapList(res);
  },
  async getIntereses(): Promise<ConfigItem[]> {
    const res = await apiFetch<ApiListResponse<ConfigItem>>("/config-clientes/intereses");
    return unwrapList(res);
  },
  async createInteres(data: Record<string, unknown>) {
    return apiFetch("/config-clientes/intereses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateInteres(id: string, data: Record<string, unknown>) {
    return apiFetch(`/config-clientes/intereses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  async getTiposServicio(empresaId: string): Promise<ConfigItem[]> {
    const res = await apiFetch<ApiListResponse<ConfigItem>>(
      `/config-clientes/tipos-servicio?empresaId=${empresaId}`,
    );
    return unwrapList(res);
  },
  async getMetodosPago(empresaId: string): Promise<ConfigItem[]> {
    const res = await apiFetch<ApiListResponse<ConfigItem>>(
      `/config-clientes/metodos-pago?empresaId=${empresaId}`,
    );
    return unwrapList(res);
  },
  async getZonas(empresaId: string): Promise<ConfigItem[]> {
    const res = await apiFetch<ApiListResponse<ConfigItem>>(
      `/config-clientes/zonas?empresaId=${empresaId}`,
    );
    return unwrapList(res);
  },
  async getServicios(empresaId?: string): Promise<ConfigItem[]> {
    const url = empresaId ? `/config-clientes/servicios?empresaId=${empresaId}` : "/config-clientes/servicios";
    const res = await apiFetch<ApiListResponse<ConfigItem>>(url);
    return unwrapList(res);
  },
  async createServicio(data: Record<string, unknown>) {
    return apiFetch("/config-clientes/servicios", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateServicio(id: string, data: Record<string, unknown>) {
    return apiFetch(`/config-clientes/servicios/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  async deleteServicio(id: string) {
    return apiFetch(`/config-clientes/servicios/${id}`, {
      method: "DELETE",
    });
  },
  async getClienteOperativa(clienteId: string): Promise<unknown[]> {
    const res = await apiFetch<ApiListResponse<unknown>>(
      `/config-clientes/operativa/${clienteId}`,
    );
    return unwrapList(res);
  },
  async upsertOperativa(payload: Record<string, unknown>) {
    return apiFetch("/config-clientes/operativa", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
};
