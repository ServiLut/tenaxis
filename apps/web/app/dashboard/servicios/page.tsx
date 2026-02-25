"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard";
import { 
  Input, 
  Button, 
  Skeleton,
  Select,
  Label
} from "@/components/ui";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Filter,
  RotateCcw,
  MoreHorizontal,
  AlertCircle,
  Eye,
  EyeOff,
  Pencil,
  FileText,
  CalendarClock,
  Trash2,
  Download,
  FileSpreadsheet,
  File as FileIcon,
  Info,
  CreditCard,
  MapPin,
  ExternalLink,
  Car,
  CheckCircle2,
  Activity,
  XCircle,
  Copy,
  Bell,
  FileUp,
  Receipt,
  Image as ImageIcon,
  Send,
  UserPlus
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
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/components/ui/utils";
import { toast } from "sonner";
import { exportToExcel, exportToPDF, exportToWord } from "@/lib/utils/export-helper";
import {
  getOrdenesServicioAction,
  getEstadoServiciosAction,
  getOperatorsAction,
  type ClienteDTO,
} from "../actions";

interface Servicio {
  id: string;
  cliente: string;
  clienteFull: ClienteDTO;
  servicioEspecifico: string;
  fecha: string;
  hora: string;
  tecnico: string;
  tecnicoId?: string;
  estadoServicio: string;
  urgencia: string;
  empresaId: string;
  raw: OrdenServicioRaw;
}

interface OrdenServicioRaw {
  id: string;
  numeroOrden?: string;
  cliente: ClienteDTO;
  clienteId: string;
  empresaId: string;
  empresa?: { id: string; nombre: string };
  servicio?: { id: string; nombre: string };
  servicioId?: string;
  tecnicoId?: string;
  fechaVisita?: string;
  horaInicio?: string;
  horaFin?: string;
  tecnico?: { id: string; user?: { nombre: string; apellido: string } };
  creadoPor?: { id: string; user?: { nombre: string; apellido: string } };
  urgencia?: string;
  observacion?: string;
  observacionFinal?: string;
  nivelInfestacion?: string;
  condicionesHigiene?: string;
  condicionesLocal?: string;
  tipoVisita?: string;
  frecuenciaSugerida?: number;
  tipoFacturacion?: string;
  valorCotizado?: number;
  valorPagado?: number;
  valorRepuestos?: number;
  metodoPagoId?: string;
  metodoPago?: { id: string; nombre: string };
  estadoPago?: string;
  estadoServicio?: string;
  createdAt: string;
  direccionTexto?: string;
  barrio?: string;
  municipio?: string;
  departamento?: string;
  piso?: string;
  bloque?: string;
  unidad?: string;
  zona?: { id: string; nombre: string };
  vehiculoId?: string;
  vehiculo?: { 
    placa: string; 
    marca?: string | null; 
    modelo?: string | null; 
    color?: string | null; 
    tipo?: string | null; 
  };
  facturaPath?: string | null;
  facturaElectronica?: string | null;
  linkMaps?: string | null;
}

const ESTADO_STYLING: Record<string, string> = {
  "NUEVO": "bg-zinc-50 text-zinc-600 border-zinc-100 dark:bg-zinc-900/20 dark:text-zinc-400 dark:border-zinc-800/50",
  "PROCESO": "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50",
  "CANCELADO": "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50",
  "PROGRAMADO": "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50",
  "LIQUIDADO": "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50",
  "TECNICO_FINALIZO": "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50",
  "REPROGRAMADO": "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50",
  "SIN_CONCRETAR": "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/50",
};

const URGENCIA_STYLING: Record<string, string> = {
  "ALTA": "bg-red-500 text-white",
  "MEDIA": "bg-amber-500 text-white",
  "BAJA": "bg-emerald-500 text-white",
  "CRITICA": "bg-red-700 text-white",
};

function ServiciosSkeleton({ showKPIs = true }: { showKPIs?: boolean }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {showKPIs && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 shrink-0">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-4 animate-pulse">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden">
        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 flex justify-between">
          <Skeleton className="h-12 w-1/2 rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-12 w-32 rounded-lg" />
            <Skeleton className="h-12 w-40 rounded-lg" />
          </div>
        </div>
        <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">ID Orden</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Cliente / Servicio</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Programación</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Técnico</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Estado</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {[...Array(5)].map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-8 py-6">
                <Skeleton className="h-8 w-24 rounded-lg" />
              </td>
              <td className="px-8 py-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </td>
              <td className="px-8 py-6">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </td>
              <td className="px-8 py-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </td>
              <td className="px-8 py-6">
                <Skeleton className="h-8 w-28 rounded-full" />
              </td>
              <td className="px-8 py-6 text-right">
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
}

export default function ServiciosPage() {
  const [search, setSearch] = useState("");
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showKPIs, setShowKPIs] = useState(true);
  
  // Filter State
  const [filters, setFilters] = useState({
    estado: "all",
    tecnico: "all",
    urgencia: "all",
  });
  const [filterOptions, setOptions] = useState<{
    estados: { id: string; nombre: string }[];
    tecnicos: { id: string; nombre: string }[];
  }>({
    estados: [],
    tecnicos: [],
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchOptions = useCallback(async () => {
    try {
      const empresaId = localStorage.getItem("current-enterprise-id") || undefined;
      const [estados, tecnicos] = await Promise.all([
        getEstadoServiciosAction(empresaId),
        empresaId ? getOperatorsAction(empresaId) : Promise.resolve([]),
      ]);
      
      setOptions({
        estados: Array.isArray(estados) ? estados : [],
        tecnicos: (Array.isArray(tecnicos) ? tecnicos : []).map(t => ({
          id: t.id,
          nombre: `${t.user?.nombre || ""} ${t.user?.apellido || ""}`.trim() || "Sin nombre"
        })),
      });
    } catch (error) {
      console.error("Error fetching filter options", error);
    }
  }, []);

  const fetchServicios = useCallback(async () => {
    setLoading(true);
    try {
      const empresaId = localStorage.getItem("current-enterprise-id") || undefined;
      const data = await getOrdenesServicioAction(empresaId);
      
      const mapped: Servicio[] = (Array.isArray(data) ? data : []).map((os: OrdenServicioRaw) => {
        const clienteLabel = os.cliente.tipoCliente === "EMPRESA" 
          ? (os.cliente.razonSocial || "Empresa") 
          : `${os.cliente.nombre || ""} ${os.cliente.apellido || ""}`.trim();
          
        return {
          id: os.numeroOrden || os.id.substring(0, 8).toUpperCase(),
          cliente: clienteLabel,
          clienteFull: os.cliente,
          servicioEspecifico: os.servicio?.nombre || "Servicio General",
          fecha: os.fechaVisita ? new Date(os.fechaVisita).toLocaleDateString() : "Sin fecha",
          hora: os.horaInicio ? new Date(os.horaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Sin hora",
          tecnico: os.tecnico?.user ? `${os.tecnico.user.nombre} ${os.tecnico.user.apellido}` : "Sin asignar",
          tecnicoId: os.tecnicoId,
          estadoServicio: os.estadoServicio || "NUEVO",
          urgencia: os.urgencia || "BAJA",
          empresaId: os.empresaId,
          raw: os,
        };
      });
      
      setServicios(mapped);
    } catch (error) {
      console.error("Error loading services", error);
      toast.error("Error al cargar las órdenes de servicio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServicios();
    fetchOptions();
  }, [fetchServicios, fetchOptions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredServicios = servicios.filter((s: Servicio) => {
    const matchesSearch = 
      s.cliente.toLowerCase().includes(search.toLowerCase()) ||
      s.servicioEspecifico.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase());
    
    const matchesEstado = filters.estado === "all" || s.estadoId === filters.estado;
    const matchesTecnico = filters.tecnico === "all" || s.tecnicoId === filters.tecnico;
    const matchesUrgencia = filters.urgencia === "all" || s.urgencia === filters.urgencia;

    return matchesSearch && matchesEstado && matchesTecnico && matchesUrgencia;
  });

  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServicios = filteredServicios.slice(startIndex, startIndex + itemsPerPage);

  const stats = {
    total: servicios.length,
    programados: servicios.filter(s => s.estado === "PROGRAMADO").length,
    enProceso: servicios.filter(s => s.estado === "EN PROCESO").length,
    finalizados: servicios.filter(s => s.estado === "FINALIZADO").length,
    noConcretados: servicios.filter(s => s.estado === "CANCELADO").length,
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'word') => {
    const headers = ["ID Orden", "Cliente", "Servicio", "Fecha", "Hora", "Técnico", "Estado", "Urgencia"];
    const data = filteredServicios.map((s: Servicio) => [
      s.id,
      s.cliente,
      s.servicioEspecifico,
      s.fecha,
      s.hora,
      s.tecnico,
      s.estado,
      s.urgencia
    ]);

    const exportParams = {
      headers,
      data,
      filename: `servicios_tenaxis_${new Date().getTime()}`,
      title: "REPORTE OPERATIVO DE ÓRDENES DE SERVICIO"
    };

    toast.info(`Generando archivo ${format.toUpperCase()}...`, {
      description: `Se exportarán ${filteredServicios.length} órdenes de servicio.`,
    });
    
    try {
      if (format === 'excel') exportToExcel(exportParams);
      else if (format === 'pdf') exportToPDF(exportParams);
      else if (format === 'word') await exportToWord(exportParams);

      toast.success(`${format.toUpperCase()} generado exitosamente`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Error al generar el archivo ${format.toUpperCase()}`);
    } finally {
      setShowExportMenu(false);
    }
  };

    return (
      <DashboardLayout overflowHidden>
        <div className="flex flex-col h-full">
          {/* Sub-Header Estratégico */}
          <div className="shrink-0 py-10 px-6 lg:px-10 border-b border-zinc-200/60 dark:border-zinc-800/50 mb-8 bg-gray-50 dark:bg-zinc-900/50">
            <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azul-1 text-white shadow-xl shadow-azul-1/20">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  Órdenes de <span className="text-azul-1 dark:text-claro-azul-4">Servicio</span>
                </h1>
                <p className="text-zinc-500 font-medium mt-1">
                  Control operativo y trazabilidad de servicios técnicos.
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
                                    <EyeOff className="h-4 w-4" />
                                    Ocultar KPIs
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    Mostrar KPIs
                                  </>
                                )}
                              </Button>              </div>
            </div>
          </div>
  
          {/* Contenedor Principal de Datos */}
          <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-10 pb-4 sm:pb-6 lg:pb-10">
            <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col">
              {loading ? (
                <ServiciosSkeleton showKPIs={showKPIs} />
              ) : (
                <>
                  {/* KPI Cards Grid */}
                  {showKPIs && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 shrink-0 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-azul-1/10 flex items-center justify-center text-azul-1">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Órdenes</p>
                          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.total}</p>
                        </div>
                      </div>
  
                      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                          <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Programados</p>
                          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.programados}</p>
                        </div>
                      </div>
  
                      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                          <Activity className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">En Proceso</p>
                          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.enProceso}</p>
                        </div>
                      </div>
  
                      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Finalizados</p>
                          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.finalizados}</p>
                        </div>
                      </div>
  
                      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                          <XCircle className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">No Concretados</p>
                          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.noConcretados}</p>
                        </div>
                      </div>
                    </div>
                  )}
  
                  <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden">
                    {/* Search & Actions */}
                    <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 shrink-0">
                      <div className="flex flex-1 items-center gap-3 max-w-2xl">
                                    <div className="relative flex-1">
                                      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                                      <Input 
                                        placeholder="Buscar por ID, cliente o servicio..." 
                                        className="h-12 pl-12 rounded-lg border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 transition-all"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                      />
                                    </div>
                        
                                    {/* Botón de Filtros Avanzados */}
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button className={cn(
                                          "flex items-center h-12 px-5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-3 transition-all font-bold text-[11px] uppercase tracking-wider relative",
                                          (filters.estado !== "all" || filters.tecnico !== "all" || filters.urgencia !== "all") && "border-azul-1 text-azul-1 dark:border-azul-1 dark:text-azul-1"
                                        )}>
                                          <Filter className="h-4 w-4" />
                                          <span>Filtros</span>
                                          {(filters.estado !== "all" || filters.tecnico !== "all" || filters.urgencia !== "all") && (
                                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-azul-1 text-[8px] font-black text-white ring-2 ring-white dark:ring-zinc-900">
                                              !
                                            </span>
                                          )}
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-80 p-6 rounded-2xl shadow-2xl border-zinc-100 dark:border-zinc-800" align="start">
                                        <div className="space-y-6">
                                          <div className="flex items-center justify-between">
                                            <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-zinc-400">Filtrar Servicios</h4>
                                            <button 
                                              onClick={() => setFilters({ estado: "all", tecnico: "all", urgencia: "all" })}
                                              className="text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-azul-1 flex items-center gap-1 transition-colors"
                                            >
                                              <RotateCcw className="h-3 w-3" /> Reiniciar
                                            </button>
                                          </div>
                        
                                          <div className="space-y-4">
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Estado del Servicio</Label>
                                              <Select 
                                                value={filters.estado} 
                                                onChange={(e) => setFilters(f => ({ ...f, estado: e.target.value }))}
                                                className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800 text-[11px] font-bold"
                                              >
                                                <option value="all">TODOS LOS ESTADOS</option>
                                                {filterOptions.estados.map(est => (
                                                  <option key={est.id} value={est.id}>{est.nombre.toUpperCase()}</option>
                                                ))}
                                              </Select>
                                            </div>
                        
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Técnico Asignado</Label>
                                              <Select 
                                                value={filters.tecnico} 
                                                onChange={(e) => setFilters(f => ({ ...f, tecnico: e.target.value }))}
                                                className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800 text-[11px] font-bold"
                                              >
                                                <option value="all">TODOS LOS TÉCNICOS</option>
                                                {filterOptions.tecnicos.map(tec => (
                                                  <option key={tec.id} value={tec.id}>{tec.nombre.toUpperCase()}</option>
                                                ))}
                                              </Select>
                                            </div>
                        
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nivel de Urgencia</Label>
                                              <Select 
                                                value={filters.urgencia} 
                                                onChange={(e) => setFilters(f => ({ ...f, urgencia: e.target.value }))}
                                                className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800 text-[11px] font-bold"
                                              >
                                                <option value="all">CUALQUIER URGENCIA</option>
                                                <option value="ALTA">ALTA</option>
                                                <option value="MEDIA">MEDIA</option>
                                                <option value="BAJA">BAJA</option>
                                                <option value="CRITICA">CRÍTICA</option>
                                              </Select>
                                            </div>
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </div>                      <div className="flex items-center gap-3">
                        {/* Botón de Exportación */}
                        <div className="relative">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
                            className="flex items-center h-12 px-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 gap-3 transition-all font-bold text-[11px] uppercase tracking-wider"
                          >
                            <Download className="h-4 w-4" />
                            <span>Exportar</span>
                          </button>
  
                          {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="px-4 py-2 mb-1 border-b border-zinc-50 dark:border-zinc-800">
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Reportes Operativos</p>
                              </div>
                              <button 
                                onClick={() => handleExport('excel')}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              >
                                <FileSpreadsheet className="h-4 w-4" />
                                MICROSOFT EXCEL (.XLSX)
                              </button>
                              <button 
                                onClick={() => handleExport('pdf')}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              >
                                <FileText className="h-4 w-4" />
                                DOCUMENTO PDF (.PDF)
                              </button>
                              <button 
                                onClick={() => handleExport('word')}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                <FileIcon className="h-4 w-4" />
                                MICROSOFT WORD (.DOCX)
                              </button>
                            </div>
                          )}
                        </div>
  
                        <Link href="/dashboard/servicios/nuevo">
                          <div className="flex items-center h-12 px-8 rounded-lg bg-azul-1 text-zinc-50 gap-3 shadow-lg shadow-azul-1/20 transition-all hover:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer">
                            <Plus className="h-5 w-5" />
                            <span className="font-bold uppercase tracking-wider text-[11px]">Nueva Orden</span>
                          </div>
                        </Link>
                      </div>
                    </div>
  
                    {/* Tabla de Servicios con Scroll y Paginación */}
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">ID Orden</th>
                              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Cliente / Servicio</th>
                              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Programación</th>
                              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Técnico</th>
                              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Estado</th>
                              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {paginatedServicios.map((servicio: Servicio) => (
                              <tr key={servicio.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                <td className="px-8 py-6">
                                  <span className="font-mono text-xs font-black text-[var(--color-azul-1)] bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                                    {servicio.id}
                                  </span>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="space-y-1">
                                    <p className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{servicio.cliente}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{servicio.servicioEspecifico}</span>
                                      <span className={cn(
                                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter",
                                        URGENCIA_STYLING[servicio.urgencia]
                                      )}>
                                        {servicio.urgencia}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                      {servicio.fecha}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                      {servicio.hora}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                      <User className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{servicio.tecnico}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <span className={cn(
                                    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                    ESTADO_STYLING[servicio.estado]
                                  )}>
                                    <div className="h-1.5 w-1.5 rounded-full bg-current" />
                                    {servicio.estado}
                                  </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <div className="flex justify-end gap-2">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-400 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all">
                                          <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                      </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl">
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setSelectedServicio(servicio);
                                          setIsModalOpen(true);
                                        }}
                                        className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400"
                                      >
                                        <Eye className="h-4 w-4" /> VER DETALLES
                                      </DropdownMenuItem>
                                      <Link href={`/dashboard/servicios/${servicio.raw.id}/editar`}>
                                        <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                          <Pencil className="h-4 w-4" /> EDITAR ORDEN
                                        </DropdownMenuItem>
                                      </Link>
                                      <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                        <MapPin className="h-4 w-4 text-blue-500" /> VER GEOLOCALIZACIÓN
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                        <Copy className="h-4 w-4 text-amber-500" /> COPIAR
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />
                                      
                                      <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                        <Bell className="h-4 w-4 text-purple-500" /> NOTIFICAR AL CLIENTE
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                        <Send className="h-4 w-4 text-azul-1" /> ENVIAR AL TÉCNICO
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                        <UserPlus className="h-4 w-4 text-emerald-500" /> ASIGNAR REFUERZO
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />

                                      <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                        <FileUp className="h-4 w-4 text-orange-500" /> SUBIR FACTURA/ORDEN
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                        <Receipt className="h-4 w-4 text-blue-600" /> SUBIR COMPROBANTE
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                        <ImageIcon className="h-4 w-4 text-pink-500" /> SUBIR EVIDENCIA
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />

                                      <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                        <FileText className="h-4 w-4 text-emerald-500" /> CERTIFICADO
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                        <CalendarClock className="h-4 w-4 text-blue-500" /> RE-PROGRAMAR
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuSeparator />
                                      
                                      <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold text-red-600 hover:text-red-600 hover:bg-red-50 cursor-pointer">
                                        <Trash2 className="h-4 w-4" /> ELIMINAR
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
  
                      {!loading && filteredServicios.length === 0 && (
                        <div className="py-32 text-center flex-1 flex flex-col justify-center">
                          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-800 mb-6">
                            <AlertCircle className="h-12 w-12 text-zinc-300" />
                          </div>
                          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">Sin resultados</h2>
                          <p className="text-zinc-500 mt-2 font-medium">No se encontraron órdenes que coincidan con su búsqueda.</p>
                        </div>
                      )}
  
                      {/* Paginación */}
                      <div className="px-8 py-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-300">
                          Mostrando <span className="text-zinc-900 dark:text-zinc-100">{Math.min(startIndex + 1, filteredServicios.length)}</span> - <span className="text-zinc-900 dark:text-zinc-100">{Math.min(startIndex + itemsPerPage, filteredServicios.length)}</span> de <span className="text-zinc-900 dark:text-zinc-100">{filteredServicios.length}</span> resultados
                        </span>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-xl text-xs font-bold" 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          >
                            Anterior
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-xl text-xs font-bold" 
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          >
                            Siguiente
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
<<<<<<< HEAD

            {/* Tabla de Servicios con Scroll y Paginación */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                {loading ? (
                  <ServiciosSkeleton />
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">ID Orden</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Cliente / Servicio</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Programación</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Técnico</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Estado</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {paginatedServicios.map((servicio: Servicio) => (
                        <tr key={servicio.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="px-8 py-6">
                            <span className="font-mono text-xs font-black text-[var(--color-azul-1)] bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                              {servicio.id}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-1">
                              <p className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{servicio.cliente}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{servicio.servicioEspecifico}</span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter",
                                  URGENCIA_STYLING[servicio.urgencia]
                                )}>
                                  {servicio.urgencia}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                {servicio.fecha}
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                {servicio.hora}
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <User className="h-4 w-4 text-zinc-500" />
                              </div>
                              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{servicio.tecnico}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                              ESTADO_STYLING[servicio.estadoServicio]
                            )}>
                              <div className="h-1.5 w-1.5 rounded-full bg-current" />
                              {servicio.estadoServicio}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-400 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all">
                                    <MoreHorizontal className="h-5 w-5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedServicio(servicio);
                                      setIsModalOpen(true);
                                    }}
                                    className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400"
                                  >
                                    <Eye className="h-4 w-4" /> VER DETALLES
                                  </DropdownMenuItem>
                                  <Link href={`/dashboard/servicios/${servicio.raw.id}/editar`}>
                                    <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                      <Pencil className="h-4 w-4" /> EDITAR ORDEN
                                    </DropdownMenuItem>
                                  </Link>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                    <FileText className="h-4 w-4 text-emerald-500" /> CERTIFICADO
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                    <CalendarClock className="h-4 w-4 text-blue-500" /> RE-PROGRAMAR
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold text-red-600 hover:text-red-600 hover:bg-red-50 cursor-pointer">
                                    <Trash2 className="h-4 w-4" /> CANCELAR
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            {!loading && filteredServicios.length === 0 && (
              <div className="py-32 text-center flex-1 flex flex-col justify-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-800 mb-6">
                  <AlertCircle className="h-12 w-12 text-zinc-300" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">Sin resultados</h2>
                <p className="text-zinc-500 mt-2 font-medium">No se encontraron órdenes que coincidan con su búsqueda.</p>
              </div>
            )}

            {/* Paginación */}
            <div className="px-8 py-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-300">
                Mostrando <span className="text-zinc-900 dark:text-zinc-100">{Math.min(startIndex + 1, filteredServicios.length)}</span> - <span className="text-zinc-900 dark:text-zinc-100">{Math.min(startIndex + itemsPerPage, filteredServicios.length)}</span> de <span className="text-zinc-900 dark:text-zinc-100">{filteredServicios.length}</span> resultados
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 rounded-xl text-xs font-bold" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 rounded-xl text-xs font-bold" 
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
=======
  
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
>>>>>>> 7764cee451c47f55a76747b7905e08647d9b9590
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Detalle Completo de Orden</DialogTitle>
            <DialogDescription className="font-medium">
              Información detallada del servicio registrado
            </DialogDescription>
          </DialogHeader>

          {selectedServicio && (
            <div className="space-y-8 mt-2">
              {/* 1. Información General */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-2">
                  <Info className="h-3 w-3" /> Información General
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">ID Servicio</span>
                    <span className="font-mono text-sm font-black text-azul-1">#{selectedServicio.raw.id.substring(0, 8).toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Número Orden</span>
                    <span className="font-black text-sm">{selectedServicio.raw.numeroOrden || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Estado Actual</span>
                    <div className="mt-1">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                        ESTADO_STYLING[selectedServicio.estadoServicio]
                      )}>
                        {selectedServicio.estadoServicio}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Fecha Creación</span>
                    <span className="font-bold text-sm">{new Date(selectedServicio.raw.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Creado Por</span>
                    <span className="font-bold text-sm">
                      {selectedServicio.raw.creadoPor?.user 
                        ? `${selectedServicio.raw.creadoPor.user.nombre} ${selectedServicio.raw.creadoPor.user.apellido}`
                        : "Sistema"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Cliente y Contacto */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-2">
                  <User className="h-3 w-3" /> Cliente y Contacto
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-zinc-50/50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Nombre Completo</span>
                    <span className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                      {selectedServicio.cliente}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Documento</span>
                    <span className="font-bold text-sm">
                      {selectedServicio.clienteFull.tipoDocumento || (selectedServicio.clienteFull.tipoCliente === "EMPRESA" ? "NIT" : "CC")} {selectedServicio.clienteFull.nit || selectedServicio.clienteFull.numeroDocumento || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Teléfono</span>
                    <span className="font-bold text-sm">{selectedServicio.clienteFull.telefono}</span>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Correo Electrónico</span>
                    <span className="font-bold text-sm text-azul-1 dark:text-claro-azul-4 truncate">{selectedServicio.clienteFull.correo || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* 3. Ubicación del Servicio */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Ubicación del Servicio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="md:col-span-2">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">
                      {selectedServicio.raw.vehiculoId && !selectedServicio.raw.municipio ? "Vehículo" : "Dirección Principal"}
                    </span>
                    <span className="font-black text-base flex items-center gap-3 text-zinc-900 dark:text-zinc-100">
                      {selectedServicio.raw.vehiculoId && !selectedServicio.raw.municipio ? (
                        <Car className="h-5 w-5 text-purple-500" />
                      ) : (
                        <MapPin className="h-5 w-5 text-azul-1" />
                      )}
                      {selectedServicio.raw.direccionTexto || "No especificada"}
                    </span>
                    {selectedServicio.raw.linkMaps && selectedServicio.raw.linkMaps !== "No Concretado" && (
                      <div className="mt-3">
                        <a 
                          href={selectedServicio.raw.linkMaps.startsWith('http') ? selectedServicio.raw.linkMaps : `https://${selectedServicio.raw.linkMaps}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-azul-1 hover:text-blue-700 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ver en Google Maps
                        </a>
                      </div>
                    )}
                  </div>

                  {selectedServicio.raw.municipio && (
                    <>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Municipio / Depto</span>
                        <span className="font-bold text-sm uppercase">
                          {selectedServicio.raw.municipio}
                          {selectedServicio.raw.departamento && `, ${selectedServicio.raw.departamento}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Zona / Barrio</span>
                        <span className="font-bold text-sm uppercase">
                          {selectedServicio.raw.zona?.nombre || "N/A"}
                          {selectedServicio.raw.barrio && ` / ${selectedServicio.raw.barrio}`}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Detalles Interior</span>
                        <span className="font-bold text-sm uppercase tracking-tight text-zinc-700 dark:text-zinc-300">
                          {[
                            selectedServicio.raw.bloque && `Bloque: ${selectedServicio.raw.bloque}`,
                            selectedServicio.raw.piso && `Piso: ${selectedServicio.raw.piso}`,
                            selectedServicio.raw.unidad && `Unidad: ${selectedServicio.raw.unidad}`,
                          ].filter(Boolean).join(" - ") || "Sin detalles adicionales"}
                        </span>
                      </div>
                    </>
                  )}

                  {selectedServicio.raw.vehiculoId && selectedServicio.raw.vehiculo && (
                    <div className="md:col-span-2 border-t border-zinc-200 dark:border-zinc-700 pt-4 mt-2 grid grid-cols-2 gap-6">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Placa / Marca / Modelo</span>
                        <span className="font-black text-sm uppercase text-purple-600 dark:text-purple-400">
                          {selectedServicio.raw.vehiculo.placa} {selectedServicio.raw.vehiculo.marca && ` - ${selectedServicio.raw.vehiculo.marca}`} {selectedServicio.raw.vehiculo.modelo && ` - ${selectedServicio.raw.vehiculo.modelo}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Color / Tipo</span>
                        <span className="font-bold text-sm uppercase">
                          {selectedServicio.raw.vehiculo.color || "N/A"} {selectedServicio.raw.vehiculo.tipo && ` - ${selectedServicio.raw.vehiculo.tipo}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Detalle del Servicio */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-2">
                  <FileText className="h-3 w-3" /> Detalle del Servicio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Empresa</span>
                    <span className="font-bold text-sm uppercase">{selectedServicio.raw.empresa?.nombre || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Tipo de Servicio</span>
                    <span className="font-bold text-sm uppercase">{selectedServicio.raw.tipoVisita || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Servicio Específico</span>
                    <span className="font-black text-sm text-azul-1 uppercase">{selectedServicio.servicioEspecifico}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Técnico Asignado</span>
                    <span className="font-bold text-sm uppercase">
                      {selectedServicio.tecnico}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Programación */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Programación
                </h3>
                <div className="grid grid-cols-3 gap-6 bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/50 shadow-sm shadow-blue-100/20">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 block uppercase tracking-wider mb-1">Fecha Visita</span>
                    <span className="font-black text-sm text-blue-900 dark:text-blue-100 uppercase">{selectedServicio.fecha}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 block uppercase tracking-wider mb-1">Hora Inicio</span>
                    <span className="font-black text-sm text-blue-900 dark:text-blue-100">{selectedServicio.hora}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 block uppercase tracking-wider mb-1">Hora Fin</span>
                    <span className="font-black text-sm text-blue-900 dark:text-blue-100">
                      {selectedServicio.raw.horaFin ? new Date(selectedServicio.raw.horaFin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--:--"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. Estado y Observaciones */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" /> Estado y Observaciones
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Nivel Infestación</span>
                    <span className="font-black text-sm uppercase">{selectedServicio.raw.nivelInfestacion || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Cond. Higiene</span>
                    <span className="font-black text-sm uppercase">{selectedServicio.raw.condicionesHigiene || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Cond. Local</span>
                    <span className="font-black text-sm uppercase">{selectedServicio.raw.condicionesLocal || "N/A"}</span>
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-2">Observaciones Generales</span>
                    <p className="text-sm font-medium bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 min-h-[80px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {selectedServicio.raw.observacion || "Sin observaciones registradas."}
                    </p>
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-2">Observación Final</span>
                    <p className="text-sm font-black bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 min-h-[80px] leading-relaxed text-zinc-900 dark:text-zinc-100">
                      {selectedServicio.raw.observacionFinal || "Sin observación final registrada."}
                    </p>
                  </div>
                </div>
              </div>

              {/* 7. Información Financiera */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-2">
                  <CreditCard className="h-3 w-3" /> Información Financiera
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Valor Cotizado</span>
                    <span className="font-black text-lg text-zinc-900 dark:text-zinc-100">
                      {selectedServicio.raw.valorCotizado ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedServicio.raw.valorCotizado) : "$ 0"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Valor Repuestos</span>
                    <span className="font-black text-sm text-red-500">
                      {selectedServicio.raw.valorRepuestos ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedServicio.raw.valorRepuestos) : "$ 0"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Valor Pagado</span>
                    <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {selectedServicio.raw.valorPagado ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedServicio.raw.valorPagado) : "$ 0"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Método de Pago</span>
                    <span className="font-black text-sm uppercase">{selectedServicio.raw.metodoPago?.nombre || selectedServicio.raw.estadoPago || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* 8. Factura / Evidencia */}
              {selectedServicio.raw.facturaPath && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800 pb-2">Factura del Servicio</h3>
                  <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-center p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedServicio.raw.facturaPath}
                      alt="Evidencia del servicio"
                      className="max-w-full h-auto max-h-[500px] object-contain rounded-xl shadow-lg"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 font-bold text-[10px] uppercase tracking-wider h-10 px-5 rounded-xl border-zinc-200 dark:border-zinc-800"
                      onClick={() => window.open(selectedServicio.raw.facturaPath!, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                      Ver Original
                    </Button>
                  </div>
                </div>
              )}

              {/* 9. Factura/Orden */}
              {selectedServicio.raw.facturaElectronica && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800 pb-2">Factura/Orden</h3>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-azul-1 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold text-[10px] uppercase tracking-wider h-10 px-5 rounded-xl"
                      onClick={() => window.open(selectedServicio.raw.facturaElectronica!, "_blank")}
                    >
                      <FileText className="h-4 w-4" />
                      Ver Factura/Orden
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
