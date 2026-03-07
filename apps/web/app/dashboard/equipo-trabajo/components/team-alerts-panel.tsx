"use client";

import React from "react";
import { AlertTriangle, UserMinus, ShieldAlert, Bell } from "lucide-react";
import { cn } from "@/components/ui/utils";

type Alerts = {
  noActivity: Array<{ membershipId: string; name: string; role: string }>;
  lowEffectiveness: Array<{ membershipId: string; name: string; efectividad: number }>;
  pendingLiquidation: Array<{ membershipId: string; name: string; pendientes: number }>;
};

export function TeamAlertsPanel({ alerts }: { alerts: Alerts }) {
  const totalAlerts = alerts.noActivity.length + alerts.lowEffectiveness.length + alerts.pendingLiquidation.length;

  if (totalAlerts === 0) return null;

  const alertGroups = [
    {
      id: 'no-activity',
      title: "Sin actividad operativa",
      items: alerts.noActivity.slice(0, 3).map(i => ({ name: i.name, meta: i.role })),
      type: 'danger',
      icon: UserMinus,
      priority: 'alta'
    },
    {
      id: 'low-eff',
      title: "Rendimiento crítico",
      items: alerts.lowEffectiveness.slice(0, 3).map(i => ({ name: i.name, meta: `${i.efectividad}%` })),
      type: 'warning',
      icon: AlertTriangle,
      priority: 'media'
    },
    {
      id: 'pending',
      title: "Pendientes por liquidar",
      items: alerts.pendingLiquidation.slice(0, 3).map(i => ({ name: i.name, meta: `${i.pendientes} serv.` })),
      type: 'info',
      icon: ShieldAlert,
      priority: 'media'
    }
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-4 w-4 text-accent" />
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Alertas de Equipo</h2>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-black text-white shadow-sm">
          {totalAlerts}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {alertGroups.map((group) => (
          group.items.length > 0 && (
            <div 
              key={group.id}
              className={cn(
                "group relative overflow-hidden p-6 rounded-[2rem] border-2 transition-all duration-300 hover:shadow-lg",
                group.type === 'danger' ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40" : 
                group.type === 'warning' ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40" :
                "bg-[#01ADFB]/5 border-[#01ADFB]/20 hover:border-[#01ADFB]/40"
              )}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110 duration-500",
                  group.type === 'danger' ? "bg-red-500 text-white" : 
                  group.type === 'warning' ? "bg-amber-500 text-white" :
                  "bg-[#01ADFB] text-white"
                )}>
                  <group.icon className="h-6 w-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-tighter",
                      group.priority === 'alta' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                      "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      Prioridad {group.priority}
                    </span>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-foreground leading-tight">
                    {group.title}
                  </h3>
                </div>
              </div>

              <div className="space-y-2 mt-2">
                {group.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-background/40 border border-border/50">
                    <span className="text-[11px] font-black uppercase truncate max-w-[120px]">{item.name}</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      group.type === 'danger' ? "bg-red-500/10 text-red-500" :
                      group.type === 'warning' ? "bg-amber-500/10 text-amber-500" :
                      "bg-[#01ADFB]/10 text-[#01ADFB]"
                    )}>
                      {item.meta}
                    </span>
                  </div>
                ))}
              </div>

              {/* Background Icon Decoration */}
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] transition-opacity group-hover:opacity-[0.07]">
                <group.icon className="h-24 w-24" />
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
