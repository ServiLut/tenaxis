"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { toBogotaYmd } from "@/utils/date-utils";

export type TeamTab = "ranking" | "usuarios";
export type RankingScope = "operativo" | "todos";

type TeamFilters = {
  from: string;
  to: string;
  empresaId?: string;
  zonaId?: string;
  municipioId?: string;
  role?: string;
  search: string;
  scope: RankingScope;
  page: number;
  pageSize: number;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  joinDate: string;
  placa?: string | null;
  moto?: boolean | null;
  direccion?: string | null;
  municipioId?: string | null;
  municipioNombre?: string | null;
  empresaIds: string[];
  empresaNombres: string[];
  zonaIds: string[];
  zonaNombres: string[];
  totalServicios: number;
  serviciosLiquidados: number;
  pendientes: number;
  totalRecaudo: number;
  recaudoNuevos: number;
  recaudoRefuerzo: number;
  efectividad: number;
  // Role-specific metrics
  clientesCreados: number;
  conversionRate: number;
  avgTicket: number;
  avgLiquidationDays: number;
  overdueDebt: number;
  cancellations: number;
  reschedulings: number;
  agedPending: number;
  reworkRate: number;
};

export type TeamOrder = {
  id: string;
  orderNumber: string;
  date: string | null;
  status: string;
  paidValue: number;
  type?: string | null;
  client: string;
};

export type TeamMemberDetail = {
  member: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
  };
  metrics: {
    clientesCreados: number;
    totalServicios: number;
    serviciosLiquidados: number;
    pendientes: number;
    totalRecaudo: number;
    recaudoNuevos: number;
    recaudoRefuerzo: number;
    efectividad: number;
    conversionRate: number;
    avgTicket: number;
    avgLiquidationDays: number;
    overdueDebt: number;
    cancellations: number;
    reschedulings: number;
    agedPending: number;
    reworkRate: number;
  };
  orders: TeamOrder[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type TeamPerformanceResponse = {
  range: {
    from: string;
    to: string;
  };
  kpis: {
    totalRecaudo: number;
    totalServicios: number;
    serviciosLiquidados: number;
    serviciosPendientes: number;
    efectividadEquipo: number;
    ticketPromedio: number;
    comparison: {
      totalRecaudoChangePct: number;
      serviciosLiquidadosChangePct: number;
      efectividadChangePct: number;
    };
  };
  alerts: {
    noActivity: Array<{ membershipId: string; name: string; role: string }>;
    lowEffectiveness: Array<{
      membershipId: string;
      name: string;
      efectividad: number;
    }>;
    pendingLiquidation: Array<{
      membershipId: string;
      name: string;
      pendientes: number;
    }>;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  members: TeamMember[];
};

type Municipality = {
  id: string;
  name: string;
};

const getCookie = (name: string) => {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
};

const unwrapData = async <T>(res: Response): Promise<T> => {
  const contentType = res.headers.get("content-type");
  let data: unknown;

  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${text || res.statusText}`);
    }
    data = text;
  }

  return ((data as Record<string, unknown>)?.data || data) as T;
};

const defaultDateRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return {
    from: toBogotaYmd(from),
    to: toBogotaYmd(to),
  };
};

export function useTeamPerformance(
  tenantId: string | null,
  initialSearch?: URLSearchParams,
) {
  const range = defaultDateRange();
  const [filters, setFilters] = useState<TeamFilters>({
    from: initialSearch?.get("from") || range.from,
    to: initialSearch?.get("to") || range.to,
    empresaId: initialSearch?.get("empresaId") || undefined,
    zonaId: initialSearch?.get("zonaId") || undefined,
    municipioId: initialSearch?.get("municipioId") || undefined,
    role: initialSearch?.get("role") || undefined,
    search: initialSearch?.get("q") || "",
    scope: (initialSearch?.get("scope") as RankingScope) || "todos",
    page: Number(initialSearch?.get("page") || 1),
    pageSize: 50,
  });

  const [activeTab, setActiveTab] = useState<TeamTab>(
    (initialSearch?.get("tab") as TeamTab) || "ranking",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [data, setData] = useState<TeamPerformanceResponse | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberDetailById, setMemberDetailById] = useState<
    Record<string, TeamMemberDetail>
  >({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 250);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchMunicipalities = useCallback(async () => {
    const token = getCookie("access_token");
    const res = await fetch("/api/geo/municipalities", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      throw new Error("No se pudieron cargar los municipios");
    }
    const rows = await unwrapData<Municipality[]>(res);
    setMunicipalities(Array.isArray(rows) ? rows : []);
  }, []);

  const fetchPerformance = useCallback(async () => {
    if (!tenantId) return;
    const token = getCookie("access_token");
    const params = new URLSearchParams();
    params.set("from", filters.from);
    params.set("to", filters.to);
    params.set("scope", filters.scope);
    params.set("page", String(filters.page));
    params.set("pageSize", String(filters.pageSize));
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (filters.role) params.set("role", filters.role);
    if (filters.municipioId) params.set("municipioId", filters.municipioId);
    if (filters.empresaId) params.set("empresaId", filters.empresaId);
    if (filters.zonaId) params.set("zonaId", filters.zonaId);

    const res = await fetch(
      `/api/tenants/${tenantId}/team/performance?${params.toString()}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!res.ok) {
      throw new Error("No se pudo cargar el tablero del equipo");
    }
    const payload = await unwrapData<TeamPerformanceResponse>(res);
    setData(payload);
  }, [
    debouncedSearch,
    filters.empresaId,
    filters.from,
    filters.municipioId,
    filters.page,
    filters.pageSize,
    filters.role,
    filters.scope,
    filters.to,
    filters.zonaId,
    tenantId,
  ]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchPerformance(), fetchMunicipalities()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [fetchMunicipalities, fetchPerformance]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const fetchMemberDetail = useCallback(
    async (membershipId: string) => {
      if (!tenantId) return;
      if (memberDetailById[membershipId]) return;

      try {
        setLoadingDetail(true);
        const token = getCookie("access_token");
        const params = new URLSearchParams({
          from: filters.from,
          to: filters.to,
          page: "1",
          pageSize: "100",
        });
        if (filters.empresaId) params.set("empresaId", filters.empresaId);
        if (filters.zonaId) params.set("zonaId", filters.zonaId);

        const res = await fetch(
          `/api/tenants/${tenantId}/team/members/${membershipId}/detail?${params.toString()}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );

        if (!res.ok) throw new Error("No se pudo cargar el detalle");
        const detail = await unwrapData<TeamMemberDetail>(res);
        setMemberDetailById((prev) => ({ ...prev, [membershipId]: detail }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error en detalle");
      } finally {
        setLoadingDetail(false);
      }
    },
    [
      filters.empresaId,
      filters.from,
      filters.to,
      filters.zonaId,
      memberDetailById,
      tenantId,
    ],
  );

  const updateMemberProfile = useCallback(
    async (
      membershipId: string,
      payload: {
        nombre: string;
        apellido?: string;
        email: string;
        telefono?: string;
        placa?: string;
        moto?: boolean;
        direccion?: string;
        municipioId?: string;
        role?: string;
        empresaIds?: string[];
        activo?: boolean;
      },
    ) => {
      if (!tenantId) return false;

      try {
        setSavingProfile(true);
        const token = getCookie("access_token");
        const res = await fetch(`/api/tenants/memberships/${membershipId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const body = await unwrapData<{ message?: string }>(res);
          throw new Error(body?.message || "No se pudo actualizar el perfil");
        }

        toast.success("Perfil actualizado correctamente");
        await fetchPerformance();
        setMemberDetailById((prev) => {
          const clone = { ...prev };
          delete clone[membershipId];
          return clone;
        });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar");
        return false;
      } finally {
        setSavingProfile(false);
      }
    },
    [fetchPerformance, tenantId],
  );

  const members = useMemo(() => data?.members || [], [data]);

  const allRoles = useMemo(
    () => Array.from(new Set(members.map((m) => m.role))).sort(),
    [members],
  );

  return {
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    loading,
    error,
    refresh,
    data,
    members,
    allRoles,
    municipalities,
    selectedMemberId,
    setSelectedMemberId,
    memberDetailById,
    fetchMemberDetail,
    loadingDetail,
    updateMemberProfile,
    savingProfile,
  };
}
