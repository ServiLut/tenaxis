"use client";

import React, { useState } from "react";
import { 
  Activity, 
  History, 
  Zap,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { DashboardLayout } from "@/components/dashboard";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Hooks
import { useMonitoringActivity } from "./hooks/use-monitoring-activity";
import { useMonitoringAudits } from "./hooks/use-monitoring-audits";

// Components
import { MonitoreoHeader } from "./components/MonitoreoHeader";
import { KpiCards } from "./components/KpiCards";
import { SessionsTable } from "./components/SessionsTable";
import { AuditsTable } from "./components/AuditsTable";
import { LogsModal } from "./components/LogsModal";
import { AuditDetailModal } from "./components/AuditDetailModal";
import { KPIModal } from "./components/KPIModal";

import { Audit, Membership, Session } from "./types";

export default function MonitoreoPage() {
  const [activeTab, setActiveTab] = useState<"actividad" | "auditoria">("actividad");
  
  // Custom Hooks
  const {
    sessions,
    stats,
    latency,
    isLoading: isActivityLoading,
    isRefreshing: isActivityRefreshing,
    isLogsLoading,
    userLogs,
    recentLogs,
    fetchActivity,
    fetchUserLogs,
    fetchRecentLogs
  } = useMonitoringActivity();

  const {
    audits,
    meta,
    currentPage,
    setCurrentPage,
    isLoading: isAuditsLoading,
    isRefreshing: isAuditsRefreshing,
    searchQuery,
    setSearchQuery,
    fetchAudits
  } = useMonitoringAudits();

  // Modals State
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [kpiModalType, setKpiModalType] = useState<'sessions' | 'events' | 'technicians' | null>(null);
  
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);

  const handleRefresh = () => {
    if (activeTab === "actividad") fetchActivity();
    else fetchAudits();
  };

  const isCurrentTabRefreshing = activeTab === "actividad" ? isActivityRefreshing : isAuditsRefreshing;

  const handleOpenLogs = async (session: Session) => {
    setSelectedMembership(session.membership);
    setIsLogsModalOpen(true);
    fetchUserLogs(session.membershipId);
  };

  const handleOpenKpiModal = async (type: 'sessions' | 'events' | 'technicians') => {
    setKpiModalType(type);
    setIsKpiModalOpen(true);
    if (type === 'events') {
      fetchRecentLogs();
    }
  };

  const handleOpenAudit = (audit: Audit) => {
    setSelectedAudit(audit);
    setIsAuditModalOpen(true);
  };

  const activeSessionsList = Array.isArray(sessions) ? sessions.filter(s => !s.fechaFin) : [];
  const activeTechniciansList = Array.isArray(sessions) ? sessions.filter(s => !s.fechaFin && s.membership?.role === "OPERADOR") : [];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-10">
        
        <MonitoreoHeader 
          isLoading={isCurrentTabRefreshing} 
          onRefresh={handleRefresh} 
        />

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
              <KpiCards 
                stats={stats} 
                latency={latency} 
                activeTechniciansCount={activeTechniciansList.length}
                onOpenKpi={handleOpenKpiModal}
              />

              <SessionsTable 
                sessions={sessions}
                isLoading={isActivityLoading}
                onOpenLogs={handleOpenLogs}
              />
            </div>
          ) : (
            <AuditsTable 
              audits={audits}
              meta={meta}
              currentPage={currentPage}
              isLoading={isAuditsLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onPageChange={setCurrentPage}
              onOpenAudit={handleOpenAudit}
            />
          )}
        </div>
      </div>

      {/* Modales de KPI */}
      <KPIModal 
        isOpen={isKpiModalOpen && kpiModalType === 'sessions'} 
        onOpenChange={(open) => !open && setIsKpiModalOpen(false)}
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
        onOpenChange={(open) => !open && setIsKpiModalOpen(false)}
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
        onOpenChange={(open) => !open && setIsKpiModalOpen(false)}
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
          onOpenChange={setIsLogsModalOpen} 
          membership={selectedMembership}
          logs={userLogs}
          isLoading={isLogsLoading}
        />
      )}

      {/* Audit Detail Modal */}
      {selectedAudit && (
        <AuditDetailModal 
          isOpen={isAuditModalOpen} 
          onOpenChange={setIsAuditModalOpen} 
          audit={selectedAudit}
        />
      )}
    </DashboardLayout>
  );
}
