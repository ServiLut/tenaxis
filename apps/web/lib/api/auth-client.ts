import { apiFetch } from "./base-client";

export const authClient = {
  async login(data: any) {
    return apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async register(data: any) {
    return apiFetch("/auth/register", {
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

  async getProfile(): Promise<any> {
    return apiFetch("/auth/profile");
  },

  async updateTestRole(role: string) {
    return apiFetch("/auth/test-role", {
      method: "PATCH",
      body: JSON.stringify({ role })
    });
  }
};
