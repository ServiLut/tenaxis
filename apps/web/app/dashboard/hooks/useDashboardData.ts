"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardStatsAction, getOrdenesServicioAction } from "../actions";
import type { DashboardStatsType, DashboardKpisType, DashboardTrendsType, DashboardActionableType } from "../schemas/dashboard.schema";

export const DASHBOARD_STATS_KEY = "dashboard-stats";
export const RECENT_ACTIVITY_KEY = "recent-activity";

export function useDashboardStats(empresaId?: string) {
  return useQuery({
    queryKey: [DASHBOARD_STATS_KEY, empresaId],
    queryFn: () => getDashboardStatsAction(empresaId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Selectors
export function useDashboardKpis(empresaId?: string) {
  return useQuery({
    queryKey: [DASHBOARD_STATS_KEY, empresaId],
    queryFn: () => getDashboardStatsAction(empresaId),
    select: (data): DashboardKpisType => data.kpis,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDashboardTrends(empresaId?: string) {
  return useQuery({
    queryKey: [DASHBOARD_STATS_KEY, empresaId],
    queryFn: () => getDashboardStatsAction(empresaId),
    select: (data): DashboardTrendsType => data.trends,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDashboardActionable(empresaId?: string) {
  return useQuery({
    queryKey: [DASHBOARD_STATS_KEY, empresaId],
    queryFn: () => getDashboardStatsAction(empresaId),
    select: (data): DashboardActionableType => data.actionable,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRecentActivity(empresaId?: string) {
  return useQuery({
    queryKey: [RECENT_ACTIVITY_KEY, empresaId],
    queryFn: async () => {
      const data = await getOrdenesServicioAction(empresaId);
      return Array.isArray(data) ? data.slice(0, 4) : [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for activity
  });
}

export function useDashboardRefresh(empresaId?: string) {
  const queryClient = useQueryClient();

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [DASHBOARD_STATS_KEY, empresaId] }),
      queryClient.invalidateQueries({ queryKey: [RECENT_ACTIVITY_KEY, empresaId] }),
    ]);
  };

  return { refreshAll };
}
