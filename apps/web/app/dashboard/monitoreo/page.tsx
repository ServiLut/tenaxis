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
import { exportToExcel } from "./components/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { ExportRangeModal } from "./components/ExportRangeModal";
import { toast } from "sonner";
import { 
  getMonitoringSessions, 
  getAudits, 
  getMonitoringPayrollPreview 
} from "./actions";

import { Audit, Session } from "./types";

export default function MonitoreoPage() {
  const [activeTab, setActiveTab] = useState<"actividad" | "auditoria">("actividad");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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

  const isGlobalRefreshing = isActivityRefreshing || isAuditsRefreshing;
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

  const handleExportRange = async (range: { from: Date; to: Date }) => {
    if (!range.from || !range.to) return;

    const startDate = toBogotaYmd(range.from);
    const endDate = toBogotaYmd(range.to);

    try {
      // Fetch data for the entire range
      const [sessionsRes, auditsRes, payrollRes] = await Promise.all([
        getMonitoringSessions(undefined, startDate, endDate),
        getAudits(1, 1000, undefined, startDate, endDate), // Limit set high for range export
        getMonitoringPayrollPreview(undefined, startDate, endDate),
      ]);

      const sessionsData = (sessionsRes.data || []).map((s) => ({
        Usuario: `${s.membership?.user?.nombre ?? ""} ${s.membership?.user?.apellido ?? ""}`.trim() || "Desconocido",
        Username: s.membership?.username || "N/A",
        Rol: s.membership?.role || "N/A",
        Inicio: formatBogotaDateTime(s.fechaInicio, "es-CO"),
        Fin: s.fechaFin ? formatBogotaDateTime(s.fechaFin, "es-CO") : "Activo",
        Inactividad: `${s.tiempoInactivo || 0} min`,
        IP: s.ip || "0.0.0.0",
        Dispositivo: s.dispositivo || "Desconocido",
      }));

      const auditData = (auditsRes.data || []).map((a) => ({
        Fecha: formatBogotaDateTime(a.createdAt, "es-CO"),
        Entidad: a.entidad || "N/A",
        Accion: a.accion || "N/A",
        Usuario: `${a.membership?.user?.nombre ?? ""} ${a.membership?.user?.apellido ?? ""}`.trim() || "Desconocido",
        Username: a.membership?.username || "N/A",
        ID_Entidad: a.entidadId || "N/A",
      }));

      const payrollData = (payrollRes.data?.items || []).map((item) => ({
        Usuario: `${item.nombre ?? ""} ${item.apellido ?? ""}`.trim(),
        Rol: item.role || "N/A",
        ValorHora: item.valorHora ?? "Sin configurar",
        HorasPagables: item.horasPagables || 0,
        MinutosInactivos: item.minutosInactivos || 0,
        PagoEstimado: item.pagoEstimado || 0,
        Estado: item.estado || "N/A",
      }));

      type ExcelRow = Record<string, string | number | null | undefined>;
      const sheets: { name: string; data: ExcelRow[] }[] = [
        { name: "Sesiones", data: sessionsData as unknown as ExcelRow[] },
        { name: "Auditoria", data: auditData as unknown as ExcelRow[] },
      ];

      if (payrollData.length > 0) {
        sheets.push({ 
          name: "Pre-Nomina", 
          data: payrollData as unknown as ExcelRow[] 
        });
      }

      await exportToExcel(sheets, `monitoreo_rango_${startDate}_a_${endDate}`);
      toast.success("Reporte generado con éxito");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error al generar el reporte de rango");
    }
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
          isLoading={isGlobalRefreshing}
          onRefresh={handleRefresh}
          lastUpdated={currentLastUpdated}
          onExport={() => setIsExportModalOpen(true)}
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

      <ExportRangeModal
        isOpen={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        onExport={handleExportRange}
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
