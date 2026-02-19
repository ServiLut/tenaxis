"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard";
import { Input, Card, CardContent, Button } from "@/components/ui";
import { 
  Plus, 
  Search, 
  Briefcase, 
  Calendar, 
  Clock, 
  User, 
  Filter,
  ArrowUpRight,
  MoreVertical,
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
import { cn } from "@/components/ui/utils";
import { toast } from "sonner";

// ... (MOCK_SERVICIOS, ESTADO_STYLING, URGENCIA_STYLING remain the same)

import { exportToExcel, exportToPDF, exportToWord } from "@/lib/utils/export-helper";

// ... (previous interfaces and mock data)

export default function ServiciosPage() {
  const [search, setSearch] = useState("");
  const [servicios] = useState(MOCK_SERVICIOS);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const filteredServicios = servicios.filter(s => 
    s.cliente.toLowerCase().includes(search.toLowerCase()) ||
    s.servicioEspecifico.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = async (format: 'pdf' | 'excel' | 'word') => {
    const headers = ["ID Orden", "Cliente", "Servicio", "Fecha", "Hora", "Técnico", "Estado", "Urgencia"];
    const data = filteredServicios.map(s => [
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
    <DashboardLayout>
      <div className="space-y-10" onClick={() => setOpenMenuId(null)}>
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
              Órdenes de Servicio
            </h1>
            <p className="text-zinc-500 font-medium italic">
              Control operativo y trazabilidad de servicios técnicos.
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <Input 
              placeholder="Buscar por ID, cliente o servicio..." 
              className="h-12 pl-12 rounded-2xl border-none bg-zinc-50 dark:bg-zinc-800"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Botón de Exportación */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
                className="flex items-center h-12 px-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 gap-3 transition-all font-bold text-xs uppercase tracking-widest"
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

            <Button variant="outline" className="h-12 px-6 rounded-2xl gap-2 border-zinc-200 font-bold text-xs uppercase tracking-widest">
              <Filter className="h-4 w-4" /> Filtros
            </Button>
            <Link href="/dashboard/servicios/nuevo">
              <div className="flex items-center h-12 px-8 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100 gap-2 shadow-xl transition-all cursor-pointer">
                <Plus className="h-5 w-5" />
                <span className="font-black uppercase tracking-widest text-xs">Nueva Orden</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Tabla de Servicios */}
        <Card className="border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-visible">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
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
                  {filteredServicios.map((servicio) => (
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
                        <div className="flex justify-end gap-2 relative">
                          <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-50 hover:bg-zinc-900 hover:text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all text-zinc-400">
                            <ArrowUpRight className="h-5 w-5" />
                          </button>
                          
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === servicio.id ? null : servicio.id);
                              }}
                              className={cn(
                                "h-10 w-10 flex items-center justify-center rounded-xl transition-all text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                                openMenuId === servicio.id && "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black shadow-lg"
                              )}
                            >
                              <MoreVertical className="h-5 w-5" />
                            </button>

                            {openMenuId === servicio.id && (
                              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-zinc-100 dark:border-zinc-800 z-50 py-2 animate-in fade-in zoom-in duration-200">
                                <button className="w-full px-4 py-3 flex items-center gap-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                  <Eye className="h-4 w-4" />
                                  <span className="text-[11px] font-black uppercase tracking-widest">Ver Detalles</span>
                                </button>
                                <button className="w-full px-4 py-3 flex items-center gap-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                  <Pencil className="h-4 w-4" />
                                  <span className="text-[11px] font-black uppercase tracking-widest">Editar Orden</span>
                                </button>
                                <button className="w-full px-4 py-3 flex items-center gap-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-t border-zinc-50 dark:border-zinc-800/50">
                                  <FileText className="h-4 w-4 text-emerald-500" />
                                  <span className="text-[11px] font-black uppercase tracking-widest">Certificado</span>
                                </button>
                                <button className="w-full px-4 py-3 flex items-center gap-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                  <CalendarClock className="h-4 w-4 text-blue-500" />
                                  <span className="text-[11px] font-black uppercase tracking-widest">Re-programar</span>
                                </button>
                                <div className="mx-2 my-1 border-t border-zinc-50 dark:border-zinc-800/50" />
                                <button className="w-full px-4 py-3 flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                  <span className="text-[11px] font-black uppercase tracking-widest">Cancelar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredServicios.length === 0 && (
              <div className="py-32 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-800 mb-6">
                  <AlertCircle className="h-12 w-12 text-zinc-300" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">Sin resultados</h2>
                <p className="text-zinc-500 mt-2 font-medium">No se encontraron órdenes que coincidan con su búsqueda.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
