import { apiFetch } from "./base-client";

export const configClient = {
  async getSegmentos(): Promise<any[]> {
    return apiFetch<any[]>("/config-clientes/segmentos");
  },
  async getRiesgos(): Promise<any[]> {
    return apiFetch<any[]>("/config-clientes/riesgos");
  },
  async getIntereses(): Promise<any[]> {
    return apiFetch<any[]>("/config-clientes/intereses");
  },
  async getTiposServicio(empresaId: string): Promise<any[]> {
    return apiFetch<any[]>(`/config-clientes/tipos-servicio?empresaId=${empresaId}`);
  },
  async getMetodosPago(empresaId: string): Promise<any[]> {
    return apiFetch<any[]>(`/config-clientes/metodos-pago?empresaId=${empresaId}`);
  },
  async getZonas(empresaId: string): Promise<any[]> {
    return apiFetch<any[]>(`/config-clientes/zonas?empresaId=${empresaId}`);
  },
  async getServicios(empresaId?: string): Promise<any[]> {
    const url = empresaId ? `/config-clientes/servicios?empresaId=${empresaId}` : "/config-clientes/servicios";
    return apiFetch<any[]>(url);
  },
  async getClienteOperativa(clienteId: string): Promise<any[]> {
    return apiFetch<any[]>(`/config-clientes/operativa/${clienteId}`);
  },
  async upsertOperativa(payload: any) {
    return apiFetch("/config-clientes/operativa", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
};
