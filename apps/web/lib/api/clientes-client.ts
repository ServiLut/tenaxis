import { apiFetch } from "./base-client";

export interface Cliente {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  telefono: string;
  razonSocial?: string | null;
  nit?: string | null;
  tipoCliente: "PERSONA" | "EMPRESA";
  // Add other fields as needed
}

export const clientesClient = {
  async getAll(): Promise<Cliente[]> {
    return apiFetch<Cliente[]>("/clientes/list", { cache: "no-store" });
  },

  async getById(id: string): Promise<Cliente | null> {
    try {
      return await apiFetch<Cliente>(`/clientes/${id}`, { cache: "no-store" });
    } catch (error) {
      console.error("clientesClient.getById error:", error);
      return null;
    }
  },

  async create(data: any) {
    return apiFetch("/clientes/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any) {
    return apiFetch(`/clientes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return apiFetch(`/clientes/${id}`, {
      method: "DELETE",
    });
  }
};
