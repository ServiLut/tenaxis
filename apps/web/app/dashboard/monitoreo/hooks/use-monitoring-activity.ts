"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useState, useMemo } from "react";
import { contabilidadClient } from "@/lib/api/contabilidad-client";
import { getBrowserCookie } from "@/lib/api/browser-client";
import { monitoringClient } from "@/lib/api/monitoreo-client";
import {
  Session,
  MonitoringStats,
  Log,
  MonitoringAlert,
  MonitoringMetrics,
  ExecutiveAuditMetrics,
  MonitoringPayrollPreview,
} from "../types";

export function useMonitoringActivity(date?: string) {
  const [latency, setLatency] = useState(0);
  const [maxLatency, setMaxLatency] = useState(0);
  const queryClient = useQueryClient();

  // Activity query (sessions + stats)
  const activityQuery = useQuery({
    queryKey: ["monitoring", "activity", date],
    queryFn: async () => {
      const start = Date.now();
      const [sessionsRes, statsRes] = await Promise.all([
        monitoringClient.getSessions({ date }),
        monitoringClient.getStats({ date }),
      ]);
      const end = Date.now();
      const currentLatency = end - start;
      setLatency(currentLatency);
      setMaxLatency(prev => Math.max(prev, currentLatency));

      return { 
        sessions: sessionsRes as Session[], 
        stats: statsRes as unknown as MonitoringStats
      };
    },
    refetchInterval: date ? false : 30000,
    staleTime: 10000,
    retry: 2,
  });

  // Alerts query
  const alertsQuery = useQuery({
    queryKey: ["monitoring", "alerts", date],
    queryFn: async () => {
      const res = await monitoringClient.getAlerts({ date });
      return res as MonitoringAlert[];
    },
    refetchInterval: date ? false : 60000,
  });

  // Metrics query
  const metricsQuery = useQuery({
    queryKey: ["monitoring", "metrics", date],
    queryFn: async () => {
      return await monitoringClient.getMetrics({ date }) as unknown as MonitoringMetrics;
    },
    refetchInterval: date ? false : 120000, // Cada 2 minutos
  });

  // Executive Audit query
  const executiveAuditQuery = useQuery({
    queryKey: ["monitoring", "executive-audit", date],
    queryFn: async () => {
      return await monitoringClient.getExecutiveAudit({ date }) as unknown as ExecutiveAuditMetrics;
    },
    refetchInterval: date ? false : 300000, // Cada 5 minutos
  });

  const payrollPreviewQuery = useQuery({
    queryKey: ["monitoring", "payroll-preview", date],
    queryFn: async () => {
      return await monitoringClient.getPayrollPreview({ date }) as unknown as MonitoringPayrollPreview;
    },
    refetchInterval: date ? false : 120000,
    staleTime: 30000,
    retry: 1,
  });

  useEffect(() => {
    if (activityQuery.isError) {
      toast.error("Error al sincronizar actividad del servidor");
    }
  }, [activityQuery.isError]);

  useEffect(() => {
    if (payrollPreviewQuery.isError) {
      toast.error("Error al calcular la pre-nomina del equipo");
    }
  }, [payrollPreviewQuery.isError]);

  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  
  const userLogsQuery = useQuery({
    queryKey: ["monitoring", "logs", selectedMembershipId, date],
    queryFn: async () => ({
      data: await monitoringClient.getLogsByMembership(selectedMembershipId!, { date }) as Log[],
    }),
    enabled: !!selectedMembershipId,
    staleTime: 5000,
    retry: 1,
  });

  useEffect(() => {
    if (userLogsQuery.isError) {
      toast.error("Error al cargar registros del usuario");
    }
  }, [userLogsQuery.isError]);

  const [recentLogsEnabled, setRecentLogsEnabled] = useState(false);

  const recentLogsQuery = useQuery({
    queryKey: ["monitoring", "recent-logs", date],
    queryFn: async () => ({
      data: await monitoringClient.getRecentLogs({ date }) as Log[],
    }),
    enabled: recentLogsEnabled,
    staleTime: 30000,
    retry: 1,
  });

  useEffect(() => {
    if (recentLogsQuery.isError) {
      toast.error("Error al cargar eventos recientes");
    }
  }, [recentLogsQuery.isError]);

  const payrollGenerationMutation = useMutation({
    mutationFn: async (membershipIds?: string[]) => {
      const payrollDate = date || new Date().toISOString().slice(0, 10);
      const empresaId = getBrowserCookie("x-enterprise-id");
      if (!empresaId) {
        throw new Error("No hay una empresa activa para generar la nómina");
      }

      return await contabilidadClient.generarNominaDesdeMonitoreo({
        empresaId,
        fechaInicio: payrollDate,
        fechaFin: payrollDate,
        membershipIds,
        includeAllEligible: !membershipIds || membershipIds.length === 0,
      });
    },
    onSuccess: (data) => {
      const totalCreated =
        data?.createdCount ||
        data?.summary?.total ||
        data?.generated?.length ||
        data?.nominas?.length ||
        0;

      toast.success(
        totalCreated > 0
          ? `${totalCreated} nómina(s) generadas desde monitoreo`
          : "Nómina generada correctamente",
      );

      void queryClient.invalidateQueries({
        queryKey: ["monitoring", "payroll-preview", date],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al generar la nómina",
      );
    },
  });

  const lastUpdated = useMemo(() => {
    return Math.max(
      activityQuery.dataUpdatedAt,
      alertsQuery.dataUpdatedAt,
      metricsQuery.dataUpdatedAt,
      executiveAuditQuery.dataUpdatedAt,
      payrollPreviewQuery.dataUpdatedAt
    );
  }, [
    activityQuery.dataUpdatedAt, 
    alertsQuery.dataUpdatedAt, 
    metricsQuery.dataUpdatedAt, 
    executiveAuditQuery.dataUpdatedAt,
    payrollPreviewQuery.dataUpdatedAt
  ]);

  return {
    sessions: activityQuery.data?.sessions || [] as Session[],
    stats: activityQuery.data?.stats || { totalEvents: 0, activeSessions: 0, totalInactivity: 0 } as MonitoringStats,
    alerts: alertsQuery.data || [] as MonitoringAlert[],
    metrics: metricsQuery.data || { avgActiveTimeMin: 0, totalInactivityMin: 0, topInactivity: [], mttfeSec: 0, userCount: 0 } as MonitoringMetrics,
    payrollPreview: payrollPreviewQuery.data || {
      date: date || new Date().toISOString().slice(0, 10),
      items: [],
      summary: {
        totalPersonas: 0,
        elegibles: 0,
        conIncidencias: 0,
        horasPagables: 0,
        totalEstimado: 0,
      },
    } as MonitoringPayrollPreview,
    executiveAudit: executiveAuditQuery.data || { 
      today: { created: 0, updated: 0, deleted: 0, total: 0 }, 
      week: { created: 0, updated: 0, deleted: 0, total: 0 },
      topEntities: [],
      topUsers: [],
      successRate: 100
    } as ExecutiveAuditMetrics,
    latency,
    maxLatency,
    lastUpdated,
    isLoading: activityQuery.isLoading || alertsQuery.isLoading || metricsQuery.isLoading || executiveAuditQuery.isLoading || payrollPreviewQuery.isLoading,
    isRefreshing: activityQuery.isFetching || alertsQuery.isFetching || metricsQuery.isFetching || executiveAuditQuery.isFetching || payrollPreviewQuery.isFetching,
    isLogsLoading: userLogsQuery.isLoading || recentLogsQuery.isLoading,
    isPayrollLoading: payrollPreviewQuery.isLoading,
    isPayrollRefreshing: payrollPreviewQuery.isFetching,
    isGeneratingPayroll: payrollGenerationMutation.isPending,
    userLogs: userLogsQuery.data?.data || [] as Log[],
    recentLogs: recentLogsQuery.data?.data || [] as Log[],
    fetchActivity: () => activityQuery.refetch(),
    fetchAlerts: () => alertsQuery.refetch(),
    fetchMetrics: () => metricsQuery.refetch(),
    fetchPayrollPreview: () => payrollPreviewQuery.refetch(),
    fetchExecutiveAudit: () => executiveAuditQuery.refetch(),
    fetchUserLogs: (membershipId: string) => setSelectedMembershipId(membershipId),
    fetchRecentLogs: () => setRecentLogsEnabled(true),
    generatePayroll: (membershipIds?: string[]) =>
      payrollGenerationMutation.mutateAsync(membershipIds),
  };
}
