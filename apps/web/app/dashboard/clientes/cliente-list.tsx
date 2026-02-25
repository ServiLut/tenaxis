"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
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
  Download,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Mail,
  MapPin,
  Fingerprint,
  Calendar,
  Filter,
  RotateCcw,
  Zap,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/components/ui/utils";
import { toast } from "sonner";
import { exportToExcel, exportToPDF, exportToWord } from "@/lib/utils/export-helper";
import { deleteClienteAction } from "../actions";

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
    direccion: string;
    municipio?: string;
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
}

interface ClienteListProps {
  initialClientes: Cliente[];
}

const SCORE_COLORS = {
  ORO: "bg-amber-500 text-white shadow-black-100",
  PLATA: "bg-zinc-400 text-white shadow-black-100",
  BRONCE: "bg-orange-400 text-white shadow-black-100",
  RIESGO: "bg-red-500 text-white shadow-black-100",
};

const RIESGO_LABELS = {
  BAJO: { label: "Riesgo Bajo", color: "text-emerald-600 bg-emerald-50", dot: "bg-emerald-500" },
  MEDIO: { label: "Riesgo Medio", color: "text-amber-600 bg-amber-50", dot: "bg-amber-500" },
  ALTO: { label: "Riesgo Alto", color: "text-orange-600 bg-orange-50", dot: "bg-orange-500" },
  CRITICO: { label: "Crítico", color: "text-red-600 bg-red-50", dot: "bg-red-500" },
};

export function ClienteList({ initialClientes }: ClienteListProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const clientes = useMemo(() => initialClientes || [], [initialClientes]);
  const [search, setSearch] = useState("");
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showKPIs, setShowKPIs] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este cliente?")) return;

    toast.promise(deleteClienteAction(id), {
      loading: "Eliminando cliente...",
      success: (res) => {
        if (res.success) return "Cliente eliminado correctamente";
        throw new Error(res.error);
      },
      error: (err) => err.message || "Error al eliminar el cliente",
    });
  };

  // Estados de Filtros
  const [filters, setFilters] = useState({
    empresas: [] as string[],
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

  // Valores únicos para los filtros
  const filterOptions = useMemo(() => {
    if (!mounted) return { municipios: [], segmentos: [], clasificaciones: [], riesgos: [], empresas: [] };
    const municipios = Array.from(new Set(clientes.flatMap(c => c.direcciones?.map(d => d.municipio).filter((m): m is string => !!m) || []))).sort();
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

    return { municipios, segmentos, clasificaciones, riesgos, empresas };
  }, [clientes, mounted]);

  const filteredClientes = useMemo(() => {
    if (!mounted) return [];
    return clientes.filter(c => {
      // Búsqueda por texto
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || (
        c.nombre?.toLowerCase().includes(searchLower) ||
        c.apellido?.toLowerCase().includes(searchLower) ||
        c.razonSocial?.toLowerCase().includes(searchLower) ||
        c.nit?.toLowerCase().includes(searchLower) ||
        c.numeroDocumento?.toLowerCase().includes(searchLower)
      );

      // Filtros específicos
      const matchesEmpresas = filters.empresas.length === 0 || (c.empresa?.id && filters.empresas.includes(c.empresa.id));
      const matchesMunicipio = filters.municipio === "all" || c.direcciones?.some(d => d.municipio === filters.municipio);
      const matchesBarrio = !filters.barrio || c.direcciones?.some(d => d.barrio?.toLowerCase().includes(filters.barrio.toLowerCase()));
      const matchesClasificacion = filters.clasificacion === "all" || c.clasificacion === filters.clasificacion;
      const matchesSegmento = filters.segmento === "all" || (c.segmento?.nombre || c.segmentoNegocio) === filters.segmento;
      const matchesRiesgo = filters.riesgo === "all" || (c.riesgo?.nombre || c.nivelRiesgo) === filters.riesgo;

      const clientDate = c.createdAt ? new Date(c.createdAt) : null;
      const matchesFechaDesde = !filters.fechaDesde || (clientDate && clientDate >= new Date(filters.fechaDesde));
      const matchesFechaHasta = !filters.fechaHasta || (clientDate && clientDate <= new Date(filters.fechaHasta + "T23:59:59"));

      return matchesSearch && matchesEmpresas && matchesMunicipio && matchesBarrio && matchesClasificacion && matchesSegmento && matchesRiesgo && matchesFechaDesde && matchesFechaHasta;
    });
  }, [clientes, search, filters, mounted]);

  const handleExport = async (format: 'pdf' | 'excel' | 'word') => {
    let headers: string[];
    let data: (string | number | boolean)[][];

    if (format === 'pdf') {
      headers = ["Cliente", "Identificación", "Tipo", "Celular", "Segmento", "Clasif.", "Riesgo"];
      data = filteredClientes.map(c => [
        c.tipoCliente === "EMPRESA" ? (c.razonSocial || "N/A") : `${c.nombre || ''} ${c.apellido || ''}`.trim(),
        c.tipoCliente === "EMPRESA" ? (c.nit || "N/A") : (c.numeroDocumento || "N/A"),
        c.tipoCliente,
        c.telefono,
        c.segmento?.nombre || c.segmentoNegocio || "N/A",
        c.clasificacion || "BRONCE",
        c.riesgo?.nombre || c.nivelRiesgo || "BAJO"
      ]);
    } else {
      headers = [
        "ID", "Tipo", "Nombre / Razón Social", "Identificación / NIT", "Correo", "Teléfono 1", "Teléfono 2",
        "Clasificación", "Segmento", "Riesgo", "Puntos", "Origen", "Act. Económica", "Metraje", "Frecuencia",
        "Ticket Prom.", "Última Visita", "Próxima Visita", "Fecha Registro"
      ];
      data = filteredClientes.map(c => [
        c.id, c.tipoCliente,
        c.tipoCliente === "EMPRESA" ? (c.razonSocial || "N/A") : `${c.nombre || ''} ${c.apellido || ''}`.trim(),
        c.tipoCliente === "EMPRESA" ? (c.nit || "N/A") : (c.numeroDocumento || "N/A"),
        c.correo || "N/A", c.telefono, c.clasificacion || "BRONCE",
        c.segmento?.nombre || c.segmentoNegocio || "N/A",
        c.riesgo?.nombre || c.nivelRiesgo || "BAJO"
      ]);
    }

    const exportParams = {
      headers,
      data,
      filename: `cartera_clientes_tenaxis_${new Date().toISOString().split('T')[0]}`,
      title: "REPORTE ESTRATÉGICO DE CARTERA DE CLIENTES"
    };

    toast.info(`Generando archivo ${format.toUpperCase()}...`);

    try {
      if (format === 'excel') await exportToExcel(exportParams);
      else if (format === 'pdf') exportToPDF(exportParams);
      else if (format === 'word') await exportToWord(exportParams);
      toast.success(`${format.toUpperCase()} generado exitosamente`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Error al generar el archivo ${format.toUpperCase()}`);
    }
  };

  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "empresas") return (value as string[]).length > 0;
    if (key === "municipio" || key === "clasificacion" || key === "segmento" || key === "riesgo") return value !== "all";
    return !!value;
  }).length;

  const resetFilters = () => {
    setFilters({
      empresas: [],
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

  if (!mounted) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden items-center justify-center">
        <div className="animate-pulse text-sm font-black text-zinc-400 uppercase tracking-widest">
          Sincronizando Cartera...
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden">
      
      {/* KPI Cards Grid */}
      {showKPIs && (
        <div className="px-8 pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 shrink-0 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-azul-1/10 flex items-center justify-center text-azul-1">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Clientes</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.total}</p>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Corporativos</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.empresas}</p>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Clientes Oro</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.oro}</p>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Riesgo Alto</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.riesgoCritico}</p>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Avg Score</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.avgScore}</p>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros Unificada */}
      <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex flex-1 items-center gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por nombre, documento o NIT..."
              className="h-12 pl-12 rounded-lg border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Botón de Filtros Avanzados */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center h-12 px-6 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all gap-2 border",
                activeFiltersCount > 0
                  ? "bg-azul-1 text-white border-azul-1"
                  : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              )}>
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="ml-1 bg-white text-azul-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 rounded-2xl shadow-2xl border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden" align="start">
              <div className="p-6 space-y-6 max-h-[420px] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between border-b border-zinc-50 dark:border-zinc-800 pb-4 sticky top-[-24px] bg-white dark:bg-zinc-900 z-10 pt-1">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Filtros Avanzados</h3>
                  <button
                    onClick={resetFilters}
                    className="text-[11px] font-black text-zinc-600 dark:text-zinc-400 hover:text-azul-1 flex items-center gap-1.5 transition-colors group"
                  >
                    <RotateCcw className="h-3.5 w-3.5 group-hover:rotate-[-45deg] transition-transform" /> REINICIAR
                  </button>
                </div>

                <div className="grid gap-4">
                  {/* Empresa (Solo Admins) */}
                  {(userRole === "SU_ADMIN" || userRole === "ADMIN") && filterOptions.empresas.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Filtrar por Empresas</Label>
                      <Input
                        placeholder="Buscar empresa..."
                        value={empresaSearch}
                        onChange={(e) => setEmpresaSearch(e.target.value)}
                        className="h-9 text-xs mb-2"
                      />
                      <div className="flex flex-col gap-2 max-h-32 overflow-y-auto custom-scrollbar p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        {filterOptions.empresas
                          .filter(emp => emp.nombre.toLowerCase().includes(empresaSearch.toLowerCase()))
                          .map((emp: { id: string, nombre: string }) => (
                          <label key={emp.id} className="flex items-center gap-3 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer group">
                            <div className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 transition-colors",
                              filters.empresas.includes(emp.id) ? "bg-azul-1 border-azul-1" : "bg-white dark:bg-zinc-900 group-hover:border-azul-1"
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

                  {/* Municipio */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Municipio</Label>
                    <Combobox
                      options={[
                        { value: "all", label: "Todos los municipios" },
                        ...filterOptions.municipios.map(m => ({ value: m, label: m }))
                      ]}
                      value={filters.municipio}
                      onChange={(val) => setFilters(prev => ({ ...prev, municipio: val }))}
                      placeholder="Seleccionar municipio..."
                      className="h-10"
                    />
                  </div>

                  {/* Barrio */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Barrio</Label>
                    <Input
                      placeholder="Ej: El Poblado"
                      value={filters.barrio}
                      onChange={(e) => setFilters(prev => ({ ...prev, barrio: e.target.value }))}
                      className="h-10 text-xs"
                    />
                  </div>

                  {/* Clasificación */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Clasificación</Label>
                    <Select
                      value={filters.clasificacion}
                      onChange={(e) => setFilters(prev => ({ ...prev, clasificacion: e.target.value }))}
                      className="h-10 text-xs"
                    >
                      <option value="all">Todas</option>
                      {filterOptions.clasificaciones.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </div>

                  {/* Segmento */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Segmento</Label>
                    <Select
                      value={filters.segmento}
                      onChange={(e) => setFilters(prev => ({ ...prev, segmento: e.target.value }))}
                      className="h-10 text-xs"
                    >
                      <option value="all">Todos los segmentos</option>
                      {filterOptions.segmentos.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>

                  {/* Riesgo */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Nivel de Riesgo</Label>
                    <Select
                      value={filters.riesgo}
                      onChange={(e) => setFilters(prev => ({ ...prev, riesgo: e.target.value }))}
                      className="h-10 text-xs"
                    >
                      <option value="all">Todos los niveles</option>
                      {filterOptions.riesgos.map(r => <option key={r} value={r}>{r}</option>)}
                    </Select>
                  </div>

                  {/* Rango de Fechas */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Fecha de Registro</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={filters.fechaDesde}
                        onChange={(e) => setFilters(prev => ({ ...prev, fechaDesde: e.target.value }))}
                        className="h-10 text-[10px]"
                      />
                      <Input
                        type="date"
                        value={filters.fechaHasta}
                        onChange={(e) => setFilters(prev => ({ ...prev, fechaHasta: e.target.value }))}
                        className="h-10 text-[10px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón de Exportación con Shadcn */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center h-12 px-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 gap-3 transition-all font-bold text-[11px] uppercase tracking-wider">
                <Download className="h-4 w-4" />
                <span>Exportar</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
              <DropdownMenuLabel className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pb-2">Formatos Corporativos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('excel')} className="flex items-center gap-3 py-3 text-[11px] font-bold cursor-pointer hover:text-emerald-600">
                <FileSpreadsheet className="h-4 w-4" /> MICROSOFT EXCEL (.XLSX)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="flex items-center gap-3 py-3 text-[11px] font-bold cursor-pointer hover:text-red-600">
                <FileText className="h-4 w-4" /> DOCUMENTO PDF (.PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('word')} className="flex items-center gap-3 py-3 text-[11px] font-bold cursor-pointer hover:text-blue-600">
                <FileIcon className="h-4 w-4" /> MICROSOFT WORD (.DOCX)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/dashboard/clientes/nuevo">
            <div className="flex items-center h-12 px-8 rounded-lg bg-azul-1 text-zinc-50 gap-3 shadow-lg shadow-azul-1/20 transition-all hover:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer">
              <Plus className="h-5 w-5" />
              <span className="font-bold uppercase tracking-wider text-[11px]">Nuevo Registro</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Tabla con Scroll Interno */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
          <table className="w-full text-left border-collapse min-w-[1000px] lg:min-w-full">
            <thead className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-20">
              <tr className="border-b border-zinc-100 dark:border-zinc-800/50">
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-300">Cliente</th>
                <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-300">Documento</th>
                <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-300 text-center">Clasificación</th>
                <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-300 text-center">Segmento</th>
                <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-300 text-center">Riesgo</th>
                <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-300">Teléfonos</th>
                <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-300">Ubicación</th>
                <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {paginatedClientes.map((cliente) => (
                <tr key={cliente.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all">
                  <td className="px-4 py-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md",
                        cliente.tipoCliente === "EMPRESA" ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                      )}>
                        {cliente.tipoCliente === "EMPRESA" ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-100 truncate max-w-[150px] sm:max-w-[200px] lg:max-w-[280px]">
                          {cliente.tipoCliente === "EMPRESA" ? cliente.razonSocial : `${cliente.nombre} ${cliente.apellido}`}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[120px]">
                          {cliente.tipoCliente === "EMPRESA" ? "Empresa" : "Persona Natural"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                        {cliente.tipoCliente === "EMPRESA" ? (cliente.nit || "Sin NIT") : (cliente.numeroDocumento || "Sin Doc")}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase">
                        {cliente.tipoCliente === "EMPRESA" ? "NIT" : "Documento"}
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-6 text-center">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm",
                      SCORE_COLORS[cliente.clasificacion || "BRONCE"]
                    )}>
                      <Trophy className="h-2.5 w-2.5" />
                      {cliente.clasificacion || "BRONCE"}
                    </div>
                  </td>

                  <td className="px-3 py-6 text-center">
                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                      {cliente.segmento?.nombre || cliente.segmentoNegocio || "N/A"}
                    </span>
                  </td>

                  <td className="px-3 py-6 text-center">
                    {(() => {
                      const riesgoNombre = cliente.riesgo?.nombre || cliente.nivelRiesgo || "BAJO";
                      const labelInfo = RIESGO_LABELS[riesgoNombre.toUpperCase() as keyof typeof RIESGO_LABELS] || {
                        label: riesgoNombre,
                        color: "text-zinc-600 bg-zinc-50",
                        dot: "bg-zinc-500"
                      };
                      return (
                        <div className={cn(
                          "inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                          labelInfo.color
                        )}>
                          {labelInfo.label}
                        </div>
                      );
                    })()}
                  </td>

                  <td className="px-3 py-6">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                        <Phone className="h-3 w-3 text-zinc-400" />
                        {cliente.telefono}
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-6">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">
                        {cliente.direcciones?.[0]?.direccion || "N/A"}
                      </span>
                      <span className="text-[9px] font-medium text-zinc-400 uppercase">
                        {cliente.direcciones?.[0]?.municipio || "S/M"}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-6 text-right">
                    {/* Dropdown de Acciones de Shadcn - Soluciona el problema de Z-Index y Scroll */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-400 dark:bg-zinc-800/50 dark:hover:bg-white dark:hover:text-black transition-all">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl">
                        <DropdownMenuItem
                          onClick={() => setSelectedCliente(cliente)}
                          className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer"
                        >
                          <Eye className="h-4 w-4 text-zinc-400" /> VER DETALLES
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer">
                          <Settings className="h-4 w-4 text-zinc-400" /> SERVICIOS
                        </DropdownMenuItem>
                        <Link href={`/dashboard/clientes/${cliente.id}/editar`}>
                          <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer">
                            <Pencil className="h-4 w-4 text-zinc-400" /> EDITAR
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(cliente.id)}
                          className="flex items-center gap-3 py-2.5 text-[11px] font-bold text-red-600 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" /> ELIMINAR
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredClientes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <Search className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">No se encontraron clientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Paginación */}
      <div className="px-8 py-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-300">
            Mostrando {Math.min(filteredClientes.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredClientes.length, currentPage * itemsPerPage)} de {filteredClientes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-300 disabled:opacity-30 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl text-[11px] font-black transition-all",
                  currentPage === page
                    ? "bg-azul-1 text-zinc-50 shadow-lg shadow-azul-1/20"
                    : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                )}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-300 disabled:opacity-30 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Modal de Detalles del Cliente - REDISEÑADO PARA MOSTRAR TODA LA INFO */}
      <Dialog open={!!selectedCliente} onOpenChange={(open) => !open && setSelectedCliente(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalles del Cliente</DialogTitle>
          </DialogHeader>
          {selectedCliente && (
            <div className="flex flex-col h-[90vh]">
              {/* Header Estratégico */}
              <div className={cn(
                "h-40 w-full p-8 flex items-center justify-between text-white relative shrink-0",
                selectedCliente.tipoCliente === "EMPRESA" ? "bg-zinc-900" : "bg-azul-1"
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
              <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-950 space-y-10 custom-scrollbar">

                {/* 1. SECCIÓN: RESUMEN ESTRATÉGICO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Segmento Negocio</p>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-azul-1/10 flex items-center justify-center text-azul-1">
                        <Target className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase">
                        {selectedCliente.segmento?.nombre || selectedCliente.segmentoNegocio || "No Definido"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Nivel de Riesgo</p>
                    {(() => {
                      const riesgoNombre = selectedCliente.riesgo?.nombre || selectedCliente.nivelRiesgo || "BAJO";
                      const labelInfo = RIESGO_LABELS[riesgoNombre.toUpperCase() as keyof typeof RIESGO_LABELS] || {
                        label: riesgoNombre,
                        color: "text-zinc-600 bg-zinc-50",
                        dot: "bg-zinc-500"
                      };
                      return (
                        <div className="flex items-center gap-3">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", labelInfo.color)}>
                            <AlertCircle className="h-4 w-4" />
                          </div>
                          <span className={cn("text-sm font-black uppercase", labelInfo.color.split(' ')[0])}>
                            {labelInfo.label}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Plan Actual</p>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Zap className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase">
                        {selectedCliente.planActual || "Plan Estándar"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. SECCIÓN: DATOS DE IDENTIDAD Y PERFIL */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-3 px-1">
                    <Fingerprint className="h-4 w-4" /> Identidad y Perfil Corporativo
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Tipo Documento</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.tipoDocumento || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Número / NIT</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono">{selectedCliente.nit || selectedCliente.numeroDocumento || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Origen Cliente</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.origenCliente || "Desconocido"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Tipo Interés</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.tipoInteres?.nombre || "No definido"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Subsegmento</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.subsegmento || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Act. Económica</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.actividadEconomica || "No Registrada"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Metraje Total</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.metrajeTotal ? `${selectedCliente.metrajeTotal} m²` : "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Rep. Legal</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.representanteLegal || "No Definido"}</p>
                    </div>
                  </div>
                </div>

                {/* 3. SECCIÓN: CONTACTO Y TRAZABILIDAD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-3 px-1">
                      <Phone className="h-4 w-4" /> Líneas de Contacto
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                        <div className="h-10 w-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400"><Phone className="h-5 w-5" /></div>
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Teléfono Principal</p>
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.telefono}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                        <div className="h-10 w-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400"><Phone className="h-5 w-5" /></div>
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Teléfono Secundario</p>
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.telefono2 || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                        <div className="h-10 w-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400"><Mail className="h-5 w-5" /></div>
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Correo Electrónico</p>
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.correo || "Sin correo"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-3 px-1">
                      <Calendar className="h-4 w-4" /> Cronología y Métricas
                    </h3>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-y-6 gap-x-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-zinc-400 uppercase">Creado El</p>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.createdAt ? new Date(selectedCliente.createdAt).toLocaleDateString() : "N/A"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-zinc-400 uppercase">Última Visita</p>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.ultimaVisita ? new Date(selectedCliente.ultimaVisita).toLocaleDateString() : "Ninguna"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-zinc-400 uppercase">Próxima Visita</p>
                        <p className="text-xs font-bold text-azul-1">{selectedCliente.proximaVisita ? new Date(selectedCliente.proximaVisita).toLocaleDateString() : "Pendiente"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-zinc-400 uppercase">Frecuencia (Días)</p>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedCliente.frecuenciaServicio || "Puntual"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-zinc-400 uppercase">Ticket Promedio</p>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">${Number(selectedCliente.ticketPromedio || 0).toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-zinc-400 uppercase">Marketing</p>
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-md",
                          selectedCliente.aceptaMarketing ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
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
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-3">
                      <MapPin className="h-4 w-4" /> Sedes Operativas Registradas
                    </h3>
                    <span className="text-[10px] font-black text-azul-1 bg-azul-1/10 px-3 py-1 rounded-full uppercase">
                      {selectedCliente.direcciones?.length || 0} Sedes
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCliente.direcciones?.map((dir, idx) => (
                      <div key={idx} className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-azul-1/20 group-hover:bg-azul-1 transition-colors" />
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-azul-1" />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{dir.nombreSede || `SEDE #${idx + 1}`}</span>
                          </div>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase">
                            {dir.tipoUbicacion || "No Def."}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 mb-4">{dir.direccion}</h4>

                        <div className="grid grid-cols-2 gap-y-4 gap-x-2 border-t border-zinc-50 dark:border-zinc-800 pt-4">
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-zinc-400 uppercase">Municipio</p>
                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{dir.municipio || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-zinc-400 uppercase">Barrio</p>
                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{dir.barrio || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-zinc-400 uppercase">Contacto</p>
                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{dir.nombreContacto || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-zinc-400 uppercase">Tel. Sede</p>
                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{dir.telefonoContacto || "N/A"}</p>
                          </div>
                          <div className="col-span-2 space-y-1">
                            <p className="text-[9px] font-black text-zinc-400 uppercase">Punto Crítico</p>
                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{dir.clasificacionPunto || "No Especificado"}</p>
                          </div>
                          <div className="col-span-2 space-y-1">
                            <p className="text-[9px] font-black text-zinc-400 uppercase">Horario Operativo</p>
                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                              {dir.horarioInicio && dir.horarioFin ? `${dir.horarioInicio} - ${dir.horarioFin}` : "Sin restricciones"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!selectedCliente.direcciones || selectedCliente.direcciones.length === 0) && (
                      <div className="col-span-2 py-10 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                        <MapPin className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Sin sedes operativas vinculadas</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. SECCIÓN: FLOTA VEHICULAR */}
                <div className="space-y-4 pb-10">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-3">
                      <Settings className="h-4 w-4" /> Parque Automotor Vinculado
                    </h3>
                    <span className="text-[10px] font-black text-zinc-900 dark:text-white bg-zinc-200 dark:bg-zinc-800 px-3 py-1 rounded-full uppercase">
                      {selectedCliente.vehiculos?.length || 0} Vehículos
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedCliente.vehiculos?.map((veh, idx) => (
                      <div key={idx} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center group transition-all hover:border-zinc-900 dark:hover:border-white">
                        <div className="h-12 w-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center mb-3 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                          <Settings className="h-6 w-6" />
                        </div>
                        <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-1">{veh.placa}</p>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase">{veh.marca} {veh.modelo}</p>
                      </div>
                    ))}
                    {(!selectedCliente.vehiculos || selectedCliente.vehiculos.length === 0) && (
                      <div className="col-span-4 py-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Sin vehículos registrados en el sistema</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

                            {/* Footer con Acciones */}
                            <div className="shrink-0 p-8 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex gap-4">
                              <button
                                onClick={() => router.push(`/dashboard/clientes/${selectedCliente.id}/editar`)}
                                className="flex-1 h-14 rounded-2xl bg-azul-1 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-blue-700 active:scale-[0.98] shadow-xl shadow-azul-1/25"
                              >
                                Editar Perfil Estratégico
                              </button>
                              <button
                                onClick={() => setSelectedCliente(null)}
                                className="px-10 h-14 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 text-xs font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all"
                              >
                                Cerrar
                              </button>
                            </div>            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
