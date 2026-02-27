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
  Clock,
  ClipboardCheck,
  ShieldCheck,
  Box,
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
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { toast } from "sonner";
import { exportToExcel, exportToPDF, exportToWord } from "@/lib/utils/export-helper";
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
  ORO: "bg-amber-500 text-black dark:text-zinc-300 shadow-black-100",
  PLATA: "bg-zinc-400 text-black dark:text-zinc-300 shadow-black-100",
  BRONCE: "bg-orange-800 text-white shadow-black-100",
  RIESGO: "bg-red-500 text-black dark:text-zinc-300 shadow-black-100",
};

const RIESGO_LABELS = {
  BAJO: { label: "Riesgo Bajo", color: "text-emerald-600 bg-emerald-50", dot: "bg-emerald-500" },
  MEDIO: { label: "Riesgo Medio", color: "text-amber-600 bg-amber-50", dot: "bg-amber-500" },
  ALTO: { label: "Riesgo Alto", color: "text-red-600 bg-red-50", dot: "bg-red-500" },
  CRITICO: { label: "Crítico", color: "text-red-600 bg-red-50", dot: "bg-red-500" },
  "PLAGA ALTA": { label: "Plaga Alta", color: "text-red-600 bg-red-50", dot: "bg-red-500" },
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

  // Form States para ConfiguraciÃ³n
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

  // Estados de Filtros
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

  // Valores únicos para los filtros
  const filterOptions = useMemo(() => {
    if (!mounted) return { municipios: [], segmentos: [], clasificaciones: [], riesgos: [], empresas: [], departamentos: [] };
    
    // Si tenemos datos maestros de departamentos, los usamos
    const departamentos = initialDepartments.length > 0 
      ? initialDepartments.sort((a, b) => a.name.localeCompare(b.name))
      : Array.from(new Set(clientes.flatMap(c => c.direcciones?.map(d => d.departmentId).filter(Boolean) || [])))
          .map(id => ({ id, name: String(id), code: String(id) }));

    // Si tenemos datos maestros de municipios, los filtramos por el departamento seleccionado
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

  // Cargar configuraciones cuando se abre el modal
  React.useEffect(() => {
    const loadConfigs = async () => {
      if (!selectedClienteForConfig) return;
      setConfigLoading(true);
      const configs = await getClienteConfigsAction(selectedClienteForConfig.id) as ConfiguracionOperativa[];
      setActiveConfigs(configs);

      // Cargar configuración "Global" (all) por defecto
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
        // Reset a valores por defecto si no hay global
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

  // Cargar historial de servicios
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

  // Cambiar de sede en el formulario
  const handleSedeChange = (sedeValue: string) => {
    setCurrentConfigSede(sedeValue);

    // Si direccionId es null en la DB, es global. Si no, es por sede.
    // El frontend usa 'direccion' como valor para identificar la sede.
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

    setNewElement({
      nombre: "",
      tipo: "Estación de Cebo",
      ubicacion: "",
    });
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
      toast.error("No se encontrÃ³ la empresa activa");
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
      loading: "Guardando configuraciÃ³n...",
      success: (res) => {
        if (res.success) {
          setSelectedClienteForConfig(null);
          return "ConfiguraciÃ³n guardada exitosamente";
        }
        throw new Error(res.error);
      },
      error: (err) => err.message || "Error al guardar la configuraciÃ³n",
    });
  };

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
    <div className="flex flex-col h-full">
      {/* Sub-Header Estratégico */}
      <div className="shrink-0 py-10 px-6 lg:px-10 border-b border-zinc-200/60 dark:border-zinc-800/50 mb-8 bg-gray-50 dark:bg-zinc-900/50">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azul-1 text-white shadow-xl shadow-azul-1/20">
            <Contact className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              Cartera de <span className="text-azul-1 dark:text-claro-azul-4">Clientes</span>
            </h1>
            <p className="text-zinc-500 font-medium mt-1">
              Gestión estratégica y segmentación de la base instalada.
            </p>
          </div>
          <div className="md:ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKPIs(!showKPIs)}
              className="h-10 px-4 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[10px] font-black uppercase tracking-widest gap-2"
            >
              {showKPIs ? (
                <>
                  <EyeOff className="h-4 w-4 text-amber-500" />
                  Ocultar KPIs
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 text-azul-1" />
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
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-azul-1/10 flex items-center justify-center text-azul-1">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Clientes</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.total}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Corporativos</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.empresas}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Clientes Oro</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.oro}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Riesgo Alto</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.riesgoCritico}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Avg Score</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-zinc-300">{stats.avgScore}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden">
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

                  {/* Departamento */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Departamento</Label>
                    <Combobox
                      options={[
                        { value: "all", label: "Todos los departamentos" },
                        ...filterOptions.departamentos.map(d => ({ value: d.id || "", label: d.name }))
                      ]}
                      value={filters.departamento}
                      onChange={(val) => {
                        setFilters(prev => ({ ...prev, departamento: val, municipio: "all" }));
                      }}
                      placeholder="Seleccionar departamento..."
                      className="h-10"
                    />
                  </div>

                  {/* Municipio */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Municipio</Label>
                    <Combobox
                      options={[
                        { value: "all", label: "Todos los municipios" },
                        ...filterOptions.municipios.map(m => typeof m === 'string' ? { value: m, label: m } : { value: m.id || "", label: m.name })
                      ]}
                      value={filters.municipio}
                      onChange={(val) => setFilters(prev => ({ ...prev, municipio: val }))}
                      placeholder="Seleccionar municipio..."
                      className="h-10"
                      disabled={filters.departamento === "all" && initialDepartments.length > 0}
                    />
                    {filters.departamento === "all" && initialDepartments.length > 0 && (
                      <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest ml-1">Seleccione un departamento primero</p>
                    )}
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
                        cliente.tipoCliente === "EMPRESA" ? "bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-300" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
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
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm",
                        SCORE_COLORS[cliente.clasificacion || "BRONCE"]
                      )}>
                        <Trophy className="h-2.5 w-2.5" />
                        {cliente.clasificacion || "BRONCE"}
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500">{cliente.score || 0} pts</span>
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
                        <DropdownMenuItem
                          onClick={() => setSelectedClienteForHistory(cliente)}
                          className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer"
                        >
                          <FileText className="h-4 w-4 text-zinc-400" /> VER SERVICIOS
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSelectedClienteForConfig(cliente)}
                          className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer"
                        >
                          <Settings className="h-4 w-4 text-zinc-400" /> CONFIGURACION
                        </DropdownMenuItem>
                        <Link href={`/dashboard/clientes/${cliente.id}/editar`}>
                          <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer">
                            <Pencil className="h-4 w-4 text-zinc-400" /> EDITAR
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(cliente)}
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
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Mostrar siempre la primera, la última, y las páginas cercanas a la actual
                return page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
              })
              .map((page, index, array) => (
                <React.Fragment key={page}>
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="px-2 text-zinc-400">...</span>
                  )}
                  <button
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
                </React.Fragment>
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
            <DialogTitle className="dark:text-zinc-300">Detalles del Cliente</DialogTitle>
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
                    {selectedCliente.tipoCliente === "EMPRESA" ? <Building2 className="h-10 w-10 dark:text-zinc-300" /> : <User className="h-10 w-10 dark:text-zinc-300" />}
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-3xl font-black tracking-tight leading-none mb-2 dark:text-zinc-300">
                      {selectedCliente.tipoCliente === "EMPRESA" ? (selectedCliente.razonSocial || "S/N") : `${selectedCliente.nombre || ''} ${selectedCliente.apellido || ''}`.trim()}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 bg-white/10 dark:text-zinc-300 rounded-md">
                        {selectedCliente.tipoCliente === "EMPRESA" ? "Corporativo" : "Persona Natural"}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 dark:text-zinc-300">
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
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60 dark:text-zinc-300">Score:</span>
                    <span className="text-xs font-black dark:text-zinc-300">{selectedCliente.score || 0} pts</span>
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
                      <span className={cn(
                        "text-sm font-black uppercase",
                        (selectedCliente.segmento?.nombre || selectedCliente.segmentoNegocio) ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
                      )}>
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
                      <p className={cn("text-xs font-bold", selectedCliente.tipoDocumento ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500")}>
                        {selectedCliente.tipoDocumento || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Número / NIT</p>
                      <p className={cn("text-xs font-bold font-mono", (selectedCliente.nit || selectedCliente.numeroDocumento) ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500")}>
                        {selectedCliente.nit || selectedCliente.numeroDocumento || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Origen Cliente</p>
                      <p className={cn("text-xs font-bold", selectedCliente.origenCliente ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500")}>
                        {selectedCliente.origenCliente || "Desconocido"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Tipo Interés</p>
                      <p className={cn("text-xs font-bold", selectedCliente.tipoInteres?.nombre ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500")}>
                        {selectedCliente.tipoInteres?.nombre || "No definido"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Subsegmento</p>
                      <p className={cn("text-xs font-bold", selectedCliente.subsegmento ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500")}>
                        {selectedCliente.subsegmento || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Act. Económica</p>
                      <p className={cn("text-xs font-bold", selectedCliente.actividadEconomica ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500")}>
                        {selectedCliente.actividadEconomica || "No Registrada"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Metraje Total</p>
                      <p className={cn("text-xs font-bold", selectedCliente.metrajeTotal ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500")}>
                        {selectedCliente.metrajeTotal ? `${selectedCliente.metrajeTotal} m²` : "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-400 uppercase">Rep. Legal</p>
                      <p className={cn("text-xs font-bold", selectedCliente.representanteLegal ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500")}>
                        {selectedCliente.representanteLegal || "No Definido"}
                      </p>
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
                          selectedCliente.aceptaMarketing 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-zinc-300"
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
                    <span className="text-[10px] font-black text-azul-1 dark:text-zinc-300 bg-azul-1/10 px-3 py-1 rounded-full uppercase">
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
                    <span className="text-[10px] font-black text-zinc-900 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 px-3 py-1 rounded-full uppercase">
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
                                className="flex-1 h-14 rounded-2xl bg-azul-1 text-xs font-black uppercase tracking-[0.2em] text-white dark:text-zinc-300 transition-all hover:bg-blue-700 active:scale-[0.98] shadow-xl shadow-azul-1/25"
                              >
                                Editar Perfil Estratégico
                              </button>
                              <button
                                onClick={() => setSelectedCliente(null)}
                                className="px-10 h-14 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 text-xs font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all"
                              >
                                Cerrar
                              </button>
                            </div>            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIGURACIÓN OPERATIVA - SERVICIOS */}
      <Dialog
        open={!!selectedClienteForConfig}
        onOpenChange={(open) => !open && setSelectedClienteForConfig(null)}
      >
        <DialogContent className="max-w-5xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Configuración Operativa</DialogTitle>
          </DialogHeader>
          {selectedClienteForConfig && (
            <div className="flex flex-col h-[85vh] bg-white dark:bg-zinc-950">
              {/* Header Contextual */}
              <div className="shrink-0 p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-azul-1 flex items-center justify-center text-white shadow-lg shadow-azul-1/20">
                    <Settings className="h-7 w-7 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight uppercase">
                      Configuración Operativa
                    </h2>
                    <p className="text-xs font-bold text-zinc-400 dark:text-zinc-300 mt-0.5 uppercase tracking-wider">
                      {selectedClienteForConfig.tipoCliente === "EMPRESA" ? selectedClienteForConfig.razonSocial : `${selectedClienteForConfig.nombre} ${selectedClienteForConfig.apellido}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-black text-azul-1 dark:text-zinc-300 bg-azul-1/10 px-3 py-1 rounded-full uppercase">
                    Módulo de Automatización
                  </span>
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-300 uppercase tracking-widest">
                    ID: {selectedClienteForConfig.id.split('-')[0]}...
                  </span>
                </div>
              </div>

              {/* Contenido Scrollable */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

                {configLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <Settings className="h-10 w-10 text-zinc-300 animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sincronizando Parámetros...</p>
                  </div>
                ) : (
                  <>
                    {/* Selector de Sede para Configuración Específica */}
                    <div className="p-6 rounded-3xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center text-azul-1 shadow-sm border border-blue-100 dark:border-blue-800">
                          <MapPin className="h-5 w-5 dark:text-zinc-300" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase">Ámbito de Configuración</h4>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Define si los cambios aplican a todas las sedes o una específica</p>
                        </div>
                      </div>
                      <div className="w-full md:w-64">
                        <Select
                          value={currentConfigSede}
                          onChange={(e) => handleSedeChange(e.target.value)}
                          className="h-11 text-xs font-bold bg-white"
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
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4 text-azul-1" /> Protocolo de Servicio Estándar
                          </h3>
                          <textarea
                            value={configForm.protocoloServicio}
                            onChange={(e) => setConfigForm(prev => ({ ...prev, protocoloServicio: e.target.value }))}
                            className="w-full h-40 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-azul-1/20 focus:border-azul-1 transition-all resize-none"
                            placeholder="Escribe aquí las instrucciones fijas para el técnico (EPP requerido, químicos permitidos, restricciones de acceso...)"
                          />
                          <p className="text-[9px] font-bold text-zinc-400 italic">* Este texto se precargará automáticamente en todas las futuras órdenes de servicio.</p>
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-amber-500" /> Observaciones Administrativas
                          </h3>
                          <textarea
                            value={configForm.observacionesFijas}
                            onChange={(e) => setConfigForm(prev => ({ ...prev, observacionesFijas: e.target.value }))}
                            className="w-full h-32 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                            placeholder="Notas internas para el personal de oficina (condiciones de pago, horarios de atención, contactos de emergencia...)"
                          />
                        </div>
                      </div>

                      {/* Columna Derecha: Reglas y Agendamiento */}
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-emerald-500" /> Parámetros de Agendamiento
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Duración Estimada</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={configForm.duracionEstimada}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, duracionEstimada: parseInt(e.target.value) || 0 }))}
                                  className="h-9 text-xs font-black w-20"
                                />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase">Minutos</span>
                              </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Frecuencia Sugerida</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={configForm.frecuenciaSugerida}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, frecuenciaSugerida: parseInt(e.target.value) || 0 }))}
                                  className="h-9 text-xs font-black w-20"
                                />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase">Días</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-purple-500" /> Reglas de Validación
                          </h3>
                          <div className="space-y-3 bg-zinc-50 dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                            <label className="flex items-center justify-between cursor-pointer group">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">Firma Digital Obligatoria</span>
                                <span className="text-[9px] font-bold text-zinc-400 uppercase">No permite finalizar sin firma del cliente</span>
                              </div>
                              <div
                                onClick={() => setConfigForm(prev => ({ ...prev, requiereFirmaDigital: !prev.requiereFirmaDigital }))}
                                className={cn(
                                  "h-6 w-11 rounded-full flex items-center px-1 transition-all",
                                  configForm.requiereFirmaDigital ? "bg-azul-1" : "bg-zinc-300 dark:bg-zinc-700"
                                )}
                              >
                                <div className={cn(
                                  "h-4 w-4 rounded-full bg-white transition-all transform",
                                  configForm.requiereFirmaDigital ? "translate-x-5" : "translate-x-0"
                                )} />
                              </div>
                            </label>
                            <div className="h-px bg-zinc-200/50 dark:bg-zinc-800" />
                            <label className="flex items-center justify-between cursor-pointer group">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">Fotos de Evidencia</span>
                                <span className="text-[9px] font-bold text-zinc-400 uppercase">Exigir fotos de antes y después del servicio</span>
                              </div>
                              <div
                                onClick={() => setConfigForm(prev => ({ ...prev, requiereFotosEvidencia: !prev.requiereFotosEvidencia }))}
                                className={cn(
                                  "h-6 w-11 rounded-full flex items-center px-1 transition-all",
                                  configForm.requiereFotosEvidencia ? "bg-azul-1" : "bg-zinc-300 dark:bg-zinc-700"
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
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                            <Box className="h-4 w-4 text-blue-400" /> Activos / Elementos Predefinidos
                          </h3>
                          
                          {/* Formulario rápido para nuevo elemento */}
                          <div className="grid grid-cols-3 gap-2 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <div className="space-y-1">
                              <Label className="text-[8px] font-black text-zinc-400 uppercase">Nombre / Tag</Label>
                              <Input 
                                placeholder="Eje: Estación 01" 
                                value={newElement.nombre}
                                onChange={(e) => setNewElement(prev => ({ ...prev, nombre: e.target.value }))}
                                className="h-8 text-[10px]"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[8px] font-black text-zinc-400 uppercase">Tipo</Label>
                              <Select 
                                value={newElement.tipo}
                                onChange={(e) => setNewElement(prev => ({ ...prev, tipo: e.target.value }))}
                                className="h-8 text-[10px]"
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
                              <Label className="text-[8px] font-black text-zinc-400 uppercase">Acción</Label>
                              <Button 
                                size="sm" 
                                onClick={handleAddElement}
                                className="h-8 w-full bg-blue-500 hover:bg-blue-600 text-white text-[9px] font-bold uppercase"
                              >
                                <Plus className="h-3 w-3 mr-1" /> Añadir
                              </Button>
                            </div>
                            <div className="col-span-3 space-y-1">
                              <Label className="text-[8px] font-black text-zinc-400 uppercase">Ubicación / Notas</Label>
                              <Input 
                                placeholder="Eje: Pasillo de servicio, al lado de la puerta principal" 
                                value={newElement.ubicacion}
                                onChange={(e) => setNewElement(prev => ({ ...prev, ubicacion: e.target.value }))}
                                className="h-8 text-[10px]"
                              />
                            </div>
                          </div>

                          {/* Lista de elementos agregados */}
                          <div className="space-y-2 mt-4">
                            {configForm.elementosPredefinidos.length === 0 ? (
                              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No hay elementos configurados</p>
                                <p className="text-[9px] font-medium text-zinc-400 mt-1 lowercase italic">Ej: Trampas de luz, Extintores, Aires acondicionados...</p>
                              </div>
                            ) : (
                              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {configForm.elementosPredefinidos.map((el, i) => (
                                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm group">
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <Box className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <p className="text-[11px] font-black text-zinc-900 dark:text-zinc-50 leading-tight uppercase">{el.nombre}</p>
                                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                                          {el.tipo} {el.ubicacion ? `| ${el.ubicacion}` : ""}
                                        </p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => handleRemoveElement(i)}
                                      className="h-7 w-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
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
              <div className="shrink-0 p-8 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-end gap-4">
                <button
                  onClick={() => setSelectedClienteForConfig(null)}
                  disabled={configLoading}
                  className="px-8 h-12 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={configLoading}
                  className="px-10 h-12 rounded-xl bg-azul-1 text-xs font-black uppercase tracking-widest text-white dark:text-zinc-300 shadow-lg shadow-azul-1/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
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
        <DialogContent className="max-w-5xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Historial de Servicios</DialogTitle>
          </DialogHeader>
          {selectedClienteForHistory && (
            <div className="flex flex-col h-[85vh] bg-white dark:bg-zinc-950">
              {/* Header con Info del Cliente */}
              <div className="shrink-0 p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-azul-1 flex items-center justify-center text-white shadow-lg shadow-azul-1/20">
                    <Calendar className="h-7 w-7 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight uppercase">
                      Historial de Servicios
                    </h2>
                    <p className="text-xs font-bold text-zinc-400 dark:text-zinc-300 mt-0.5 uppercase tracking-wider">
                      {selectedClienteForHistory.tipoCliente === "EMPRESA" ? selectedClienteForHistory.razonSocial : `${selectedClienteForHistory.nombre} ${selectedClienteForHistory.apellido}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-black text-azul-1 dark:text-zinc-300 bg-azul-1/10 px-3 py-1 rounded-full uppercase">
                    {serviceHistory.length} Servicios Registrados
                  </span>
                </div>
              </div>

              {/* Lista de Servicios */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <Calendar className="h-10 w-10 text-zinc-300 animate-bounce mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Consultando Expediente...</p>
                  </div>
                ) : serviceHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-20 w-20 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-4">
                      <Search className="h-10 w-10 text-zinc-200" />
                    </div>
                    <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest">Sin Servicios Previos</h3>
                    <p className="text-xs text-zinc-400 mt-1">Este cliente aún no registra órdenes de servicio en el sistema.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {serviceHistory.map((orden: OrdenServicio) => (
                      <div key={orden.id} className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-azul-1/30 transition-all group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-5">
                            <div className="h-12 w-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-azul-1 transition-colors">
                              <FileText className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">#{orden.numeroOrden || 'S/N'}</span>
                                <span className={cn(
                                  "text-[9px] font-black px-2 py-0.5 rounded-md uppercase",
                                  orden.estadoServicio === "LIQUIDADO" ? "bg-emerald-100 text-emerald-700" :
                                  orden.estadoServicio === "PROGRAMADO" ? "bg-blue-100 text-blue-700" :
                                  "bg-zinc-100 text-zinc-600"
                                )}>
                                  {orden.estadoServicio}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{orden.servicio?.nombre || 'Servicio General'}</h4>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 uppercase">
                                  <Calendar className="h-3 w-3" />
                                  {orden.fechaVisita ? new Date(orden.fechaVisita).toLocaleDateString() : 'Pendiente'}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 uppercase">
                                  <MapPin className="h-3 w-3" />
                                  {orden.direccionTexto?.substring(0, 30) || 'Sede Principal'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-10">
                            <div className="hidden md:flex flex-col items-end">
                              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Técnico Asignado</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="h-6 w-6 rounded-full bg-azul-1/10 flex items-center justify-center text-[10px] font-bold text-azul-1">
                                  {orden.tecnico?.user?.nombre?.charAt(0) || 'T'}
                                </div>
                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                  {orden.tecnico?.user?.nombre} {orden.tecnico?.user?.apellido}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Valor</p>
                              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 mt-1">${Number(orden.valorCotizado || 0).toLocaleString()}</p>
                            </div>
                            <button className="h-10 w-10 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-center hover:bg-azul-1 hover:text-white transition-all">
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
              <div className="shrink-0 p-8 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-end">
                <button 
                  onClick={() => setSelectedClienteForHistory(null)}
                  className="px-10 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition-all"
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
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          {clienteToDelete && (
            <div className="flex flex-col bg-white dark:bg-zinc-950">
              <div className="p-8 flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-500/10">
                  <AlertCircle className="h-10 w-10" />
                </div>
                
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight uppercase mb-2">
                  ¿Eliminar este cliente?
                </h3>
                
                <p className="text-sm font-medium text-zinc-500 leading-relaxed px-4">
                  Estás a punto de eliminar a <span className="font-black text-zinc-900 dark:text-zinc-100">
                    {clienteToDelete.tipoCliente === "EMPRESA" ? clienteToDelete.razonSocial : `${clienteToDelete.nombre} ${clienteToDelete.apellido}`}
                  </span>. Esta acción no se puede deshacer y afectará el historial operativo vinculado.
                </p>
              </div>

              <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
                <button
                  onClick={() => setClienteToDelete(null)}
                  className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 h-12 rounded-xl bg-red-600 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-[0.98] transition-all"
                >
                  Eliminar Ahora
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  </div>
</div>
</div>
);
}
