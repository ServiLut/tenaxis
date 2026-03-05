"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { toast } from "sonner";
import {
  deleteClienteAction,
  getClienteConfigsAction,
  upsertClienteConfigAction,
  getOrdenesServicioByClienteAction,
  ConfiguracionOperativa,
  ElementoPredefinido
} from "../actions";
import { Contact } from "lucide-react";

interface Cliente {
  id: string;
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  tipoCliente: "PERSONA" | "EMPRESA";
  segmentoNegocio?: string;
  segmento?: {
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
  score: number;
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

interface ClienteListProps {
  initialClientes: Cliente[];
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

interface OrdenServicio {
  id: string;
  numeroOrden?: string;
  estadoServicio: string;
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
}

export function ClienteList({ initialClientes, initialDepartments = [], initialMunicipalities = [] }: ClienteListProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const clientes = useMemo(() => initialClientes || [], [initialClientes]);
  const [search, setSearch] = useState("");
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedClienteForConfig, setSelectedClienteForConfig] = useState<Cliente | null>(null);
  const [selectedClienteForHistory, setSelectedClienteForHistory] = useState<Cliente | null>(null);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
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

  const [userRole, setUserRole] = useState<string | null>(null);
  const [showKPIs, setShowKPIs] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const stats = useMemo(() => {
    const total = initialClientes.length;
    const empresas = initialClientes.filter(c => c.tipoCliente === "EMPRESA").length;
    const oro = initialClientes.filter(c => c.clasificacion === "ORO").length;
    const riesgoCritico = initialClientes.filter(c => {
      const r = (c.riesgo?.nombre || c.nivelRiesgo || "").toUpperCase();
      return r === "CRITICO" || r === "ALTO";
    }).length;
    const avgScore = total > 0 ? Math.round(initialClientes.reduce((acc, c) => acc + (c.score || 0), 0) / total) : 0;

    return { total, empresas, oro, riesgoCritico, avgScore };
  }, [initialClientes]);

  const handleDelete = (cliente: Cliente) => {
    setClienteToDelete(cliente);
  };

  const confirmDelete = async () => {
    if (!clienteToDelete) return;
    const id = clienteToDelete.id;
    setClienteToDelete(null);
    toast.promise(deleteClienteAction(id), {
      loading: "Eliminando cliente...",
      success: (res) => {
        if (res.success) return "Cliente eliminado correctamente";
        throw new Error(res.error);
      },
      error: (err) => err.message || "Error al eliminar el cliente",
    });
  };

  const [filters, setFilters] = useState({
    empresas: [] as string[],
    departamento: "all",
    municipio: "all",
    barrio: "",
    clasificacion: "all",
    segmento: "all",
    riesgo: "all",
    fechaDesde: "",
    fechaHasta: "",
  });

  const itemsPerPage = 10;

  React.useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem("user");
    if (userData && userData !== "undefined") {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role);
      } catch (_e) { /* ignore */ }
    }
  }, []);

  const filterOptions = useMemo(() => {
    if (!mounted) return { municipios: [], segmentos: [], clasificaciones: [], riesgos: [], empresas: [], departamentos: [] };
    const departamentos = initialDepartments.length > 0
      ? initialDepartments.sort((a, b) => a.name.localeCompare(b.name))
      : Array.from(new Set(clientes.flatMap(c => c.direcciones?.map(d => d.departmentId).filter(Boolean) || [])))
          .map(id => ({ id, name: String(id), code: String(id) }));
    const municipios = initialMunicipalities.length > 0
      ? initialMunicipalities
          .filter(m => filters.departamento === "all" || m.departmentId === filters.departamento)
          .sort((a, b) => a.name.localeCompare(b.name))
      : Array.from(new Set(clientes.flatMap(c => c.direcciones?.map(d => d.municipio).filter((m): m is string => !!m) || [])))
          .sort();
    const segmentos = Array.from(new Set(clientes.map(c => c.segmento?.nombre || c.segmentoNegocio).filter((s): s is string => !!s))).sort();
    const clasificaciones = ["ORO", "PLATA", "BRONCE", "RIESGO"];
    const riesgos = Array.from(new Set(clientes.map(c => c.riesgo?.nombre || c.nivelRiesgo).filter((r): r is string => !!r))).sort();
    const empresas = Array.from(
      new Map(
        clientes
          .filter(c => c.empresa)
          .map(c => [c.empresa!.id, { id: c.empresa!.id, nombre: c.empresa!.nombre }])
      ).values()
    ).sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { municipios, segmentos, clasificaciones, riesgos, empresas, departamentos };
  }, [clientes, mounted, filters.departamento, initialDepartments, initialMunicipalities]);

  const filteredClientes = useMemo(() => {
    if (!mounted) return [];
    return clientes.filter(c => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || (
        c.nombre?.toLowerCase().includes(searchLower) ||
        c.apellido?.toLowerCase().includes(searchLower) ||
        c.razonSocial?.toLowerCase().includes(searchLower) ||
        c.nit?.toLowerCase().includes(searchLower) ||
        c.numeroDocumento?.toLowerCase().includes(searchLower)
      );
      const matchesEmpresas = filters.empresas.length === 0 || (c.empresa?.id && filters.empresas.includes(c.empresa.id));
      const matchesDepartamento = filters.departamento === "all" || c.direcciones?.some(d => d.departmentId === filters.departamento);
      const matchesMunicipio = filters.municipio === "all" || c.direcciones?.some(d => d.municipioId === filters.municipio || d.municipio === filters.municipio);
      const matchesBarrio = !filters.barrio || c.direcciones?.some(d => d.barrio?.toLowerCase().includes(filters.barrio.toLowerCase()));
      const matchesClasificacion = filters.clasificacion === "all" || c.clasificacion === filters.clasificacion;
      const matchesSegmento = filters.segmento === "all" || (c.segmento?.nombre || c.segmentoNegocio) === filters.segmento;
      const matchesRiesgo = filters.riesgo === "all" || (c.riesgo?.nombre || c.nivelRiesgo) === filters.riesgo;
      const clientDate = c.createdAt ? new Date(c.createdAt) : null;
      const matchesFechaDesde = !filters.fechaDesde || (clientDate && clientDate >= new Date(filters.fechaDesde));
      const matchesFechaHasta = !filters.fechaHasta || (clientDate && clientDate <= new Date(filters.fechaHasta + "T23:59:59"));
      return matchesSearch && matchesEmpresas && matchesDepartamento && matchesMunicipio && matchesBarrio && matchesClasificacion && matchesSegmento && matchesRiesgo && matchesFechaDesde && matchesFechaHasta;
    });
  }, [clientes, search, filters, mounted]);

  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "empresas") return (value as string[]).length > 0;
    if (key === "municipio" || key === "departamento" || key === "clasificacion" || key === "segmento" || key === "riesgo") return value !== "all";
    return !!value;
  }).length;

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
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filters]);

  React.useEffect(() => {
    const loadConfigs = async () => {
      if (!selectedClienteForConfig) return;
      setConfigLoading(true);
      const configs = await getClienteConfigsAction(selectedClienteForConfig.id) as ConfiguracionOperativa[];
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
          elementosPredefinidos: (globalConfig.elementosPredefinidos as ElementoPredefinido[]) || [],
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
      const history = await getOrdenesServicioByClienteAction(selectedClienteForHistory.id);
      setServiceHistory(history);
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
    const cookieStore = document.cookie;
    const empresaId = cookieStore.split("; ").find(row => row.startsWith("x-enterprise-id="))?.split("=")[1];
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
    toast.promise(upsertClienteConfigAction(payload), {
      loading: "Guardando configuración...",
      success: (res) => {
        if (res.success) {
          setSelectedClienteForConfig(null);
          return "Configuración guardada exitosamente";
        }
        throw new Error(res.error);
      },
      error: (err) => err.message || "Error al guardar la configuración",
    });
  };

  if (!mounted) {
    return (
      <div className="flex flex-col h-full bg-background rounded-xl border border-border shadow-xl items-center justify-center">
        <div className="animate-pulse text-sm font-black text-muted-foreground uppercase tracking-widest">
          Sincronizando Cartera...
        </div>
      </div>
    );
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
          <div className="md:ml-auto">
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
              </div>

              <div className="flex items-center gap-3">
                <Link href="/dashboard/clientes/nuevo">
                  <div className="flex items-center h-12 px-8 rounded-xl bg-[#01ADFB] text-white gap-3 shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                    <Plus className="h-5 w-5" />
                    <span className="font-black uppercase tracking-widest text-[10px]">Nuevo Cliente</span>
                  </div>
                </Link>
              </div>
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
                    {/* Empresa (Solo Admins) */}
                    {(userRole === "SU_ADMIN" || userRole === "ADMIN") && filterOptions.empresas.length > 0 && (
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
                          date={filters.fechaDesde ? new Date(filters.fechaDesde + "T00:00:00") : undefined}
                          onChange={(d) => setFilters(prev => ({ ...prev, fechaDesde: d ? d.toISOString().split("T")[0] : "" }))}
                          className="flex-1 h-11 bg-background border-border transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                          placeholder="FECHA INICIAL"
                        />
                        <span className="text-muted-foreground font-bold text-xs">AL</span>
                        <DatePicker
                          date={filters.fechaHasta ? new Date(filters.fechaHasta + "T00:00:00") : undefined}
                          onChange={(d) => setFilters(prev => ({ ...prev, fechaHasta: d ? d.toISOString().split("T")[0] : "" }))}
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
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Cliente / Perfil</th>
                      <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Documentación</th>
                      <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground text-center">Clasificación</th>
                      <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground text-center">Segmentación</th>
                      <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground text-center">Riesgo</th>
                      <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Contacto</th>
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
                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] mt-0.5">
                                {cliente.tipoCliente === "EMPRESA" ? "Corporativo" : "Persona Natural"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-foreground font-mono">
                              {cliente.tipoCliente === "EMPRESA" ? (cliente.nit || "SIN NIT") : (cliente.numeroDocumento || "SIN DOC")}
                            </span>
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mt-0.5">
                              {cliente.tipoCliente === "EMPRESA" ? "NIT" : (cliente.tipoDocumento || "CC")}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-6 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border border-black/5",
                              SCORE_COLORS[cliente.clasificacion || "BRONCE"]
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
                              {cliente.segmento?.nombre || cliente.segmentoNegocio || "N/A"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-6 text-center">
                          {(() => {
                            const riesgoNombre = cliente.riesgo?.nombre || cliente.nivelRiesgo || "BAJO";
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
                              <Link href={`/dashboard/clientes/${cliente.id}/editar`}>
                                <DropdownMenuItem className="flex items-center gap-3 py-3 text-[11px] font-black uppercase tracking-widest cursor-pointer text-foreground hover:bg-muted">
                                  <Pencil className="h-4 w-4 text-amber-600" /> Editar Perfil
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator className="bg-border" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(cliente)}
                                className="flex items-center gap-3 py-3 text-[11px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" /> Eliminar Cartera
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredClientes.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Search className="h-12 w-12 mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">No se encontraron clientes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Paginación */}
            <div className="px-8 py-4 border-t border-border bg-card flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Mostrando {Math.min(filteredClientes.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredClientes.length, currentPage * itemsPerPage)} de {filteredClientes.length}
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
                        (selectedCliente.segmento?.nombre || selectedCliente.segmentoNegocio) ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {selectedCliente.segmento?.nombre || selectedCliente.segmentoNegocio || "No Definido"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted border border-border shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Nivel de Riesgo</p>
                    {(() => {
                      const riesgoNombre = selectedCliente.riesgo?.nombre || selectedCliente.nivelRiesgo || "BAJO";
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
                        <p className="text-xs font-black text-foreground">{selectedCliente.createdAt ? new Date(selectedCliente.createdAt).toLocaleDateString() : "N/A"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Última Visita</p>
                        <p className="text-xs font-black text-foreground">{selectedCliente.ultimaVisita ? new Date(selectedCliente.ultimaVisita).toLocaleDateString() : "Ninguna"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Próxima Visita</p>
                        <p className="text-xs font-black text-[#01ADFB]">{selectedCliente.proximaVisita ? new Date(selectedCliente.proximaVisita).toLocaleDateString() : "Pendiente"}</p>
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
                <button
                  onClick={() => router.push(`/dashboard/clientes/${selectedCliente.id}/editar`)}
                  className="flex-1 h-14 rounded-2xl bg-[#01ADFB] text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-blue-700 active:scale-[0.98] shadow-xl shadow-[#01ADFB]/25"
                >
                  Editar Perfil Estratégico
                </button>
                <button
                  onClick={() => setSelectedCliente(null)}
                  className="px-10 h-14 rounded-2xl border-2 border-border text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted hover:text-foreground transition-all bg-background"
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
                                  {orden.fechaVisita ? new Date(orden.fechaVisita).toLocaleDateString() : 'Pendiente'}
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
    </div>
  );
}
