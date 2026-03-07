import { apiFetch } from "./base-client";

export const enterpriseClient = {
  async getAll(): Promise<any[]> {
    return apiFetch<any[]>("/enterprise");
  },
  async getOperators(empresaId: string): Promise<any[]> {
    return apiFetch<any[]>(`/enterprise/${empresaId}/operators`);
  },
  async create(data: any) {
    return apiFetch("/enterprise/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async update(id: string, data: any) {
    return apiFetch(`/enterprise/${id}`, {
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
