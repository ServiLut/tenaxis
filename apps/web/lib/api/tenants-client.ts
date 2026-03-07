import { apiFetch } from "./base-client";

export interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  nit?: string;
  correo?: string;
  isActive: boolean;
}

export interface TenantMembership {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  user: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

export const tenantsClient = {
  async getAll(): Promise<Tenant[]> {
    return apiFetch<Tenant[]>("/tenants");
  },

  async getById(id: string): Promise<Tenant> {
    return apiFetch<Tenant>(`/tenants/${id}`);
  },

  async getMemberships(tenantId: string): Promise<TenantMembership[]> {
    return apiFetch<TenantMembership[]>(`/tenants/${tenantId}/memberships`, { cache: "no-store" });
  },

  async updateMembership(id: string, data: any) {
    return apiFetch(`/tenants/memberships/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async getPendingMemberships(tenantId: string): Promise<TenantMembership[]> {
    return apiFetch<TenantMembership[]>(`/tenants/${tenantId}/pending-memberships`, { cache: "no-store" });
  },

  async approveMembership(id: string) {
    return apiFetch(`/tenants/memberships/${id}/approve`, {
      method: "POST",
    });
  },

  async rejectMembership(id: string) {
    return apiFetch(`/tenants/memberships/${id}/reject`, {
      method: "POST",
    });
  },

  async createTenant(data: any) {
    return apiFetch("/tenants", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async join(slug: string) {
    return apiFetch("/tenants/join", {
      method: "POST",
      body: JSON.stringify({ slug }),
    });
  },

  async inviteMember(tenantId: string, data: any) {
    return apiFetch(`/tenants/${tenantId}/memberships`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
};
