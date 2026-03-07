"use client";

import React from "react";
import { TrendingUp, Users, CheckCircle2, DollarSign } from "lucide-react";
import { cn } from "@/components/ui/utils";

type TeamKpis = {
  totalRecaudo: number;
  totalServicios: number;
  serviciosLiquidados: number;
  serviciosPendientes: number;
  efectividadEquipo: number;
  ticketPromedio: number;
  comparison: {
    totalRecaudoChangePct: number;
    serviciosLiquidadosChangePct: number;
    efectividadChangePct: number;
  };
};

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;

const formatDelta = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

export function TeamKpiStrip({ kpis }: { kpis: TeamKpis }) {
  const cards = [
    {
      title: "Recaudo total",
      value: formatCurrency(kpis.totalRecaudo),
      trend: formatDelta(kpis.comparison.totalRecaudoChangePct),
      icon: DollarSign,
      color: "bg-emerald-500",
      description: "Crecimiento vs período anterior"
    },
    {
      title: "Efectividad",
      value: `${kpis.efectividadEquipo}%`,
      trend: formatDelta(kpis.comparison.efectividadChangePct),
      icon: TrendingUp,
      color: "bg-[#01ADFB]",
      description: "Servicios liquidados vs creados"
    },
    {
      title: "Liquidados",
      value: kpis.serviciosLiquidados.toString(),
      trend: `${kpis.serviciosPendientes} pendientes`,
      icon: CheckCircle2,
      color: "bg-amber-500",
      description: "Meta de cumplimiento diaria"
    },
    {
      title: "Ticket promedio",
      value: formatCurrency(kpis.ticketPromedio),
      trend: `${kpis.totalServicios} servicios`,
      icon: Users,
      color: "bg-purple-500",
      description: "Valor medio por operación"
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((item, i) => (
        <div 
          key={i}
          className="relative overflow-hidden rounded-[2rem] border-2 border-border bg-card/40 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
              {item.title}
            </p>
            <div className={cn("p-2 rounded-xl text-white shadow-lg", item.color)}>
              <item.icon className="h-4 w-4" />
            </div>
          </div>
          
          <div className="text-3xl font-black text-foreground mb-1 tabular-nums">
            {item.value}
          </div>
          
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <p className="text-[10px] font-bold text-accent uppercase tracking-wider">
              {item.trend}
            </p>
            <p className="text-[9px] font-medium text-muted-foreground italic">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
