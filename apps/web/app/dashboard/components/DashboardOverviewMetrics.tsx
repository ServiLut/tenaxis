"use client";

import React from "react";
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
    { label: "Servicios Agendados", value: data?.today.serviciosAgendados ?? 0, kind: "number" as const, description: "Órdenes con fecha de visita hoy." },
    { label: "En Proceso (Hoy)", value: data?.today.enProceso ?? 0, kind: "number" as const, description: "Estado PROCESO con visita hoy." },
    { label: "Realizados Hoy", value: data?.today.realizados ?? 0, kind: "number" as const, description: "Estado LIQUIDADO con visita hoy." },
    { label: "Ingresos Hoy", value: data?.today.ingresos ?? 0, kind: "currency" as const, description: "Pagado/conciliado con visita hoy." },
    { label: "Pendientes Liquidar (Hoy)", value: data?.today.pendientesLiquidar ?? 0, kind: "number" as const, description: "Estado TECNICO_FINALIZO con visita hoy." },
    { label: "Cancelados Hoy", value: data?.today.cancelados ?? 0, kind: "number" as const, description: "Estado CANCELADO con visita hoy." },
    { label: "Tasa Cancelación Hoy", value: data?.today.tasaCancelacion ?? 0, kind: "percent" as const, description: "Cancelados hoy / agendados hoy." },
    { label: "Sin Cobrar Hoy", value: data?.today.sinCobrar ?? 0, kind: "number" as const, description: "Pago pendiente en órdenes finalizadas hoy." },
  ];

  const globalItems = [
    { label: "En Proceso (Total)", value: data?.global.enProceso ?? 0, kind: "number" as const, description: "Total histórico en estado PROCESO." },
    { label: "Pendientes Liquidar", value: data?.global.pendientesLiquidar ?? 0, kind: "number" as const, description: "Total histórico en TECNICO_FINALIZO." },
    { label: "Realizados (Histórico)", value: data?.global.realizadosHistorico ?? 0, kind: "number" as const, description: "Total histórico en LIQUIDADO." },
    { label: "Servicios Totales", value: data?.global.serviciosTotales ?? 0, kind: "number" as const, description: "Total de órdenes del tenant/empresa." },
    { label: "Ingresos Totales", value: data?.global.ingresosTotales ?? 0, kind: "currency" as const, description: "Suma histórica pagada/conciliada." },
    { label: "Sin Cobrar Totales", value: data?.global.sinCobrarTotales ?? 0, kind: "number" as const, description: "Finalizadas con estadoPago PENDIENTE." },
    { label: "Cancelados (Total)", value: data?.global.cancelados ?? 0, kind: "number" as const, description: "Total histórico en estado CANCELADO." },
    { label: "Tasa de Cancelación", value: data?.global.tasaCancelacion ?? 0, kind: "percent" as const, description: "Cancelados totales / servicios totales." },
  ];

  return (
    <section className="relative space-y-6">
      <div className="rounded-3xl border border-border bg-card/40 p-6 shadow-sm backdrop-blur-md">
        <h4 className="text-2xl font-black tracking-tight text-foreground">Resumen de Hoy</h4>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {todayItems.map((item) => (
            <div
              key={item.label}
              className={cn(
                "rounded-2xl border border-border/70 bg-background/60 px-4 py-3",
                item.kind === "currency" && "border-[#01ADFB]/40"
              )}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-black tracking-tight text-foreground">
                {formatValue(item.value, item.kind)}
              </p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground/90">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card/40 p-6 shadow-sm backdrop-blur-md">
        <h4 className="text-2xl font-black tracking-tight text-foreground">Estadísticas Globales</h4>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {globalItems.map((item) => (
            <div
              key={item.label}
              className={cn(
                "rounded-2xl border border-border/70 bg-background/60 px-4 py-3",
                item.kind === "currency" && "border-[#01ADFB]/40"
              )}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-black tracking-tight text-foreground">
                {formatValue(item.value, item.kind)}
              </p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground/90">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
      {isConfiguring && (
        <WidgetConfigurator onMoveUp={onMoveUp} onMoveDown={onMoveDown} onHide={onHide || (() => {})} />
      )}
    </section>
  );
});
