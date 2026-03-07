import { apiFetch } from "./base-client";

export interface Direccion {
  id: string;
  departmentId?: string;
  municipioId?: string;
  municipio?: string;
  barrio?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  linkMaps?: string;
  piso?: string;
  bloque?: string;
  unidad?: string;
  tipoUbicacion?: string;
  clasificacionPunto?: string;
  horarioInicio?: string;
  horarioFin?: string;
  restricciones?: string;
  nombreContacto?: string;
  telefonoContacto?: string;
  cargoContacto?: string;
  activa?: boolean;
  bloqueada?: boolean;
  motivoBloqueo?: string;
  precisionGPS?: number;
  validadoPorSistema?: boolean;
  municipioRel?: {
    id: string;
    name: string;
  };
}

export interface Cliente {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  telefono: string;
  telefono2?: string | null;
  razonSocial?: string | null;
  nit?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  correo?: string | null;
  tipoCliente: "PERSONA" | "EMPRESA";
  clasificacion?: "ORO" | "PLATA" | "BRONCE" | "RIESGO";
  interesId?: string | null;
  segmentoId?: string | null;
  riesgoId?: string | null;
  proximaVisita?: string | null;
  createdAt?: string;
  empresa?: { id: string, nombre: string };
  direcciones?: Direccion[];
  ordenesServicio?: unknown[];
  origenCliente?: string | null;
  actividadEconomica?: string | null;
  metrajeTotal?: number | null;
  segmento?: string | null;
  nivelRiesgo?: string | null;
  tipoInteresId?: string | null;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async create(data: any) {
    return apiFetch<Cliente>("/clientes/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update(id: string, data: any) {
    return apiFetch<Cliente>(`/clientes/${id}`, {
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
