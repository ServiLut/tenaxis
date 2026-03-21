"use client";

import React, { useState } from "react";
import { cn } from "@/components/ui/utils";
import {
  Package,
  Search,
  History,
  AlertCircle,
  TrendingDown,
  Download,
  Plus,
  Loader2,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  FileIcon,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/base-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { 
  exportMultiToExcel, 
  exportMultiToPDF, 
  exportMultiToWord, 
  type ExportDataset 
} from "@/lib/utils/export-helper";

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "relative overflow-hidden rounded-3xl border border-border bg-card/40 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md",
    className
  )}>
    {children}
  </div>
);

type InsumosClientProps = {
  initialStock: any[];
  initialSolicitudes: any[];
  proveedores: any[];
  memberships: any[];
};

export function InsumosClient({ initialStock, initialSolicitudes, proveedores, memberships }: InsumosClientProps) {
  const [activeTab, setActiveTab] = useState<"solicitudes" | "stock">("solicitudes");
  const [solSearch, setSolSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  // Modal states
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isSolicitudModalOpen, setIsSolicitudModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Form states
  const [stockForm, setStockForm] = useState({
    nombre: "",
    categoria: "",
    unidadMedida: "",
    stockActual: "",
    stockMinimo: "",
    proveedorId: "",
  });

  const [solicitudForm, setSolicitudForm] = useState({
    productoId: "",
    cantidad: "",
    unidadMedida: "",
    membershipId: "",
  });

  const formattedSolicitudes = initialSolicitudes.map(sol => ({
    id: sol.id,
    fecha: sol.createdAt ? format(new Date(sol.createdAt), "dd MMM yyyy", { locale: es }) : "N/A",
    tecnico: sol.membership?.user ? `${sol.membership.user.nombre} ${sol.membership.user.apellido}` : "Desconocido",
    producto: sol.producto?.nombre || "Producto desconocido",
    cantidad: sol.cantidad,
    unidad: sol.unidadMedida || sol.producto?.unidadMedida || "",
    estado: sol.estado === "ACEPTADA" ? "Aprobado" : sol.estado === "RECHAZADA" ? "Rechazado" : "Pendiente",
    categoria: sol.producto?.categoria || "General",
    rawEstado: sol.estado,
  }));

  const formattedStock = initialStock.map(item => {
    const stockActual = item.stockActual || 0;
    const stockMinimo = item.stockMinimo || 0;
    
    let estado = "Normal";
    if (stockActual === 0) estado = "Agotado";
    else if (stockActual > 0 && stockActual <= stockMinimo * 0.25) estado = "Crítico";
    else if (stockActual > stockMinimo * 0.25 && stockActual <= stockMinimo) estado = "Bajo";

    return {
      id: item.id,
      producto: item.nombre,
      categoria: item.categoria || "General",
      stockActual,
      unidad: item.unidadMedida || "unidades",
      estado,
    };
  });

  const filteredSolicitudes = formattedSolicitudes.filter(sol => 
    sol.producto.toLowerCase().includes(solSearch.toLowerCase()) || 
    sol.tecnico.toLowerCase().includes(solSearch.toLowerCase())
  );

  const filteredStock = formattedStock.filter(item => 
    item.producto.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const outOfStockCount = formattedStock.filter(s => s.estado === "Agotado").length;
  const lowStockCount = formattedStock.filter(s => s.estado === "Bajo" || s.estado === "Crítico").length;

  const handleCreateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...stockForm,
        stockActual: parseInt(stockForm.stockActual) || 0,
        stockMinimo: parseInt(stockForm.stockMinimo) || 0,
        proveedorId: stockForm.proveedorId || undefined,
      };
      await apiFetch("/productos/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Producto registrado exitosamente");
      setIsStockModalOpen(false);
      setStockForm({
        nombre: "",
        categoria: "",
        unidadMedida: "",
        stockActual: "",
        stockMinimo: "",
        proveedorId: "",
      });
    } catch (error) {
      toast.error("Error inesperado al registrar el producto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...solicitudForm,
        membershipId: solicitudForm.membershipId || undefined,
      };
      await apiFetch("/productos/solicitudes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Solicitud registrada exitosamente");
      setIsSolicitudModalOpen(false);
      setSolicitudForm({
        productoId: "",
        cantidad: "",
        unidadMedida: "",
        membershipId: "",
      });
    } catch (error) {
      toast.error("Error inesperado al registrar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, nuevoEstado: "ACEPTADA" | "RECHAZADA") => {
    setProcessingId(id);
    try {
      await apiFetch(`/productos/solicitudes/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      toast.success(`Solicitud ${nuevoEstado === "ACEPTADA" ? "aprobada" : "rechazada"} con éxito`);
    } catch (error) {
      toast.error("Error inesperado al actualizar la solicitud");
    } finally {
      setProcessingId(null);
    }
  };

  const handleExport = async (formatType: 'excel' | 'pdf' | 'word') => {
    const stockDatasets: ExportDataset = {
      title: "Inventario de Stock / Almacén",
      sheetName: "Stock",
      headers: ["PRODUCTO", "CATEGORÍA", "STOCK ACTUAL", "UNIDAD", "ESTADO"],
      data: formattedStock.map(s => [s.producto, s.categoria, s.stockActual, s.unidad, s.estado])
    };

    const solicitudesDatasets: ExportDataset = {
      title: "Historial de Solicitudes de Insumos",
      sheetName: "Solicitudes",
      headers: ["FECHA", "TÉCNICO", "PRODUCTO", "CANTIDAD", "ESTADO"],
      data: formattedSolicitudes.map(s => [s.fecha, s.tecnico, s.producto, `${s.cantidad} ${s.unidad}`, s.estado])
    };

    const exportOptions = {
      datasets: [stockDatasets, solicitudesDatasets],
      filename: `reporte_insumos_${new Date().getTime()}`,
      mainTitle: "REPORTE DE GESTIÓN DE INSUMOS"
    };

    toast.info(`Generando reporte en formato ${formatType.toUpperCase()}...`);

    try {
      if (formatType === 'excel') await exportMultiToExcel(exportOptions);
      else if (formatType === 'pdf') exportMultiToPDF(exportOptions);
      else if (formatType === 'word') await exportMultiToWord(exportOptions);

      toast.success(`${formatType.toUpperCase()} generado exitosamente`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Error al generar el reporte ${formatType.toUpperCase()}`);
    } finally {
      setShowExportMenu(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-foreground lg:text-5xl">
            Gestión de <span className="text-[#01ADFB]">Insumos</span>
          </h1>
          <p className="text-lg font-medium text-muted-foreground">
            Controla las solicitudes de materiales y el inventario en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Button 
              variant="outline" 
              className="h-12 rounded-2xl border-border bg-card font-black uppercase tracking-widest transition-transform hover:scale-105 active:scale-95"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 mb-1 border-b border-border">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Formatos Disponibles</p>
                </div>
                <button 
                  onClick={() => handleExport('excel')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-foreground hover:bg-muted transition-colors text-left"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  MICROSOFT EXCEL (.XLSX)
                </button>
                <button 
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-foreground hover:bg-muted transition-colors text-left"
                >
                  <FileText className="h-4 w-4 text-red-500" />
                  DOCUMENTO PDF (.PDF)
                </button>
                <button 
                  onClick={() => handleExport('word')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-foreground hover:bg-muted transition-colors text-left"
                >
                  <FileIcon className="h-4 w-4 text-blue-500" />
                  MICROSOFT WORD (.DOCX)
                </button>
              </div>
            )}
          </div>

          <Button 
            className="h-12 rounded-2xl bg-[#01ADFB] px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95 hover:bg-[#01ADFB]/90"
            onClick={() => setIsStockModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Registrar Stock
          </Button>
          <Button 
            className="h-12 rounded-2xl bg-primary px-6 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
            onClick={() => setIsSolicitudModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Solicitud
          </Button>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="flex items-center gap-1.5 rounded-2xl bg-muted p-1.5 w-fit border border-border">
        <button
          onClick={() => setActiveTab("solicitudes")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300",
            activeTab === "solicitudes"
              ? "bg-background text-[#01ADFB] shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <History className="h-4 w-4" />
          Solicitudes
        </button>
        <button
          onClick={() => setActiveTab("stock")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300",
            activeTab === "stock"
              ? "bg-background text-[#01ADFB] shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="h-4 w-4" />
          Stock / Almacén
        </button>
      </div>

      {/* Content */}
      <div className="mt-8 space-y-8">
        {activeTab === "solicitudes" ? (
          <div className="space-y-6">
            <div className="flex justify-end">
              <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-[#01ADFB] transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar técnico o producto..."
                  value={solSearch}
                  onChange={(e) => setSolSearch(e.target.value)}
                  className="h-12 w-full rounded-2xl border-none bg-card px-12 text-sm font-bold shadow-sm ring-1 ring-border focus:ring-2 focus:ring-[#01ADFB]/20 transition-all outline-none text-foreground"
                />
              </div>
            </div>

            <GlassCard className="w-full overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Técnico</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Producto</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Cantidad</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acciones / Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSolicitudes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm font-bold text-muted-foreground">
                          No se encontraron solicitudes.
                        </td>
                      </tr>
                    )}
                    {filteredSolicitudes.map((sol) => (
                      <tr key={sol.id} className="hover:bg-muted transition-colors group">
                        <td className="px-6 py-5 text-muted-foreground font-bold text-xs">{sol.fecha}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-[10px] font-black">
                              {sol.tecnico.split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase()}
                            </div>
                            <span className="font-black text-foreground text-sm uppercase">{sol.tecnico}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-bold text-primary dark:text-[#01ADFB] text-sm uppercase">{sol.producto}</td>
                        <td className="px-6 py-5 font-black text-foreground text-sm text-center tabular-nums">{sol.cantidad} {sol.unidad}</td>
                        <td className="px-6 py-5 text-right">
                          {sol.rawEstado === "PENDIENTE" ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                disabled={!!processingId}
                                className="h-8 w-8 rounded-lg border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                                onClick={() => handleUpdateStatus(sol.id, "ACEPTADA")}
                              >
                                {processingId === sol.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                disabled={!!processingId}
                                className="h-8 w-8 rounded-lg border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
                                onClick={() => handleUpdateStatus(sol.id, "RECHAZADA")}
                              >
                                {processingId === sol.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                              </Button>
                            </div>
                          ) : (
                            <span className={cn(
                              "inline-flex items-center rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border shadow-sm",
                              sol.estado === "Aprobado" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                              sol.estado === "Pendiente" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                              sol.estado === "Rechazado" && "bg-destructive/10 text-destructive border-destructive/20"
                            )}>
                              {sol.estado}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-end">
              <div className="relative w-full md:w-80 group">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-[#01ADFB] transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar en almacén..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="h-12 w-full rounded-2xl border-none bg-card px-12 text-sm font-bold shadow-sm ring-1 ring-border focus:ring-2 focus:ring-[#01ADFB]/20 transition-all outline-none text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
              <GlassCard className="bg-primary border-none text-white dark:bg-muted dark:text-foreground">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-[#01ADFB]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Alertas Críticas</p>
                    <p className="text-2xl font-black">{outOfStockCount} Producto{outOfStockCount !== 1 && 's'} Agotado{outOfStockCount !== 1 && 's'}</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="bg-card/60 border-border">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#01ADFB]/10 flex items-center justify-center text-[#01ADFB]">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Stock Bajo</p>
                    <p className="text-2xl font-black text-foreground">{lowStockCount} Referencia{lowStockCount !== 1 && 's'}</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="w-full overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Producto</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Categoría</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Stock</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStock.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-sm font-bold text-muted-foreground">
                          No se encontraron productos.
                        </td>
                      </tr>
                    )}
                    {filteredStock.map((item) => (
                      <tr key={item.id} className="hover:bg-muted transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground">
                              <Package className="h-5 w-5" />
                            </div>
                            <span className="font-black text-foreground text-sm uppercase">{item.producto}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-block rounded-lg bg-muted px-2 py-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-border">
                            {item.categoria}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center font-black text-foreground text-sm tabular-nums">
                          {item.stockActual} <span className="text-[10px] font-bold text-muted-foreground opacity-60 ml-1 uppercase">{item.unidad}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={cn(
                              "h-2 w-2 rounded-full",
                              item.estado === "Normal" && "bg-emerald-500",
                              item.estado === "Bajo" && "bg-amber-500",
                              (item.estado === "Crítico" || item.estado === "Agotado") && "bg-red-500 animate-pulse",
                              item.estado === "Excedente" && "bg-[#01ADFB]"
                            )} />
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              item.estado === "Normal" && "text-emerald-600",
                              item.estado === "Bajo" && "text-amber-600",
                              (item.estado === "Crítico" || item.estado === "Agotado") && "text-red-600",
                              item.estado === "Excedente" && "text-[#01ADFB]"
                            )}>
                              {item.estado}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Registrar Stock Modal */}
      <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              Registrar <span className="text-[#01ADFB]">Nuevo Producto</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateStock} className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Producto</Label>
                <Input 
                  id="nombre" 
                  value={stockForm.nombre} 
                  onChange={(e) => setStockForm({...stockForm, nombre: e.target.value})}
                  required
                  placeholder="Ej: Refrigerante R410A"
                  className="rounded-xl border-border bg-muted/50 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Categoría</Label>
                  <Input 
                    id="categoria" 
                    value={stockForm.categoria} 
                    onChange={(e) => setStockForm({...stockForm, categoria: e.target.value})}
                    placeholder="Ej: Consumibles"
                    className="rounded-xl border-border bg-muted/50 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unidadMedida" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unidad</Label>
                  <Input 
                    id="unidadMedida" 
                    value={stockForm.unidadMedida} 
                    onChange={(e) => setStockForm({...stockForm, unidadMedida: e.target.value})}
                    placeholder="Ej: kg, m, unid"
                    className="rounded-xl border-border bg-muted/50 font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stockActual" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stock Inicial</Label>
                  <Input 
                    id="stockActual" 
                    type="number"
                    value={stockForm.stockActual} 
                    onChange={(e) => setStockForm({...stockForm, stockActual: e.target.value})}
                    placeholder="0"
                    className="rounded-xl border-border bg-muted/50 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockMinimo" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stock Mínimo</Label>
                  <Input 
                    id="stockMinimo" 
                    type="number"
                    value={stockForm.stockMinimo} 
                    onChange={(e) => setStockForm({...stockForm, stockMinimo: e.target.value})}
                    placeholder="Ej: 5"
                    className="rounded-xl border-border bg-muted/50 font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proveedor" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Proveedor (Opcional)</Label>
                <Select 
                  id="proveedor"
                  value={stockForm.proveedorId} 
                  onChange={(e) => setStockForm({...stockForm, proveedorId: e.target.value})}
                  className="rounded-xl border-border bg-muted/50 font-bold"
                >
                  <option value="">Sin proveedor</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-12 rounded-2xl bg-[#01ADFB] font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 hover:bg-[#01ADFB]/90"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar Producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nueva Solicitud Modal */}
      <Dialog open={isSolicitudModalOpen} onOpenChange={setIsSolicitudModalOpen}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              Nueva <span className="text-primary">Solicitud de Insumos</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSolicitud} className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="producto" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Producto</Label>
                <Select 
                  id="producto"
                  value={solicitudForm.productoId} 
                  onChange={(e) => setSolicitudForm({...solicitudForm, productoId: e.target.value})}
                  required
                  className="rounded-xl border-border bg-muted/50 font-bold"
                >
                  <option value="">Seleccionar producto</option>
                  {initialStock.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.stockActual} {p.unidadMedida})</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cantidad" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cantidad</Label>
                  <Input 
                    id="cantidad" 
                    value={solicitudForm.cantidad} 
                    onChange={(e) => setSolicitudForm({...solicitudForm, cantidad: e.target.value})}
                    required
                    placeholder="Ej: 5"
                    className="rounded-xl border-border bg-muted/50 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solUnidad" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unidad (Opcional)</Label>
                  <Input 
                    id="solUnidad" 
                    value={solicitudForm.unidadMedida} 
                    onChange={(e) => setSolicitudForm({...solicitudForm, unidadMedida: e.target.value})}
                    placeholder="Ej: kg"
                    className="rounded-xl border-border bg-muted/50 font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tecnico" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Solicitado para (Técnico)</Label>
                <Select 
                  id="tecnico"
                  value={solicitudForm.membershipId} 
                  onChange={(e) => setSolicitudForm({...solicitudForm, membershipId: e.target.value})}
                  className="rounded-xl border-border bg-muted/50 font-bold"
                >
                  <option value="">Solicitante (Yo)</option>
                  {memberships.map((m) => (
                    <option key={m.id} value={m.id}>{m.user.nombre} {m.user.apellido} ({m.role})</option>
                  ))}
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting || !solicitudForm.productoId}
                className="w-full h-12 rounded-2xl bg-primary font-black uppercase tracking-widest text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Solicitud"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
