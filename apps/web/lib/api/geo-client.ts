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
    return apiFetch<Department[]>("/geo/departments");
  },
  async getMunicipalities(): Promise<Municipality[]> {
    return apiFetch<Municipality[]>("/geo/municipalities");
  }
};
