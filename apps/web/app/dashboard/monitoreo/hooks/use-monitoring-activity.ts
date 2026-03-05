"use client";

import { useQuery } from "@tanstack/react-query";
import { getMonitoringSessions, getMonitoringStats, getMemberLogs, getRecentLogs } from "../actions";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Session, MonitoringStats, Log } from "../types";

export function useMonitoringActivity() {
  const [latency, setLatency] = useState(0);

  // Activity query (sessions + stats)
  const activityQuery = useQuery({
    queryKey: ["monitoring", "activity"],
    queryFn: async () => {
      const start = Date.now();
      const [sessionsRes, statsRes] = await Promise.all([
        getMonitoringSessions(),
        getMonitoringStats()
      ]);
      const end = Date.now();
      setLatency(end - start);
      
      return { 
        sessions: sessionsRes.data, 
        stats: statsRes.data 
      };
    },
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 2,
  });

  useEffect(() => {
    if (activityQuery.isError) {
      toast.error("Error al sincronizar actividad del servidor");
    }
  }, [activityQuery.isError]);

  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  
  const userLogsQuery = useQuery({
    queryKey: ["monitoring", "logs", selectedMembershipId],
    queryFn: () => getMemberLogs(selectedMembershipId!),
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
    queryKey: ["monitoring", "recent-logs"],
    queryFn: getRecentLogs,
    enabled: recentLogsEnabled,
    staleTime: 30000,
    retry: 1,
  });

  useEffect(() => {
    if (recentLogsQuery.isError) {
      toast.error("Error al cargar eventos recientes");
    }
  }, [recentLogsQuery.isError]);

  return {
    sessions: activityQuery.data?.sessions || [] as Session[],
    stats: activityQuery.data?.stats || { totalEvents: 0, activeSessions: 0, totalInactivity: 0 } as MonitoringStats,
    latency,
    isLoading: activityQuery.isLoading,
    isRefreshing: activityQuery.isFetching,
    isLogsLoading: userLogsQuery.isLoading || recentLogsQuery.isLoading,
    userLogs: userLogsQuery.data?.data || [] as Log[],
    recentLogs: recentLogsQuery.data?.data || [] as Log[],
    fetchActivity: () => activityQuery.refetch(),
    fetchUserLogs: (membershipId: string) => setSelectedMembershipId(membershipId),
    fetchRecentLogs: () => setRecentLogsEnabled(true)
  };
}
