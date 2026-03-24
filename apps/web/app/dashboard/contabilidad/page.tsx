"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { authClient } from "@/lib/api/auth-client";
import { contabilidadClient } from "@/lib/api/contabilidad-client";
import { tenantsClient } from "@/lib/api/tenants-client";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, DatePicker } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-shadcn";
import { 
  type TechnicianRecaudo
} from "@/lib/api/contabilidad-client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es as _es } from "date-fns/locale";
import { CheckCircle, Loader2, FileUp, AlertCircle } from "lucide-react";
import {
  formatBogotaDate,
  pickerDateToYmd,
  toBogotaYmd,
  ymdToPickerDate,
} from "@/utils/date-utils";

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
        return <section id="nomina"><StandardTableView type="nomina" title="Gestión de Nómina" description="Administración de pagos y prestaciones de empleados." /></section>;
      case "anticipos":
        return <section id="anticipos"><StandardTableView type="anticipos" title="Control de Anticipos" description="Registro de adelantos entregados a personal técnico." /></section>;
      case "egresos":
        return <section id="egresos"><StandardTableView type="egresos" title="Egresos Generales" description="Control de gastos operativos, insumos y mantenimiento." /></section>;
      case "balance":
        return <section id="balance"><BalanceView /></section>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 bg-background">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black tracking-tighter text-foreground">
            Contabilidad & Finanzas
          </h1>
          <p className="text-muted-foreground font-medium italic">
            Gestión integral de flujos de caja, nómina y balances operativos.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-3 p-2 bg-card rounded-[2rem] shadow-xl shadow-zinc-200/50 dark:shadow-none border border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as AccountingTab)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-foreground text-background shadow-lg scale-105" 
                  : "text-muted-foreground hover:bg-muted"
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

// --- sub-views ---

interface Movement {
  id: string;
  createdAt?: string;
  fechaGeneracion?: string;
  monto?: number;
  totalPagar?: number;
  titulo?: string;
  razon?: string;
  membership?: { user: { nombre: string; apellido: string } };
  estado?: string;
  categoria?: string;
}

interface Membership {
  id: string;
  role: string;
  user: {
    nombre: string;
    apellido: string;
  };
}

function StandardTableView({ title, description, type }: { title: string, description: string, type: 'egresos' | 'nomina' | 'anticipos' }) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<Membership[]>([]);

  const getCategoryColor = (cat: string) => {
    const category = (cat || "GENERAL").toUpperCase();
    switch (category) {
      case "INSUMOS":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "MARKETING":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "OPERATIVO":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "SERVICIOS_PUBLICOS":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
    }
  };

  const [formData, setFormData] = useState({
    titulo: "",
    monto: "",
    razon: "",
    categoria: "GENERAL",
    membershipId: "none",
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const empresaId = localStorage.getItem("current-enterprise-id") || undefined;
      let result: unknown[] = [];
      if (type === 'egresos') result = await contabilidadClient.getEgresos(empresaId);
      else if (type === 'nomina') result = await contabilidadClient.getNominas(empresaId);
      else if (type === 'anticipos') result = await contabilidadClient.getAnticipos(empresaId);
      setData(result);
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
      toast.error(`Error al cargar ${title}`);
    } finally {
      setLoading(false);
    }
  }, [type, title]);

  const fetchMembers = React.useCallback(async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}") as { tenantId?: string };
      const profile = await authClient.getProfile();
      const tenantId = profile?.tenantId || storedUser.tenantId;
      if (!tenantId) {
        setMembers([]);
        return;
      }
      const res = await tenantsClient.getMemberships(tenantId);
      if (!res || res.length === 0) {
        console.warn("No members found or error in tenantsClient.getMemberships");
      }
      setMembers(res || []);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Error al cargar la lista de responsables");
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (type === 'egresos' || type === 'anticipos') fetchMembers();
  }, [type, fetchData, fetchMembers]);

  const handleCreateRecord = async () => {
    if ((type === 'egresos' && !formData.titulo) || !formData.monto || (type === 'anticipos' && formData.membershipId === 'none')) {
      toast.error("Complete los campos obligatorios");
      return;
    }

    setIsSaving(true);
    try {
      const empresaId = localStorage.getItem("current-enterprise-id");
      if (!empresaId) throw new Error("No enterprise selected");

      if (type === 'egresos') {
        await contabilidadClient.crearEgreso({
          titulo: formData.titulo,
          monto: Number(formData.monto),
          razon: formData.razon,
          categoria: formData.categoria,
          membershipId: formData.membershipId === 'none' ? undefined : formData.membershipId,
          empresaId,
        });
        toast.success("Egreso registrado exitosamente");
        setIsModalOpen(false);
        setFormData({ titulo: "", monto: "", razon: "", categoria: "GENERAL", membershipId: "none" });
        fetchData();
      } else if (type === 'anticipos') {
        await contabilidadClient.crearAnticipo({
          membershipId: formData.membershipId,
          monto: Number(formData.monto),
          razon: formData.razon || "Anticipo de personal",
          empresaId,
        });
        toast.success("Anticipo registrado exitosamente");
        setIsModalOpen(false);
        setFormData({ titulo: "", monto: "", razon: "", categoria: "GENERAL", membershipId: "none" });
        fetchData();
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Error al procesar el registro");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (formatType: 'pdf' | 'excel' | 'word') => {
    const headers = [
      "Fecha", 
      "Descripción", 
      ...(type === 'egresos' ? ["Categoría"] : []),
      "Responsable", 
      "Monto", 
      "Estado"
    ];

    const exportData = data.map(d => {
      const item = d as Movement;
      const fecha = item.createdAt || item.fechaGeneracion || new Date();
      const monto = item.monto || item.totalPagar || 0;
      const desc = item.titulo || item.razon || `Registro #${item.id.slice(0, 8)}`;
      const resp = item.membership?.user ? `${item.membership.user.nombre} ${item.membership.user.apellido}` : "N/A";
      const est = item.estado || "Completado";

      return [
        format(new Date(fecha), "dd/MM/yyyy"),
        desc,
        ...(type === 'egresos' ? [item.categoria || "GENERAL"] : []),
        resp,
        `$ ${Number(monto).toLocaleString()}`,
        est
      ];
    });

    const exportParams = {
      headers,
      data: exportData,
      filename: `contabilidad_${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}`,
      title: `REPORTE FINANCIERO: ${title.toUpperCase()}`
    };

    toast.info(`Generando reporte de ${title} en formato ${formatType.toUpperCase()}...`);
    
    try {
      if (formatType === 'excel') exportToExcel(exportParams);
      else if (formatType === 'pdf') exportToPDF(exportParams);
      else if (formatType === 'word') await exportToWord(exportParams);

      toast.success(`${formatType.toUpperCase()} generado exitosamente`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Error al generar el reporte ${formatType.toUpperCase()}`);
    } finally {
      setShowExportMenu(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground font-medium">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center h-11 px-5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 gap-3 transition-all font-bold text-[10px] uppercase tracking-widest border border-emerald-500/20 shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 mb-1 border-b border-border">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Informes Financieros</p>
                </div>
                <button 
                  onClick={() => handleExport('excel')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-foreground hover:bg-muted transition-colors text-left"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  MICROSOFT EXCEL (.XLSX)
                </button>
                <button 
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-foreground hover:bg-muted transition-colors text-left"
                >
                  <FileText className="h-4 w-4" />
                  DOCUMENTO PDF (.PDF)
                </button>
                <button 
                  onClick={() => handleExport('word')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-foreground hover:bg-muted transition-colors text-left"
                >
                  <FileIcon className="h-4 w-4" />
                  MICROSOFT WORD (.DOCX)
                </button>
              </div>
            )}
          </div>

          <Button onClick={fetchData} variant="outline" className="h-11 rounded-xl gap-2 font-bold text-xs uppercase tracking-widest border-border bg-card">
            <Loader2 className={cn("h-4 w-4", loading && "animate-spin")} /> Refrescar
          </Button>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="h-11 rounded-xl bg-[#01ADFB] text-white hover:bg-blue-700 gap-2 font-black text-xs uppercase tracking-widest px-6 shadow-xl shadow-[#01ADFB]/20 border-none"
          >
            <Plus className="h-4 w-4" /> Nuevo Registro
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-card rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Fecha</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Descripción</th>
                  {type === 'egresos' && (
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Categoría</th>
                  )}
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Responsable</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Monto</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={type === 'egresos' ? 6 : 5} className="px-8 py-5 h-16 bg-muted/20"></td>
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={type === 'egresos' ? 6 : 5} className="px-8 py-20 text-center">
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No hay registros encontrados.</p>
                    </td>
                  </tr>
                ) : (
                  data.map((d) => {
                    const item = d as Movement;
                    const fecha = item.createdAt || item.fechaGeneracion || new Date();
                    const monto = item.monto || item.totalPagar || 0;
                    const desc = item.titulo || item.razon || `ID: ${item.id.slice(0, 8)}`;
                    const resp = item.membership?.user ? `${item.membership.user.nombre} ${item.membership.user.apellido}` : "N/A";
                    const est = item.estado || "Completado";

                    return (
                      <tr key={item.id} className="group hover:bg-muted/50 transition-colors">
                        <td className="px-8 py-5 text-sm font-bold text-muted-foreground">
                          {format(new Date(fecha), "dd/MM/yyyy")}
                        </td>
                        <td className="px-8 py-5 font-black text-foreground uppercase tracking-tighter">
                          {desc}
                        </td>
                        {type === 'egresos' && (
                          <td className="px-8 py-5">
                            <span className={cn(
                              "px-3 py-1 rounded-lg text-[9px] font-black uppercase border",
                              getCategoryColor(item.categoria || "GENERAL")
                            )}>
                              {item.categoria || "GENERAL"}
                            </span>
                          </td>
                        )}
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 rounded-lg bg-muted text-[10px] font-black uppercase border border-border">
                            {resp}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-foreground tabular-nums text-lg">
                          $ {Number(monto).toLocaleString()}
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex justify-center">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[9px] font-black uppercase border",
                              est === 'BORRADOR' || est === 'PENDIENTE' 
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            )}>
                              {est}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-foreground">
              <Plus className="h-6 w-6 text-blue-500" /> Nuevo Registro: {title}
            </DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">
              Complete los detalles para registrar este movimiento contable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {type === 'egresos' && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Título / Concepto <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    placeholder="Ej: Pago de Arriendo"
                    className="h-12 rounded-xl border-border bg-muted text-foreground font-bold"
                  />
                </div>
              )}
              <div className={cn("space-y-2", type === 'anticipos' && "sm:col-span-2")}>
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monto ($) <span className="text-red-500">*</span></Label>
                <Input 
                  type="number"
                  value={formData.monto}
                  onChange={(e) => setFormData({...formData, monto: e.target.value})}
                  placeholder="0.00"
                  className="h-12 rounded-xl border-border bg-muted text-foreground font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {type === 'egresos' && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Categoría</Label>
                  <Select 
                    value={formData.categoria}
                    onValueChange={(val) => setFormData({...formData, categoria: val})}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-border bg-muted text-foreground font-bold">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General</SelectItem>
                      <SelectItem value="INSUMOS">Insumos</SelectItem>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="OPERATIVO">Operativo</SelectItem>
                      <SelectItem value="SERVICIOS_PUBLICOS">Servicios Públicos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={cn("space-y-2", type === 'anticipos' && "sm:col-span-2")}>
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Responsable <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.membershipId}
                  onValueChange={(val) => setFormData({...formData, membershipId: val})}
                >
                  <SelectTrigger className="h-12 rounded-xl border-border bg-muted text-foreground font-bold">
                    <SelectValue placeholder="Seleccionar responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    {type === 'egresos' && <SelectItem value="none">Ninguno</SelectItem>}
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.user.nombre} {m.user.apellido} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {type === 'egresos' ? "Descripción o Razón" : "Concepto del Anticipo"}
              </Label>
              <textarea 
                value={formData.razon}
                onChange={(e) => setFormData({...formData, razon: e.target.value})}
                className="w-full min-h-[100px] p-4 rounded-2xl border border-border bg-muted text-sm font-medium text-foreground focus:ring-2 focus:ring-[#01ADFB] outline-none transition-all"
                placeholder={type === 'egresos' ? "Detalles adicionales del gasto..." : "Ej: Viáticos para comisión en Cali"}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] border-border bg-background"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 h-12 rounded-xl bg-[#01ADFB] hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-[#01ADFB]/20"
                onClick={handleCreateRecord}
                disabled={isSaving || (type === 'egresos' && !formData.titulo) || !formData.monto || (type === 'anticipos' && formData.membershipId === 'none')}
              >
                {isSaving ? "Guardando..." : "Registrar Movimiento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



function RecaudoView() {
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<TechnicianRecaudo[]>([]);
  const [selectedTech, setSelectedTech] = useState<TechnicianRecaudo | null>(null);
  const [selectedOrdenIds, setSelectedOrdenIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    referenciaBanco: "",
    fechaConsignacion: toBogotaYmd(),
    observacion: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const empresaId = localStorage.getItem("current-enterprise-id") || undefined;
      const data = await contabilidadClient.getRecaudoTecnicos(empresaId);
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

  const handleOpenModal = (tech: TechnicianRecaudo) => {
    setSelectedTech(tech);
    setSelectedOrdenIds(tech.ordenesIds); // Por defecto seleccionamos todas
    setComprobanteFile(null);
    setFormData({
      referenciaBanco: "",
      fechaConsignacion: toBogotaYmd(),
      observacion: "",
    });
    setIsModalOpen(true);
  };

  const toggleOrdenSelection = (id: string) => {
    setSelectedOrdenIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const totalSeleccionado = useMemo(() => {
    if (!selectedTech) return 0;
    return selectedTech.declaraciones
      .filter(d => selectedOrdenIds.includes(d.ordenId))
      .reduce((sum, d) => sum + d.valorDeclarado, 0);
  }, [selectedTech, selectedOrdenIds]);

  const handleRegisterConsignacion = async () => {
    if (!selectedTech || !formData.referenciaBanco || !comprobanteFile) {
      toast.error("Por favor complete los campos obligatorios");
      return;
    }

    if (selectedOrdenIds.length === 0) {
      toast.error("Debe seleccionar al menos una orden para conciliar");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Registrando consignación...");

    try {
      const empresaId = localStorage.getItem("current-enterprise-id");
      if (!empresaId) throw new Error("No enterprise selected");

      const formPayload = new FormData();
      formPayload.append("tecnicoId", selectedTech.id);
      formPayload.append("empresaId", empresaId);
      formPayload.append("valorConsignado", totalSeleccionado.toString());
      formPayload.append("referenciaBanco", formData.referenciaBanco);
      formPayload.append("ordenIds", JSON.stringify(selectedOrdenIds));
      formPayload.append("fechaConsignacion", formData.fechaConsignacion);
      if (formData.observacion) {
        formPayload.append("observacion", formData.observacion);
      }
      formPayload.append("comprobanteFile", comprobanteFile);

      await contabilidadClient.registrarConsignacion(formPayload);
      toast.success("Consignación registrada y conciliada exitosamente", { id: toastId });
      setIsModalOpen(false);
      fetchData();
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
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase tracking-tight">Recaudo en Efectivo</h2>
          <p className="text-sm text-muted-foreground font-medium">Conciliación de dinero físico entregado por los técnicos.</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="h-11 rounded-xl gap-2 font-bold text-xs uppercase tracking-widest border-border bg-card">
          Refrescar Datos
        </Button>
      </div>

      <Card className="border-border shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-card rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-b border-border">
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Técnico</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Saldo Pendiente</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Órdenes</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Última Transferencia</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estado</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3].map(i => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="px-8 py-10 text-center">
                        <div className="flex justify-center items-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-[#01ADFB]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cargando balances...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : technicians.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <AlertCircle className="h-12 w-12 text-muted/30" />
                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No hay recaudos pendientes de conciliación.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  technicians.map((tech) => (
                    <TableRow key={tech.id} className="group hover:bg-muted transition-colors">
                      <TableCell className="px-8 py-6 font-black text-foreground uppercase tracking-tight">
                        {tech.nombre} {tech.apellido}
                      </TableCell>
                      <TableCell className="px-8 py-6 text-center">
                        <span className={cn(
                          "text-base font-black tabular-nums",
                          tech.saldoPendiente > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/30"
                        )}>
                          $ {tech.saldoPendiente.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="px-8 py-6 text-center">
                        {tech.ordenesPendientesCount > 0 ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-[#01ADFB] border-[#01ADFB]/20 font-black text-[10px]">
                            {tech.ordenesPendientesCount} PENDIENTES
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/30 text-[10px] font-black">--</span>
                        )}
                      </TableCell>
                      <TableCell className="px-8 py-6 text-xs font-bold text-muted-foreground">
                        {tech.ultimaTransferencia 
                          ? formatBogotaDate(tech.ultimaTransferencia, "es-CO")
                          : "PRIMER RECAUDO"
                        }
                      </TableCell>
                      <TableCell className="px-8 py-6">
                        {tech.diasSinTransferir > 7 && tech.saldoPendiente > 0 ? (
                          <Badge variant="destructive" className="bg-destructive/10 text-destructive font-black text-[9px] uppercase tracking-tighter">
                            {tech.diasSinTransferir} DÍAS ATRASADO
                          </Badge>
                        ) : tech.saldoPendiente === 0 ? (
                          <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                            <CheckCircle className="h-3 w-3 mr-2" /> AL DÍA
                          </div>
                        ) : (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground font-black text-[9px]">
                            NORMAL ({tech.diasSinTransferir} DÍAS)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-8 py-6 text-right">
                        <Button 
                          size="sm" 
                          className="h-10 px-6 rounded-xl bg-[#01ADFB] hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#01ADFB]/20 border-none"
                          onClick={() => handleOpenModal(tech)}
                          disabled={tech.saldoPendiente <= 0}
                        >
                          Gestionar Conciliación
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
        <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-foreground">
              <Coins className="h-6 w-6 text-emerald-500" /> Conciliación de Efectivo
            </DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">
              Seleccione las órdenes y legalice el dinero físico reportado.
            </DialogDescription>
          </DialogHeader>

          {selectedTech && (
            <div className="space-y-6 mt-4">
              <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Responsable</p>
                  <p className="text-lg font-black text-foreground uppercase">{selectedTech.nombre} {selectedTech.apellido}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Monto Seleccionado</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    $ {totalSeleccionado.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">
                    {selectedOrdenIds.length} de {selectedTech.ordenesPendientesCount} órdenes
                  </p>
                </div>
              </div>

              {/* Listado de Órdenes Seleccionables */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Órdenes Pendientes de Conciliación</Label>
                <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border bg-muted/20 max-h-48 overflow-y-auto custom-scrollbar">
                  {selectedTech.declaraciones.map((d) => (
                    <div 
                      key={d.ordenId} 
                      className={cn(
                        "flex items-center justify-between p-4 cursor-pointer transition-colors",
                        selectedOrdenIds.includes(d.ordenId) ? "bg-emerald-500/5" : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleOrdenSelection(d.ordenId)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center transition-all",
                          selectedOrdenIds.includes(d.ordenId) ? "bg-[#01ADFB] border-[#01ADFB] text-white" : "border-muted-foreground/30 bg-background"
                        )}>
                          {selectedOrdenIds.includes(d.ordenId) && <CheckCircle className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-foreground">ORDEN #{d.ordenId.substring(0, 8).toUpperCase()}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{formatBogotaDate(d.fechaDeclaracion)}</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-foreground">$ {d.valorDeclarado.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Referencia de Banco <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.referenciaBanco}
                    onChange={(e) => setFormData({...formData, referenciaBanco: e.target.value})}
                    placeholder="Nº de transferencia"
                    className="h-12 rounded-xl border-border bg-muted text-foreground font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha de Consignación <span className="text-red-500">*</span></Label>
                  <DatePicker 
                    date={formData.fechaConsignacion ? ymdToPickerDate(formData.fechaConsignacion) : undefined}
                    onChange={(d) => setFormData({...formData, fechaConsignacion: pickerDateToYmd(d)})}
                    className="h-12 border-border bg-muted w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comprobante de Consignación <span className="text-red-500">*</span></Label>
                <div 
                  onClick={() => document.getElementById('comprobante-recaudo-upload')?.click()}
                  className="h-24 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors"
                >
                  <FileUp className="h-6 w-6 text-muted-foreground mb-2" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 text-center truncate w-full">
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Observaciones (Opcional)</Label>
                <textarea 
                  value={formData.observacion}
                  onChange={(e) => setFormData({...formData, observacion: e.target.value})}
                  className="w-full min-h-[100px] p-4 rounded-2xl border border-border bg-muted text-sm font-medium text-foreground focus:ring-2 focus:ring-[#01ADFB] outline-none transition-all"
                  placeholder="Notas sobre el cierre de caja..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] border-border bg-background"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 h-12 rounded-xl bg-[#01ADFB] hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-[#01ADFB]/20"
                  onClick={handleRegisterConsignacion}
                  disabled={isSaving || !formData.referenciaBanco || !comprobanteFile || selectedOrdenIds.length === 0}
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
  const [balance, setBalance] = useState<{
    ingresos: { total: number; change: number };
    egresos: { total: number; change: number };
    utilidad: { total: number; change: number };
    categorias: { label: string; value: number; color: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      setLoading(true);
      const empresaId = localStorage.getItem("current-enterprise-id") || undefined;
      const data = await contabilidadClient.getBalance(empresaId);
      setBalance(data);
      setLoading(false);
    };
    fetchBalance();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border shadow-2xl bg-card rounded-[2.5rem]">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className={cn(
                "text-[10px] font-black px-2 py-1 rounded-lg",
                (balance?.ingresos.change || 0) >= 0 ? "text-emerald-600 bg-emerald-500/10" : "text-destructive bg-destructive/10"
              )}>
                {(balance?.ingresos.change || 0) >= 0 ? "+" : ""}{balance?.ingresos.change}%
              </span>
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ingresos Totales</p>
            <h3 className="text-3xl font-black tracking-tighter mt-1 text-foreground">
              $ {balance?.ingresos.total.toLocaleString() || "0"}
            </h3>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xl bg-card rounded-[2.5rem]">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                <TrendingDown className="h-6 w-6" />
              </div>
              <span className={cn(
                "text-[10px] font-black px-2 py-1 rounded-lg",
                (balance?.egresos.change || 0) <= 0 ? "text-emerald-600 bg-emerald-500/10" : "text-destructive bg-destructive/10"
              )}>
                {(balance?.egresos.change || 0) >= 0 ? "+" : ""}{balance?.egresos.change}%
              </span>
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Egresos Totales</p>
            <h3 className="text-3xl font-black tracking-tighter mt-1 text-foreground">
              $ {balance?.egresos.total.toLocaleString() || "0"}
            </h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl bg-foreground text-background rounded-[2.5rem]">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-background/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-background" />
              </div>
            </div>
            <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">Utilidad Neta</p>
            <h3 className="text-3xl font-black tracking-tighter mt-1">
              $ {balance?.utilidad.total.toLocaleString() || "0"}
            </h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-border shadow-2xl bg-card rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="text-xl font-black flex items-center gap-3 text-foreground">
              <div className="h-2 w-2 rounded-full bg-[#01ADFB]" />
              Flujo de Caja Mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Visualización de Gráfico — Prototipo</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xl bg-card rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="text-xl font-black text-foreground">Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(balance?.categorias || []).map((cat) => (
              <div key={cat.label} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{cat.label}</span>
                  <span className="text-xs font-black text-foreground">{cat.value}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
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
