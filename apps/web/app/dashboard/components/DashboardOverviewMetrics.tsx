"use client";

import React from "react";
import { 
  Calendar, Activity, CheckCircle2, TrendingUp, Clock, XCircle, Percent, AlertTriangle,
  Layers, ClipboardCheck, History, Briefcase, BarChart3, CreditCard, FileX, PieChart
} from "lucide-react";
import { useDashboardOverview } from "../hooks/useDashboardData";
import { cn } from "@/components/ui/utils";
import { WidgetConfigurator } from "./WidgetConfigurator";

interface DashboardOverviewMetricsProps {
  enterpriseId?: string;
  isConfiguring?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onHide?: () => void;
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatValue(value: number, kind: "number" | "currency" | "percent") {
  if (kind === "currency") return currencyFormatter.format(value);
  if (kind === "percent") return `${value.toFixed(1)}%`;
  return value.toLocaleString("es-CO");
}

export const DashboardOverviewMetrics = React.memo(function DashboardOverviewMetrics({
  enterpriseId,
  isConfiguring,
  onMoveUp,
  onMoveDown,
  onHide,
}: DashboardOverviewMetricsProps) {
  const { data } = useDashboardOverview(enterpriseId);

  const todayItems = [
    { label: "Servicios Agendados", value: data?.today.serviciosAgendados ?? 0, kind: "number" as const, description: "Órdenes con visita hoy.", icon: Calendar, color: "text-[#01ADFB]" },
    { label: "En Proceso (Hoy)", value: data?.today.enProceso ?? 0, kind: "number" as const, description: "Estado PROCESO hoy.", icon: Activity, color: "text-amber-500" },
    { label: "Realizados Hoy", value: data?.today.realizados ?? 0, kind: "number" as const, description: "Estado LIQUIDADO hoy.", icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Ingresos Hoy", value: data?.today.ingresos ?? 0, kind: "currency" as const, description: "Pagado con visita hoy.", icon: TrendingUp, color: "text-[#01ADFB]" },
    { label: "Pendientes Liquidar", value: data?.today.pendientesLiquidar ?? 0, kind: "number" as const, description: "TECNICO_FINALIZO hoy.", icon: Clock, color: "text-indigo-500" },
    { label: "Cancelados Hoy", value: data?.today.cancelados ?? 0, kind: "number" as const, description: "Estado CANCELADO hoy.", icon: XCircle, color: "text-destructive" },
    { label: "Tasa Cancelación", value: data?.today.tasaCancelacion ?? 0, kind: "percent" as const, description: "Cancelados/Agendados hoy.", icon: Percent, color: "text-slate-500" },
    { label: "Sin Cobrar Hoy", value: data?.today.sinCobrar ?? 0, kind: "number" as const, description: "Pago pendiente hoy.", icon: AlertTriangle, color: "text-orange-500" },
  ];

  const globalItems = [
    { label: "En Proceso (Total)", value: data?.global.enProceso ?? 0, kind: "number" as const, description: "Histórico en PROCESO.", icon: Layers, color: "text-amber-500" },
    { label: "Pendientes Liquidar", value: data?.global.pendientesLiquidar ?? 0, kind: "number" as const, description: "Histórico FINALIZADOS.", icon: ClipboardCheck, color: "text-indigo-500" },
    { label: "Realizados (Total)", value: data?.global.realizadosHistorico ?? 0, kind: "number" as const, description: "Histórico LIQUIDADOS.", icon: History, color: "text-emerald-500" },
    { label: "Servicios Totales", value: data?.global.serviciosTotales ?? 0, kind: "number" as const, description: "Total órdenes empresa.", icon: Briefcase, color: "text-[#01ADFB]" },
    { label: "Ingresos Totales", value: data?.global.ingresosTotales ?? 0, kind: "currency" as const, description: "Suma histórica pagada.", icon: BarChart3, color: "text-[#01ADFB]" },
    { label: "Sin Cobrar Total", value: data?.global.sinCobrarTotales ?? 0, kind: "number" as const, description: "Finalizadas con pago pendiente.", icon: CreditCard, color: "text-orange-500" },
    { label: "Cancelados (Total)", value: data?.global.cancelados ?? 0, kind: "number" as const, description: "Histórico CANCELADOS.", icon: FileX, color: "text-destructive" },
    { label: "Tasa de Cancelación", value: data?.global.tasaCancelacion ?? 0, kind: "percent" as const, description: "Cancelados/Totales.", icon: PieChart, color: "text-slate-500" },
  ];

  // eslint-disable-next-line react/no-unstable-nested-components
  const MetricItem = ({ item }: { item: typeof todayItems[0] }) => (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border/50 bg-background/40 p-4 transition-all duration-300 hover:border-[#01ADFB]/40 hover:bg-background/60 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className={cn("rounded-xl bg-muted/50 p-2 transition-transform group-hover:scale-110", item.color)}>
          <item.icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Métrica</span>
      </div>
      
      <div className="mt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1 line-clamp-1">{item.label}</p>
        <h4 className="text-xl font-black tracking-tighter text-foreground">
          {formatValue(item.value, item.kind)}
        </h4>
        <p className="mt-1 text-[10px] leading-tight text-muted-foreground/70 font-medium line-clamp-2">
          {item.description}
        </p>
      </div>
    </div>
  );

  return (
    <section className="relative space-y-10">
      <div className="space-y-6">
        <h3 className="text-xl font-black uppercase tracking-widest text-foreground pl-2 border-l-4 border-[#01ADFB]">
          Resumen de <span className="text-[#01ADFB]">Hoy</span>
        </h3>
        <div className="rounded-3xl border border-border bg-card/30 p-6 shadow-sm backdrop-blur-md">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {todayItems.map((item) => (
              <MetricItem key={item.label} item={item} />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-black uppercase tracking-widest text-foreground pl-2 border-l-4 border-[#01ADFB]">
          Estadísticas <span className="text-[#01ADFB]">Globales</span>
        </h3>
        <div className="rounded-3xl border border-border bg-card/30 p-6 shadow-sm backdrop-blur-md">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {globalItems.map((item) => (
              <MetricItem key={item.label} item={item} />
            ))}
          </div>
        </div>
      </div>
      
      {isConfiguring && (
        <WidgetConfigurator onMoveUp={onMoveUp} onMoveDown={onMoveDown} onHide={onHide || (() => {})} />
      )}
    </section>
  );
});
