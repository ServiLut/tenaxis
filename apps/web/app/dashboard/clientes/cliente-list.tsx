"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Building2,
  User,
  Trophy,
  Phone,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Eye,
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
  X,
  ExternalLink,
  Filter,
  RotateCcw,
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

interface Cliente {
  id: string;
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  tipoCliente: "PERSONA" | "EMPRESA";
  segmentoNegocio?: string;
  nivelRiesgo?: "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
  clasificacion?: "ORO" | "PLATA" | "BRONCE" | "RIESGO";
  score: number;
  telefono: string;
  telefono2?: string;
  correo?: string;
  numeroDocumento?: string;
  nit?: string;
  createdAt?: string;
  direcciones?: {
    direccion: string;
    municipio?: string;
    barrio?: string;
    piso?: string;
    bloque?: string;
    unidad?: string;
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
  const [clientes] = useState<Cliente[]>(initialClientes);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  
  // Estados de Filtros
  const [filters, setFilters] = useState({
    municipio: "all",
    barrio: "",
    clasificacion: "all",
    segmento: "all",
    riesgo: "all",
    fechaDesde: "",
    fechaHasta: "",
  });

  const itemsPerPage = 10;

  // Valores únicos para los filtros
  const filterOptions = useMemo(() => {
    const municipios = Array.from(new Set(clientes.flatMap(c => c.direcciones?.map(d => d.municipio).filter(Boolean) || []))).sort();
    const segmentos = Array.from(new Set(clientes.map(c => c.segmentoNegocio).filter(Boolean))).sort();
    const clasificaciones = ["ORO", "PLATA", "BRONCE", "RIESGO"];
    const riesgos = ["BAJO", "MEDIO", "ALTO", "CRITICO"];
    
    return { municipios, segmentos, clasificaciones, riesgos };
  }, [clientes]);

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      // Búsqueda por texto
      const matchesSearch = (
        c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        c.apellido?.toLowerCase().includes(search.toLowerCase()) ||
        c.razonSocial?.toLowerCase().includes(search.toLowerCase()) ||
        c.nit?.toLowerCase().includes(search.toLowerCase()) ||
        c.numeroDocumento?.toLowerCase().includes(search.toLowerCase())
      );

      // Filtros específicos
      const matchesMunicipio = filters.municipio === "all" || c.direcciones?.some(d => d.municipio === filters.municipio);
      const matchesBarrio = !filters.barrio || c.direcciones?.some(d => d.barrio?.toLowerCase().includes(filters.barrio.toLowerCase()));
      const matchesClasificacion = filters.clasificacion === "all" || c.clasificacion === filters.clasificacion;
      const matchesSegmento = filters.segmento === "all" || c.segmentoNegocio === filters.segmento;
      const matchesRiesgo = filters.riesgo === "all" || c.nivelRiesgo === filters.riesgo;
      
      const clientDate = c.createdAt ? new Date(c.createdAt) : null;
      const matchesFechaDesde = !filters.fechaDesde || (clientDate && clientDate >= new Date(filters.fechaDesde));
      const matchesFechaHasta = !filters.fechaHasta || (clientDate && clientDate <= new Date(filters.fechaHasta + "T23:59:59"));

      return matchesSearch && matchesMunicipio && matchesBarrio && matchesClasificacion && matchesSegmento && matchesRiesgo && matchesFechaDesde && matchesFechaHasta;
    });
  }, [clientes, search, filters]);

  const handleExport = async (format: 'pdf' | 'excel' | 'word') => {
    let headers: string[];
    let data: any[][];

    if (format === 'pdf') {
      headers = ["Cliente", "Identificación", "Tipo", "Celular", "Segmento", "Clasif.", "Riesgo"];
      data = filteredClientes.map(c => [
        c.tipoCliente === "EMPRESA" ? (c.razonSocial || "N/A") : `${c.nombre || ''} ${c.apellido || ''}`.trim(),
        c.tipoCliente === "EMPRESA" ? (c.nit || "N/A") : (c.numeroDocumento || "N/A"),
        c.tipoCliente,
        c.telefono,
        c.segmentoNegocio || "N/A",
        c.clasificacion || "BRONCE",
        c.nivelRiesgo || "BAJO"
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
        c.correo || "N/A", c.telefono, c.clasificacion || "BRONCE", c.segmentoNegocio || "N/A", c.nivelRiesgo || "BAJO"
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
    if (key === "municipio" || key === "clasificacion" || key === "segmento" || key === "riesgo") return value !== "all";
    return !!value;
  }).length;

  const resetFilters = () => {
    setFilters({
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden">

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
            <div className="flex items-center h-12 px-8 rounded-lg bg-zinc-900 text-white gap-3 shadow-lg cursor-pointer">
              <Plus className="h-5 w-5" />
              <span className="font-bold uppercase tracking-wider text-[11px]">Nuevo Registro</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Tabla con Scroll Interno */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-20">
              <tr className="border-b border-zinc-100 dark:border-zinc-800/50">
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Cliente</th>
                <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Documento</th>
                <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Clasificación</th>
                <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Segmento</th>
                <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Riesgo</th>
                <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Teléfonos</th>
                <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Ubicación</th>
                <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Acciones</th>
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
                        <span className="text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                          {cliente.tipoCliente === "EMPRESA" ? cliente.razonSocial : `${cliente.nombre} ${cliente.apellido}`}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate">
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
                      {cliente.segmentoNegocio || "N/A"}
                    </span>
                  </td>

                  <td className="px-3 py-6 text-center">
                    <div className={cn(
                      "inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                      RIESGO_LABELS[cliente.nivelRiesgo || "BAJO"].color
                    )}>
                      {RIESGO_LABELS[cliente.nivelRiesgo || "BAJO"].label}
                    </div>
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
                        <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer">
                          <Pencil className="h-4 w-4 text-zinc-400" /> EDITAR
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold text-red-600 hover:text-red-600 hover:bg-red-50 cursor-pointer">
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
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Mostrando {Math.min(filteredClientes.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredClientes.length, currentPage * itemsPerPage)} de {filteredClientes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 disabled:opacity-30 hover:bg-zinc-50 transition-all"
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
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                    : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50"
                )}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 disabled:opacity-30 hover:bg-zinc-50 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Modal de Detalles del Cliente */}
      <Dialog open={!!selectedCliente} onOpenChange={(open) => !open && setSelectedCliente(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          {selectedCliente && (
            <div className="flex flex-col">
              {/* Header Colorido - Estilo Equipo Trabajo */}
              <div className={cn(
                "h-32 w-full p-8 flex items-center justify-between text-white relative",
                selectedCliente.tipoCliente === "EMPRESA" ? "bg-zinc-900" : "bg-azul-1"
              )}>
                <div className="flex items-center gap-5 z-10">
                  <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black shadow-inner border border-white/10">
                    {selectedCliente.tipoCliente === "EMPRESA" ? <Building2 className="h-8 w-8" /> : <User className="h-8 w-8" />}
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-black tracking-tight leading-tight">
                      {selectedCliente.tipoCliente === "EMPRESA" ? selectedCliente.razonSocial : `${selectedCliente.nombre} ${selectedCliente.apellido}`}
                    </h2>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 flex items-center gap-2">
                      {selectedCliente.tipoCliente === "EMPRESA" ? "Socio Corporativo" : "Persona Natural"}
                      <span className="h-1 w-1 rounded-full bg-white/40" />
                      ID: {selectedCliente.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
                
                {/* Badge de Clasificación */}
                <div className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2",
                  SCORE_COLORS[selectedCliente.clasificacion || "BRONCE"]
                )}>
                  <Trophy className="h-3 w-3" />
                  {selectedCliente.clasificacion || "BRONCE"}
                </div>
              </div>

              {/* Contenido Detallado */}
              <div className="p-8 bg-white dark:bg-zinc-950 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                
                {/* Grid de Información Primaria */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 group hover:border-azul-1/20 transition-all">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Segmento</p>
                    <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <ExternalLink className="h-3 w-3 text-azul-1" />
                      {selectedCliente.segmentoNegocio || "No especificado"}
                    </p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl border transition-all flex flex-col justify-center",
                    RIESGO_LABELS[selectedCliente.nivelRiesgo || "BAJO"].color,
                    "border-transparent hover:border-current/10"
                  )}>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Nivel de Riesgo</p>
                    <div className="flex items-center gap-2 font-black text-sm">
                      <span className={cn("h-2 w-2 rounded-full", RIESGO_LABELS[selectedCliente.nivelRiesgo || "BAJO"].dot)} />
                      {RIESGO_LABELS[selectedCliente.nivelRiesgo || "BAJO"].label}
                    </div>
                  </div>
                </div>

                {/* Sección: Identidad y Contacto */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-1">Información de Contacto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <div className="h-10 w-10 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                        <Fingerprint className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Documento/NIT</p>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50 font-mono">
                          {selectedCliente.tipoCliente === "EMPRESA" ? selectedCliente.nit : selectedCliente.numeroDocumento}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <div className="h-10 w-10 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Email Corporativo</p>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate">{selectedCliente.correo || "Sin correo"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <div className="h-10 w-10 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Línea Principal</p>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{selectedCliente.telefono}</p>
                      </div>
                    </div>
                    {selectedCliente.telefono2 && (
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <div className="h-10 w-10 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                          <Phone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Línea Alterna</p>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{selectedCliente.telefono2}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sección: Direcciones / Sedes */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Ubicaciones Registradas</h3>
                    <span className="text-[10px] font-black text-azul-1 bg-azul-1/10 px-2 py-0.5 rounded-md">
                      {selectedCliente.direcciones?.length || 0} SEDE(S)
                    </span>
                  </div>
                  <div className="space-y-3">
                    {selectedCliente.direcciones?.map((dir, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 relative group transition-all hover:bg-white dark:hover:bg-zinc-900">
                        <MapPin className="h-5 w-5 text-azul-1 absolute top-4 left-4" />
                        <div className="pl-8">
                          <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 leading-tight mb-1">
                            {dir.direccion}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                              <MapPin className="h-3 w-3" /> {dir.municipio || "S/M"}
                            </span>
                            {dir.barrio && (
                              <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                                <Building2 className="h-3 w-3" /> {dir.barrio}
                              </span>
                            )}
                            {(dir.piso || dir.bloque || dir.unidad) && (
                              <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                                <Settings className="h-3 w-3" /> {[dir.unidad, dir.bloque, dir.piso].filter(Boolean).join(" - ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!selectedCliente.direcciones || selectedCliente.direcciones.length === 0) && (
                      <div className="py-6 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Sin direcciones registradas</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer del Modal */}
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => {
                      setSelectedCliente(null);
                      // Aquí podrías redirigir a la edición
                    }}
                    className="flex-1 h-12 rounded-xl bg-zinc-900 dark:bg-white text-[10px] font-black uppercase tracking-widest text-white dark:text-black transition-all hover:opacity-90"
                  >
                    Editar Información
                  </button>
                  <button 
                    onClick={() => setSelectedCliente(null)}
                    className="h-12 px-6 rounded-xl border-2 border-zinc-100 dark:border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
