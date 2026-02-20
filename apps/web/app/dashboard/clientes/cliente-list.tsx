"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  direcciones?: {
    direccion: string;
    municipio?: string;
    barrio?: string;
  }[];
}

interface ClienteListProps {
  initialClientes: Cliente[];
}

const SCORE_COLORS = {
  ORO: "bg-amber-500 text-white shadow-amber-200",
  PLATA: "bg-zinc-400 text-white shadow-zinc-200",
  BRONCE: "bg-orange-400 text-white shadow-orange-200",
  RIESGO: "bg-red-500 text-white shadow-red-200",
};

const RIESGO_LABELS = {
  BAJO: { label: "Riesgo Bajo", color: "text-emerald-600 bg-emerald-50" },
  MEDIO: { label: "Riesgo Medio", color: "text-amber-600 bg-amber-50" },
  ALTO: { label: "Riesgo Alto", color: "text-orange-600 bg-orange-50" },
  CRITICO: { label: "Crítico", color: "text-red-600 bg-red-50" },
};

export function ClienteList({ initialClientes }: ClienteListProps) {
  const [clientes] = useState<Cliente[]>(initialClientes);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredClientes = clientes.filter(c =>
    (c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
     c.apellido?.toLowerCase().includes(search.toLowerCase()) ||
     c.razonSocial?.toLowerCase().includes(search.toLowerCase()) ||
     c.nit?.toLowerCase().includes(search.toLowerCase()) ||
     c.numeroDocumento?.toLowerCase().includes(search.toLowerCase()))
  );

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
<<<<<<< HEAD
      headers = [
        "ID", "Tipo", "Nombre / Razón Social", "Identificación / NIT", "Correo", "Teléfono 1", "Teléfono 2",
        "Clasificación", "Segmento", "Riesgo", "Puntos", "Origen", "Act. Económica", "Metraje", "Frecuencia",
        "Ticket Prom.", "Última Visita", "Próxima Visita", "Fecha Registro"
      ];
=======
      headers = ["ID", "Tipo", "Nombre / Razón Social", "Identificación / NIT", "Correo", "Teléfono 1", "Clasificación", "Segmento", "Riesgo"];
>>>>>>> 48dcc531f14cee1b10831963fc2cac7136a02f9b
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
<<<<<<< HEAD
    
=======

>>>>>>> 48dcc531f14cee1b10831963fc2cac7136a02f9b
    try {
      if (format === 'excel') await exportToExcel(exportParams);
      else if (format === 'pdf') exportToPDF(exportParams);
      else if (format === 'word') await exportToWord(exportParams);
<<<<<<< HEAD
      toast.success(`${format.toUpperCase()} generado`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Error al generar el archivo`);
    } finally {
      setShowExportMenu(false);
=======
      toast.success(`${format.toUpperCase()} generado exitosamente`);
    } catch (error) {
      toast.error(`Error al generar el archivo ${format.toUpperCase()}`);
>>>>>>> 48dcc531f14cee1b10831963fc2cac7136a02f9b
    }
  };

  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
<<<<<<< HEAD
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-xl overflow-visible">
      {/* Filtros */}
      <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 shrink-0 rounded-t-xl overflow-visible relative z-50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <Input 
            placeholder="Buscar..." 
            className="h-12 pl-12 rounded-lg border-zinc-200"
=======
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden">

      {/* Barra de Filtros Unificada */}
      <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Buscar por nombre, documento o NIT..."
            className="h-12 pl-12 rounded-lg border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 transition-all"
>>>>>>> 48dcc531f14cee1b10831963fc2cac7136a02f9b
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
<<<<<<< HEAD
        
        <div className="flex items-center gap-3 relative overflow-visible">
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
              className="flex items-center h-12 px-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] uppercase tracking-wider"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-2xl z-[100] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <button onClick={() => handleExport('excel')} className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"><FileSpreadsheet className="h-4 w-4" /> EXCEL (.XLSX)</button>
                <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"><FileText className="h-4 w-4" /> PDF (.PDF)</button>
                <button onClick={() => handleExport('word')} className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"><FileIcon className="h-4 w-4" /> WORD (.DOCX)</button>
              </div>
            )}
          </div>
=======

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
>>>>>>> 48dcc531f14cee1b10831963fc2cac7136a02f9b

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
<<<<<<< HEAD
                <tr 
                  key={cliente.id} 
                  className={cn(
                    "group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all",
                    activeDropdown === cliente.id && "relative z-50 bg-white dark:bg-zinc-900 shadow-lg"
                  )}
                >
                  <td className="px-4 py-6 overflow-hidden">
=======
                <tr key={cliente.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all">
                  <td className="px-4 py-6">
>>>>>>> 48dcc531f14cee1b10831963fc2cac7136a02f9b
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

<<<<<<< HEAD
                  <td className="px-4 py-6 text-right relative overflow-visible">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === cliente.id ? null : cliente.id);
                      }}
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                        activeDropdown === cliente.id 
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-black" 
                          : "bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-400 dark:bg-zinc-800/50 dark:hover:bg-white dark:hover:text-black"
                      )}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {activeDropdown === cliente.id && (
                      <div 
                        className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-2xl z-100 py-1 animate-in fade-in slide-in-from-bottom-2 duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="py-1">
                          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                            <Eye className="h-4 w-4 text-zinc-400" />
                            VER DETALLES
                          </button>
                          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                            <Settings className="h-4 w-4 text-zinc-400" />
                            SERVICIOS
                          </button>
                          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                            <Pencil className="h-4 w-4 text-zinc-400" />
                            EDITAR
                          </button>
                          <div className="h-px bg-zinc-100 dark:bg-zinc-700 my-1" />
                          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 className="h-4 w-4" />
                            ELIMINAR
                          </button>
                        </div>
                      </div>
                    )}
=======
                  <td className="px-4 py-6 text-right">
                    {/* Dropdown de Acciones de Shadcn - Soluciona el problema de Z-Index y Scroll */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-400 dark:bg-zinc-800/50 dark:hover:bg-white dark:hover:text-black transition-all">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl">
                        <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer">
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
>>>>>>> 48dcc531f14cee1b10831963fc2cac7136a02f9b
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

<<<<<<< HEAD
      {/* Paginación Estratégica */}
      <div className="px-8 py-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0 rounded-b-xl">
=======
      {/* Paginación */}
      <div className="px-8 py-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
>>>>>>> 48dcc531f14cee1b10831963fc2cac7136a02f9b
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
    </div>
  );
}
