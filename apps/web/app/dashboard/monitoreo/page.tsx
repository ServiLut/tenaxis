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
import { formatBogotaDateTime, formatBogotaTime, toBogotaYmd } from "@/utils/date-utils";

import { useMonitoringActivity } from "./hooks/use-monitoring-activity";
import { useMonitoringAudits } from "./hooks/use-monitoring-audits";

import { MonitoreoHeader } from "./components/MonitoreoHeader";
import { ScopeInfo } from "./components/ScopeInfo";
import { MonitoringHealth } from "./components/MonitoringHealth";
import { MonitoringAlerts } from "./components/MonitoringAlerts";
import { KpiCards } from "./components/KpiCards";
import { OperationMetrics } from "./components/OperationMetrics";
import { PayrollPreviewPanel } from "./components/PayrollPreviewPanel";
import { ExecutiveAudit } from "./components/ExecutiveAudit";
import { SessionsTable } from "./components/SessionsTable";
import { AuditsTable } from "./components/AuditsTable";
import { LogsModal } from "./components/LogsModal";
import { AuditDetailModal } from "./components/AuditDetailModal";
import { KPIModal } from "./components/KPIModal";
import { exportToCSV } from "./components/utils";
import { DatePicker } from "@/components/ui/date-picker";

import { Audit, Session } from "./types";

export default function MonitoreoPage() {
  const [activeTab, setActiveTab] = useState<"actividad" | "auditoria">("actividad");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [kpiModalType, setKpiModalType] = useState<"sessions" | "events" | "technicians" | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);

  const dateStr = selectedDate ? toBogotaYmd(selectedDate) : undefined;

  const {
    sessions,
    stats,
    alerts,
    metrics,
    payrollPreview,
    executiveAudit,
    latency,
    maxLatency,
    lastUpdated: activityLastUpdated,
    isLoading: isActivityLoading,
    isRefreshing: isActivityRefreshing,
    isPayrollLoading,
    isPayrollRefreshing,
    isGeneratingPayroll,
    isLogsLoading,
    userLogs,
    recentLogs,
    fetchActivity,
    fetchAlerts,
    fetchMetrics,
    fetchPayrollPreview,
    fetchExecutiveAudit,
    fetchUserLogs,
    fetchRecentLogs,
    generatePayroll,
  } = useMonitoringActivity(dateStr);

  const {
    audits,
    meta,
    currentPage,
    setCurrentPage,
    lastUpdated: auditsLastUpdated,
    isLoading: isAuditsLoading,
    isRefreshing: isAuditsRefreshing,
    searchQuery,
    setSearchQuery,
    fetchAudits,
  } = useMonitoringAudits(dateStr);

  const handleRefresh = () => {
    if (activeTab === "actividad") {
      fetchActivity();
      fetchAlerts();
      fetchMetrics();
      fetchPayrollPreview();
    } else {
      fetchAudits();
      fetchExecutiveAudit();
    }
  };

  const isCurrentTabRefreshing =
    activeTab === "actividad" ? isActivityRefreshing : isAuditsRefreshing;
  const currentLastUpdated =
    activeTab === "actividad" ? activityLastUpdated : auditsLastUpdated;

  const handleOpenLogs = async (session: Session) => {
    setSelectedSession(session);
    setIsLogsModalOpen(true);
    fetchUserLogs(session.membershipId);
  };

  const handleOpenKpiModal = async (
    type: "sessions" | "events" | "technicians",
  ) => {
    setKpiModalType(type);
    setIsKpiModalOpen(true);
    if (type === "events") {
      fetchRecentLogs();
    }
  };

  const handleOpenAudit = (audit: Audit) => {
    setSelectedAudit(audit);
    setIsAuditModalOpen(true);
  };

  const handleExport = () => {
    if (activeTab === "actividad") {
      const exportData =
        payrollPreview.items.length > 0
          ? payrollPreview.items.map((item) => ({
              Usuario: `${item.nombre} ${item.apellido}`,
              Rol: item.role,
              ValorHora: item.valorHora ?? "Sin configurar",
              HorasPagables: item.horasPagables,
              MinutosInactivos: item.minutosInactivos,
              PagoEstimado: item.pagoEstimado,
              Estado: item.estado,
            }))
          : sessions.map((s) => ({
              Usuario: `${s.membership.user.nombre} ${s.membership.user.apellido}`,
              Username: s.membership.username,
              Rol: s.membership.role,
              Inicio: formatBogotaDateTime(s.fechaInicio, "es-CO"),
              Fin: s.fechaFin ? formatBogotaDateTime(s.fechaFin, "es-CO") : "Activo",
              Inactividad: `${s.tiempoInactivo} min`,
              IP: s.ip,
              Dispositivo: s.dispositivo,
            }));
      exportToCSV(exportData, "monitoreo_actividad");
      return;
    }

    const exportData = audits.map((a) => ({
      Fecha: formatBogotaDateTime(a.createdAt, "es-CO"),
      Entidad: a.entidad,
      Accion: a.accion,
      Usuario: `${a.membership?.user?.nombre} ${a.membership?.user?.apellido}`,
      Username: a.membership?.username,
      ID_Entidad: a.entidadId,
    }));
    exportToCSV(exportData, "monitoreo_auditoria");
  };

  const activeSessionsList = Array.isArray(sessions)
    ? sessions.filter((s) => !s.fechaFin)
    : [];
  const activeTechniciansList = Array.isArray(sessions)
    ? sessions.filter((s) => !s.fechaFin && s.membership?.role === "OPERADOR")
    : [];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-10">
        <MonitoreoHeader
          isLoading={isCurrentTabRefreshing}
          onRefresh={handleRefresh}
          lastUpdated={currentLastUpdated}
          onExport={handleExport}
        />

        <ScopeInfo />

        <MonitoringHealth
          sessions={sessions}
          latency={latency}
          maxLatency={maxLatency}
        />

        <MonitoringAlerts alerts={alerts} />

        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex w-fit items-center gap-1.5 rounded-2xl border border-border bg-muted p-1.5">
            <button
              onClick={() => setActiveTab("actividad")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                activeTab === "actividad"
                  ? "bg-background text-accent shadow-md"
                  : "text-muted-foreground hover:text-foreground",
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
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <History className="h-4 w-4" />
              Auditoria
            </button>
          </div>

          <div className="w-full sm:w-64">
            <DatePicker
              date={selectedDate}
              onChange={setSelectedDate}
              placeholder="Filtrar por fecha"
            />
          </div>
        </div>

        <div className="mt-4 space-y-8">
          {activeTab === "actividad" ? (
            <div className="space-y-12">
              <KpiCards
                stats={stats}
                latency={latency}
                activeTechniciansCount={activeTechniciansList.length}
                onOpenKpi={handleOpenKpiModal}
                date={dateStr}
              />

              <PayrollPreviewPanel
                preview={payrollPreview}
                isLoading={isPayrollLoading}
                isRefreshing={isPayrollRefreshing}
                isGenerating={isGeneratingPayroll}
                onGenerate={() => void generatePayroll()}
              />

              <OperationMetrics metrics={metrics} />

              <SessionsTable
                sessions={sessions}
                isLoading={isActivityLoading}
                onOpenLogs={handleOpenLogs}
              />
            </div>
          ) : (
            <div className="space-y-12">
              <ExecutiveAudit metrics={executiveAudit} date={dateStr} />

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
            </div>
          )}
        </div>
      </div>

      <KPIModal
        isOpen={isKpiModalOpen && kpiModalType === "sessions"}
        onOpenChange={(open) => !open && setIsKpiModalOpen(false)}
        title="Usuarios en Línea"
        icon={Activity}
      >
        <div className="space-y-4">
          {activeSessionsList.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 p-4 transition-all hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 font-black text-emerald-500">
                  {s.membership.user.nombre[0]}
                </div>
                <div>
                  <p className="text-sm font-black uppercase">
                    {s.membership.user.nombre} {s.membership.user.apellido}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    @{s.membership.username}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase text-emerald-500">
                  ACTIVO
                </span>
                <p className="mt-1 text-[9px] font-bold uppercase text-muted-foreground">
                  Entró {formatBogotaTime(s.fechaInicio, "es-CO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {activeSessionsList.length === 0 && (
            <p className="py-10 text-center text-xs font-bold uppercase text-muted-foreground">
              No hay sesiones activas
            </p>
          )}
        </div>
      </KPIModal>

      <KPIModal
        isOpen={isKpiModalOpen && kpiModalType === "technicians"}
        onOpenChange={(open) => !open && setIsKpiModalOpen(false)}
        title="Técnicos Operativos"
        icon={CheckCircle2}
      >
        <div className="space-y-4">
          {activeTechniciansList.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 font-black text-blue-500">
                  {s.membership.user.nombre[0]}
                </div>
                <div>
                  <p className="text-sm font-black uppercase">
                    {s.membership.user.nombre} {s.membership.user.apellido}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    TÉCNICO OPERADOR
                  </p>
                </div>
              </div>
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            </div>
          ))}
          {activeTechniciansList.length === 0 && (
            <p className="py-10 text-center text-xs font-bold uppercase text-muted-foreground">
              No hay técnicos en línea
            </p>
          )}
        </div>
      </KPIModal>

      <KPIModal
        isOpen={isKpiModalOpen && kpiModalType === "events"}
        onOpenChange={(open) => !open && setIsKpiModalOpen(false)}
        title={dateStr ? "Flujo de Actividad (Día)" : "Flujo de Actividad (Hoy)"}
        icon={Zap}
      >
        <div className="space-y-4">
          {isLogsLoading ? (
            <div className="flex justify-center py-10">
              <RefreshCcw className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex gap-4 rounded-2xl border border-border/50 bg-muted/10 p-4"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 min-w-[32px] items-center justify-center rounded-lg text-xs text-white shadow-sm",
                    log.tipo === "LOGIN"
                      ? "bg-emerald-500"
                      : log.tipo.includes("FOCO")
                        ? "bg-amber-500"
                        : "bg-blue-500",
                  )}
                >
                  {log.tipo[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="truncate text-xs font-black uppercase text-foreground">
                      {log.sesion.membership.user.nombre} {log.sesion.membership.user.apellido}
                    </p>
                    <span className="whitespace-nowrap text-[9px] font-bold text-muted-foreground">
                      {formatBogotaTime(log.createdAt, "es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium italic leading-tight text-muted-foreground">
                    &quot;{log.descripcion}&quot;
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </KPIModal>

      <LogsModal
        isOpen={isLogsModalOpen}
        onOpenChange={setIsLogsModalOpen}
        session={selectedSession}
        logs={userLogs}
        isLoading={isLogsLoading}
      />

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
