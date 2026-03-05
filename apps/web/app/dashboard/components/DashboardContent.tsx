"use client";

import React, { useState } from "react";
import { useDashboardRefresh, useRecentActivity } from "../hooks/useDashboardData";
import { useDashboardConfig, DashboardWidget } from "../hooks/useDashboardConfig";
import { DashboardHeader } from "./DashboardHeader";
import { StatCards } from "./StatCards";
import { RevenueChart } from "./RevenueChart";
import { QuickActions } from "./QuickActions";
import { RecentActivity } from "./RecentActivity";
import { OperationActionable } from "./OperationActionable";
import { StatCardSkeleton, RevenueChartSkeleton, TableSkeleton, Skeleton } from "./Skeletons";
import { AlertCircle, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardKpis, useDashboardTrends, useDashboardActionable } from "../hooks/useDashboardData";

interface DashboardContentProps {
  enterpriseId?: string;
}

export const DashboardContent = React.memo(function DashboardContent({ enterpriseId }: DashboardContentProps) {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { config, moveWidget, toggleVisibility, isLoaded: configLoaded } = useDashboardConfig();

  const { isLoading: kpisLoading, isError: kpisError } = useDashboardKpis(enterpriseId);
  const { isLoading: trendsLoading, isError: trendsError } = useDashboardTrends(enterpriseId);
  const { isLoading: actionableLoading, isError: actionableError } = useDashboardActionable(enterpriseId);
  
  const { 
    data: recentServices, 
    isLoading: activityLoading, 
    isError: activityError,
  } = useRecentActivity(enterpriseId);

  const { refreshAll } = useDashboardRefresh(enterpriseId);

  const hasAnyError = kpisError || trendsError || actionableError || activityError;

  if (hasAnyError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <h2 className="text-2xl font-black uppercase tracking-tight">Error de carga</h2>
        </div>
        <p className="text-muted-foreground font-medium text-center max-w-md">
          No pudimos sincronizar los datos del dashboard. Por favor, verifica tu conexión e intenta de nuevo.
        </p>
        <Button 
          onClick={() => refreshAll()} 
          variant="outline" 
          className="rounded-2xl border-border bg-card font-black uppercase tracking-widest text-foreground hover:bg-muted"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  const renderWidget = (id: DashboardWidget) => {
    const commonProps = {
      isConfiguring,
      onMoveUp: () => moveWidget(id, "up"),
      onMoveDown: () => moveWidget(id, "down"),
      onHide: () => toggleVisibility(id),
    };

    switch (id) {
      case "kpis":
        return kpisLoading ? (
          <div key={id} className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
            </div>
          </div>
        ) : (
          <StatCards key={id} enterpriseId={enterpriseId} {...commonProps} />
        );
      
      case "trends":
        return (
          <div key={id} className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="lg:col-span-3">
              {trendsLoading ? (
                <RevenueChartSkeleton />
              ) : (
                <RevenueChart enterpriseId={enterpriseId} {...commonProps} />
              )}
            </div>
            {!isConfiguring && (
              <div className="lg:col-span-1 pt-12">
                <QuickActions />
              </div>
            )}
          </div>
        );

      case "actionable":
        return actionableLoading ? (
          <div key={id} className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-3xl" />)}
          </div>
        ) : (
          <OperationActionable key={id} enterpriseId={enterpriseId} {...commonProps} />
        );

      case "recent":
        return activityLoading ? (
          <div key={id}><TableSkeleton /></div>
        ) : (
          <RecentActivity 
            key={id}
            recentServices={recentServices || []} 
            loading={false} 
            refreshData={() => refreshAll()} 
            {...commonProps}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-20">
      <DashboardHeader 
        isConfiguring={isConfiguring} 
        onToggleConfig={() => setIsConfiguring(!isConfiguring)} 
      />
      
      {configLoaded && config.widgets.map(renderWidget)}

      {isConfiguring && config.hidden.length > 0 && (
        <div className="mt-12 p-8 rounded-3xl border-2 border-dashed border-muted bg-muted/5">
          <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
            <Eye className="h-4 w-4" /> Widgets Ocultos
          </h4>
          <div className="flex flex-wrap gap-4">
            {config.hidden.map(id => (
              <Button 
                key={id} 
                variant="outline" 
                size="sm" 
                onClick={() => toggleVisibility(id)}
                className="rounded-xl border-border bg-card font-bold text-xs"
              >
                Mostrar {id.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
