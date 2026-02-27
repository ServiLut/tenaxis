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
        return <section id="recaudo"><StandardTableView title="Recaudo en Efectivo" description="Seguimiento de ingresos diarios por recaudo físico." /></section>;
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
              className="flex items-center h-11 px-5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 gap-3 transition-all font-bold text-[10px] uppercase tracking-widest border border-transparent shadow-sm"
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
          <Button className="h-11 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black gap-2 font-black text-xs uppercase tracking-widest px-6 shadow-xl">
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
