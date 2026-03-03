"use client";

import React, { useState } from "react";
import { 
  Activity, 
  History, 
  Search, 
  Filter, 
  Download,
  CheckCircle2,
  Clock,
  RefreshCcw,
  Zap,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard";

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "relative overflow-hidden rounded-3xl border border-border bg-card/40 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md",
    className
  )}>
    {children}
  </div>
);

export default function MonitoreoPage() {
  const [activeTab, setActiveTab] = useState<"actividad" | "auditoria">("actividad");

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-foreground lg:text-5xl">
              Monitoreo <span className="text-[#01ADFB]">Sistema</span>
            </h1>
            <p className="text-lg font-medium text-muted-foreground">
              Sigue de cerca la actividad en tiempo real y los registros de auditoría.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-12 items-center gap-2 rounded-2xl bg-card px-6 text-sm font-black uppercase tracking-widest text-muted-foreground shadow-sm border border-border transition-all hover:bg-[#01ADFB]/5 hover:text-[#01ADFB]">
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button className="flex h-12 items-center gap-2 rounded-2xl bg-[#01ADFB] px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95">
              <RefreshCcw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-muted p-1.5 w-fit border border-border">
          <button
            onClick={() => setActiveTab("actividad")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300",
              activeTab === "actividad"
                ? "bg-background text-accent shadow-md"
                : "text-muted-foreground hover:text-foreground"
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
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-4 w-4" />
            Auditoría
          </button>
        </div>

        {/* Content Area */}
        <div className="mt-4 space-y-8">
          {activeTab === "actividad" ? (
            <div className="space-y-10">
              {/* Stats Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 w-full">
                {[
                  { title: "Sesiones Activas", value: "12", icon: Activity, trend: "+2" },
                  { title: "Peticiones API", value: "2,345", icon: Zap, trend: "+18%" },
                  { title: "Técnicos Online", value: "8", icon: CheckCircle2, trend: "Estable" },
                  { title: "Latencia", value: "145ms", icon: Clock, trend: "-12ms" },
                ].map((stat, i) => (
                  <GlassCard key={i} className="group hover:scale-[1.02] cursor-default">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.title}</p>
                      <div className={cn("p-2 rounded-xl text-white", i % 2 === 0 ? "bg-accent" : "bg-primary")}>
                        <stat.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-foreground mb-1">{stat.value}</div>
                    <p className="text-[10px] font-bold text-accent uppercase tracking-wider">{stat.trend} hoy</p>
                  </GlassCard>
                ))}
              </div>

              {/* Activity List */}
              <GlassCard className="w-full">
                <div className="pb-8 pt-2 border-b border-border mb-6">
                  <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Eventos en Tiempo Real</h3>
                  <p className="text-sm font-medium text-muted-foreground">Monitoreo de actividad concurrente en el sistema.</p>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-6 rounded-2xl border border-border p-5 transition-all hover:bg-accent/5 group">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-transform group-hover:rotate-6">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-black uppercase tracking-tight text-foreground">
                          Inicio de Sesión Exitoso
                        </p>
                        <p className="text-xs font-medium text-muted-foreground">
                          <span className="text-foreground font-bold">admin@tenaxis.com</span> • IP: 192.168.1.{i}
                        </p>
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hace {i * 5} min</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" />
                  <input 
                    placeholder="Buscar en registros..." 
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-card text-foreground border-none shadow-sm ring-1 ring-border focus:ring-2 focus:ring-accent/20 text-sm font-bold transition-all outline-none"
                  />
                </div>
                <button className="h-14 px-8 flex items-center gap-2 rounded-2xl bg-card text-muted-foreground font-black uppercase tracking-widest text-[11px] shadow-sm border border-border hover:bg-accent/5 hover:text-foreground transition-all active:scale-95">
                  <Filter className="h-4 w-4" />
                  Filtros Avanzados
                </button>
              </div>

              {/* Audit Table */}
              <GlassCard className="w-full overflow-hidden">
                <div className="pb-8 pt-2 border-b border-border mb-6 px-2">
                  <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Registros de Auditoría</h3>
                  <p className="text-sm font-medium text-muted-foreground">Historial detallado de cambios y transacciones.</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Fecha</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Usuario</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Acción</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Entidad</th>
                        <th className="px-6 py-5 text-right font-black uppercase tracking-widest text-[10px] text-muted-foreground">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <tr key={i} className="hover:bg-accent/5 transition-colors group">
                          <td className="px-6 py-5 text-muted-foreground font-medium text-xs">26 Feb, 2026 • 10:2{i} AM</td>
                          <td className="px-6 py-5 font-black text-foreground uppercase tracking-tight text-sm">Daniela G.</td>
                          <td className="px-6 py-5 font-bold text-accent text-sm">Actualización</td>
                          <td className="px-6 py-5 text-muted-foreground font-bold text-xs uppercase">Cliente #{1023 + i}</td>
                          <td className="px-6 py-5 text-right">
                            <span className="inline-flex items-center rounded-lg bg-accent/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-accent border border-accent/20 shadow-sm">
                              Exitoso
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
