import { apiFetch } from "./base-client";

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  banco?: string;
  tipoCuenta?: string;
  numeroCuenta?: string;
  valorHora?: number;
  isTenantAdmin?: boolean;
  isGlobalSuAdmin?: boolean;
  membershipId?: string;
  tenantId?: string;
  empresaId?: string;
  empresaIds?: string[];
  sesionId?: string;
}

export interface LoginResponse {
  access_token: string;
  user: UserProfile;
}

export const authClient = {
  async login(data: Record<string, unknown>) {
    return apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async register(data: Record<string, unknown>) {
    return apiFetch<UserProfile>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async forgotPassword(email: string) {
    return apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async getProfile(): Promise<UserProfile> {
    return apiFetch<UserProfile>("/auth/profile", {
      includeEnterpriseId: false,
    });
  },

  async updateTestRole(role: string) {
    return apiFetch("/auth/test-role", {
      method: "PATCH",
      body: JSON.stringify({ role })
    });
  },

  async logout() {
    return apiFetch("/auth/logout", {
      method: "POST"
    });
  }
};
