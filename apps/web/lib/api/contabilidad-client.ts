import { apiFetch } from "./base-client";
import { GenerateMonitoringPayrollResponse } from "@/app/dashboard/monitoreo/types";

export interface TechnicianRecaudo {
  id: string;
  nombre: string;
  apellido: string;
  saldoPendiente: number;
  ordenesPendientesCount: number;
  ultimaTransferencia: string | null;
  diasSinTransferir: number;
  ordenesIds: string[];
  declaraciones: Array<{
    ordenId: string;
    valorDeclarado: number;
    fechaDeclaracion: string;
  }>;
}

export interface AccountingBalance {
  ingresos: { total: number; change: number };
  egresos: { total: number; change: number };
  utilidad: { total: number; change: number };
  categorias: { label: string; value: number; color: string }[];
}

export interface MovimientoFinanciero {
  id: string;
  createdAt?: string;
  fechaGeneracion?: string;
  monto?: number;
  totalPagar?: number;
  titulo?: string;
  razon?: string;
  estado?: string;
  membership?: {
    user: {
      nombre: string;
      apellido: string;
    };
  };
}

export interface GenerateMonitoringPayrollPayload {
  empresaId: string;
  fechaInicio: string;
  fechaFin: string;
  membershipIds?: string[];
  includeAllEligible?: boolean;
  observaciones?: string;
}

export interface RegistrarConsignacionPayload {
  tecnicoId: string;
  empresaId: string;
  valorConsignado?: number;
  referenciaBanco: string;
  ordenIds: string[];
  fechaConsignacion: string;
  observacion?: string;
  comprobantePath: string;
}

export interface SendLiquidationReminderResponse {
  success: boolean;
  membershipId: string;
  saldoPendiente: number;
  ordenesPendientesCount: number;
  message: string;
}

export const contabilidadClient = {
  async getRecaudoTecnicos(empresaId?: string): Promise<TechnicianRecaudo[]> {
    const url = empresaId
      ? `/finanzas/recaudo-tecnicos?empresaId=${empresaId}`
      : `/finanzas/recaudo-tecnicos`;
    return apiFetch<TechnicianRecaudo[]>(url, { cache: "no-store" });
  },

  async getBalance(empresaId?: string): Promise<AccountingBalance | null> {
    const url = empresaId
      ? `/finanzas/balance?empresaId=${empresaId}`
      : `/finanzas/balance`;
    try {
      return await apiFetch<AccountingBalance>(url, { cache: "no-store" });
    } catch (error) {
      console.error("contabilidadClient.getBalance error:", error);
      return null;
    }
  },

  async getEgresos(empresaId?: string): Promise<MovimientoFinanciero[]> {
    const url = empresaId
      ? `/finanzas/egresos?empresaId=${empresaId}`
      : `/finanzas/egresos`;
    return apiFetch<MovimientoFinanciero[]>(url, { cache: "no-store" });
  },

  async getNominas(empresaId?: string): Promise<MovimientoFinanciero[]> {
    const url = empresaId
      ? `/finanzas/nominas?empresaId=${empresaId}`
      : `/finanzas/nominas`;
    return apiFetch<MovimientoFinanciero[]>(url, { cache: "no-store" });
  },

  async getAnticipos(empresaId?: string): Promise<MovimientoFinanciero[]> {
    const url = empresaId
      ? `/finanzas/anticipos?empresaId=${empresaId}`
      : `/finanzas/anticipos`;
    return apiFetch<MovimientoFinanciero[]>(url, { cache: "no-store" });
  },

  async getMovimientos(empresaId?: string): Promise<MovimientoFinanciero[]> {
    const [egresos, nominas, anticipos] = await Promise.all([
      this.getEgresos(empresaId),
      this.getNominas(empresaId),
      this.getAnticipos(empresaId),
    ]);

    return [...egresos, ...nominas, ...anticipos].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.fechaGeneracion || 0);
      const dateB = new Date(b.createdAt || b.fechaGeneracion || 0);
      return dateB.getTime() - dateA.getTime();
    });
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async crearEgreso(data: any) {
    return apiFetch("/finanzas/registrar-egreso", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async crearAnticipo(data: any) {
    return apiFetch("/finanzas/registrar-anticipo", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async registrarConsignacion(data: RegistrarConsignacionPayload | FormData) {
    if (data instanceof FormData) {
      return apiFetch("/finanzas/registrar-consignacion", {
        method: "POST",
        body: data,
      });
    }

    return apiFetch("/finanzas/registrar-consignacion", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async enviarRecordatorioLiquidacion(
    membershipId: string,
    empresaId?: string,
  ): Promise<SendLiquidationReminderResponse> {
    return apiFetch<SendLiquidationReminderResponse>(
      `/finanzas/recaudo-tecnicos/${membershipId}/recordatorio-liquidacion`,
      {
        method: "POST",
        body: JSON.stringify(empresaId ? { empresaId } : {}),
      },
    );
  },

  async generarNominaDesdeMonitoreo(
    data: GenerateMonitoringPayrollPayload,
  ): Promise<GenerateMonitoringPayrollResponse> {
    return apiFetch<GenerateMonitoringPayrollResponse>(
      "/finanzas/nominas/generar-desde-monitoreo",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }
};
