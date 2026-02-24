"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard";
import { Input, Button, Skeleton } from "@/components/ui";
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Filter,
  ArrowUpRight,
  MoreHorizontal,
  AlertCircle,
  Eye,
  Pencil,
  FileText,
  CalendarClock,
  Trash2,
  Download,
  FileSpreadsheet,
  File as FileIcon
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
  updateOrdenServicioAction,
  getOperatorsAction,
  getEstadoServiciosAction,
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
  estado: string;
  estadoId?: string;
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
  servicio?: { id: string; nombre: string };
  servicioId?: string;
  tecnicoId?: string;
  estadoServicioId?: string;
  fechaVisita?: string;
  horaInicio?: string;
  tecnico?: { id: string; user?: { nombre: string; apellido: string } };
  estadoServicio?: { id: string; nombre: string };
  urgencia?: string;
  observacion?: string;
  nivelInfestacion?: string;
  tipoVisita?: string;
  frecuenciaSugerida?: number;
  tipoFacturacion?: string;
  valorCotizado?: number;
  metodoPagoId?: string;
  estadoPago?: string;
}

const ESTADO_STYLING: Record<string, string> = {
  "PROGRAMADO": "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50",
  "EN PROCESO": "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50",
  "FINALIZADO": "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50",
  "CANCELADO": "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50",
};

const URGENCIA_STYLING: Record<string, string> = {
  "ALTA": "bg-red-500 text-white",
  "MEDIA": "bg-amber-500 text-white",
  "BAJA": "bg-emerald-500 text-white",
  "CRITICA": "bg-red-700 text-white",
};

function ServiciosSkeleton() {
  return (
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
  );
}

interface OrdenServicioResponse {
  id: string;
  numeroOrden?: string | null;
  cliente: {
    tipoCliente: "PERSONA" | "EMPRESA";
    nombre?: string | null;
    apellido?: string | null;
    razonSocial?: string | null;
  };
  servicio?: {
    nombre: string;
  } | null;
  fechaVisita?: string | null;
  horaInicio?: string | null;
  tecnico?: {
    user: {
      nombre: string;
      apellido: string;
    };
  } | null;
  estadoServicio?: {
    nombre: string;
  } | null;
  urgencia?: string | null;
}
}

export default function ServiciosPage() {
  const [search, setSearch] = useState("");
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
          estado: os.estadoServicio?.nombre || "PROGRAMADO",
          estadoId: os.estadoServicioId,
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
  }, [fetchServicios]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredServicios = servicios.filter((s: Servicio) => 
    s.cliente.toLowerCase().includes(search.toLowerCase()) ||
    s.servicioEspecifico.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServicios = filteredServicios.slice(startIndex, startIndex + itemsPerPage);

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
          </div>
        </div>

        {/* Contenedor Principal de Datos */}
        <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-10 pb-4 sm:pb-6 lg:pb-10">
          <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden">
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
          </div>
          <div className="flex items-center gap-3">
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

            <Button variant="outline" className="flex items-center h-12 px-6 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all gap-2 border bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700">
              <Filter className="h-4 w-4" /> <span>Filtros</span>
            </Button>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Detalles del Cliente</DialogTitle>
            <DialogDescription className="font-medium">
              Información completa del cliente asociado a la orden <span className="text-azul-1 font-bold">#{selectedServicio?.id}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedServicio && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="col-span-1 md:col-span-2 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Información del Servicio</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Servicio</p>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedServicio.servicioEspecifico}</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Fecha Programada</p>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedServicio.fecha}</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Hora de Inicio</p>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedServicio.hora}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Nombre / Razón Social</h4>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedServicio.clienteFull.tipoCliente === "EMPRESA" 
                      ? selectedServicio.clienteFull.razonSocial 
                      : `${selectedServicio.clienteFull.nombre} ${selectedServicio.clienteFull.apellido}`}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Identificación</h4>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedServicio.clienteFull.tipoDocumento || (selectedServicio.clienteFull.tipoCliente === "EMPRESA" ? "NIT" : "CC")}: {selectedServicio.clienteFull.nit || selectedServicio.clienteFull.numeroDocumento || "No registrado"}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Correo Electrónico</h4>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedServicio.clienteFull.correo || "No registrado"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Teléfono Principal</h4>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedServicio.clienteFull.telefono}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Teléfono Secundario</h4>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedServicio.clienteFull.telefono2 || "No registrado"}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Actividad Económica</h4>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedServicio.clienteFull.actividadEconomica || "No especificada"}</p>
                </div>
              </div>

              {selectedServicio.clienteFull.direcciones && selectedServicio.clienteFull.direcciones.length > 0 && (
                <div className="col-span-1 md:col-span-2 mt-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Direcciones Registradas</h4>
                  <div className="space-y-3">
                    {selectedServicio.clienteFull.direcciones.map((dir, idx) => (
                      <div key={idx} className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-700/50">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{dir.nombreSede || `Sede ${idx + 1}`}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{dir.direccion} - {dir.barrio}, {dir.municipio}</p>
                      </div>
                    ))}
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
