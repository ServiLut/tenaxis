"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button
} from "@/components/ui";
import { 
  Wallet, 
  Users, 
  Coins, 
  ArrowUpCircle, 
  Scale, 
  Plus, 
  Filter,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  File as FileIcon
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { toast } from "sonner";
import { 
  getRecaudoTecnicosAction, 
  registrarConsignacionAction 
} from "../actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Skeleton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Loader2, FileUp, AlertCircle } from "lucide-react";
import { uploadFile } from "@/lib/supabase-storage";

type AccountingTab = "recaudo" | "nomina" | "anticipos" | "egresos" | "balance";

export default function ContabilidadPage() {
  const [activeTab, setActiveTab] = useState<AccountingTab>("balance");

  // Sync tab with URL Hash (Read)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "") as AccountingTab;
      if (["recaudo", "nomina", "anticipos", "egresos", "balance"].includes(hash)) {
        setActiveTab(hash);
      }
    };

    handleHashChange(); // Initial load
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Sync state to URL Hash (Write)
  useEffect(() => {
    if (window.location.hash.replace("#", "") !== activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  const handleTabChange = (tabId: AccountingTab) => {
    setActiveTab(tabId);
  };

  const tabs = [
    { id: "recaudo", label: "Recaudo efectivo", icon: Wallet, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" },
    { id: "nomina", label: "Nómina", icon: Users, color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10" },
    { id: "anticipos", label: "Anticipos", icon: Coins, color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
    { id: "egresos", label: "Egresos", icon: ArrowUpCircle, color: "text-red-500 bg-red-50 dark:bg-red-500/10" },
    { id: "balance", label: "Balance", icon: Scale, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "recaudo":
        return <section id="recaudo"><RecaudoView /></section>;
      case "nomina":
        return <section id="nomina"><StandardTableView title="Gestión de Nómina" description="Administración de pagos y prestaciones de empleados." /></section>;
      case "anticipos":
        return <section id="anticipos"><StandardTableView title="Control de Anticipos" description="Registro de adelantos entregados a personal técnico." /></section>;
      case "egresos":
        return <section id="egresos"><StandardTableView title="Egresos Generales" description="Control de gastos operativos, insumos y mantenimiento." /></section>;
      case "balance":
        return <section id="balance"><BalanceView /></section>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
            Contabilidad & Finanzas
          </h1>
          <p className="text-zinc-500 font-medium italic">
            Gestión integral de flujos de caja, nómina y balances operativos.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-3 p-2 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as AccountingTab)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-200 shadow-lg scale-105" 
                  : "text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <tab.icon className={cn("h-5 w-5", activeTab !== tab.id && tab.color.split(" ")[0])} />
              <span className="text-[11px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Content */}
        <div className="transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
          {renderContent()}
        </div>
      </div>
    </DashboardLayout>
  );
}

import { exportToExcel, exportToPDF, exportToWord } from "@/lib/utils/export-helper";

// ... (previous interfaces and Page logic)

// --- sub-views ---

function StandardTableView({ title, description }: { title: string, description: string }) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Example mock data for export (since we don't have real data state here yet)
  const mockData = [1, 2, 3, 4, 5].map(i => ({
    fecha: "19/02/2026",
    descripcion: `Ejemplo de transacción #${i}04`,
    categoria: "Operativo",
    monto: 1250000,
    estado: "Completado"
  }));

  const handleExport = async (format: 'pdf' | 'excel' | 'word') => {
    const headers = ["Fecha", "Descripción", "Categoría", "Monto", "Estado"];
    const data = mockData.map(d => [
      d.fecha,
      d.descripcion,
      d.categoria,
      `$ ${d.monto.toLocaleString()}`,
      d.estado
    ]);

    const exportParams = {
      headers,
      data,
      filename: `contabilidad_${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}`,
      title: `REPORTE FINANCIERO: ${title.toUpperCase()}`
    };

    toast.info(`Generando reporte de ${title} en formato ${format.toUpperCase()}...`);
    
    try {
      if (format === 'excel') exportToExcel(exportParams);
      else if (format === 'pdf') exportToPDF(exportParams);
      else if (format === 'word') await exportToWord(exportParams);

      toast.success(`${format.toUpperCase()} generado exitosamente`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Error al generar el reporte ${format.toUpperCase()}`);
    } finally {
      setShowExportMenu(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{title}</h2>
          <p className="text-sm text-zinc-500 font-medium">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Botón de Exportación */}
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center h-11 px-5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 gap-3 transition-all font-bold text-[10px] uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20 shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 mb-1 border-b border-zinc-50 dark:border-zinc-800">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Informes Financieros</p>
                </div>
                <button 
                  onClick={() => handleExport('excel')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  MICROSOFT EXCEL (.XLSX)
                </button>
                <button 
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors text-left"
                >
                  <FileText className="h-4 w-4" />
                  DOCUMENTO PDF (.PDF)
                </button>
                <button 
                  onClick={() => handleExport('word')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                >
                  <FileIcon className="h-4 w-4" />
                  MICROSOFT WORD (.DOCX)
                </button>
              </div>
            )}
          </div>

          <Button variant="outline" className="h-11 rounded-xl gap-2 font-bold text-xs uppercase tracking-widest">
            <Filter className="h-4 w-4" /> Filtrar
          </Button>
          <Button className="h-11 rounded-xl bg-azul-1 dark:bg-azul-1 text-white dark:text-zinc-300 hover:bg-azul-1/90 dark:hover:bg-azul-1/90 gap-2 font-black text-xs uppercase tracking-widest px-6 shadow-xl shadow-azul-1/20 border-none">
            <Plus className="h-4 w-4" /> Nuevo Registro
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Fecha</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Descripción</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Categoría</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Monto</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-zinc-500">19/02/2026</td>
                    <td className="px-8 py-5 font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">Ejemplo de transacción #{i}04</td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase">Operativo</span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
                      $ 1,250,000
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center">
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 text-[9px] font-black uppercase">Completado</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecaudoView() {
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTech, setSelectedTech] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    referenciaBanco: "",
    fechaConsignacion: new Date().toISOString().split('T')[0],
    observacion: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const empresaId = localStorage.getItem("current-enterprise-id") || undefined;
      const data = await getRecaudoTecnicosAction(empresaId);
      setTechnicians(data);
    } catch (error) {
      console.error("Error loading recaudo data:", error);
      toast.error("Error al cargar datos de recaudo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (tech: any) => {
    setSelectedTech(tech);
    setComprobanteFile(null);
    setFormData({
      referenciaBanco: "",
      fechaConsignacion: new Date().toISOString().split('T')[0],
      observacion: "",
    });
    setIsModalOpen(true);
  };

  const handleRegisterConsignacion = async () => {
    if (!selectedTech || !formData.referenciaBanco || !comprobanteFile) {
      toast.error("Por favor complete los campos obligatorios");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Registrando consignación...");

    try {
      // 1. Subir comprobante
      const { fileId } = await uploadFile(comprobanteFile, 'comprobanteOrdenServicio' as any);

      // 2. Registrar en API
      const empresaId = localStorage.getItem("current-enterprise-id");
      if (!empresaId) throw new Error("No enterprise selected");

      const res = await registrarConsignacionAction({
        tecnicoId: selectedTech.id,
        empresaId,
        valorConsignado: selectedTech.saldoPendiente,
        referenciaBanco: formData.referenciaBanco,
        comprobantePath: fileId,
        ordenIds: selectedTech.ordenesIds,
        fechaConsignacion: formData.fechaConsignacion,
        observacion: formData.observacion,
      });

      if (res.success) {
        toast.success("Consignación registrada y conciliada exitosamente", { id: toastId });
        setIsModalOpen(false);
        fetchData();
      } else {
        toast.error(res.error || "Error al registrar", { id: toastId });
      }
    } catch (error) {
      console.error("Consignation error:", error);
      toast.error("Error al procesar el registro", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">Recaudo en Efectivo</h2>
          <p className="text-sm text-zinc-500 font-medium">Conciliación de dinero físico entregado por los técnicos.</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="h-11 rounded-xl gap-2 font-bold text-xs uppercase tracking-widest">
          Refrescar Datos
        </Button>
      </div>

      <Card className="border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50 dark:bg-zinc-800/50">
                <TableRow className="border-b border-zinc-100 dark:border-zinc-800">
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Técnico</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Saldo Pendiente</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Órdenes</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Última Transferencia</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Estado</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3].map(i => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="px-8 py-10 text-center">
                        <div className="flex justify-center items-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-azul-1" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cargando balances...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : technicians.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <AlertCircle className="h-12 w-12 text-zinc-200" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No hay recaudos pendientes de conciliación.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  technicians.map((tech) => (
                    <TableRow key={tech.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <TableCell className="px-8 py-6 font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                        {tech.nombre} {tech.apellido}
                      </TableCell>
                      <TableCell className="px-8 py-6 text-center">
                        <span className={cn(
                          "text-base font-black tabular-nums",
                          tech.saldoPendiente > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-300"
                        )}>
                          $ {tech.saldoPendiente.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="px-8 py-6 text-center">
                        {tech.ordenesPendientesCount > 0 ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 font-black text-[10px]">
                            {tech.ordenesPendientesCount} PENDIENTES
                          </Badge>
                        ) : (
                          <span className="text-zinc-300 text-[10px] font-black">--</span>
                        )}
                      </TableCell>
                      <TableCell className="px-8 py-6 text-xs font-bold text-zinc-500">
                        {tech.ultimaTransferencia 
                          ? format(new Date(tech.ultimaTransferencia), "d 'de' MMM, yyyy", { locale: es })
                          : "PRIMER RECAUDO"
                        }
                      </TableCell>
                      <TableCell className="px-8 py-6">
                        {tech.diasSinTransferir > 7 && tech.saldoPendiente > 0 ? (
                          <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-black text-[9px] uppercase tracking-tighter">
                            {tech.diasSinTransferir} DÍAS ATRASADO
                          </Badge>
                        ) : tech.saldoPendiente === 0 ? (
                          <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                            <CheckCircle className="h-3 w-3 mr-2" /> AL DÍA
                          </div>
                        ) : (
                          <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 font-black text-[9px]">
                            NORMAL ({tech.diasSinTransferir} DÍAS)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-8 py-6 text-right">
                        <Button 
                          size="sm" 
                          className="h-10 px-6 rounded-xl bg-azul-1 dark:bg-azul-1 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-azul-1/20 border-none"
                          onClick={() => handleOpenModal(tech)}
                          disabled={tech.saldoPendiente <= 0}
                        >
                          Registrar Consignación
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Coins className="h-6 w-6 text-emerald-500" /> Conciliación de Efectivo
            </DialogTitle>
            <DialogDescription className="font-medium">
              Legalice el dinero físico reportado por el técnico.
            </DialogDescription>
          </DialogHeader>

          {selectedTech && (
            <div className="space-y-6 mt-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-emerald-600/70 dark:text-emerald-400 uppercase tracking-widest mb-1">Responsable</p>
                  <p className="text-lg font-black text-emerald-900 dark:text-emerald-50 uppercase">{selectedTech.nombre} {selectedTech.apellido}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-600/70 dark:text-emerald-400 uppercase tracking-widest mb-1">Monto a Conciliar</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    $ {selectedTech.saldoPendiente.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Referencia de Banco <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.referenciaBanco}
                    onChange={(e) => setFormData({...formData, referenciaBanco: e.target.value})}
                    placeholder="Nº de transferencia"
                    className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fecha de Consignación <span className="text-red-500">*</span></Label>
                  <Input 
                    type="date"
                    value={formData.fechaConsignacion}
                    onChange={(e) => setFormData({...formData, fechaConsignacion: e.target.value})}
                    className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Comprobante de Consignación <span className="text-red-500">*</span></Label>
                <div 
                  onClick={() => document.getElementById('comprobante-recaudo-upload')?.click()}
                  className="h-24 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <FileUp className="h-6 w-6 text-zinc-400 mb-2" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-4 text-center truncate w-full">
                    {comprobanteFile ? comprobanteFile.name : "Subir foto de la transferencia única"}
                  </span>
                  <input 
                    id="comprobante-recaudo-upload"
                    type="file" 
                    className="hidden" 
                    onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                    accept="image/*,application/pdf"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Observaciones (Opcional)</Label>
                <textarea 
                  value={formData.observacion}
                  onChange={(e) => setFormData({...formData, observacion: e.target.value})}
                  className="w-full min-h-[100px] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm font-medium focus:ring-2 focus:ring-azul-1 outline-none transition-all"
                  placeholder="Notas sobre el cierre de caja..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 h-12 rounded-xl bg-azul-1 dark:bg-azul-1 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-azul-1/20"
                  onClick={handleRegisterConsignacion}
                  disabled={isSaving || !formData.referenciaBanco || !comprobanteFile}
                >
                  {isSaving ? "Procesando..." : "Confirmar Conciliación"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BalanceView() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-2xl bg-white dark:bg-zinc-900 rounded-[2.5rem]">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+12.5%</span>
            </div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ingresos Totales</p>
            <h3 className="text-3xl font-black tracking-tighter mt-1">$ 45,250,000</h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl bg-white dark:bg-zinc-900 rounded-[2.5rem]">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600">
                <TrendingDown className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg">-4.3%</span>
            </div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Egresos Totales</p>
            <h3 className="text-3xl font-black tracking-tighter mt-1">$ 12,840,000</h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl bg-zinc-900 dark:bg-zinc-950 text-white dark:text-zinc-200 rounded-[2.5rem] border dark:border-zinc-800">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 dark:bg-zinc-800/50 flex items-center justify-center">
                <DollarSign className="h-6 w-6 dark:text-zinc-200" />
              </div>
            </div>
            <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-300 uppercase tracking-widest">Utilidad Neta</p>
            <h3 className="text-3xl font-black tracking-tighter mt-1">$ 32,410,000</h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-2xl bg-white dark:bg-zinc-900 rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Flujo de Caja Mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Visualización de Gráfico — Prototipo</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl bg-white dark:bg-zinc-900 rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="text-xl font-black">Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { label: "Nómina", value: 65, color: "bg-blue-500" },
              { label: "Insumos", value: 20, color: "bg-amber-500" },
              { label: "Marketing", value: 10, color: "bg-emerald-500" },
              { label: "Otros", value: 5, color: "bg-zinc-400" },
            ].map((cat) => (
              <div key={cat.label} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{cat.label}</span>
                  <span className="text-xs font-black">{cat.value}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", cat.color)} style={{ width: `${cat.value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
