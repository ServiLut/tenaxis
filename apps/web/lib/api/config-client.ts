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

export const configClient = {
  async getSegmentos(): Promise<ConfigItem[]> {
    return apiFetch<ConfigItem[]>("/config-clientes/segmentos");
  },
  async getRiesgos(): Promise<ConfigItem[]> {
    return apiFetch<ConfigItem[]>("/config-clientes/riesgos");
  },
  async getIntereses(): Promise<ConfigItem[]> {
    return apiFetch<ConfigItem[]>("/config-clientes/intereses");
  },
  async getTiposServicio(empresaId: string): Promise<ConfigItem[]> {
    return apiFetch<ConfigItem[]>(`/config-clientes/tipos-servicio?empresaId=${empresaId}`);
  },
  async getMetodosPago(empresaId: string): Promise<ConfigItem[]> {
    return apiFetch<ConfigItem[]>(`/config-clientes/metodos-pago?empresaId=${empresaId}`);
  },
  async getZonas(empresaId: string): Promise<ConfigItem[]> {
    return apiFetch<ConfigItem[]>(`/config-clientes/zonas?empresaId=${empresaId}`);
  },
  async getServicios(empresaId?: string): Promise<ConfigItem[]> {
    const url = empresaId ? `/config-clientes/servicios?empresaId=${empresaId}` : "/config-clientes/servicios";
    return apiFetch<ConfigItem[]>(url);
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
    return apiFetch<unknown[]>(`/config-clientes/operativa/${clienteId}`);
  },
  async upsertOperativa(payload: Record<string, unknown>) {
    return apiFetch("/config-clientes/operativa", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
};
