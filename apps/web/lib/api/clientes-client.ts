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

export interface ClienteSearchResult {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  telefono?: string | null;
  telefono2?: string | null;
  razonSocial?: string | null;
  nit?: string | null;
  numeroDocumento?: string | null;
  tipoCliente: "PERSONA" | "EMPRESA";
  createdAt?: string;
  direcciones?: Direccion[];
}

export interface Cliente extends ClienteSearchResult {
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

export interface ContratoCliente {
  id: string;
  tenantId: string;
  clienteId: string;
  empresaId: string;
  estado: "ACTIVO" | "PAUSADO" | "VENCIDO" | "CANCELADO";
  fechaInicio: string;
  fechaFin?: string | null;
  serviciosComprometidos?: number | null;
  frecuenciaServicio?: number | null;
  tipoFacturacion:
    | "UNICO"
    | "CONTRATO_MENSUAL"
    | "PLAN_TRIMESTRAL"
    | "PLAN_SEMESTRAL"
    | "PLAN_ANUAL";
  observaciones?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContratoClientePayload {
  empresaId: string;
  fechaInicio: string;
  fechaFin?: string | null;
  serviciosComprometidos?: number | null;
  frecuenciaServicio?: number | null;
  tipoFacturacion: ContratoCliente["tipoFacturacion"];
  estado?: ContratoCliente["estado"];
  observaciones?: string | null;
}

type ContratoClienteApiResponse = Partial<ContratoCliente> & {
  contratoId?: string;
  contrato_id?: string;
  tenant_id?: string;
  cliente_id?: string;
  empresa_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string | null;
  servicios_comprometidos?: number | null;
  frecuencia_servicio?: number | null;
  tipo_facturacion?: ContratoCliente["tipoFacturacion"];
  created_at?: string;
  updated_at?: string;
};

function normalizeContratoCliente(
  contrato: ContratoClienteApiResponse | null,
): ContratoCliente | null {
  if (!contrato) {
    return null;
  }

  const contractId = contrato.id ?? contrato.contratoId ?? contrato.contrato_id;
  if (!contractId) {
    return null;
  }

  return {
    id: contractId,
    tenantId: contrato.tenantId ?? contrato.tenant_id ?? "",
    clienteId: contrato.clienteId ?? contrato.cliente_id ?? "",
    empresaId: contrato.empresaId ?? contrato.empresa_id ?? "",
    estado: contrato.estado ?? "ACTIVO",
    fechaInicio: contrato.fechaInicio ?? contrato.fecha_inicio ?? "",
    fechaFin: contrato.fechaFin ?? contrato.fecha_fin ?? null,
    serviciosComprometidos:
      contrato.serviciosComprometidos ?? contrato.servicios_comprometidos ?? null,
    frecuenciaServicio:
      contrato.frecuenciaServicio ?? contrato.frecuencia_servicio ?? null,
    tipoFacturacion:
      contrato.tipoFacturacion ?? contrato.tipo_facturacion ?? "CONTRATO_MENSUAL",
    observaciones: contrato.observaciones ?? null,
    createdAt: contrato.createdAt ?? contrato.created_at,
    updatedAt: contrato.updatedAt ?? contrato.updated_at,
  };
}

export const clientesClient = {
  async getAll(options?: {
    includeEnterpriseId?: boolean;
  }): Promise<Cliente[]> {
    return apiFetch<Cliente[]>("/clientes/list", {
      cache: "no-store",
      includeEnterpriseId: options?.includeEnterpriseId,
    });
  },

  async search(
    query: string,
    options?: {
      limit?: number;
      includeEnterpriseId?: boolean;
    },
  ): Promise<ClienteSearchResult[]> {
    const params = new URLSearchParams();
    const normalizedQuery = query.trim();

    if (normalizedQuery) {
      params.set("q", normalizedQuery);
    }

    params.set("limit", String(options?.limit ?? 10));

    const result = await apiFetch<
      ClienteSearchResult[] | { data?: ClienteSearchResult[]; items?: ClienteSearchResult[] }
    >(`/clientes/search?${params.toString()}`, {
      cache: "no-store",
      includeEnterpriseId: options?.includeEnterpriseId,
    });

    if (Array.isArray(result)) {
      return result;
    }

    return result.data ?? result.items ?? [];
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
  },

  async getActiveContrato(id: string, empresaId?: string) {
    const params = new URLSearchParams();
    if (empresaId) {
      params.set("empresaId", empresaId);
    }
    const query = params.toString();
    const contrato = await apiFetch<ContratoClienteApiResponse | null>(
      `/clientes/${id}/contrato-activo${query ? `?${query}` : ""}`,
      { cache: "no-store" },
    );
    return normalizeContratoCliente(contrato);
  },

  async createContrato(id: string, data: ContratoClientePayload) {
    const contrato = await apiFetch<ContratoClienteApiResponse>(
      `/clientes/${id}/contratos`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    const normalizedContrato = normalizeContratoCliente(contrato);
    if (!normalizedContrato) {
      throw new Error("La API devolvio un contrato sin identificador.");
    }
    return normalizedContrato;
  },

  async updateContrato(id: string, data: Partial<ContratoClientePayload>) {
    const contrato = await apiFetch<ContratoClienteApiResponse>(
      `/clientes/contratos/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
    const normalizedContrato = normalizeContratoCliente(contrato);
    if (!normalizedContrato) {
      throw new Error("La API devolvio un contrato sin identificador.");
    }
    return normalizedContrato;
  }
};
