"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui";
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
import { cn } from "@/components/ui/utils";
import { toast } from "sonner";

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

import { exportToExcel, exportToPDF, exportToWord } from "@/lib/utils/export-helper";

// ... (previous interface and constants)

export function ClienteList({ initialClientes }: ClienteListProps) {
  const [clientes] = useState<Cliente[]>(initialClientes);
  const [search, setSearch] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
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
      // PDF headers slightly reduced for portrait fit
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
      // Excel/Word headers (Full data)
      headers = [
        "ID", "Tipo", "Nombre / Razón Social", "Identificación / NIT", "Correo", "Teléfono 1", "Teléfono 2",
        "Clasificación", "Segmento", "Riesgo", "Puntos", "Origen", "Act. Económica", "Metraje", "Frecuencia",
        "Ticket Prom.", "Última Visita", "Próxima Visita", "Fecha Registro"
      ];
      data = filteredClientes.map(c => [
        c.id, c.tipoCliente,
        c.tipoCliente === "EMPRESA" ? (c.razonSocial || "N/A") : `${c.nombre || ''} ${c.apellido || ''}`.trim(),
        c.tipoCliente === "EMPRESA" ? (c.nit || "N/A") : (c.numeroDocumento || "N/A"),
        c.correo || "N/A", c.telefono, c.telefono2 || "N/A",
        c.clasificacion || "BRONCE", c.segmentoNegocio || "N/A", c.nivelRiesgo || "BAJO", c.score || 0,
        (c as any).origenCliente || "N/A", (c as any).actividadEconomica || "N/A",
        (c as any).metrajeTotal ? `${(c as any).metrajeTotal}` : "0", (c as any).frecuenciaServicio || "N/A",
        (c as any).ticketPromedio ? `$ ${(c as any).ticketPromedio}` : "$ 0",
        (c as any).ultimaVisita ? new Date((c as any).ultimaVisita).toLocaleDateString() : "N/A",
        (c as any).proximaVisita ? new Date((c as any).proximaVisita).toLocaleDateString() : "N/A",
        new Date((c as any).createdAt).toLocaleDateString()
      ]);
    }

    const exportParams = {
      headers,
      data,
      filename: `cartera_clientes_tenaxis_${new Date().toISOString().split('T')[0]}`,
      title: "REPORTE ESTRATÉGICO DE CARTERA DE CLIENTES"
    };

    toast.info(`Generando archivo ${format.toUpperCase()}...`, {
      description: `Se exportarán ${filteredClientes.length} registros con el diseño corporativo.`,
    });
    
    try {
      if (format === 'excel') await exportToExcel(exportParams);
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

  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden">
      {/* Barra de Filtros Unificada */}
      <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <Input 
            placeholder="Buscar por nombre, documento o NIT..." 
            className="h-12 pl-12 rounded-lg border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Botón de Exportación */}
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center h-12 px-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 gap-3 transition-all font-bold text-[11px] uppercase tracking-wider"
            >
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 mb-1 border-b border-zinc-50 dark:border-zinc-800">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Formatos Corporativos</p>
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

          <Link href="/dashboard/clientes/nuevo">
            <div className="flex items-center h-12 px-8 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100 gap-3 shadow-lg shadow-zinc-900/10 transition-all cursor-pointer">
              <Plus className="h-5 w-5" />
              <span className="font-bold uppercase tracking-wider text-[11px]">Nuevo Registro</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Tabla de Clientes con Scroll Interno */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div 
          className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800"
          onClick={() => setActiveDropdown(null)}
        >
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10">
              <tr className="border-b border-zinc-100 dark:border-zinc-800/50">
                <th className="w-[22%] px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Cliente</th>
                <th className="w-[12%] px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Documento</th>
                <th className="w-[10%] px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Clasificación</th>
                <th className="w-[10%] px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Segmento</th>
                <th className="w-[10%] px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Riesgo</th>
                <th className="w-[12%] px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Teléfonos</th>
                <th className="w-[16%] px-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Ubicación</th>
                <th className="w-[8%] px-4 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {paginatedClientes.map((cliente) => (
                <tr key={cliente.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all">
                  <td className="px-4 py-6 overflow-hidden">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md",
                        cliente.tipoCliente === "EMPRESA" ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                      )}>
                        {cliente.tipoCliente === "EMPRESA" ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                      </div>
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                          {cliente.tipoCliente === "EMPRESA" ? cliente.razonSocial : `${cliente.nombre} ${cliente.apellido}`}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate">
                          {cliente.tipoCliente === "EMPRESA" ? "Empresa" : "Persona Natural"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-6 overflow-hidden">
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <span className="text-xs font-black text-zinc-700 dark:text-zinc-300 truncate">
                        {cliente.tipoCliente === "EMPRESA" ? (cliente.nit || "Sin NIT") : (cliente.numeroDocumento || "Sin Doc")}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase truncate">
                        {cliente.tipoCliente === "EMPRESA" ? "NIT" : "Documento"}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-3 py-6 text-center overflow-hidden">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm",
                      SCORE_COLORS[cliente.clasificacion || "BRONCE"]
                    )}>
                      <Trophy className="h-2.5 w-2.5" />
                      {cliente.clasificacion || "BRONCE"}
                    </div>
                  </td>

                  <td className="px-3 py-6 text-center overflow-hidden">
                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 truncate block">
                      {cliente.segmentoNegocio || "N/A"}
                    </span>
                  </td>

                  <td className="px-3 py-6 text-center overflow-hidden">
                    <div className={cn(
                      "inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                      RIESGO_LABELS[cliente.nivelRiesgo || "BAJO"].color
                    )}>
                      {RIESGO_LABELS[cliente.nivelRiesgo || "BAJO"].label}
                    </div>
                  </td>

                  <td className="px-3 py-6 overflow-hidden">
                    <div className="flex flex-col gap-0.5 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 truncate">
                        <Phone className="h-3 w-3 text-zinc-400 shrink-0" />
                        {cliente.telefono}
                      </div>
                      {cliente.telefono2 && (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate opacity-70">
                          <Phone className="h-3 w-3 text-zinc-400 shrink-0" />
                          {cliente.telefono2}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-6 overflow-hidden">
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 truncate">
                        {cliente.direcciones?.[0]?.direccion || "N/A"}
                      </span>
                      <span className="text-[9px] font-medium text-zinc-400 truncate uppercase">
                        {cliente.direcciones?.[0]?.municipio || "S/M"}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-6 text-right relative">
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
                        className="absolute right-8 top-12 w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden"
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

      {/* Paginación Estratégica */}
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
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl text-[11px] font-black transition-all shadow-sm",
                  currentPage === page
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                    : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                )}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
