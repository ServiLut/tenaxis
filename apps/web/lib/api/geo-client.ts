import { apiFetch } from "./base-client";

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Municipality {
  id: string;
  name: string;
  code: string;
  departmentId: string;
}

export const geoClient = {
  async getDepartments(): Promise<Department[]> {
    const res = await apiFetch<any>("/geo/departments");
    return Array.isArray(res) ? res : (res?.data || []);
  },
  async getMunicipalities(): Promise<Municipality[]> {
    const res = await apiFetch<any>("/geo/municipalities");
    return Array.isArray(res) ? res : (res?.data || []);
  }
};
