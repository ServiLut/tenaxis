"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout, JoinOrganization } from "@/components/dashboard";
import { cn } from "@/components/ui/utils";
import {
  Users,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Plus,
  Download,
  MoreVertical,
} from "lucide-react";

// --- Components ---

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md dark:border-white/5 dark:bg-white/5",
    className
  )}>
    {children}
  </div>
);

const CircularProgress = ({ progress, color, size = 60 }: { progress: number; color: string; size?: number }) => {
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          className="text-zinc-200 dark:text-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-black text-zinc-900 dark:text-zinc-100">{progress}%</span>
    </div>
  );
};

const MiniBarChart = () => {
  const data = [40, 70, 45, 90, 65, 80, 50];
  return (
    <div className="flex h-12 items-end gap-1.5">
      {data.map((height, i) => (
        <div
          key={i}
          className={cn(
            "w-2 rounded-full transition-all duration-500",
            i % 2 === 0 ? "bg-[#01ADFB]" : "bg-[#021359] dark:bg-white/20"
          )}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
};

// --- Data ---

const stats = [
  {
    title: "Clientes Totales",
    value: "1,248",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    color: "#01ADFB",
    progress: 78,
  },
  {
    title: "Servicios Hoy",
    value: "42",
    change: "+4.3%",
    trend: "up",
    icon: Briefcase,
    color: "#01ADFB", // Usamos acento para mejor visibilidad
    progress: 62,
  },
  {
    title: "Ingresos Mes",
    value: "$12,450",
    change: "+18.2%",
    trend: "up",
    icon: TrendingUp,
    color: "#01ADFB",
    progress: 85,
  },
  {
    title: "Alertas Activas",
    value: "3",
    change: "-2",
    trend: "down",
    icon: AlertTriangle,
    color: "#706F71",
    progress: 15,
  },
];

const recentServices = [
  { id: 1, name: "Mantenimiento AC", client: "Cliente #154", tech: "Carlos Ruiz", time: "2h ago", price: "$120", status: "Done" },
  { id: 2, name: "Reparación Eléctrica", client: "Cliente #089", tech: "Ana Beltrán", time: "4h ago", price: "$85", status: "Done" },
  { id: 3, name: "Instalación Red", client: "Cliente #210", tech: "Juan Pérez", time: "5h ago", price: "$350", status: "Pending" },
  { id: 4, name: "Soporte Remoto", client: "Cliente #044", tech: "Carlos Ruiz", time: "1d ago", price: "$45", status: "Done" },
];

export default function DashboardPage() {
  const [hasTenant, setHasTenant] = useState<boolean | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    let tenantExists = false;

    if (userData && userData !== "undefined") {
      try {
        const user = JSON.parse(userData);
        tenantExists = !!user.tenantId;
        
        if (user.tenantId) {
          const hasTenantCookie = document.cookie.split('; ').some(row => row.startsWith('tenant-id='));
          if (!hasTenantCookie) {
            document.cookie = `tenant-id=${user.tenantId}; path=/; max-age=86400; SameSite=Lax`;
          }
        }
      } catch {
        tenantExists = false;
      }
    }

    const frameId = requestAnimationFrame(() => {
      setHasTenant(tenantExists);
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  if (hasTenant === null) return null;

  if (!hasTenant) {
    return (
      <DashboardLayout>
        <JoinOrganization />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-10">
        
        {/* Header & Actions */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 lg:text-5xl">
              Dashboard <span className="text-[#01ADFB]">Analytics</span>
            </h1>
            <p className="text-lg font-medium text-zinc-500 dark:text-zinc-400">
              Bienvenido de nuevo. Aquí tienes un resumen del rendimiento actual.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex h-12 items-center gap-2 rounded-2xl bg-white dark:bg-zinc-900 px-6 text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-800 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800">
              <Download className="h-4 w-4" />
              Reporte
            </button>
            <button className="flex h-12 items-center gap-2 rounded-2xl bg-[#01ADFB] px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95">
              <Plus className="h-5 w-5" />
              Nueva Orden
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <GlassCard key={stat.title} className="group">
              <div className="flex items-start justify-between">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110",
                  stat.title === "Clientes Totales" && "bg-[#01ADFB]",
                  stat.title === "Servicios Hoy" && "bg-[#021359] dark:bg-[#01ADFB]",
                  stat.title === "Ingresos Mes" && "bg-[#01ADFB]",
                  stat.title === "Alertas Activas" && "bg-zinc-500 dark:bg-zinc-700"
                )}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <CircularProgress progress={stat.progress} color={stat.color} />
              </div>
              
              <div className="mt-6 space-y-1">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                  {stat.title}
                </p>
                <h3 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
                  {stat.value}
                </h3>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50 pt-4">
                <div className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black",
                  stat.trend === "up" ? "bg-[#01ADFB]/10 text-[#01ADFB]" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                )}>
                  {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.change}
                </div>
                <MiniBarChart />
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Revenue Chart Widget */}
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Ingresos Semanales</h2>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Tendencia de ingresos de los últimos 7 días</p>
              </div>
              <button className="flex items-center gap-2 rounded-xl bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <Download className="h-4 w-4" />
                Exportar
              </button>
            </div>

            <div className="flex h-64 items-end justify-between gap-4 px-2">
              {[65, 45, 75, 55, 90, 60, 85].map((h, i) => (
                <div key={i} className="group relative flex flex-1 flex-col items-center gap-2">
                  <div className="absolute -top-10 opacity-0 transition-all group-hover:top-[-45px] group-hover:opacity-100">
                    <div className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-2 py-1 text-[10px] font-bold text-zinc-100 dark:text-zinc-900 shadow-xl">
                      ${h * 15}
                    </div>
                  </div>
                  <div 
                    className={cn(
                      "w-full rounded-2xl transition-all duration-700 ease-out group-hover:brightness-110",
                      i === 4 ? "bg-[#01ADFB] shadow-[0_0_20px_rgba(1,173,251,0.3)]" : "bg-zinc-200 dark:bg-zinc-800"
                    )}
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-400">
                    {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"][i]}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Quick Actions & Tasks */}
          <div className="space-y-6">
            <GlassCard className="bg-gradient-to-br from-[#021359] to-[#01ADFB] dark:from-[#01ADFB]/20 dark:to-zinc-900 border-none text-white overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-xl font-black tracking-tight text-white dark:text-zinc-50">Nueva Orden de Servicio</h3>
                <p className="mt-2 text-sm font-medium text-white/80 dark:text-zinc-300">Genera una nueva solicitud de mantenimiento rápidamente.</p>
                <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white dark:bg-zinc-100 px-6 py-4 text-sm font-black uppercase tracking-widest text-[#021359] dark:text-zinc-900 shadow-xl transition-transform hover:scale-[1.02] active:scale-95">
                  Comenzar Ahora
                  <ArrowUpRight className="h-5 w-5" />
                </button>
              </div>
              <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-white/10 dark:bg-white/5 blur-3xl" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-[#01ADFB]/30 dark:bg-[#01ADFB]/10 blur-3xl" />
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">Acciones Recomendadas</h3>
              <div className="mt-6 space-y-3">
                {[
                  { label: "Validar Facturas Pendientes", color: "bg-[#01ADFB]" },
                  { label: "Actualizar Inventario", color: "bg-[#021359] dark:bg-[#01ADFB]" },
                  { label: "Revisar Alertas Críticas", color: "bg-zinc-400 dark:bg-zinc-600" },
                ].map((action, i) => (
                  <button key={i} className="flex w-full items-center gap-4 rounded-2xl bg-white dark:bg-zinc-900/50 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800">
                    <div className={cn("h-2 w-2 rounded-full", action.color)} />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{action.label}</span>
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Recent Activity Table */}
          <GlassCard className="lg:col-span-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-6">
              <div>
                <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Actividad Reciente</h2>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Últimas operaciones realizadas en el sistema</p>
              </div>
              <button className="text-xs font-black uppercase tracking-widest text-[#01ADFB] hover:underline transition-all">
                Ver Todo el Historial
              </button>
            </div>
            
            <div className="mt-6 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    <th className="pb-4 pl-2">Servicio</th>
                    <th className="pb-4">Cliente</th>
                    <th className="pb-4">Técnico</th>
                    <th className="pb-4">Monto</th>
                    <th className="pb-4">Estado</th>
                    <th className="pb-4 text-right pr-2">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recentServices.map((service) => (
                    <tr key={service.id} className="group transition-colors hover:bg-zinc-50/50 dark:hover:bg-white/5">
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-azul-1/10 text-azul-1">
                            <Briefcase className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{service.name}</p>
                            <p className="text-[10px] font-medium text-zinc-400">{service.time}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">{service.client}</td>
                      <td className="py-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">{service.tech}</td>
                      <td className="py-4 text-sm font-black text-zinc-900 dark:text-zinc-50">{service.price}</td>
                      <td className="py-4">
                        <span className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                          service.status === "Done" ? "bg-emerald-100/50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-amber-100/50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                        )}>
                          {service.status === "Done" ? "Completado" : "Pendiente"}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

        </div>
      </div>
    </DashboardLayout>
  );
}
