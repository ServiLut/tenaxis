"use client";

import React, { useState, useEffect } from "react";
import { 
  Activity, 
  History, 
  Search, 
  Filter, 
  Download,
  CheckCircle2,
  Clock,
  RefreshCcw,
  Zap,
  AlertTriangle,
  User,
  ExternalLink,
  X,
  Monitor,
  Smartphone,
  Terminal,
  Server,
  Database,
  ShieldCheck,
  ShieldAlert,
  Eye,
  FileJson,
  ArrowRight,
  MoveRight,
  ChevronRight
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard";
import { getMonitoringSessions, getMemberLogs, getMonitoringStats, getAudits, getRecentLogs } from "./actions";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const GlassCard = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "relative overflow-hidden rounded-3xl border border-border bg-card/40 p-6 shadow-sm backdrop-blur-md transition-all duration-300",
      onClick ? "hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-95" : "cursor-default",
      className
    )}
  >
    {children}
  </div>
);

// Componente para la tabla comparativa de auditoría
function ComparisonTable({ detalles }: { detalles: any }) {
  if (!detalles) return <p className="text-muted-foreground italic p-4 text-xs">No hay datos registrados.</p>;

  const anterior = detalles.anterior || {};
  const nuevo = detalles.nuevo || {};
  
  const allKeys = Array.from(new Set([...Object.keys(anterior), ...Object.keys(nuevo)]))
    .filter(k => k !== 'id' && k !== 'empresaId');

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-muted/5">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="px-4 py-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Campo</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Valor Anterior</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground w-8 text-center"></th>
            <th className="px-4 py-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Valor Nuevo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {allKeys.map((key) => {
            const valAnt = anterior[key];
            const valNue = nuevo[key];
            const isChanged = JSON.stringify(valAnt) !== JSON.stringify(valNue);

            return (
              <tr key={key} className={cn("transition-colors", isChanged ? "bg-accent/[0.02]" : "opacity-60")}>
                <td className="px-4 py-3 font-bold text-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </td>
                <td className="px-4 py-3 font-medium text-muted-foreground italic">
                  {valAnt !== undefined ? String(valAnt) : <span className="opacity-20">-</span>}
                </td>
                <td className="px-2 py-3 text-center">
                  {isChanged && <MoveRight className="h-3 w-3 text-accent inline" />}
                </td>
                <td className={cn("px-4 py-3 font-bold", isChanged ? "text-emerald-500" : "text-muted-foreground font-medium")}>
                  {valNue !== undefined ? String(valNue) : <span className="opacity-20">-</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Modal Genérico para KPIs
function KPIModal({ 
  isOpen, 
  onClose, 
  title, 
  icon: Icon,
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  icon: any;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-foreground">{title}</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
        <div className="p-4 border-t border-border bg-muted/10 text-center">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Información en tiempo real</p>
        </div>
      </div>
    </div>
  );
}

function AuditDetailModal({ isOpen, onClose, audit }: { isOpen: boolean; onClose: () => void; audit: any }) {
  if (!isOpen || !audit) return null;
  const isSuccess = !audit.accion.includes('FAILED');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-4">
            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg", isSuccess ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
              <FileJson className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Detalles del Cambio</h2>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{audit.entidad} • #{audit.entidadId}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"><X className="h-6 w-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 bg-muted/20 rounded-3xl border border-border space-y-4">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-accent" />Resumen de Operación</h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Acción Realizada</p>
                  <p className="font-black text-foreground text-lg uppercase tracking-tight">{audit.accion.split('_')[0]}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Estado</p>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border", isSuccess ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                    {isSuccess ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                    {isSuccess ? "EXITOSA" : "FALLIDA"}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Fecha y Hora</p>
                  <p className="font-bold text-foreground text-sm">{format(new Date(audit.createdAt), "PPPPp", { locale: es })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Ubicación IP</p>
                  <p className="font-bold text-foreground text-sm">{audit.metadata?.ip || 'Desconocida'}</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-muted/20 rounded-3xl border border-border space-y-4">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-accent" />Responsable</h4>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent text-lg font-black shadow-inner">{audit.membership?.user.nombre[0]}</div>
                <div>
                  <p className="font-black text-foreground uppercase text-sm">{audit.membership?.user.nombre} {audit.membership?.user.apellido}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">@{audit.membership?.username}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-accent" />Comparativa de Datos</h4>
            <ComparisonTable detalles={audit.detalles} />
          </div>
        </div>
        <div className="p-6 border-t border-border bg-muted/10">
          <Button onClick={onClose} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-foreground text-background hover:opacity-90 transition-all">Cerrar Detalles</Button>
        </div>
      </div>
    </div>
  );
}

function LogsModal({ 
  isOpen, 
  onClose, 
  membership, 
  logs, 
  isLoading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  membership: any; 
  logs: any[]; 
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Terminal className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-foreground">
                Historial de Actividad
              </h2>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                {membership.user.nombre} {membership.user.apellido} • @{membership.username}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <RefreshCcw className="h-10 w-10 animate-spin text-accent mb-4" />
              <p className="font-black uppercase tracking-widest text-xs text-muted-foreground">Cargando registros...</p>
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log, i) => (
                <div key={log.id} className="flex gap-6 rounded-2xl border border-border p-5 transition-all hover:bg-accent/5">
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg",
                      log.tipo === 'LOGIN' ? "bg-emerald-500 shadow-emerald-500/20" :
                      log.tipo.includes('FOCO') ? "bg-amber-500 shadow-amber-500/20" :
                      log.tipo.includes('INACTIVIDAD') ? "bg-red-500 shadow-red-500/20" : "bg-blue-500 shadow-blue-500/20"
                    )}>
                      {log.tipo === 'LOGIN' ? <CheckCircle2 className="h-5 w-5" /> :
                       log.sesion.dispositivo?.toLowerCase().includes('phone') ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                    </div>
                    <div className="w-px h-full bg-border" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black uppercase tracking-tight text-foreground">
                        {log.tipo.replace(/_/g, ' ')}
                      </p>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        {format(new Date(log.createdAt), "HH:mm:ss")}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                      {log.descripcion || "Sin descripción adicional registrada."}
                    </p>
                    {log.ruta && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-accent/70">Ruta:</span>
                        <code className="text-[10px] bg-accent/5 text-accent px-2 py-0.5 rounded border border-accent/10 font-bold">
                          {log.ruta}
                        </code>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">
                      <span className="flex items-center gap-1.5">
                        <Monitor className="h-3 w-3" />
                        {log.sesion.ip}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        hace {formatDistanceToNow(new Date(log.createdAt), { locale: es })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center">
              <Activity className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="font-black uppercase tracking-widest text-xs text-muted-foreground">No hay logs para mostrar hoy.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-border bg-muted/10">
          <Button 
            onClick={onClose}
            className="w-full h-12 rounded-2xl font-black uppercase tracking-widest"
          >
            Cerrar Ventana
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MonitoreoPage() {
  const [activeTab, setActiveTab] = useState<"actividad" | "auditoria">("actividad");
  const [sessions, setSessions] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalEvents: 0, activeSessions: 0, totalInactivity: 0 });
  const [latency, setLatency] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals State
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [kpiModalType, setKpiModalType] = useState<'sessions' | 'events' | 'technicians' | null>(null);
  
  const [selectedMembership, setSelectedMembership] = useState<any>(null);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    const start = performance.now();
    try {
      if (activeTab === "actividad") {
        const [sessionsData, statsData] = await Promise.all([
          getMonitoringSessions(),
          getMonitoringStats()
        ]);
        setSessions(sessionsData);
        setStats(statsData);
      } else {
        const auditsData = await getAudits();
        setAudits(auditsData);
      }
      const end = performance.now();
      setLatency(Math.round(end - start));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenLogs = async (session: any) => {
    setSelectedMembership(session.membership);
    setIsLogsModalOpen(true);
    setIsLogsLoading(true);
    try {
      const logs = await getMemberLogs(session.membershipId);
      setUserLogs(logs);
    } catch (error) {
      console.error("Error fetching user logs:", error);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const handleOpenKpiModal = async (type: 'sessions' | 'events' | 'technicians') => {
    setKpiModalType(type);
    setIsKpiModalOpen(true);
    if (type === 'events') {
      setIsLogsLoading(true);
      try {
        const logs = await getRecentLogs();
        setRecentLogs(logs);
      } catch (error) {
        console.error("Error fetching recent logs:", error);
      } finally {
        setIsLogsLoading(false);
      }
    }
  };

  const handleOpenAudit = (audit: any) => {
    setSelectedAudit(audit);
    setIsAuditModalOpen(true);
  };

  useEffect(() => {
    fetchData();
    if (activeTab === "actividad") {
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const filteredAudits = audits.filter(audit => {
    const searchStr = searchQuery.toLowerCase();
    return (
      audit.entidad.toLowerCase().includes(searchStr) ||
      audit.accion.toLowerCase().includes(searchStr) ||
      audit.membership?.user.nombre.toLowerCase().includes(searchStr) ||
      audit.membership?.user.apellido.toLowerCase().includes(searchStr) ||
      audit.membership?.username?.toLowerCase().includes(searchStr)
    );
  });

  // Filtrado de datos para los Modales KPI
  const activeSessionsList = Array.isArray(sessions) ? sessions.filter(s => !s.fechaFin) : [];
  const activeTechniciansList = Array.isArray(sessions) ? sessions.filter(s => !s.fechaFin && s.membership?.role === "OPERADOR") : [];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-foreground lg:text-5xl">
              Monitoreo <span className="text-[#01ADFB]">Sistema</span>
            </h1>
            <p className="text-lg font-medium text-muted-foreground">
              Sigue de cerca la actividad en tiempo real y los registros de auditoría.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-12 items-center gap-2 rounded-2xl bg-card px-6 text-sm font-black uppercase tracking-widest text-muted-foreground shadow-sm border border-border transition-all hover:bg-[#01ADFB]/5 hover:text-[#01ADFB]">
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button 
              onClick={fetchData}
              className="flex h-12 items-center gap-2 rounded-2xl bg-[#01ADFB] px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
              disabled={isLoading}
            >
              <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-muted p-1.5 w-fit border border-border">
          <button
            onClick={() => setActiveTab("actividad")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300",
              activeTab === "actividad"
                ? "bg-background text-accent shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Activity className="h-4 w-4" />
            Actividad
          </button>
          <button
            onClick={() => setActiveTab("auditoria")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300",
              activeTab === "auditoria"
                ? "bg-background text-accent shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-4 w-4" />
            Auditoría
          </button>
        </div>

        {/* Content Area */}
        <div className="mt-4 space-y-8">
          {activeTab === "actividad" ? (
            <div className="space-y-10">
              {/* Stats Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 w-full">
                {[
                  { 
                    id: 'sessions',
                    title: "Sesiones Activas", 
                    value: stats.activeSessions.toString(), 
                    icon: Activity, 
                    trend: stats.activeSessions > 0 ? "En línea" : "Sin conexión",
                    color: "bg-emerald-500",
                    interactive: true
                  },
                  { 
                    id: 'events',
                    title: "Eventos hoy", 
                    value: stats.totalEvents.toLocaleString(), 
                    icon: Zap, 
                    trend: "+100%",
                    color: "bg-amber-500",
                    interactive: true
                  },
                  { 
                    id: 'technicians',
                    title: "Técnicos Online", 
                    value: activeTechniciansList.length.toString(), 
                    icon: CheckCircle2, 
                    trend: "Activos",
                    color: "bg-blue-500",
                    interactive: true
                  },
                  { 
                    id: 'latency',
                    title: "Latencia API", 
                    value: `${latency}ms`, 
                    icon: Server, 
                    trend: latency < 200 ? "Excelente" : "Lento",
                    color: "bg-purple-500",
                    interactive: false
                  },
                ].map((stat, i) => (
                  <GlassCard 
                    key={i} 
                    className={cn("group transition-all", stat.interactive && "hover:shadow-[#01ADFB]/10")}
                    onClick={stat.interactive ? () => handleOpenKpiModal(stat.id as any) : undefined}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.title}</p>
                      <div className={cn("p-2 rounded-xl text-white shadow-lg", stat.color)}>
                        <stat.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-foreground mb-1">{stat.value}</div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-accent uppercase tracking-wider">{stat.trend}</p>
                      {stat.interactive && <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:translate-x-1 transition-transform" />}
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* Activity Table */}
              <GlassCard className="w-full overflow-hidden">
                <div className="pb-8 pt-2 border-b border-border mb-6 px-2">
                  <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Estado de Usuarios en Tiempo Real</h3>
                  <p className="text-sm font-medium text-muted-foreground">Monitoreo detallado de actividad y sesiones de usuarios.</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Usuario</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Inicio Sesión</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Fin Sesión</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Estado</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Tiempo Inactivo</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Último Evento</th>
                        <th className="px-6 py-5 text-right font-black uppercase tracking-widest text-[10px] text-muted-foreground">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sessions.length > 0 ? (
                        sessions.map((session) => {
                          const lastEvent = session.logs[0];
                          const isActive = !session.fechaFin;
                          const isAway = session.tiempoInactivo > 0;
                          
                          return (
                            <tr key={session.id} className="hover:bg-accent/5 transition-colors group">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black">
                                    {session.membership.user.nombre[0]}
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="font-black text-foreground uppercase tracking-tight text-sm">
                                      {session.membership.user.nombre} {session.membership.user.apellido}
                                    </p>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                      @{session.membership.username} • {session.membership.role}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 font-bold text-foreground text-sm">
                                {format(new Date(session.fechaInicio), "HH:mm")}
                              </td>
                              <td className="px-6 py-5 font-bold text-muted-foreground text-sm">
                                {session.fechaFin ? format(new Date(session.fechaFin), "HH:mm") : "--:--"}
                              </td>
                              <td className="px-6 py-5">
                                {isActive ? (
                                  <span className={cn(
                                    "inline-flex items-center rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                    isAway 
                                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  )}>
                                    {isAway ? `Ausente (${session.tiempoInactivo}m)` : "Activo"}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-lg bg-muted px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-border shadow-sm">
                                    Sesión Finalizada
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-5 font-bold text-muted-foreground text-sm">
                                {session.tiempoInactivo > 0 ? `${session.tiempoInactivo} min` : "-"}
                              </td>
                              <td className="px-6 py-5">
                                {lastEvent && (
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-black text-foreground tracking-tight uppercase">
                                      {lastEvent.tipo}
                                    </p>
                                    <p className="text-[10px] font-medium text-muted-foreground">
                                      hace {formatDistanceToNow(new Date(lastEvent.createdAt), { locale: es })}
                                    </p>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-5 text-right">
                                <button 
                                  onClick={() => handleOpenLogs(session)}
                                  className="inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-[10px] font-black uppercase tracking-widest text-accent border border-accent/20 shadow-sm hover:bg-accent hover:text-white transition-all"
                                >
                                  Ver Logs
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-20 text-center">
                            {isLoading ? (
                              <RefreshCcw className="h-8 w-8 animate-spin mx-auto text-accent mb-4" />
                            ) : (
                              <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                            )}
                            <p className="font-black uppercase tracking-widest text-xs text-muted-foreground">
                              {isLoading ? "Cargando sesiones..." : "No se encontraron sesiones de actividad"}
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Auditoría Tab Content (Ya implementado anteriormente) */}
              <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" />
                  <input 
                    placeholder="Buscar por entidad, acción o usuario..." 
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-card text-foreground border-none shadow-sm ring-1 ring-border focus:ring-2 focus:ring-accent/20 text-sm font-bold transition-all outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="h-14 px-8 flex items-center gap-2 rounded-2xl bg-card text-muted-foreground font-black uppercase tracking-widest text-[11px] shadow-sm border border-border hover:bg-accent/5 hover:text-foreground transition-all active:scale-95">
                  <Filter className="h-4 w-4" />
                  Filtros Avanzados
                </button>
              </div>

              <GlassCard className="w-full overflow-hidden">
                <div className="pb-8 pt-2 border-b border-border mb-6 px-2">
                  <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Registros de Auditoría</h3>
                  <p className="text-sm font-medium text-muted-foreground">Historial detallado de cambios y transacciones (CRUD).</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Fecha</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Usuario</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Acción</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Entidad</th>
                        <th className="px-6 py-5 text-right font-black uppercase tracking-widest text-[10px] text-muted-foreground">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAudits.length > 0 ? (
                        filteredAudits.map((audit) => {
                          const isSuccess = !audit.accion.includes('FAILED');
                          const actionName = audit.accion.split('_')[0];
                          return (
                            <tr key={audit.id} className="hover:bg-accent/5 transition-colors group">
                              <td className="px-6 py-5 text-muted-foreground font-medium text-xs">{format(new Date(audit.createdAt), "dd MMM, yyyy • HH:mm:ss", { locale: es })}</td>
                              <td className="px-6 py-5">
                                <div className="space-y-0.5">
                                  <p className="font-black text-foreground uppercase tracking-tight text-sm">{audit.membership?.user.nombre} {audit.membership?.user.apellido}</p>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase">@{audit.membership?.username || "sistema"}</p>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <span className={cn("font-bold text-sm uppercase tracking-tight", actionName === 'CREACIÓN' ? "text-emerald-500" : actionName === 'ACTUALIZACIÓN' ? "text-amber-500" : actionName === 'ELIMINACIÓN' ? "text-red-500" : "text-accent")}>{actionName}</span>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-muted text-muted-foreground"><Database className="h-3.5 w-3.5" /></div>
                                    <span className="text-foreground font-black text-xs uppercase tracking-tight">{audit.entidad}</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-muted-foreground/70 bg-muted/30 px-2 py-0.5 rounded-md w-fit border border-border/50">ID: {audit.entidadId}</span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right flex items-center justify-end gap-3">
                                <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border shadow-sm", isSuccess ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                                  {isSuccess ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                                  {isSuccess ? "EXITOSA" : "FALLIDA"}
                                </span>
                                <button onClick={() => handleOpenAudit(audit)} className="h-8 w-8 rounded-full hover:bg-accent/10 flex items-center justify-center text-muted-foreground hover:text-accent transition-all"><Eye className="h-4 w-4" /></button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={5} className="px-6 py-20 text-center"><History className="h-8 w-8 mx-auto text-muted-foreground mb-4" /><p className="font-black uppercase tracking-widest text-xs text-muted-foreground">No se encontraron registros</p></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>

      {/* Modales de KPI */}
      <KPIModal 
        isOpen={isKpiModalOpen && kpiModalType === 'sessions'} 
        onClose={() => setIsKpiModalOpen(false)}
        title="Usuarios en Línea"
        icon={Activity}
      >
        <div className="space-y-4">
          {activeSessionsList.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border hover:bg-muted/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black">{s.membership.user.nombre[0]}</div>
                <div>
                  <p className="text-sm font-black uppercase">{s.membership.user.nombre} {s.membership.user.apellido}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">@{s.membership.username}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md border border-emerald-500/20">ACTIVO</span>
                <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">Entró {format(new Date(s.fechaInicio), "HH:mm")}</p>
              </div>
            </div>
          ))}
          {activeSessionsList.length === 0 && <p className="text-center py-10 text-muted-foreground text-xs font-bold uppercase">No hay sesiones activas</p>}
        </div>
      </KPIModal>

      <KPIModal 
        isOpen={isKpiModalOpen && kpiModalType === 'technicians'} 
        onClose={() => setIsKpiModalOpen(false)}
        title="Técnicos Operativos"
        icon={CheckCircle2}
      >
        <div className="space-y-4">
          {activeTechniciansList.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-black">{s.membership.user.nombre[0]}</div>
                <div>
                  <p className="text-sm font-black uppercase">{s.membership.user.nombre} {s.membership.user.apellido}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">TÉCNICO OPERADOR</p>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          ))}
          {activeTechniciansList.length === 0 && <p className="text-center py-10 text-muted-foreground text-xs font-bold uppercase">No hay técnicos en línea</p>}
        </div>
      </KPIModal>

      <KPIModal 
        isOpen={isKpiModalOpen && kpiModalType === 'events'} 
        onClose={() => setIsKpiModalOpen(false)}
        title="Flujo de Actividad (Hoy)"
        icon={Zap}
      >
        <div className="space-y-4">
          {isLogsLoading ? (
            <div className="py-10 flex justify-center"><RefreshCcw className="h-6 w-6 animate-spin text-accent" /></div>
          ) : recentLogs.map((log) => (
            <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-muted/10 border border-border/50">
              <div className={cn("h-8 w-8 min-w-[32px] rounded-lg flex items-center justify-center text-white shadow-sm text-xs", 
                log.tipo === 'LOGIN' ? "bg-emerald-500" : log.tipo.includes('FOCO') ? "bg-amber-500" : "bg-blue-500")}>
                {log.tipo[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-black uppercase text-foreground truncate">{log.sesion.membership.user.nombre} {log.sesion.membership.user.apellido}</p>
                  <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">{format(new Date(log.createdAt), "HH:mm")}</span>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground leading-tight italic">"{log.descripcion}"</p>
              </div>
            </div>
          ))}
        </div>
      </KPIModal>

      {/* Logs Modal (Membresía específica) */}
      {selectedMembership && (
        <LogsModal 
          isOpen={isLogsModalOpen} 
          onClose={() => setIsLogsModalOpen(false)} 
          membership={selectedMembership}
          logs={userLogs}
          isLoading={isLogsLoading}
        />
      )}

      {/* Audit Detail Modal */}
      {selectedAudit && (
        <AuditDetailModal 
          isOpen={isAuditModalOpen} 
          onClose={() => setIsAuditModalOpen(false)} 
          audit={selectedAudit}
        />
      )}
    </DashboardLayout>
  );
}
