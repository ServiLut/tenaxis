import { apiFetch } from "./base-client";

type PaginatedResponse<T> = {
  data?: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type ServiciosListResponse = unknown[] | PaginatedResponse<unknown>;

export const serviciosClient = {
  async getAll(empresaId?: string, clienteId?: string): Promise<unknown[]> {
    let url = "/ordenes-servicio";
    const params = new URLSearchParams();
    if (empresaId && empresaId !== "all") params.append("empresaId", empresaId);
    if (clienteId) params.append("clienteId", clienteId);
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    
    const response = await apiFetch<ServiciosListResponse>(url, { cache: "no-store" });
    
    // Manejar respuestas paginadas (con data y meta) o el array directamente
    if (!Array.isArray(response) && Array.isArray(response.data)) {
      return response.data;
    }
    
    return Array.isArray(response) ? response : [];
  },

  async getById(id: string): Promise<Record<string, unknown> | null> {
    try {
      return await apiFetch<Record<string, unknown>>(`/ordenes-servicio/${id}`, { cache: "no-store" });
    } catch (error) {
      console.error("serviciosClient.getById error:", error);
      return null;
    }
  },

  async create(data: Record<string, unknown>) {
    return apiFetch("/ordenes-servicio", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, payload: Record<string, unknown> | FormData) {
    const isFormData = payload instanceof FormData;
    return apiFetch(`/ordenes-servicio/${id}`, {
      method: "PATCH",
      body: isFormData ? payload : JSON.stringify(payload),
    });
  },

  async addEvidencias(id: string, formData: FormData) {
    return apiFetch(`/ordenes-servicio/${id}/evidencias`, {
      method: "POST",
      body: formData,
    });
  },

  async delete(id: string) {
    return apiFetch(`/ordenes-servicio/${id}`, {
      method: "DELETE",
    });
  }
};
