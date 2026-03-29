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
    const res = await apiFetch<any>("/config-clientes/segmentos");
    return Array.isArray(res) ? res : (res?.data || []);
  },
  async getRiesgos(): Promise<ConfigItem[]> {
    const res = await apiFetch<any>("/config-clientes/riesgos");
    return Array.isArray(res) ? res : (res?.data || []);
  },
  async getIntereses(): Promise<ConfigItem[]> {
    const res = await apiFetch<any>("/config-clientes/intereses");
    return Array.isArray(res) ? res : (res?.data || []);
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
    const res = await apiFetch<any>(`/config-clientes/tipos-servicio?empresaId=${empresaId}`);
    return Array.isArray(res) ? res : (res?.data || []);
  },
  async getMetodosPago(empresaId: string): Promise<ConfigItem[]> {
    const res = await apiFetch<any>(`/config-clientes/metodos-pago?empresaId=${empresaId}`);
    return Array.isArray(res) ? res : (res?.data || []);
  },
  async getZonas(empresaId: string): Promise<ConfigItem[]> {
    const res = await apiFetch<any>(`/config-clientes/zonas?empresaId=${empresaId}`);
    return Array.isArray(res) ? res : (res?.data || []);
  },
  async getServicios(empresaId?: string): Promise<ConfigItem[]> {
    const url = empresaId ? `/config-clientes/servicios?empresaId=${empresaId}` : "/config-clientes/servicios";
    const res = await apiFetch<any>(url);
    return Array.isArray(res) ? res : (res?.data || []);
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
    const res = await apiFetch<any>(`/config-clientes/operativa/${clienteId}`);
    return Array.isArray(res) ? res : (res?.data || []);
  },
  async upsertOperativa(payload: Record<string, unknown>) {
    return apiFetch("/config-clientes/operativa", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
};
