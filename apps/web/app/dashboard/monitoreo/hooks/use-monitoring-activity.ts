"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  getMonitoringSessions, 
  getMonitoringStats, 
  getMemberLogs, 
  getRecentLogs, 
  getMonitoringAlerts,
  getMonitoringMetrics,
  getExecutiveAuditMetrics
} from "../actions";
import { toast } from "sonner";
import { useEffect, useState, useMemo } from "react";
import { Session, MonitoringStats, Log, MonitoringAlert, MonitoringMetrics, ExecutiveAuditMetrics } from "../types";

export function useMonitoringActivity(date?: string) {
  const [latency, setLatency] = useState(0);
  const [maxLatency, setMaxLatency] = useState(0);

  // Activity query (sessions + stats)
  const activityQuery = useQuery({
    queryKey: ["monitoring", "activity", date],
    queryFn: async () => {
      const start = Date.now();
      const [sessionsRes, statsRes] = await Promise.all([
        getMonitoringSessions(date),
        getMonitoringStats(date)
      ]);
      const end = Date.now();
      const currentLatency = end - start;
      setLatency(currentLatency);
      setMaxLatency(prev => Math.max(prev, currentLatency));
      
      if (sessionsRes.message && (!sessionsRes.data || sessionsRes.data.length === 0)) {
        throw new Error(sessionsRes.message);
      }
      if (statsRes.message && (!statsRes.data || statsRes.data.totalEvents === 0)) {
        throw new Error(statsRes.message);
      }

      return { 
        sessions: sessionsRes.data, 
        stats: statsRes.data 
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
      const res = await getMonitoringAlerts(date);
      if (res.message && (!res.data || res.data.length === 0)) {
        // throw new Error(res.message); // Opcional: no bloquear todo por alertas
      }
      return res.data || [] as MonitoringAlert[];
    },
    refetchInterval: date ? false : 60000,
  });

  // Metrics query
  const metricsQuery = useQuery({
    queryKey: ["monitoring", "metrics", date],
    queryFn: async () => {
      const res = await getMonitoringMetrics(date);
      if (res.message && (!res.data || res.data.userCount === 0)) {
        // throw new Error(res.message);
      }
      return res.data;
    },
    refetchInterval: date ? false : 120000, // Cada 2 minutos
  });

  // Executive Audit query
  const executiveAuditQuery = useQuery({
    queryKey: ["monitoring", "executive-audit", date],
    queryFn: async () => {
      const res = await getExecutiveAuditMetrics(date);
      if (res.message && (!res.data || res.data.successRate === 0)) {
        // throw new Error(res.message);
      }
      return res.data;
    },
    refetchInterval: date ? false : 300000, // Cada 5 minutos
  });

  useEffect(() => {
    if (activityQuery.isError) {
      toast.error("Error al sincronizar actividad del servidor");
    }
  }, [activityQuery.isError]);

  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  
  const userLogsQuery = useQuery({
    queryKey: ["monitoring", "logs", selectedMembershipId, date],
    queryFn: () => getMemberLogs(selectedMembershipId!, date),
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
    queryFn: () => getRecentLogs(date),
    enabled: recentLogsEnabled,
    staleTime: 30000,
    retry: 1,
  });

  useEffect(() => {
    if (recentLogsQuery.isError) {
      toast.error("Error al cargar eventos recientes");
    }
  }, [recentLogsQuery.isError]);

  const lastUpdated = useMemo(() => {
    return Math.max(
      activityQuery.dataUpdatedAt,
      alertsQuery.dataUpdatedAt,
      metricsQuery.dataUpdatedAt,
      executiveAuditQuery.dataUpdatedAt
    );
  }, [
    activityQuery.dataUpdatedAt, 
    alertsQuery.dataUpdatedAt, 
    metricsQuery.dataUpdatedAt, 
    executiveAuditQuery.dataUpdatedAt
  ]);

  return {
    sessions: activityQuery.data?.sessions || [] as Session[],
    stats: activityQuery.data?.stats || { totalEvents: 0, activeSessions: 0, totalInactivity: 0 } as MonitoringStats,
    alerts: alertsQuery.data || [] as MonitoringAlert[],
    metrics: metricsQuery.data || { avgActiveTimeMin: 0, totalInactivityMin: 0, topInactivity: [], mttfeSec: 0, userCount: 0 } as MonitoringMetrics,
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
    isLoading: activityQuery.isLoading || alertsQuery.isLoading || metricsQuery.isLoading || executiveAuditQuery.isLoading,
    isRefreshing: activityQuery.isFetching || alertsQuery.isFetching || metricsQuery.isFetching || executiveAuditQuery.isFetching,
    isLogsLoading: userLogsQuery.isLoading || recentLogsQuery.isLoading,
    userLogs: userLogsQuery.data?.data || [] as Log[],
    recentLogs: recentLogsQuery.data?.data || [] as Log[],
    fetchActivity: () => activityQuery.refetch(),
    fetchAlerts: () => alertsQuery.refetch(),
    fetchMetrics: () => metricsQuery.refetch(),
    fetchExecutiveAudit: () => executiveAuditQuery.refetch(),
    fetchUserLogs: (membershipId: string) => setSelectedMembershipId(membershipId),
    fetchRecentLogs: () => setRecentLogsEnabled(true)
  };
}
