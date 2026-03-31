"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  AlertCircle,
  Plus,
  Search,
  Building2,
  User,
  Trophy,
  Target,
  Phone,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Eye,
  EyeOff,
  BarChart3,
  Activity,
  Settings,
  Pencil,
  Trash2,
  FileText,
  Mail,
  MapPin,
  Fingerprint,
  Calendar,
  Filter,
  RotateCcw,
  Zap,
  Check,
  Clock,
  ClipboardCheck,
  ShieldCheck,
  Box,
  ArrowUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { toast } from "sonner";
import { Contact } from "lucide-react";
import { apiFetch } from "@/lib/api/base-client";
import { clientesClient } from "@/lib/api/clientes-client";
import { configClient } from "@/lib/api/config-client";
import { serviciosClient } from "@/lib/api/servicios-client";
import {
  createDashboardPreset,
  deleteDashboardPreset,
  listDashboardPresets,
  PRESET_COLOR_STYLES,
  type DashboardPreset,
  type DashboardPresetColorToken,
  updateDashboardPreset,
} from "../presets-api";
import {
  formatBogotaDate,
  formatBogotaTime,
  pickerDateToYmd,
  toBogotaYmd,
  utcIsoToBogotaYmd,
  ymdToPickerDate,
} from "@/utils/date-utils";
import { getBrowserCookie } from "@/lib/api/browser-client";
import { useUserRole } from "@/hooks/use-user-role";
import {
  getBrowserAccessScope,
  getBrowserScopedEnterpriseId,
} from "@/lib/browser-access-scope";
import type { AccessScope } from "@/lib/access-scope";

export interface Cliente {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  razonSocial?: string | null;
  tipoCliente: "PERSONA" | "EMPRESA";
  segmentoNegocio?: string;
  segmento?: string | {
    id: string;
    nombre: string;
  };
  nivelRiesgo?: string;
  riesgo?: {
    id: string;
    nombre: string;
    color?: string;
  };
  clasificacion?: "ORO" | "PLATA" | "BRONCE" | "RIESGO";
  score?: number;
  telefono: string;
  telefono2?: string;
  correo?: string;
  numeroDocumento?: string;
  tipoDocumento?: string;
  nit?: string;
  createdAt?: string;
  updatedAt?: string;
  aceptaMarketing?: boolean;
  actividadEconomica?: string;
  cargoContacto?: string;
  fechaConsentimiento?: string;
  frecuenciaServicio?: number;
  frecuenciaSugerida?: number;
  metrajeTotal?: number | string;
  origenCliente?: string;
  planActual?: string;
  proximaVisita?: string;
  ultimaVisita?: string;
  representanteLegal?: string;
  subsegmento?: string;
  ticketPromedio?: number | string;
  tipoInteres?: {
    id: string;
    nombre: string;
  };
  empresa?: {
    id: string;
    nombre: string;
  };
  creadoPor?: {
    user: {
      nombre: string;
      apellido: string;
    }
  };
  direcciones?: {
    id: string;
    direccion: string;
    municipio?: string;
    municipioId?: string;
    departmentId?: string;
    municipioRel?: {
      id: string;
      name: string;
      departmentId: string;
    };
    barrio?: string;
    piso?: string;
    bloque?: string;
    unidad?: string;
    nombreSede?: string;
    nombreContacto?: string;
    telefonoContacto?: string;
    cargoContacto?: string;
    tipoUbicacion?: string;
    clasificacionPunto?: string;
    horarioInicio?: string;
    horarioFin?: string;
    latitud?: number;
    longitud?: number;
    restricciones?: string;
    validadoPorSistema?: boolean;
  }[];
  vehiculos?: {
    id: string;
    placa: string;
    marca?: string;
    modelo?: string;
    color?: string;
    tipo?: string;
  }[];
  configuracionesOperativas?: ConfiguracionOperativa[];
  ordenesServicio?: OrdenServicio[];
  dashboardSegments?: Array<"riesgoFuga" | "upsellPotencial" | "dormidos" | "operacionEstable">;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Municipality {
  id: string;
  name: string;
  code: string;
  departmentId: string;
}

interface ElementoPredefinido {
  nombre: string;
  tipo: string;
  ubicacion?: string;
}

interface ConfiguracionOperativa {
  id: string;
  direccionId?: string | null;
  direccion?: {
    id: string;
    direccion: string;
  } | null;
  protocoloServicio?: string | null;
  observacionesFijas?: string | null;
  requiereFirmaDigital: boolean;
  requiereFotosEvidencia: boolean;
  duracionEstimada?: number | null;
  frecuenciaSugerida?: number | null;
  elementosPredefinidos?: ElementoPredefinido[] | null;
}

export interface Sugerencia {
  id: string;
  clienteId: string;
  tipo: string;
  prioridad: string;
  estado: string;
  titulo: string;
  descripcion: string;
  creadoAt: string;
  cliente?: Cliente;
}

export interface SugerenciaStats {
  pendientesPorPrioridad: Record<string, number>;
  tasaAceptacion: number;
  tiempoPromedioEjecucionMin: number;
  totalHoy: number;
}

interface ClienteListProps {
  initialClientes: Cliente[];
  segmentedData?: {
    riesgoFuga: { count: number };
    upsellPotencial: { count: number };
    dormidos: { count: number };
    operacionEstable: { count: number };
  } | null;
  initialOverview?: {
    total: number;
    empresas: number;
    oro: number;
    riesgoCritico: number;
    avgScore: number;
  } | null;
  initialPagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
  initialSugerencias?: Sugerencia[];
  sugerenciasStats?: SugerenciaStats | null;
  initialDepartments?: Department[];
  initialMunicipalities?: Municipality[];
}

const SCORE_COLORS = {
  ORO: "bg-amber-500 text-white shadow-sm",
  PLATA: "bg-zinc-400 text-white shadow-sm",
  BRONCE: "bg-orange-800 text-white shadow-sm",
  RIESGO: "bg-red-500 text-white shadow-sm",
};

const RIESGO_LABELS = {
  BAJO: { label: "Riesgo Bajo", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-500" },
  MEDIO: { label: "Riesgo Medio", color: "text-amber-600 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-500" },
  ALTO: { label: "Riesgo Alto", color: "text-red-600 bg-red-500/10 border-red-500/20", dot: "bg-red-500" },
  CRITICO: { label: "Crítico", color: "text-red-600 bg-red-500/10 border-red-500/20", dot: "bg-red-500" },
  "PLAGA ALTA": { label: "Plaga Alta", color: "text-red-600 bg-red-500/10 border-red-500/20", dot: "bg-red-500" },
};

const ESTADO_STYLING: Record<string, string> = {
  "NUEVO": "bg-muted text-muted-foreground border-border",
  "PROCESO": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "EN PROCESO": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "CANCELADO": "bg-destructive/10 text-destructive border-destructive/20",
  "PROGRAMADO": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "LIQUIDADO": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "TECNICO_FINALIZO": "bg-green-500/10 text-green-600 border-green-500/20",
  "TECNICO FINALIZO": "bg-green-500/10 text-green-600 border-green-500/20",
  "REPROGRAMADO": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "SIN_CONCRETAR": "bg-slate-500/10 text-slate-600 border-slate-500/20",
  "DEFAULT": "bg-muted text-muted-foreground border-border",
};

const CUSTOM_PRESET_COLORS: DashboardPresetColorToken[] = [
  "slate",
  "red",
  "orange",
  "amber",
  "emerald",
  "teal",
  "sky",
  "blue",
  "indigo",
  "pink",
];

interface OrdenServicio {
  id: string;
  numeroOrden?: string;
  estadoServicio: string;
  estadoPago?: string;
  servicio?: {
    nombre: string;
  };
  fechaVisita?: string;
  direccionTexto?: string;
  tecnico?: {
    user: {
      nombre: string;
      apellido: string;
    }
  };
  valorCotizado?: number;
  valorPagado?: number;
  valorRepuestos?: number;
}

export function ClienteList({ 
  initialClientes, 
  segmentedData, 
  initialOverview = null,
  initialPagination = null,
  initialSugerencias = [],
  sugerenciasStats,
  initialDepartments = [], 
  initialMunicipalities = [] 
}: ClienteListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { checkPermission, isLoading: isLoadingRole } = useUserRole();

  const [mounted, setMounted] = useState(false);
  const [clientesData, setClientesData] = useState<Cliente[]>(initialClientes);
  const [overview, setOverview] = useState(initialOverview);
  const [pagination, setPagination] = useState(initialPagination);
  const [isPageLoading, setIsPageLoading] = useState(false);
  
  // URL Persistence
  const [activeSegment, setActiveSegment] = useState<string>(searchParams.get("segment") || "all");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(
    searchParams.get("sort") 
      ? { key: searchParams.get("sort")!, direction: (searchParams.get("dir") as "asc" | "desc") || "asc" }
      : null
  );

  const [onlySinVisita, setOnlySinVisita] = useState(searchParams.get("sinVisita") === "true");
  const [onlyWithPendingPayments, setOnlyWithPendingPayments] = useState(searchParams.get("pendingPayments") === "true");
  const [onlySinServicios, setOnlySinServicios] = useState(searchParams.get("sinServicios") === "true");
  const [filters, setFilters] = useState({
    empresas: searchParams.get("empresas")?.split(",").filter(Boolean) || [] as string[],
    departamento: searchParams.get("dept") || "all",
    municipio: searchParams.get("muni") || "all",
    barrio: searchParams.get("barrio") || "",
    clasificacion: searchParams.get("class") || "all",
    segmento: searchParams.get("seg") || "all",
    riesgo: searchParams.get("risk") || "all",
    fechaDesde: searchParams.get("from") || "",
    fechaHasta: searchParams.get("to") || "",
  });

  // Sync state to URL
  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams();
    if (activeSegment !== "all") params.set("segment", activeSegment);
    if (search) params.set("search", search);
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (sortConfig) {
      params.set("sort", sortConfig.key);
      params.set("dir", sortConfig.direction);
    }
    if (onlySinVisita) params.set("sinVisita", "true");
    if (onlyWithPendingPayments) params.set("pendingPayments", "true");
    if (onlySinServicios) params.set("sinServicios", "true");
    if (filters.empresas.length > 0) params.set("empresas", filters.empresas.join(","));
    if (filters.departamento !== "all") params.set("dept", filters.departamento);
    if (filters.municipio !== "all") params.set("muni", filters.municipio);
    if (filters.barrio) params.set("barrio", filters.barrio);
    if (filters.clasificacion !== "all") params.set("class", filters.clasificacion);
    if (filters.segmento !== "all") params.set("seg", filters.segmento);
    if (filters.riesgo !== "all") params.set("risk", filters.riesgo);
    if (filters.fechaDesde) params.set("from", filters.fechaDesde);
    if (filters.fechaHasta) params.set("to", filters.fechaHasta);

    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [activeSegment, search, currentPage, sortConfig, filters, pathname, router, mounted, onlySinVisita, onlyWithPendingPayments, onlySinServicios]);

  useEffect(() => {
    if (!isLoadingRole && !checkPermission("CLIENT_VIEW")) {
      router.replace("/dashboard");
    }
  }, [isLoadingRole, checkPermission, router]);

  const [showSuggestionsQueue, setShowSuggestionsQueue] = useState(false);
  
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>(initialSugerencias);
  const clientes = clientesData;

  const [empresaSearch, setEmpresaSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedClienteForConfig, setSelectedClienteForConfig] = useState<Cliente | null>(null);
  const [selectedClienteForHistory, setSelectedClienteForHistory] = useState<Cliente | null>(null);
  const [selectedClienteForSuggestions, setSelectedClienteForSuggestions] = useState<Cliente | null>(null);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);

  const getSegmentoNombre = (cliente: Cliente) =>
    typeof cliente.segmento === "string"
      ? cliente.segmento
      : cliente.segmento?.nombre || cliente.segmentoNegocio || "";

  const getRiesgoNombre = (cliente: Cliente) =>
    cliente.riesgo?.nombre || cliente.nivelRiesgo || "";

  const handleUpdateSugerencia = async (id: string, nuevoEstado: string) => {
    try {
      await apiFetch(`/sugerencias-clientes/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      setSugerencias(prev => prev.map(s => s.id === id ? { ...s, estado: nuevoEstado } : s));
      toast.success(`Sugerencia ${nuevoEstado.toLowerCase()} correctamente`);
    } catch (error) {
      console.error("Error updating suggestion status:", error);
      toast.error("Error al actualizar la sugerencia");
    }
  };

  const suggestions = useMemo(() => {
    if (!selectedClienteForSuggestions) return [];
    const client = selectedClienteForSuggestions;
    const todayYmd = toBogotaYmd();
    const list = [];

    // 1. Programar visita (si próxima visita vencida o vacía con frecuencia definida)
    const proximaVencida =
      !client.proximaVisita ||
      utcIsoToBogotaYmd(client.proximaVisita) < todayYmd;
    const tieneFrecuencia = Number(client.frecuenciaSugerida || client.frecuenciaServicio || 0) > 0;
    
    if (proximaVencida && tieneFrecuencia) {
      list.push({
        id: "programar-visita",
        title: "Programar Visita de Seguimiento",
        description: "La fecha de próxima visita está vencida o no ha sido programada, pero el cliente tiene una frecuencia de servicio establecida.",
        icon: Calendar,
        color: "text-blue-600 bg-blue-50",
        actionLabel: "Ir a Programación",
        action: () => {
          if (!checkPermission("SERVICE_CREATE")) {
            toast.error("No tienes permisos para crear servicios.");
            return;
          }
          router.push(`/dashboard/servicios/nuevo?clienteId=${client.id}`);
          setSelectedClienteForSuggestions(null);
        }
      });
    }

    // 2. Reactivar cliente (si dormido)
    const isDormido = client.dashboardSegments?.includes("dormidos");
    if (isDormido) {
      list.push({
        id: "reactivar-cliente",
        title: "Reactivar Cliente Dormido",
        description: "Este cliente no ha registrado actividad en los últimos 60 días. Se recomienda contacto comercial inmediato.",
        icon: RotateCcw,
        color: "text-slate-600 bg-slate-50",
        actionLabel: "Registrar Contacto",
        action: () => {
          toast.info("Función de registro de contacto en desarrollo");
          setSelectedClienteForSuggestions(null);
        }
      });
    }

    // 3. Ofrecer upsell (si upsell potencial y consentimiento marketing activo)
    const isUpsell = client.dashboardSegments?.includes("upsellPotencial");
    if (isUpsell && client.aceptaMarketing) {
      list.push({
        id: "ofrecer-upsell",
        title: "Oferta de Upsell Potencial",
        description: "El ticket promedio es superior a la media y el cliente autoriza marketing. Ideal para servicios complementarios.",
        icon: Zap,
        color: "text-amber-600 bg-amber-50",
        actionLabel: "Generar Oferta",
        action: () => {
          toast.info("Generando propuesta comercial automática...");
          setSelectedClienteForSuggestions(null);
        }
      });
    }

    // 4. Revisar configuración operativa (si datos críticos incompletos)
    const sinDirecciones = !client.direcciones || client.direcciones.length === 0;
    const sinConfig = !client.configuracionesOperativas || client.configuracionesOperativas.length === 0;
    if (sinDirecciones || sinConfig) {
      list.push({
        id: "revisar-config",
        title: "Completar Configuración Operativa",
        description: "Faltan datos críticos (sedes o protocolos) para garantizar una ejecución técnica perfecta.",
        icon: Settings,
        color: "text-purple-600 bg-purple-50",
        actionLabel: "Configurar Ahora",
        action: () => {
          setSelectedClienteForConfig(client);
          setSelectedClienteForSuggestions(null);
        }
      });
    }

    return list;
  }, [selectedClienteForSuggestions, router, checkPermission]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [serviceHistory, setServiceHistory] = useState<OrdenServicio[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [activeConfigs, setActiveConfigs] = useState<ConfiguracionOperativa[]>([]);
  const [currentConfigSede, setCurrentConfigSede] = useState("all");

  const [configForm, setConfigForm] = useState({
    protocoloServicio: "",
    observacionesFijas: "",
    requiereFirmaDigital: true,
    requiereFotosEvidencia: true,
    duracionEstimada: 60,
    frecuenciaSugerida: 30,
    elementosPredefinidos: [] as ElementoPredefinido[],
  });

  const [newElement, setNewElement] = useState({
    nombre: "",
    tipo: "Estación de Cebo",
    ubicacion: "",
  });

  const [accessScope, setAccessScope] = useState<AccessScope | null>(null);
  const [showKPIs, setShowKPIs] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [customPresets, setCustomPresets] = useState<DashboardPreset[]>([]);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetForm, setPresetForm] = useState<{
    name: string;
    colorToken: DashboardPresetColorToken;
    isShared: boolean;
  }>({
    name: "",
    colorToken: "sky",
    isShared: false,
  });
  const pendingSugerencias = useMemo(
    () => sugerencias.filter((s) => s.estado === "PENDIENTE"),
    [sugerencias]
  );
  const recentManagedSugerencias = useMemo(
    () =>
      sugerencias
        .filter((s) => s.estado !== "PENDIENTE")
        .sort((a, b) => new Date(b.creadoAt).getTime() - new Date(a.creadoAt).getTime())
        .slice(0, 8),
    [sugerencias]
  );

  const stats = useMemo(() => {
    return (
      overview || {
        total: clientes.length,
        empresas: clientes.filter(c => c.tipoCliente === "EMPRESA").length,
        oro: clientes.filter(c => c.clasificacion === "ORO").length,
        riesgoCritico: clientes.filter(c => {
          const r = getRiesgoNombre(c).toUpperCase();
          return r === "CRITICO" || r === "ALTO";
        }).length,
        avgScore: clientes.length > 0 ? Math.round(clientes.reduce((acc, c) => acc + (c.score || 0), 0) / clientes.length) : 0,
      }
    );
  }, [overview, clientes]);

  const handleDelete = (cliente: Cliente) => {
    setClienteToDelete(cliente);
  };

  const confirmDelete = async () => {
    if (!clienteToDelete) return;
    const id = clienteToDelete.id;
    setClienteToDelete(null);
    toast.promise(clientesClient.delete(id), {
      loading: "Eliminando cliente...",
      success: () => "Cliente eliminado correctamente",
      error: (err) => err.message || "Error al eliminar el cliente",
    });
  };

  React.useEffect(() => {
    setMounted(true);
    setAccessScope(getBrowserAccessScope());
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    let isCancelled = false;
    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("limit", "10");

    if (activeSegment !== "all") params.set("segment", activeSegment);
    if (search) params.set("search", search);
    if (sortConfig) {
      params.set("sort", sortConfig.key);
      params.set("dir", sortConfig.direction);
    }
    if (onlySinVisita) params.set("sinVisita", "true");
    if (onlyWithPendingPayments) params.set("pendingPayments", "true");
    if (onlySinServicios) params.set("sinServicios", "true");
    if (filters.empresas.length > 0) params.set("empresas", filters.empresas.join(","));
    if (filters.departamento !== "all") params.set("dept", filters.departamento);
    if (filters.municipio !== "all") params.set("muni", filters.municipio);
    if (filters.barrio) params.set("barrio", filters.barrio);
    if (filters.clasificacion !== "all") params.set("class", filters.clasificacion);
    if (filters.segmento !== "all") params.set("seg", filters.segmento);
    if (filters.riesgo !== "all") params.set("risk", filters.riesgo);
    if (filters.fechaDesde) params.set("from", filters.fechaDesde);
    if (filters.fechaHasta) params.set("to", filters.fechaHasta);

    async function loadClientesPage() {
      try {
        setIsPageLoading(true);
        const response = await apiFetch<{
          clientes: Cliente[];
          segmentacion: ClienteListProps["segmentedData"];
          overview: NonNullable<ClienteListProps["initialOverview"]>;
          pagination: NonNullable<ClienteListProps["initialPagination"]>;
        }>(`/clientes/dashboard-data?${params.toString()}`, {
          cache: "no-store",
          includeEnterpriseId: true,
        });

        if (isCancelled) return;

        setClientesData(response.clientes || []);
        setOverview(response.overview || null);
        setPagination(response.pagination || null);

        if (response.pagination && response.pagination.page !== currentPage) {
          setCurrentPage(response.pagination.page);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Error loading paginated clientes:", error);
          toast.error("No se pudieron cargar los clientes");
        }
      } finally {
        if (!isCancelled) {
          setIsPageLoading(false);
        }
      }
    }

    void loadClientesPage();

    return () => {
      isCancelled = true;
    };
  }, [
    mounted,
    currentPage,
    activeSegment,
    search,
    sortConfig,
    filters,
    onlySinVisita,
    onlyWithPendingPayments,
    onlySinServicios,
  ]);

  useEffect(() => {
    if (!accessScope) {
      return;
    }

    const scopedEnterpriseId = getBrowserScopedEnterpriseId(accessScope);
    if (accessScope.isEmpresaLocked) {
      if (!scopedEnterpriseId) {
        return;
      }

      setTimeout(() => {
        setFilters((prev) => {
          if (
            prev.empresas.length === 1 &&
            prev.empresas[0] === scopedEnterpriseId
          ) {
            return prev;
          }

          return {
            ...prev,
            empresas: [scopedEnterpriseId],
          };
        });
        setEmpresaSearch("");
      }, 0);
      return;
    }

    setTimeout(() => {
      setFilters((prev) => {
        if (prev.empresas.length === 0) {
          return prev;
        }

        return {
          ...prev,
          empresas: [],
        };
      });
      setEmpresaSearch("");
    }, 0);
  }, [accessScope]);

  const filterOptions = useMemo(() => {
    if (!mounted) return { municipios: [], segmentos: [], clasificaciones: [], riesgos: [], empresas: [], departamentos: [] };
    const departamentos = initialDepartments.length > 0
      ? initialDepartments.sort((a, b) => a.name.localeCompare(b.name))
      : Array.from(new Set(clientes.flatMap((c: Cliente) => c.direcciones?.map((d) => d.departmentId).filter(Boolean) || [])))
          .map(id => ({ id: String(id), name: String(id), code: String(id) }));
    const municipios = initialMunicipalities.length > 0
      ? initialMunicipalities
          .filter(m => filters.departamento === "all" || m.departmentId === filters.departamento)
          .sort((a, b) => a.name.localeCompare(b.name))
      : Array.from(new Set(clientes.flatMap((c: Cliente) => c.direcciones?.map((d) => d.municipio).filter((m: string | undefined): m is string => !!m) || [])))
          .sort();
    const segmentos = Array.from(new Set(clientes.map(getSegmentoNombre).filter((s): s is string => !!s))).sort();
    const clasificaciones = ["ORO", "PLATA", "BRONCE", "RIESGO"];
    const riesgos = Array.from(new Set(clientes.map(getRiesgoNombre).filter((r): r is string => !!r))).sort();
    const empresas = Array.from(
      new Map(
        clientes
          .filter((c: Cliente) => c.empresa)
          .map((c: Cliente) => [c.empresa!.id, { id: c.empresa!.id, nombre: c.empresa!.nombre }])
      ).values()
    ).sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { municipios, segmentos, clasificaciones, riesgos, empresas, departamentos };
  }, [clientes, mounted, filters.departamento, initialDepartments, initialMunicipalities]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  const itemsPerPage = pagination?.limit || 10;
  const totalPages = pagination?.totalPages || 0;
  const paginatedClientes = clientes;

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "empresas") return (value as string[]).length > 0;
    if (key === "municipio" || key === "departamento" || key === "clasificacion" || key === "segmento" || key === "riesgo") return value !== "all";
    return !!value;
  }).length;

  const hasActiveFilters = activeFiltersCount > 0 || search !== "" || activeSegment !== "all" || onlySinVisita || onlyWithPendingPayments || onlySinServicios;

  const resetFilters = () => {
    setFilters({
      empresas: [],
      departamento: "all",
      municipio: "all",
      barrio: "",
      clasificacion: "all",
      segmento: "all",
      riesgo: "all",
      fechaDesde: "",
      fechaHasta: "",
    });
    setSortConfig(null);
    setSearch("");
    setActiveSegment("all");
    setCurrentPage(1);
    setOnlySinVisita(false);
    setOnlyWithPendingPayments(false);
    setOnlySinServicios(false);
  };

  const buildClientesPresetSnapshot = () => ({
    activeSegment,
    search,
    sortConfig,
    onlySinVisita,
    onlyWithPendingPayments,
    onlySinServicios,
    filters,
  });

  const applyCustomPreset = (preset: DashboardPreset) => {
    const payload = (preset.filters || {}) as {
      activeSegment?: string;
      search?: string;
      sortConfig?: { key: string; direction: "asc" | "desc" } | null;
      onlySinVisita?: boolean;
      onlyWithPendingPayments?: boolean;
      onlySinServicios?: boolean;
      filters?: typeof filters;
    };

    setActiveSegment(payload.activeSegment || "all");
    setSearch(payload.search || "");
    setSortConfig(payload.sortConfig || null);
    setOnlySinVisita(Boolean(payload.onlySinVisita));
    setOnlyWithPendingPayments(Boolean(payload.onlyWithPendingPayments));
    setOnlySinServicios(Boolean(payload.onlySinServicios));
    setFilters(
      payload.filters || {
        empresas: [],
        departamento: "all",
        municipio: "all",
        barrio: "",
        clasificacion: "all",
        segmento: "all",
        riesgo: "all",
        fechaDesde: "",
        fechaHasta: "",
      },
    );
    setCurrentPage(1);
  };

  const openCreatePresetModal = () => {
    setEditingPresetId(null);
    setPresetForm({ name: "", colorToken: "sky", isShared: false });
    setIsPresetModalOpen(true);
  };

  const openEditPresetModal = (preset: DashboardPreset) => {
    setEditingPresetId(preset.id);
    setPresetForm({
      name: preset.name,
      colorToken: preset.colorToken,
      isShared: preset.isShared,
    });
    setIsPresetModalOpen(true);
  };

  const savePreset = async () => {
    if (!presetForm.name.trim()) {
      toast.error("El preset necesita un nombre");
      return;
    }
    try {
      if (editingPresetId) {
        await updateDashboardPreset(editingPresetId, {
          name: presetForm.name.trim(),
          colorToken: presetForm.colorToken,
          isShared: presetForm.isShared,
          filters: buildClientesPresetSnapshot(),
        });
        toast.success("Preset actualizado");
      } else {
        await createDashboardPreset({
          module: "CLIENTES",
          name: presetForm.name.trim(),
          colorToken: presetForm.colorToken,
          isShared: presetForm.isShared,
          filters: buildClientesPresetSnapshot(),
        });
        toast.success("Preset creado");
      }
      setIsPresetModalOpen(false);
      const data = await listDashboardPresets("CLIENTES");
      setCustomPresets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error saving preset", error);
      toast.error("No fue posible guardar el preset");
    }
  };

  const removePreset = async (id: string) => {
    try {
      await deleteDashboardPreset(id);
      setCustomPresets((prev) => prev.filter((p) => p.id !== id));
      toast.success("Preset eliminado");
    } catch (error) {
      console.error("Error deleting preset", error);
      toast.error("No fue posible eliminar el preset");
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filters, activeSegment]);

  useEffect(() => {
    let mountedPreset = true;
    const run = async () => {
      try {
        const data = await listDashboardPresets("CLIENTES");
        if (!mountedPreset) return;
        setCustomPresets(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading clientes presets", error);
      }
    };
    void run();
    return () => {
      mountedPreset = false;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCtrlD = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d";

      if (isCtrlD) {
        event.preventDefault();
        setShowSuggestionsQueue((prev) => !prev);
        return;
      }

      if (showSuggestionsQueue) {
        event.preventDefault();
        setShowSuggestionsQueue(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSuggestionsQueue]);

  React.useEffect(() => {
    const loadConfigs = async () => {
      if (!selectedClienteForConfig) return;
      setConfigLoading(true);
      const configs = await configClient.getClienteOperativa(selectedClienteForConfig.id) as ConfiguracionOperativa[];
      setActiveConfigs(configs);
      const globalConfig = configs.find(c => !c.direccionId);
      if (globalConfig) {
        setConfigForm({
          protocoloServicio: globalConfig.protocoloServicio || "",
          observacionesFijas: globalConfig.observacionesFijas || "",
          requiereFirmaDigital: globalConfig.requiereFirmaDigital,
          requiereFotosEvidencia: globalConfig.requiereFotosEvidencia,
          duracionEstimada: globalConfig.duracionEstimada || 60,
          frecuenciaSugerida: globalConfig.frecuenciaSugerida || 30,
          elementosPredefinidos: (globalConfig.elementosPredefinidos as unknown as ElementoPredefinido[]) || [],
        });
      } else {
        setConfigForm({
          protocoloServicio: "",
          observacionesFijas: "",
          requiereFirmaDigital: true,
          requiereFotosEvidencia: true,
          duracionEstimada: 60,
          frecuenciaSugerida: 30,
          elementosPredefinidos: [],
        });
      }
      setCurrentConfigSede("all");
      setConfigLoading(false);
    };
    loadConfigs();
  }, [selectedClienteForConfig]);

  React.useEffect(() => {
    const loadHistory = async () => {
      if (!selectedClienteForHistory) return;
      setHistoryLoading(true);
      const history = await serviciosClient.getAll(undefined, selectedClienteForHistory.id);
      setServiceHistory(history as unknown as OrdenServicio[]);
      setHistoryLoading(false);
    };
    loadHistory();
  }, [selectedClienteForHistory]);

  const handleSedeChange = (sedeValue: string) => {
    setCurrentConfigSede(sedeValue);
    const config = activeConfigs.find(c =>
      sedeValue === "all" ? !c.direccionId : c.direccion?.direccion === sedeValue
    );
    if (config) {
      setConfigForm({
        protocoloServicio: config.protocoloServicio || "",
        observacionesFijas: config.observacionesFijas || "",
        requiereFirmaDigital: config.requiereFirmaDigital,
        requiereFotosEvidencia: config.requiereFotosEvidencia,
        duracionEstimada: config.duracionEstimada || 60,
        frecuenciaSugerida: config.frecuenciaSugerida || 30,
        elementosPredefinidos: (config.elementosPredefinidos as ElementoPredefinido[]) || [],
      });
    } else {
      setConfigForm({
        protocoloServicio: "",
        observacionesFijas: "",
        requiereFirmaDigital: true,
        requiereFotosEvidencia: true,
        duracionEstimada: 60,
        frecuenciaSugerida: 30,
        elementosPredefinidos: [],
      });
    }
  };

  const handleAddElement = () => {
    if (!newElement.nombre || !newElement.tipo) {
      toast.error("Nombre y Tipo son obligatorios");
      return;
    }
    setConfigForm(prev => ({
      ...prev,
      elementosPredefinidos: [...prev.elementosPredefinidos, { ...newElement }]
    }));
    setNewElement({ nombre: "", tipo: "Estación de Cebo", ubicacion: "" });
  };

  const handleRemoveElement = (index: number) => {
    setConfigForm(prev => ({
      ...prev,
      elementosPredefinidos: prev.elementosPredefinidos.filter((_, i) => i !== index)
    }));
  };

  const handleSaveConfig = async () => {
    if (!selectedClienteForConfig) return;
    const empresaId =
      getBrowserScopedEnterpriseId(accessScope) ?? getBrowserCookie("x-enterprise-id");
    if (!empresaId) {
      toast.error("No se encontró la empresa activa");
      return;
    }
    const direccionId = currentConfigSede === "all"
      ? null
      : selectedClienteForConfig.direcciones?.find(d => d.direccion === currentConfigSede)?.id || null;
    const payload = {
      clienteId: selectedClienteForConfig.id,
      empresaId,
      direccionId,
      ...configForm,
    };
    toast.promise(configClient.upsertOperativa(payload), {
      loading: "Guardando configuración...",
      success: () => {
        setSelectedClienteForConfig(null);
        return "Configuración guardada exitosamente";
      },
      error: (err) => err.message || "Error al guardar la configuración",
    });
  };

  if (!mounted || isLoadingRole) {
    return (
      <div className="flex flex-col h-full bg-background rounded-xl border border-border shadow-xl items-center justify-center">
        <div className="animate-pulse text-sm font-black text-muted-foreground uppercase tracking-widest">
          Sincronizando Cartera...
        </div>
      </div>
    );
  }

  if (!checkPermission("CLIENT_VIEW")) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Sub-Header Estratégico */}
      <div className="shrink-0 py-10 px-6 lg:px-10 border-b border-border mb-8 bg-muted/30">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
            <Contact className="h-5 w-5 text-[#01ADFB]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase">
              Cartera de <span className="text-[#01ADFB]">Clientes</span>
            </h1>
            <p className="text-muted-foreground font-medium mt-1 text-[10px] uppercase tracking-widest">
              Gestión estratégica y segmentación de la base instalada.
            </p>
          </div>
          <div className="md:ml-auto flex items-center gap-3">
            <Button
              onClick={() => setShowSuggestionsQueue(true)}
              className="h-10 px-6 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
            >
              <Zap className="h-4 w-4 fill-current" />
              Cola Operativa
              {pendingSugerencias.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-white text-amber-600 text-[9px] font-black animate-pulse">
                  {pendingSugerencias.length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKPIs(!showKPIs)}
              className="h-10 px-4 rounded-xl border-border bg-card text-[10px] font-black uppercase tracking-widest gap-2"
            >
              {showKPIs ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Ocultar KPIs
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 text-[#01ADFB]" />
                  Ver KPIs
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Contenedor Principal de Datos */}
      <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-10 pb-4 sm:pb-6 lg:pb-10">
        <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col">

          {/* KPI Cards Grid */}
          {showKPIs && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 shrink-0 animate-in fade-in slide-in-from-top-4 duration-300">
              {[
                { label: "Total Clientes", val: stats.total, icon: User, color: "bg-primary" },
                { label: "Corporativos", val: stats.empresas, icon: Building2, color: "bg-[#01ADFB]" },
                { label: "Clientes Oro", val: stats.oro, icon: Trophy, color: "bg-[#01ADFB]" },
                { label: "Riesgo Alto", val: stats.riesgoCritico, icon: AlertCircle, color: "bg-muted-foreground" },
                { label: "Avg Score", val: stats.avgScore, icon: Activity, color: "bg-muted-foreground" },
              ].map((item, i) => (
                <div key={i} className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                  <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-white", item.color)}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{item.label}</p>
                    <p className="text-2xl font-black text-foreground">{item.val}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col bg-card rounded-[1.0rem] border border-border shadow-sm overflow-hidden">
            {/* Barra de Filtros Unificada */}
            <div className="px-8 py-6 border-b border-border flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-card shrink-0">
              <div className="flex flex-1 items-center gap-3 max-w-2xl">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-[#01ADFB] transition-colors" />
                  <Input
                    placeholder="Buscar clientes..."
                    className="h-12 pl-12 rounded-xl border-none bg-muted focus:ring-2 focus:ring-[#01ADFB]/20 transition-all font-bold text-sm text-foreground"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "flex items-center h-12 px-6 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all gap-2 border",
                    activeFiltersCount > 0
                      ? "bg-[#01ADFB] text-white border-[#01ADFB]"
                      : "bg-background text-muted-foreground border-border hover:bg-muted",
                    showFilters && "bg-primary text-primary-foreground border-primary"
                  )}
                >
                  <Filter className="h-4 w-4" />
                  <span>{showFilters ? "Ocultar" : "Filtros"}</span>
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center h-12 px-6 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all gap-2 border bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Borrar Filtros</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {checkPermission("CLIENT_CREATE") && (
                  <Link href="/dashboard/clientes/nuevo">
                    <div className="flex items-center h-12 px-8 rounded-xl bg-[#01ADFB] text-white gap-3 shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                      <Plus className="h-5 w-5" />
                      <span className="font-black uppercase tracking-widest text-[10px]">Nuevo Cliente</span>
                    </div>
                  </Link>
                )}
              </div>
              </div>

              {/* Segmentación Operativa - Tabs */}
              {segmentedData && (
              <div className="px-8 py-2 border-b border-border bg-muted/20 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {[
                  { id: "all", label: "Todos", count: overview?.total ?? pagination?.total ?? 0, icon: Target },
                  { id: "riesgoFuga", label: "Riesgo de Fuga", count: segmentedData.riesgoFuga.count, icon: AlertCircle, color: "text-red-600" },
                  { id: "upsellPotencial", label: "Upsell Potencial", count: segmentedData.upsellPotencial.count, icon: Trophy, color: "text-amber-600" },
                  { id: "dormidos", label: "Dormidos", count: segmentedData.dormidos.count, icon: Clock, color: "text-slate-600" },
                  { id: "operacionEstable", label: "Operación Estable", count: segmentedData.operacionEstable.count, icon: ShieldCheck, color: "text-emerald-600" },
                ].map((seg) => (
                  <button
                    key={seg.id}
                    onClick={() => {
                      if (seg.id === "all") {
                        resetFilters();
                      } else {
                        setActiveSegment(seg.id);
                        setCurrentPage(1);
                        setOnlySinVisita(false);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-xl transition-all whitespace-nowrap border-2",
                      activeSegment === seg.id
                        ? "bg-background border-[#01ADFB] shadow-sm scale-[1.02]"
                        : "border-transparent hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <seg.icon className={cn("h-4 w-4", activeSegment === seg.id ? "text-[#01ADFB]" : seg.color)} />
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      activeSegment === seg.id ? "text-foreground" : ""
                    )}>
                      {seg.label}
                    </span>
                    <span className={cn(
                      "ml-1 px-2 py-0.5 rounded-full text-[9px] font-black",
                      activeSegment === seg.id ? "bg-[#01ADFB] text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {seg.count}
                    </span>
                  </button>
                ))}
              </div>
              )}

              {/* Presets de Filtro Rápidos */}
              <div className="px-8 py-3 flex items-center gap-3 overflow-x-auto scrollbar-hide border-b border-border bg-muted/5">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mr-2 shrink-0">Presets Rápidos:</span>
                {[
                  { label: "Riesgo Crítico", icon: AlertCircle, color: "hover:border-red-500 hover:bg-red-50", action: () => { resetFilters(); setFilters(f => ({ ...f, riesgo: "CRITICO" })); } },
                  { 
                    label: "Sin Próxima Visita", 
                    icon: Calendar, 
                    color: onlySinVisita ? "border-purple-500 bg-purple-50 text-purple-700" : "hover:border-purple-500 hover:bg-purple-50", 
                    action: () => { 
                      const newValue = !onlySinVisita;
                      resetFilters(); 
                      setOnlySinVisita(newValue);
                      if (newValue) setSortConfig({ key: "proximaVisita", direction: "asc" }); 
                    } 
                  },
                  { 
                    label: "Pagos Pendientes", 
                    icon: FileText, 
                    color: onlyWithPendingPayments ? "border-red-500 bg-red-50 text-red-700" : "hover:border-red-500 hover:bg-red-50", 
                    action: () => { 
                      const newValue = !onlyWithPendingPayments;
                      resetFilters(); 
                      setOnlyWithPendingPayments(newValue);
                    } 
                  },
                  { 
                    label: "Sin Servicios", 
                    icon: Box, 
                    color: onlySinServicios ? "border-amber-500 bg-amber-50 text-amber-700" : "hover:border-amber-500 hover:bg-amber-50", 
                    action: () => { 
                      const newValue = !onlySinServicios;
                      resetFilters(); 
                      setOnlySinServicios(newValue);
                    } 
                  },
                ].map((preset, i) => (
                  <button
                    key={i}
                    onClick={preset.action}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                      preset.color
                    )}
                  >
                    <preset.icon className="h-3 w-3" />
                    {preset.label}
                  </button>
                ))}
                {customPresets.map((preset) => (
                  <div key={preset.id} className="inline-flex items-center gap-1">
                    <button
                      onClick={() => applyCustomPreset(preset)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                        PRESET_COLOR_STYLES[preset.colorToken] || "border-border bg-background text-foreground",
                      )}
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={() => openEditPresetModal(preset)}
                      className="h-7 w-7 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground"
                      title="Editar preset"
                    >
                      <Pencil className="h-3.5 w-3.5 mx-auto" />
                    </button>
                    <button
                      onClick={() => removePreset(preset.id)}
                      className="h-7 w-7 rounded-md border border-border bg-background text-muted-foreground hover:text-destructive"
                      title="Eliminar preset"
                    >
                      <Trash2 className="h-3.5 w-3.5 mx-auto" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCreatePresetModal}
                  className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider"
                >
                  + Nuevo preset
                </Button>
              </div>

              {/* Integrated Filter Panel */}
            {showFilters && (
              <div className="px-8 py-8 border-b border-border bg-muted/50 animate-in fade-in slide-in-from-top-2 duration-300 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="max-w-[1600px] mx-auto">
                  <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-3">
                        <Filter className="h-5 w-5 text-[#01ADFB]" /> Panel de Segmentación Avanzada
                      </h3>
                      <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">
                        Refine los resultados de la cartera de clientes
                      </p>
                    </div>
                    <button
                      onClick={resetFilters}
                      className="text-[11px] font-black text-muted-foreground hover:text-[#01ADFB] flex items-center gap-2 transition-colors px-4 py-2 rounded-xl hover:bg-muted border border-border"
                    >
                      <RotateCcw className="h-4 w-4" /> REINICIAR FILTROS
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">
                    {/* Empresa visible según alcance */}
                    {!accessScope?.isEmpresaLocked && filterOptions.empresas.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Empresa Responsable</Label>
                        <Input
                          placeholder="FILTRAR POR NOMBRE..."
                          value={empresaSearch}
                          onChange={(e) => setEmpresaSearch(e.target.value)}
                          className="h-11 text-xs mb-2 border border-border bg-background text-foreground focus-visible:border-[#01ADFB] transition-all hover:scale-[1.02] focus:scale-[1.02]"
                        />
                        <div className="flex flex-col gap-2 max-h-32 overflow-y-auto custom-scrollbar p-4 bg-background rounded-xl border border-border">
                          {filterOptions.empresas
                            .filter(emp => emp.nombre.toLowerCase().includes(empresaSearch.toLowerCase()))
                            .map((emp: { id: string, nombre: string }) => (
                            <label key={emp.id} className="flex items-center gap-3 text-xs font-black text-foreground cursor-pointer group">
                              <div className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 border-border transition-colors",
                                filters.empresas.includes(emp.id) ? "bg-[#01ADFB] border-[#01ADFB]" : "bg-background group-hover:border-[#01ADFB]"
                              )}>
                                {filters.empresas.includes(emp.id) && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={filters.empresas.includes(emp.id)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setFilters(prev => ({
                                    ...prev,
                                    empresas: checked
                                      ? [...prev.empresas, emp.id]
                                      : prev.empresas.filter(id => id !== emp.id)
                                  }));
                                }}
                              />
                              <span className="truncate flex-1" title={emp.nombre}>{emp.nombre}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Departamento */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Departamento</Label>
                      <Combobox
                        options={[
                          { value: "all", label: "TODOS LOS DEPARTAMENTOS" },
                          ...filterOptions.departamentos.map(d => ({ value: d.id || "", label: d.name.toUpperCase() }))
                        ]}
                        value={filters.departamento}
                        onChange={(val) => {
                          setFilters(prev => ({ ...prev, departamento: val, municipio: "all" }));
                        }}
                        placeholder="Seleccionar..."
                        className="h-11 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                      />
                    </div>

                    {/* Municipio */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Municipio / Localidad</Label>
                      <Combobox
                        options={[
                          { value: "all", label: "TODOS LOS MUNICIPIOS" },
                          ...filterOptions.municipios.map(m => typeof m === 'string' ? { value: m, label: m.toUpperCase() } : { value: m.id || "", label: m.name.toUpperCase() })
                        ]}
                        value={filters.municipio}
                        onChange={(val) => setFilters(prev => ({ ...prev, municipio: val }))}
                        placeholder="Seleccionar..."
                        className="h-11 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                        disabled={filters.departamento === "all" && initialDepartments.length > 0}
                      />
                    </div>

                    {/* Barrio */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Barrio / Sector</Label>
                      <Input
                        placeholder="EJ: EL POBLADO"
                        value={filters.barrio}
                        onChange={(e) => setFilters(prev => ({ ...prev, barrio: e.target.value }))}
                        className="h-11 text-xs border border-border bg-background text-foreground focus-visible:border-[#01ADFB] transition-all hover:scale-[1.02] focus:scale-[1.02]"
                      />
                    </div>

                    {/* Clasificación */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clasificación Scoring</Label>
                      <Combobox
                        options={[
                          { value: "all", label: "TODAS LAS CATEGORÍAS" },
                          ...filterOptions.clasificaciones.map(c => ({ value: c, label: c }))
                        ]}
                        value={filters.clasificacion}
                        onChange={(val) => setFilters(prev => ({ ...prev, clasificacion: val }))}
                        placeholder="Seleccionar..."
                        className="h-11 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                        hideSearch
                      />
                    </div>

                    {/* Segmento */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Segmento de Negocio</Label>
                      <Combobox
                        options={[
                          { value: "all", label: "TODOS LOS SEGMENTOS" },
                          ...filterOptions.segmentos.map(s => ({ value: s, label: s.toUpperCase() }))
                        ]}
                        value={filters.segmento}
                        onChange={(val) => setFilters(prev => ({ ...prev, segmento: val }))}
                        placeholder="Seleccionar..."
                        className="h-11 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                      />
                    </div>

                    {/* Riesgo */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nivel de Riesgo Operativo</Label>
                      <Combobox
                        options={[
                          { value: "all", label: "TODOS LOS NIVELES" },
                          ...filterOptions.riesgos.map(r => ({ value: r, label: r.toUpperCase() }))
                        ]}
                        value={filters.riesgo}
                        onChange={(val) => setFilters(prev => ({ ...prev, riesgo: val }))}
                        placeholder="Seleccionar..."
                        className="h-11 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                        hideSearch
                      />
                    </div>

                    {/* Rango de Fechas */}
                    <div className="lg:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rango de Fecha de Registro</Label>
                      <div className="flex items-center gap-3">
                        <DatePicker
                          date={filters.fechaDesde ? ymdToPickerDate(filters.fechaDesde) : undefined}
                          onChange={(d) => setFilters(prev => ({ ...prev, fechaDesde: pickerDateToYmd(d) }))}
                          className="flex-1 h-11 bg-background border-border transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                          placeholder="FECHA INICIAL"
                        />
                        <span className="text-muted-foreground font-bold text-xs">AL</span>
                        <DatePicker
                          date={filters.fechaHasta ? ymdToPickerDate(filters.fechaHasta) : undefined}
                          onChange={(d) => setFilters(prev => ({ ...prev, fechaHasta: pickerDateToYmd(d) }))}
                          className="flex-1 h-11 bg-background border-border transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                          placeholder="FECHA FINAL"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-border flex justify-end">
                    <Button
                      onClick={() => setShowFilters(false)}
                      className="h-12 px-10 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] bg-foreground text-background shadow-xl shadow-foreground/20 hover:opacity-90 transition-all"
                    >
                      Aplicar y Cerrar Panel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla con Scroll Interno */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 dark:scrollbar-thumb-muted-foreground/10">
                <table className="w-full text-left border-collapse min-w-[1000px] lg:min-w-full">
                  <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm z-20">
                    <tr className="border-b border-border">
                      <th 
                        className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("nombre")}
                      >
                        <div className="flex items-center gap-2">
                          Cliente / Perfil
                          <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === "nombre" ? "text-[#01ADFB]" : "opacity-30")} />
                        </div>
                      </th>
                      <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Contacto</th>
                      <th 
                        className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground text-center cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("score")}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Clasificación
                          <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === "score" ? "text-[#01ADFB]" : "opacity-30")} />
                        </div>
                      </th>
                      <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground text-center">Segmentación</th>
                      <th 
                        className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground text-center cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("riesgo")}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Riesgo
                          <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === "riesgo" ? "text-[#01ADFB]" : "opacity-30")} />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort("proximaVisita")}
                      >
                        <div className="flex items-center gap-2">
                          Próxima Visita
                          <ArrowUpDown className={cn("h-3 w-3", sortConfig?.key === "proximaVisita" ? "text-[#01ADFB]" : "opacity-30")} />
                        </div>
                      </th>
                      <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Ubicación</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {paginatedClientes.map((cliente) => (
                      <tr key={cliente.id} className="group hover:bg-muted/50 transition-all">
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm border border-border",
                              cliente.tipoCliente === "EMPRESA" ? "bg-primary text-primary-foreground" : "bg-[#01ADFB]/10 text-[#01ADFB]"
                            )}>
                              {cliente.tipoCliente === "EMPRESA" ? <Building2 className="h-6 w-6" /> : <User className="h-6 w-6" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-black tracking-tight text-foreground truncate max-w-[150px] sm:max-w-[200px] lg:max-w-[280px] uppercase">
                                {cliente.tipoCliente === "EMPRESA" ? cliente.razonSocial : `${cliente.nombre} ${cliente.apellido}`}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] border-r border-border pr-2">
                                  {cliente.tipoCliente === "EMPRESA" ? "NIT" : (cliente.tipoDocumento || "CC")}: {cliente.tipoCliente === "EMPRESA" ? (cliente.nit || "S/N") : (cliente.numeroDocumento || "S/N")}
                                </span>
                                <span className="text-[9px] font-black text-[#01ADFB] uppercase tracking-[0.1em]">
                                  {cliente.tipoCliente === "EMPRESA" ? "Corporativo" : "Persona Natural"}
                                </span>
                                {/* Badges de Calidad de Dato */}
                                <div className="flex items-center gap-1 ml-1">
                                  {!cliente.correo && <div title="Sin correo" className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                                  {!getSegmentoNombre(cliente) && <div title="Sin segmento" className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                                  {!cliente.frecuenciaServicio && <div title="Sin frecuencia" className="h-1.5 w-1.5 rounded-full bg-purple-500" />}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs font-black text-foreground">
                              <Phone className="h-3.5 w-3.5 text-emerald-600" />
                              {cliente.telefono}
                            </div>
                            {cliente.correo && (
                              <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground truncate max-w-[120px]">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {cliente.correo}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-6 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border border-black/5",
                              SCORE_COLORS[(cliente.clasificacion || "BRONCE") as keyof typeof SCORE_COLORS]
                            )}>
                              <Trophy className="h-2.5 w-2.5" />
                              {cliente.clasificacion || "BRONCE"}
                            </div>
                            <span className="text-[10px] font-black text-zinc-900 dark:text-zinc-400">{cliente.score || 0} PTS</span>
                          </div>
                        </td>

                        <td className="px-4 py-6 text-center">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-muted border border-border">
                            <Target className="h-3 w-3 text-[#01ADFB]" />
                            <span className="text-[10px] font-black text-foreground uppercase tracking-tight">
                              {getSegmentoNombre(cliente) || "N/A"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-6 text-center">
                          {(() => {
                            const riesgoNombre = getRiesgoNombre(cliente) || "BAJO";
                            const labelInfo = RIESGO_LABELS[riesgoNombre.toUpperCase() as keyof typeof RIESGO_LABELS] || {
                              label: riesgoNombre,
                              color: "text-muted-foreground bg-muted",
                              dot: "bg-muted-foreground"
                            };
                            return (
                              <div className={cn(
                                "inline-block px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border border-black/5 shadow-sm",
                                labelInfo.color
                              )}>
                                {labelInfo.label}
                              </div>
                            );
                          })()}
                        </td>

                        <td className="px-4 py-6 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-2 text-xs font-black text-foreground">
                              <Calendar className="h-3.5 w-3.5 text-[#01ADFB]" />
                              {cliente.proximaVisita ? formatBogotaDate(cliente.proximaVisita) : "PENDIENTE"}
                            </div>
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                              {cliente.frecuenciaServicio ? `CADA ${cliente.frecuenciaServicio} DÍAS` : "PUNTUAL"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-6">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <MapPin className="h-3 w-3 text-[#01ADFB]" />
                              <span className="text-xs font-black text-foreground truncate max-w-[150px] uppercase">
                                {cliente.direcciones?.[0]?.direccion || "SIN DIRECCIÓN"}
                              </span>
                            </div>
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-4">
                              {cliente.direcciones?.[0]?.municipio || "S/M"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted hover:bg-foreground hover:text-background text-muted-foreground transition-all border border-border shadow-sm">
                                <MoreHorizontal className="h-5 w-5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 p-2 rounded-2xl border border-border bg-card shadow-2xl">
                              <DropdownMenuItem
                                onClick={() => setSelectedCliente(cliente)}
                                className="flex items-center gap-3 py-3 text-[11px] font-black uppercase tracking-widest cursor-pointer text-foreground hover:bg-muted"
                              >
                                <Eye className="h-4 w-4 text-[#01ADFB]" /> Ver Expediente
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setSelectedClienteForSuggestions(cliente)}
                                className="flex items-center gap-3 py-3 text-[11px] font-black uppercase tracking-widest cursor-pointer text-foreground hover:bg-muted"
                              >
                                <Zap className="h-4 w-4 text-amber-500" /> Sugerencias
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setSelectedClienteForHistory(cliente)}
                                className="flex items-center gap-3 py-3 text-[11px] font-black uppercase tracking-widest cursor-pointer text-foreground hover:bg-muted"
                              >
                                <FileText className="h-4 w-4 text-purple-600" /> Historial O.S
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setSelectedClienteForConfig(cliente)}
                                className="flex items-center gap-3 py-3 text-[11px] font-black uppercase tracking-widest cursor-pointer text-foreground hover:bg-muted"
                              >
                                <Settings className="h-4 w-4 text-muted-foreground" /> Configuración
                              </DropdownMenuItem>
                              {checkPermission("CLIENT_EDIT") && (
                                <Link href={`/dashboard/clientes/${cliente.id}/editar`}>
                                  <DropdownMenuItem className="flex items-center gap-3 py-3 text-[11px] font-black uppercase tracking-widest cursor-pointer text-foreground hover:bg-muted">
                                    <Pencil className="h-4 w-4 text-amber-600" /> Editar Perfil
                                  </DropdownMenuItem>
                                </Link>
                              )}
                              <DropdownMenuSeparator className="bg-border" />
                              {checkPermission("CLIENT_DELETE") && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(cliente)}
                                  className="flex items-center gap-3 py-3 text-[11px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" /> Eliminar Cartera
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {paginatedClientes.length === 0 && !isPageLoading && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Search className="h-12 w-12 mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">No se encontraron clientes</p>
                  </div>
                )}
                {isPageLoading && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Search className="h-12 w-12 mb-4 opacity-20 animate-pulse" />
                    <p className="font-bold uppercase tracking-widest text-xs">Cargando clientes...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Paginación */}
            <div className="px-8 py-4 border-t border-border bg-card flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Mostrando {pagination?.total ? ((pagination.page - 1) * itemsPerPage) + 1 : 0}-{pagination?.total ? Math.min(pagination.total, pagination.page * itemsPerPage) : 0} de {pagination?.total ?? 0}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-border text-foreground disabled:opacity-30 hover:bg-muted transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      return page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
                    })
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl text-[11px] font-black transition-all",
                            currentPage === page
                              ? "bg-[#01ADFB] text-white shadow-lg shadow-[#01ADFB]/20"
                              : "bg-background border border-border text-foreground hover:bg-muted"
                          )}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-border text-foreground disabled:opacity-30 hover:bg-muted transition-all"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div> {/* closes div (4) flex-1 bg-card */}
        </div> {/* closes div (3) max-w-[1600px] */}
      </div> {/* closes div (2) flex-1 min-h-0 px-4 ... */}

      {/* Modal de Detalles del Cliente - REDISEÑADO PARA MOSTRAR TODA LA INFO */}
      <Dialog open={!!selectedCliente} onOpenChange={(open) => !open && setSelectedCliente(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-background">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalles del Cliente</DialogTitle>
          </DialogHeader>
          {selectedCliente && (
            <div className="flex flex-col h-[90vh]">
              {/* Header Estratégico */}
              <div className={cn(
                "h-40 w-full p-8 flex items-center justify-between text-white relative shrink-0",
                selectedCliente.tipoCliente === "EMPRESA" ? "bg-primary" : "bg-[#01ADFB]"
              )}>
                <div className="flex items-center gap-6 z-10">
                  <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-3xl font-black shadow-2xl border border-white/20">
                    {selectedCliente.tipoCliente === "EMPRESA" ? <Building2 className="h-10 w-10" /> : <User className="h-10 w-10" />}
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-3xl font-black tracking-tight leading-none mb-2">
                      {selectedCliente.tipoCliente === "EMPRESA" ? (selectedCliente.razonSocial || "S/N") : `${selectedCliente.nombre || ''} ${selectedCliente.apellido || ''}`.trim()}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 bg-white/10 rounded-md">
                        {selectedCliente.tipoCliente === "EMPRESA" ? "Corporativo" : "Persona Natural"}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                        ID: {selectedCliente.id}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 z-10">
                  <div className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2",
                    SCORE_COLORS[selectedCliente.clasificacion || "BRONCE"]
                  )}>
                    <Trophy className="h-3 w-3" />
                    {selectedCliente.clasificacion || "BRONCE"}
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Score:</span>
                    <span className="text-xs font-black">{selectedCliente.score || 0} pts</span>
                  </div>
                </div>
              </div>

              {/* Contenido con Scroll Interno */}
              <div className="flex-1 overflow-y-auto p-8 bg-background space-y-10 custom-scrollbar">

                {/* 1. SECCIÓN: RESUMEN ESTRATÉGICO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-muted border border-border shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Segmento Negocio</p>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#01ADFB]/10 flex items-center justify-center text-[#01ADFB]">
                        <Target className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-sm font-black uppercase",
                        getSegmentoNombre(selectedCliente) ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {getSegmentoNombre(selectedCliente) || "No Definido"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted border border-border shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Nivel de Riesgo</p>
                    {(() => {
                      const riesgoNombre = getRiesgoNombre(selectedCliente) || "BAJO";
                      const labelInfo = RIESGO_LABELS[riesgoNombre.toUpperCase() as keyof typeof RIESGO_LABELS] || {
                        label: riesgoNombre,
                        color: "text-muted-foreground bg-muted",
                        dot: "bg-muted-foreground"
                      };
                      return (
                        <div className="flex items-center gap-3">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", labelInfo.color)}>
                            <AlertCircle className="h-4 w-4" />
                          </div>
                          <span className={cn("text-sm font-black uppercase text-foreground")}>
                            {labelInfo.label}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="p-4 rounded-2xl bg-muted border border-border shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Plan Actual</p>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <Zap className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-black text-foreground uppercase">
                        {selectedCliente.planActual || "Plan Estándar"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. SECCIÓN: DATOS DE IDENTIDAD Y PERFIL */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3 px-1">
                    <Fingerprint className="h-4 w-4 text-[#01ADFB]" /> Identidad y Perfil Corporativo
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted p-6 rounded-3xl border border-border">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase">Tipo Documento</p>
                      <p className={cn("text-xs font-black", selectedCliente.tipoDocumento ? "text-foreground" : "text-muted-foreground")}>
                        {selectedCliente.tipoDocumento || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase">Número / NIT</p>
                      <p className={cn("text-xs font-black font-mono", (selectedCliente.nit || selectedCliente.numeroDocumento) ? "text-foreground" : "text-muted-foreground")}>
                        {selectedCliente.nit || selectedCliente.numeroDocumento || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase">Origen Cliente</p>
                      <p className={cn("text-xs font-black", selectedCliente.origenCliente ? "text-foreground" : "text-muted-foreground")}>
                        {selectedCliente.origenCliente || "Desconocido"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase">Tipo Interés</p>
                      <p className={cn("text-xs font-black", selectedCliente.tipoInteres?.nombre ? "text-foreground" : "text-muted-foreground")}>
                        {selectedCliente.tipoInteres?.nombre || "No definido"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase">Subsegmento</p>
                      <p className={cn("text-xs font-black", selectedCliente.subsegmento ? "text-foreground" : "text-muted-foreground")}>
                        {selectedCliente.subsegmento || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase">Act. Económica</p>
                      <p className={cn("text-xs font-black", selectedCliente.actividadEconomica ? "text-foreground" : "text-muted-foreground")}>
                        {selectedCliente.actividadEconomica || "No Registrada"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase">Metraje Total</p>
                      <p className={cn("text-xs font-black", selectedCliente.metrajeTotal ? "text-foreground" : "text-muted-foreground")}>
                        {selectedCliente.metrajeTotal ? `${selectedCliente.metrajeTotal} m²` : "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase">Rep. Legal</p>
                      <p className={cn("text-xs font-black", selectedCliente.representanteLegal ? "text-foreground" : "text-muted-foreground")}>
                        {selectedCliente.representanteLegal || "No Definido"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. SECCIÓN: CONTACTO Y TRAZABILIDAD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3 px-1">
                      <Phone className="h-4 w-4 text-emerald-600" /> Líneas de Contacto
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl border border-border">
                        <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-sm border border-border"><Phone className="h-5 w-5" /></div>
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Teléfono Principal</p>
                          <p className="text-sm font-bold text-foreground">{selectedCliente.telefono}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl border border-border">
                        <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-sm border border-border"><Phone className="h-5 w-5" /></div>
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Teléfono Secundario</p>
                          <p className="text-sm font-bold text-foreground">{selectedCliente.telefono2 || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl border border-border">
                        <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center text-muted-foreground shadow-sm border border-border"><Mail className="h-5 w-5" /></div>
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Correo Electrónico</p>
                          <p className="text-sm font-bold text-foreground">{selectedCliente.correo || "Sin correo"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3 px-1">
                      <Calendar className="h-4 w-4 text-purple-600" /> Cronología y Métricas
                    </h3>
                    <div className="bg-muted p-6 rounded-3xl border border-border grid grid-cols-2 gap-y-6 gap-x-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Creado El</p>
                        <p className="text-xs font-black text-foreground">{selectedCliente.createdAt ? formatBogotaDate(selectedCliente.createdAt) : "N/A"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Última Visita</p>
                        <p className="text-xs font-black text-foreground">{selectedCliente.ultimaVisita ? formatBogotaDate(selectedCliente.ultimaVisita) : "Ninguna"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Próxima Visita</p>
                        <p className="text-xs font-black text-[#01ADFB]">{selectedCliente.proximaVisita ? formatBogotaDate(selectedCliente.proximaVisita) : "Pendiente"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Frecuencia (Días)</p>
                        <p className="text-xs font-black text-foreground">{selectedCliente.frecuenciaServicio || "Puntual"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Ticket Promedio</p>
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">${Number(selectedCliente.ticketPromedio || 0).toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Marketing</p>
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-md",
                          selectedCliente.aceptaMarketing 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                            : "bg-destructive/10 text-destructive"
                        )}>
                          {selectedCliente.aceptaMarketing ? "AUTORIZADO" : "DENEGADO"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. SECCIÓN: SEDES Y UBICACIONES */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-orange-600" /> Sedes Operativas Registradas
                    </h3>
                    <span className="text-[10px] font-black text-[#01ADFB] bg-[#01ADFB]/10 px-3 py-1 rounded-full uppercase">
                      {selectedCliente.direcciones?.length || 0} Sedes
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCliente.direcciones?.map((dir, idx) => (
                      <div key={idx} className="p-6 rounded-3xl bg-muted border border-border relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#01ADFB]/20 group-hover:bg-[#01ADFB] transition-colors" />
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#01ADFB]" />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{dir.nombreSede || `SEDE #${idx + 1}`}</span>
                          </div>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-background border border-border text-foreground uppercase">
                            {dir.tipoUbicacion || "No Def."}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-foreground mb-4">{dir.direccion}</h4>

                        <div className="grid grid-cols-2 gap-y-4 gap-x-2 border-t border-border pt-4">
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase">Municipio</p>
                            <p className="text-xs font-black text-foreground">{dir.municipio || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase">Barrio</p>
                            <p className="text-xs font-black text-foreground">{dir.barrio || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase">Contacto</p>
                            <p className="text-xs font-black text-foreground">{dir.nombreContacto || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase">Tel. Sede</p>
                            <p className="text-xs font-black text-foreground">{dir.telefonoContacto || "N/A"}</p>
                          </div>
                          <div className="col-span-2 space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase">Punto Crítico</p>
                            <p className="text-xs font-black text-foreground">{dir.clasificacionPunto || "No Especificado"}</p>
                          </div>
                          <div className="col-span-2 space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase">Horario Operativo</p>
                            <p className="text-xs font-black text-foreground">
                              {dir.horarioInicio && dir.horarioFin ? `${dir.horarioInicio} - ${dir.horarioFin}` : "Sin restricciones"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!selectedCliente.direcciones || selectedCliente.direcciones.length === 0) && (
                      <div className="col-span-2 py-10 text-center border-2 border-dashed border-border rounded-3xl">
                        <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sin sedes operativas vinculadas</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. SECCIÓN: FLOTA VEHICULAR */}
                <div className="space-y-4 pb-10">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                      <Settings className="h-4 w-4 text-blue-600" /> Parque Automotor Vinculado
                    </h3>
                    <span className="text-[10px] font-black text-foreground bg-muted px-3 py-1 rounded-full uppercase">
                      {selectedCliente.vehiculos?.length || 0} Vehículos
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedCliente.vehiculos?.map((veh, idx) => (
                      <div key={idx} className="p-4 bg-muted rounded-2xl border border-border flex flex-col items-center text-center group transition-all hover:border-foreground shadow-sm">
                        <div className="h-12 w-12 rounded-xl bg-background border border-border flex items-center justify-center mb-3 text-muted-foreground group-hover:text-foreground transition-colors shadow-sm">
                          <Settings className="h-6 w-6" />
                        </div>
                        <p className="text-xs font-black text-foreground uppercase tracking-widest mb-1">{veh.placa}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">{veh.marca} {veh.modelo}</p>
                      </div>
                    ))}
                    {(!selectedCliente.vehiculos || selectedCliente.vehiculos.length === 0) && (
                      <div className="col-span-4 py-8 text-center border-2 border-dashed border-border rounded-3xl">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Sin vehículos registrados en el sistema</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Footer con Acciones */}
              <div className="shrink-0 p-8 bg-background border-t border-border flex gap-4">
                {checkPermission("CLIENT_EDIT") && (
                  <button
                    onClick={() => router.push(`/dashboard/clientes/${selectedCliente.id}/editar`)}
                    className="flex-1 h-14 rounded-2xl bg-[#01ADFB] text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-blue-700 active:scale-[0.98] shadow-xl shadow-[#01ADFB]/25"
                  >
                    Editar Perfil Estratégico
                  </button>
                )}
                <button
                  onClick={() => setSelectedCliente(null)}
                  className="h-14 rounded-2xl border-2 border-border bg-background px-10 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIGURACIÓN OPERATIVA - SERVICIOS */}
      <Dialog
        open={!!selectedClienteForConfig}
        onOpenChange={(open) => !open && setSelectedClienteForConfig(null)}
      >
        <DialogContent className="max-w-5xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-background">
          <DialogHeader className="sr-only">
            <DialogTitle>Configuración Operativa</DialogTitle>
          </DialogHeader>
          {selectedClienteForConfig && (
            <div className="flex flex-col h-[85vh]">
              {/* Header Contextual */}
              <div className="shrink-0 p-8 border-b border-border bg-muted flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-[#01ADFB] flex items-center justify-center text-white shadow-lg shadow-[#01ADFB]/20">
                    <Settings className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground tracking-tight uppercase">
                      Configuración Operativa
                    </h2>
                    <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
                      {selectedClienteForConfig.tipoCliente === "EMPRESA" ? selectedClienteForConfig.razonSocial : `${selectedClienteForConfig.nombre} ${selectedClienteForConfig.apellido}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-black text-[#01ADFB] bg-[#01ADFB]/10 px-3 py-1 rounded-full uppercase">
                    Módulo de Automatización
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                    ID: {selectedClienteForConfig.id.split('-')[0]}...
                  </span>
                </div>
              </div>

              {/* Contenido Scrollable */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

                {configLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <Settings className="h-10 w-10 text-muted-foreground/50 animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sincronizando Parámetros...</p>
                  </div>
                ) : (
                  <>
                    {/* Selector de Sede para Configuración Específica */}
                    <div className="p-6 rounded-3xl bg-[#01ADFB]/5 border border-[#01ADFB]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center text-[#01ADFB] shadow-sm border border-border">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-foreground uppercase">Ámbito de Configuración</h4>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Define si los cambios aplican a todas las sedes o una específica</p>
                        </div>
                      </div>
                      <div className="w-full md:w-64">
                        <Select
                          value={currentConfigSede}
                          onChange={(e) => handleSedeChange(e.target.value)}
                          className="h-11 text-xs font-bold bg-background border-border"
                        >
                          <option value="all">Todas las Sedes (Global)</option>
                          {selectedClienteForConfig.direcciones?.map((dir, i) => (
                            <option key={i} value={dir.direccion}>{dir.nombreSede || dir.direccion.substring(0, 20)}</option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Columna Izquierda: Protocolos y Notas */}
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4 text-[#01ADFB]" /> Protocolo de Servicio Estándar
                          </h3>
                          <textarea
                            value={configForm.protocoloServicio}
                            onChange={(e) => setConfigForm(prev => ({ ...prev, protocoloServicio: e.target.value }))}
                            className="w-full h-40 p-4 rounded-2xl bg-muted border border-border text-xs font-medium text-foreground focus:ring-2 focus:ring-[#01ADFB]/20 focus:border-[#01ADFB] transition-all resize-none"
                            placeholder="Escribe aquí las instrucciones fijas para el técnico (EPP requerido, químicos permitidos, restricciones de acceso...)"
                          />
                          <p className="text-[9px] font-bold text-muted-foreground italic">* Este texto se precargará automáticamente en todas las futuras órdenes de servicio.</p>
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4 text-amber-600" /> Observaciones Administrativas
                          </h3>
                          <textarea
                            value={configForm.observacionesFijas}
                            onChange={(e) => setConfigForm(prev => ({ ...prev, observacionesFijas: e.target.value }))}
                            className="w-full h-32 p-4 rounded-2xl bg-muted border border-border text-xs font-medium text-foreground focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                            placeholder="Notas internas para el personal de oficina (condiciones de pago, horarios de atención, contactos de emergencia...)"
                          />
                        </div>
                      </div>

                      {/* Columna Derecha: Reglas y Agendamiento */}
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4 text-emerald-600" /> Parámetros de Agendamiento
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-background border border-border shadow-sm">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Duración Estimada</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={configForm.duracionEstimada}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, duracionEstimada: parseInt(e.target.value) || 0 }))}
                                  className="h-9 text-xs font-black w-20 border-border bg-background"
                                />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Minutos</span>
                              </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-background border border-border shadow-sm">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Frecuencia Sugerida</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={configForm.frecuenciaSugerida}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, frecuenciaSugerida: parseInt(e.target.value) || 0 }))}
                                  className="h-9 text-xs font-black w-20 border-border bg-background"
                                />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Días</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-purple-600" /> Reglas de Validación
                          </h3>
                          <div className="space-y-3 bg-muted p-6 rounded-3xl border border-border">
                            <label className="flex items-center justify-between cursor-pointer group">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-foreground uppercase tracking-tight">Firma Digital Obligatoria</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">No permite finalizar sin firma del cliente</span>
                              </div>
                              <div
                                onClick={() => setConfigForm(prev => ({ ...prev, requiereFirmaDigital: !prev.requiereFirmaDigital }))}
                                className={cn(
                                  "h-6 w-11 rounded-full flex items-center px-1 transition-all",
                                  configForm.requiereFirmaDigital ? "bg-[#01ADFB]" : "bg-muted-foreground/30"
                                )}
                              >
                                <div className={cn(
                                  "h-4 w-4 rounded-full bg-white transition-all transform",
                                  configForm.requiereFirmaDigital ? "translate-x-5" : "translate-x-0"
                                )} />
                              </div>
                            </label>
                            <div className="h-px bg-border" />
                            <label className="flex items-center justify-between cursor-pointer group">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-foreground uppercase tracking-tight">Fotos de Evidencia</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Exigir fotos de antes y después del servicio</span>
                              </div>
                              <div
                                onClick={() => setConfigForm(prev => ({ ...prev, requiereFotosEvidencia: !prev.requiereFotosEvidencia }))}
                                className={cn(
                                  "h-6 w-11 rounded-full flex items-center px-1 transition-all",
                                  configForm.requiereFotosEvidencia ? "bg-[#01ADFB]" : "bg-muted-foreground/30"
                                )}
                              >
                                <div className={cn(
                                  "h-4 w-4 rounded-full bg-white transition-all transform",
                                  configForm.requiereFotosEvidencia ? "translate-x-5" : "translate-x-0"
                                )} />
                              </div>
                            </label>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <Box className="h-4 w-4 text-blue-600" /> Activos / Elementos Predefinidos
                          </h3>
                          
                          {/* Formulario rápido para nuevo elemento */}
                          <div className="grid grid-cols-3 gap-2 bg-muted p-3 rounded-2xl border border-border">
                            <div className="space-y-1">
                              <Label className="text-[8px] font-black text-muted-foreground uppercase">Nombre / Tag</Label>
                              <Input 
                                placeholder="Eje: Estación 01" 
                                value={newElement.nombre}
                                onChange={(e) => setNewElement(prev => ({ ...prev, nombre: e.target.value }))}
                                className="h-8 text-[10px] border-border bg-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[8px] font-black text-muted-foreground uppercase">Tipo</Label>
                              <Select 
                                value={newElement.tipo}
                                onChange={(e) => setNewElement(prev => ({ ...prev, tipo: e.target.value }))}
                                className="h-8 text-[10px] border-border bg-background"
                              >
                                <option value="Estación de Cebo">Estación de Cebo</option>
                                <option value="Trampa de Luz">Trampa de Luz</option>
                                <option value="Extintor">Extintor</option>
                                <option value="Unidad AC">Unidad AC</option>
                                <option value="Tablero Eléctrico">Tablero Eléctrico</option>
                                <option value="Otro">Otro</option>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[8px] font-black text-muted-foreground uppercase">Acción</Label>
                              <Button 
                                size="sm" 
                                onClick={handleAddElement}
                                className="h-8 w-full bg-[#01ADFB] hover:bg-blue-600 text-white text-[9px] font-bold uppercase"
                              >
                                <Plus className="h-3 w-3 mr-1" /> Añadir
                              </Button>
                            </div>
                            <div className="col-span-3 space-y-1">
                              <Label className="text-[8px] font-black text-muted-foreground uppercase">Ubicación / Notas</Label>
                              <Input 
                                placeholder="Eje: Pasillo de servicio, al lado de la puerta principal" 
                                value={newElement.ubicacion}
                                onChange={(e) => setNewElement(prev => ({ ...prev, ubicacion: e.target.value }))}
                                className="h-8 text-[10px] border-border bg-background"
                              />
                            </div>
                          </div>

                          {/* Lista de elementos agregados */}
                          <div className="space-y-2 mt-4">
                            {configForm.elementosPredefinidos.length === 0 ? (
                              <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No hay elementos configurados</p>
                                <p className="text-[9px] font-medium text-muted-foreground/60 mt-1 lowercase italic">Ej: Trampas de luz, Extintores, Aires acondicionados...</p>
                              </div>
                            ) : (
                              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {configForm.elementosPredefinidos.map((el, i) => (
                                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border shadow-sm group">
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-lg bg-[#01ADFB]/10 flex items-center justify-center text-[#01ADFB] border border-[#01ADFB]/20">
                                        <Box className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <p className="text-[11px] font-black text-foreground leading-tight uppercase">{el.nombre}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                                          {el.tipo} {el.ubicacion ? `| ${el.ubicacion}` : ""}
                                        </p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => handleRemoveElement(i)}
                                      className="h-7 w-7 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-destructive/20"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

              </div>

              {/* Footer de Acciones */}
              <div className="shrink-0 p-8 border-t border-border bg-card flex items-center justify-end gap-4">
                <button
                  onClick={() => setSelectedClienteForConfig(null)}
                  disabled={configLoading}
                  className="px-8 h-12 rounded-xl text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={configLoading}
                  className="px-10 h-12 rounded-xl bg-[#01ADFB] text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE HISTORIAL DE SERVICIOS */}
      <Dialog 
        open={!!selectedClienteForHistory} 
        onOpenChange={(open) => !open && setSelectedClienteForHistory(null)}
      >
        <DialogContent className="max-w-5xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-background">
          <DialogHeader className="sr-only">
            <DialogTitle>Historial de Servicios</DialogTitle>
          </DialogHeader>
          {selectedClienteForHistory && (
            <div className="flex flex-col h-[85vh]">
              {/* Header con Info del Cliente */}
              <div className="shrink-0 p-8 border-b border-border bg-muted flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-[#01ADFB] flex items-center justify-center text-white shadow-lg shadow-[#01ADFB]/20">
                    <Calendar className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground tracking-tight uppercase">
                      Historial de Servicios
                    </h2>
                    <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
                      {selectedClienteForHistory.tipoCliente === "EMPRESA" ? selectedClienteForHistory.razonSocial : `${selectedClienteForHistory.nombre} ${selectedClienteForHistory.apellido}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-black text-[#01ADFB] bg-[#01ADFB]/10 px-3 py-1 rounded-full uppercase">
                    {serviceHistory.length} Servicios Registrados
                  </span>
                </div>
              </div>

              {/* Lista de Servicios */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <Calendar className="h-10 w-10 text-muted-foreground/30 animate-bounce mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Consultando Expediente...</p>
                  </div>
                ) : serviceHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4 border border-border">
                      <Search className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Sin Servicios Previos</h3>
                    <p className="text-xs text-muted-foreground/60 mt-1">Este cliente aún no registra órdenes de servicio en el sistema.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {serviceHistory.map((orden: OrdenServicio) => (
                      <div key={orden.id} className="p-6 rounded-3xl bg-card border border-border hover:border-[#01ADFB] transition-all group shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-5">
                            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-[#01ADFB] transition-colors border border-border">
                              <FileText className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-xs font-black text-foreground uppercase tracking-tight">#{orden.numeroOrden || 'S/N'}</span>
                                <span className={cn(
                                  "text-[9px] font-black px-2 py-0.5 rounded-md uppercase border border-border shadow-sm",
                                  ESTADO_STYLING[orden.estadoServicio] || ESTADO_STYLING["DEFAULT"]
                                )}>
                                  {orden.estadoServicio}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-foreground">{orden.servicio?.nombre || 'Servicio General'}</h4>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase">
                                  <Calendar className="h-3 w-3" />
                                  {orden.fechaVisita ? formatBogotaDate(orden.fechaVisita) : 'Pendiente'}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase">
                                  <MapPin className="h-3 w-3" />
                                  {orden.direccionTexto?.substring(0, 30) || 'Sede Principal'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-10">
                            <div className="hidden md:flex flex-col items-end">
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Técnico Asignado</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="h-6 w-6 rounded-full bg-[#01ADFB]/10 flex items-center justify-center text-[10px] font-bold text-[#01ADFB]">
                                  {orden.tecnico?.user?.nombre?.charAt(0) || 'T'}
                                </div>
                                <span className="text-xs font-bold text-foreground">
                                  {orden.tecnico?.user?.nombre} {orden.tecnico?.user?.apellido}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Valor</p>
                              <p className="text-sm font-black text-foreground mt-1">${Number(orden.valorCotizado || 0).toLocaleString()}</p>
                            </div>
                            <button className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-[#01ADFB] hover:text-white transition-all text-muted-foreground">
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 p-8 border-t border-border bg-card flex items-center justify-end">
                <button 
                  onClick={() => setSelectedClienteForHistory(null)}
                  className="px-10 h-12 rounded-xl bg-[#01ADFB] text-white text-xs font-black uppercase tracking-widest hover:bg-[#01ADFB]/90 transition-all shadow-lg shadow-[#01ADFB]/20"
                >
                  Cerrar Historial
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPresetModalOpen} onOpenChange={setIsPresetModalOpen}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase">
              {editingPresetId ? "Editar Preset" : "Nuevo Preset"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Guarda los filtros actuales de clientes con nombre, color y visibilidad.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Nombre</Label>
              <Input
                value={presetForm.name}
                onChange={(e) => setPresetForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Riesgo + pagos pendientes"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Color</Label>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPresetForm((prev) => ({ ...prev, colorToken: color }))}
                    className={cn(
                      "h-8 px-2 rounded-md border text-[9px] font-black uppercase",
                      PRESET_COLOR_STYLES[color],
                      presetForm.colorToken === color && "ring-2 ring-[#01ADFB]",
                    )}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Visibilidad</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPresetForm((prev) => ({ ...prev, isShared: false }))}
                  className={cn(
                    "h-9 rounded-lg border text-[10px] font-black uppercase",
                    !presetForm.isShared ? "bg-[#01ADFB] text-white border-[#01ADFB]" : "bg-background border-border text-muted-foreground",
                  )}
                >
                  Privado
                </button>
                <button
                  type="button"
                  onClick={() => setPresetForm((prev) => ({ ...prev, isShared: true }))}
                  className={cn(
                    "h-9 rounded-lg border text-[10px] font-black uppercase",
                    presetForm.isShared ? "bg-[#01ADFB] text-white border-[#01ADFB]" : "bg-background border-border text-muted-foreground",
                  )}
                >
                  Compartido
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsPresetModalOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-[#01ADFB] text-white" onClick={savePreset}>
                Guardar Preset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN - PERSONALIZADO */}
      <Dialog
        open={!!clienteToDelete}
        onOpenChange={(open) => !open && setClienteToDelete(null)}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-background">
          <DialogHeader className="sr-only">
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          {clienteToDelete && (
            <div className="flex flex-col">
              <div className="p-8 flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-6 shadow-xl shadow-destructive/10">
                  <AlertCircle className="h-10 w-10" />
                </div>
                
                <h3 className="text-xl font-black text-foreground tracking-tight uppercase mb-2">
                  ¿Eliminar este cliente?
                </h3>
                
                <p className="text-sm font-medium text-muted-foreground leading-relaxed px-4">
                  Estás a punto de eliminar a <span className="font-black text-foreground">
                    {clienteToDelete.tipoCliente === "EMPRESA" ? clienteToDelete.razonSocial : `${clienteToDelete.nombre} ${clienteToDelete.apellido}`}
                  </span>. Esta acción no se puede deshacer y afectará el historial operativo vinculado.
                </p>
              </div>

              <div className="p-6 bg-muted/50 border-t border-border flex gap-3">
                <button
                  onClick={() => setClienteToDelete(null)}
                  className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all border border-border bg-background"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 h-12 rounded-xl bg-destructive text-destructive-foreground text-xs font-black uppercase tracking-widest shadow-lg shadow-destructive/20 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Eliminar Ahora
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* MODAL DE SUGERENCIAS ESTRATÉGICAS */}
      <Dialog
        open={!!selectedClienteForSuggestions}
        onOpenChange={(open) => !open && setSelectedClienteForSuggestions(null)}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-background">
          <DialogHeader className="sr-only">
            <DialogTitle>Acciones Sugeridas</DialogTitle>
          </DialogHeader>
          {selectedClienteForSuggestions && (
            <div className="flex flex-col">
              {/* Header Contextual */}
              <div className="shrink-0 p-8 border-b border-border bg-[#01ADFB]/5 flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-[#01ADFB] flex items-center justify-center text-white shadow-lg shadow-[#01ADFB]/20">
                  <Zap className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight uppercase">
                    Acciones Sugeridas
                  </h2>
                  <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
                    Recomendaciones inteligentes para {selectedClienteForSuggestions.tipoCliente === "EMPRESA" ? selectedClienteForSuggestions.razonSocial : `${selectedClienteForSuggestions.nombre} ${selectedClienteForSuggestions.apellido}`}
                  </p>
                </div>
              </div>

              {/* Lista de Sugerencias */}
              <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {suggestions.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center">
                    <ShieldCheck className="h-12 w-12 text-emerald-500 mb-4 opacity-20" />
                    <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Operación al día</p>
                    <p className="text-xs text-muted-foreground mt-1">No hay acciones urgentes pendientes para este cliente.</p>
                  </div>
                ) : (
                  suggestions.map((sug) => (
                    <div key={sug.id} className="p-6 rounded-3xl border border-border bg-card hover:border-[#01ADFB] transition-all group flex items-start gap-6 shadow-sm">
                      <div className={cn("h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center", sug.color)}>
                        <sug.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black text-foreground uppercase tracking-tight mb-1">{sug.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-4">{sug.description}</p>
                        <Button
                          onClick={sug.action}
                          className="h-10 px-6 rounded-xl bg-foreground text-background text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                        >
                          {sug.actionLabel}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-6 bg-muted/50 border-t border-border flex justify-end">
                <button
                  onClick={() => setSelectedClienteForSuggestions(null)}
                  className="px-8 h-12 rounded-xl text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PANEL LATERAL: COLA DE TAREAS SUGERIDAS (HOY) */}
      {showSuggestionsQueue && (
        <button
          type="button"
          aria-label="Cerrar panel de cola operativa pendiente"
          onClick={() => setShowSuggestionsQueue(false)}
          className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-[1px] cursor-default"
        />
      )}
      <div className={cn(
        "fixed inset-y-0 right-0 w-full sm:w-[450px] bg-background border-l border-border shadow-2xl z-[100] transition-transform duration-500 ease-in-out transform flex flex-col",
        showSuggestionsQueue ? "translate-x-0" : "translate-x-full"
      )} role="dialog" aria-modal="true" aria-label="Cola operativa pendiente">
        {/* Header del Panel */}
        <div className="shrink-0 p-8 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Cola Operativa Pendiente</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Tareas abiertas priorizadas</p>
            </div>
          </div>
          <button
            onClick={() => setShowSuggestionsQueue(false)}
            className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-all"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Stats del Panel */}
        {sugerenciasStats && (
          <div className="p-6 grid grid-cols-3 gap-3 border-b border-border bg-muted/10">
            <div className="p-3 rounded-2xl bg-background border border-border text-center">
              <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Aceptación</p>
              <p className="text-sm font-black text-[#01ADFB]">{sugerenciasStats.tasaAceptacion}%</p>
            </div>
            <div className="p-3 rounded-2xl bg-background border border-border text-center">
              <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">T. Ejecución</p>
              <p className="text-sm font-black text-amber-600">{Math.round(sugerenciasStats.tiempoPromedioEjecucionMin)}m</p>
            </div>
            <div className="p-3 rounded-2xl bg-background border border-border text-center">
              <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Pendientes</p>
              <p className="text-sm font-black text-red-600">{sugerenciasStats.pendientesPorPrioridad.CRITICA + sugerenciasStats.pendientesPorPrioridad.ALTA}</p>
            </div>
          </div>
        )}

        {/* Lista de Tareas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {pendingSugerencias.length === 0 ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
                <ClipboardCheck className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                <p className="text-sm font-black uppercase tracking-widest text-emerald-700">Operación al día</p>
                <p className="text-xs mt-1 text-muted-foreground">No hay pendientes activos en la cola operativa.</p>
                {sugerenciasStats && (
                  <p className="text-[10px] mt-2 font-bold uppercase tracking-widest text-muted-foreground">
                    Creadas hoy: <span className="text-foreground">{sugerenciasStats.totalHoy}</span>
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Últimas sugerencias gestionadas
                </h4>
                {recentManagedSugerencias.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className="text-xs text-muted-foreground">Aún no hay histórico de sugerencias procesadas.</p>
                  </div>
                ) : (
                  recentManagedSugerencias.map((sug) => (
                    <div key={sug.id} className="p-4 rounded-2xl bg-card border border-border shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest",
                          sug.estado === "EJECUTADA" && "bg-emerald-100 text-emerald-700",
                          sug.estado === "ACEPTADA" && "bg-blue-100 text-blue-700",
                          sug.estado === "DESCARTADA" && "bg-slate-100 text-slate-700"
                        )}>
                          {sug.estado}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground">
                          {formatBogotaDate(sug.creadoAt)}
                        </span>
                      </div>
                      <p className="text-xs font-black uppercase tracking-wider text-foreground leading-tight mb-1">{sug.titulo}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{sug.descripcion}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            pendingSugerencias.map((sug) => (
                <div key={sug.id} className="p-5 rounded-3xl bg-card border border-border shadow-sm hover:border-[#01ADFB] transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest",
                      sug.prioridad === "CRITICA" ? "bg-red-100 text-red-700" :
                      sug.prioridad === "ALTA" ? "bg-amber-100 text-amber-700" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {sug.prioridad}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground">
                      {formatBogotaTime(sug.creadoAt)}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-black text-foreground uppercase tracking-tight leading-tight mb-1">{sug.titulo}</h4>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{sug.descripcion}</p>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateSugerencia(sug.id, "ACEPTADA")}
                      className="flex-1 h-9 rounded-xl bg-[#01ADFB] text-[10px] font-black uppercase tracking-widest"
                    >
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateSugerencia(sug.id, "DESCARTADA")}
                      className="h-9 rounded-xl border-border text-[10px] font-black uppercase tracking-widest"
                    >
                      Descartar
                    </Button>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Footer del Panel */}
        <div className="shrink-0 p-8 border-t border-border bg-muted/30">
          <Button
            onClick={() => setShowSuggestionsQueue(false)}
            className="w-full h-12 rounded-xl bg-foreground text-background text-xs font-black uppercase tracking-[0.2em]"
          >
            Volver a la Cartera
          </Button>
        </div>
      </div>
    </div>
  );
}
