import { apiFetch } from "./base-client";

export interface Enterprise {
  id: string;
  nombre: string;
  nit?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export const enterpriseClient = {
  async getAll(): Promise<Enterprise[]> {
    const result = await apiFetch<any>("/enterprise");
    if (result && typeof result === "object" && "items" in result && Array.isArray(result.items)) {
      return result.items;
    }
    return Array.isArray(result) ? result : [];
  },
  async getOperators(empresaId: string): Promise<unknown[]> {
    return apiFetch<unknown[]>(`/enterprise/${empresaId}/operators`);
  },
  async create(data: Record<string, unknown>) {
    return apiFetch<Enterprise>("/enterprise/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async update(id: string, data: Record<string, unknown>) {
    return apiFetch<Enterprise>(`/enterprise/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  async delete(id: string) {
    return apiFetch(`/enterprise/${id}`, {
      method: "DELETE",
    });
  }
};
