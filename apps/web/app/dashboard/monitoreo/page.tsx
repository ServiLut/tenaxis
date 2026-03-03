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
    "relative overflow-hidden rounded-3xl border border-white bg-white/40 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60",
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
            <h1 className="text-4xl font-black tracking-tight text-black dark:text-white lg:text-5xl">
              Monitoreo <span className="text-[#01ADFB]">Sistema</span>
            </h1>
            <p className="text-lg font-medium text-[#706F71]">
              Sigue de cerca la actividad en tiempo real y los registros de auditoría.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-12 items-center gap-2 rounded-2xl bg-white px-6 text-sm font-black uppercase tracking-widest text-[#706F71] shadow-sm border border-[#706F71]/20 transition-all hover:bg-zinc-50 dark:bg-zinc-900 dark:text-white dark:border-white/10">
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
        <div className="flex items-center gap-1.5 rounded-2xl bg-[#706F71]/5 p-1.5 w-fit border border-[#706F71]/10">
          <button
            onClick={() => setActiveTab("actividad")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300",
              activeTab === "actividad"
                ? "bg-white text-[#01ADFB] shadow-md dark:bg-zinc-900"
                : "text-[#706F71] hover:text-black dark:hover:text-white"
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
                ? "bg-white text-[#01ADFB] shadow-md dark:bg-zinc-900"
                : "text-[#706F71] hover:text-black dark:hover:text-white"
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
                  { title: "Sesiones Activas", value: "12", icon: Activity, trend: "+2", color: "#01ADFB" },
                  { title: "Peticiones API", value: "2,345", icon: Zap, trend: "+18%", color: "#021359" },
                  { title: "Técnicos Online", value: "8", icon: CheckCircle2, trend: "Estable", color: "#01ADFB" },
                  { title: "Latencia", value: "145ms", icon: Clock, trend: "-12ms", color: "#706F71" },
                ].map((stat, i) => (
                  <GlassCard key={i} className="group hover:scale-[1.02] cursor-default">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-[#706F71] uppercase tracking-[0.2em]">{stat.title}</p>
                      <div className={cn("p-2 rounded-xl text-white", i % 2 === 0 ? "bg-[#01ADFB]" : "bg-[#021359]")}>
                        <stat.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-black dark:text-white mb-1">{stat.value}</div>
                    <p className="text-[10px] font-bold text-[#01ADFB] uppercase tracking-wider">{stat.trend} hoy</p>
                  </GlassCard>
                ))}
              </div>

              {/* Activity List */}
              <GlassCard className="w-full">
                <div className="pb-8 pt-2 border-b border-[#706F71]/10 mb-6">
                  <h3 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">Eventos en Tiempo Real</h3>
                  <p className="text-sm font-medium text-[#706F71]">Monitoreo de actividad concurrente en el sistema.</p>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-6 rounded-2xl border border-[#706F71]/10 p-5 transition-all hover:bg-white/60 dark:hover:bg-zinc-800/50 group">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#01ADFB]/10 text-[#01ADFB] transition-transform group-hover:rotate-6">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-black uppercase tracking-tight text-black dark:text-white">
                          Inicio de Sesión Exitoso
                        </p>
                        <p className="text-xs font-medium text-[#706F71]">
                          <span className="text-black dark:text-white font-bold">admin@tenaxis.com</span> • IP: 192.168.1.{i}
                        </p>
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#706F71]">Hace {i * 5} min</div>
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
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#706F71] group-focus-within:text-[#01ADFB] transition-colors" />
                  <input 
                    placeholder="Buscar en registros..." 
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white border-none shadow-sm ring-1 ring-[#706F71]/20 focus:ring-2 focus:ring-[#01ADFB]/20 text-sm font-bold transition-all outline-none"
                  />
                </div>
                <button className="h-14 px-8 flex items-center gap-2 rounded-2xl bg-white text-[#706F71] font-black uppercase tracking-widest text-[11px] shadow-sm border border-[#706F71]/20 hover:bg-zinc-50 transition-all active:scale-95">
                  <Filter className="h-4 w-4" />
                  Filtros Avanzados
                </button>
              </div>

              {/* Audit Table */}
              <GlassCard className="w-full overflow-hidden">
                <div className="pb-8 pt-2 border-b border-[#706F71]/10 mb-6 px-2">
                  <h3 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">Registros de Auditoría</h3>
                  <p className="text-sm font-medium text-[#706F71]">Historial detallado de cambios y transacciones.</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#706F71]/5 bg-[#706F71]/5">
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-[#706F71]">Fecha</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-[#706F71]">Usuario</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-[#706F71]">Acción</th>
                        <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-[#706F71]">Entidad</th>
                        <th className="px-6 py-5 text-right font-black uppercase tracking-widest text-[10px] text-[#706F71]">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#706F71]/5">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <tr key={i} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-5 text-[#706F71] font-medium text-xs">26 Feb, 2026 • 10:2{i} AM</td>
                          <td className="px-6 py-5 font-black text-black dark:text-white uppercase tracking-tight text-sm">Daniela G.</td>
                          <td className="px-6 py-5 font-bold text-[#021359] dark:text-[#01ADFB] text-sm">Actualización</td>
                          <td className="px-6 py-5 text-[#706F71] font-bold text-xs uppercase">Cliente #{1023 + i}</td>
                          <td className="px-6 py-5 text-right">
                            <span className="inline-flex items-center rounded-lg bg-[#01ADFB]/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#01ADFB] border border-[#01ADFB]/20 shadow-sm">
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
