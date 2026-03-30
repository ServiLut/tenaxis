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

type ApiListResponse<T> = T[] | { data?: T[] };

const unwrapList = <T>(response: ApiListResponse<T>): T[] => {
  if (Array.isArray(response)) {
    return response;
  }

  return Array.isArray(response.data) ? response.data : [];
};

export const geoClient = {
  async getDepartments(): Promise<Department[]> {
    const res = await apiFetch<ApiListResponse<Department>>("/geo/departments");
    return unwrapList(res);
  },
  async getMunicipalities(): Promise<Municipality[]> {
    const res = await apiFetch<ApiListResponse<Municipality>>("/geo/municipalities");
    return unwrapList(res);
  }
};
