"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout, JoinOrganization } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/components/ui/utils";
import {
  Users,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  LucideIcon,
} from "lucide-react";

type StatItem = {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: LucideIcon;
  color: string;
};

const stats: StatItem[] = [
  {
    title: "Clientes Totales",
    value: "1,248",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    color: "blue",
  },
  {
    title: "Servicios Hoy",
    value: "42",
    change: "+4.3%",
    trend: "up",
    icon: Briefcase,
    color: "indigo",
  },
  {
    title: "Ingresos Mes",
    value: "$12,450",
    change: "+18.2%",
    trend: "up",
    icon: TrendingUp,
    color: "emerald",
  },
  {
    title: "Alertas Activas",
    value: "3",
    change: "-2",
    trend: "down",
    icon: AlertTriangle,
    color: "amber",
  },
];

const colorVariants: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white",
};

export default function DashboardPage() {
  const [hasTenant, setHasTenant] = useState<boolean | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    let tenantExists = false;

    if (userData && userData !== "undefined") {
      try {
        const user = JSON.parse(userData);
        tenantExists = !!user.tenantId;
        
        // Sync cookie if missing
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
      <div className="space-y-10">
        {/* Welcome Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
              Vista General
            </h1>
            <p className="text-zinc-500 dark:text-zinc-300 font-medium text-lg">
              Aquí tienes un resumen de lo que está pasando hoy.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="h-12 rounded-xl bg-azul-1 px-6 text-sm font-black uppercase tracking-widest text-zinc-50 shadow-lg shadow-azul-1/20 transition-all hover:bg-blue-700 dark:hover:bg-blue-600">
              Nueva Orden
            </button>
            <button className="h-12 rounded-xl bg-white px-6 text-sm font-black uppercase tracking-widest text-zinc-900 shadow-sm border border-zinc-200 transition-all hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Descargar Reporte
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="group relative overflow-hidden border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 transition-all hover:scale-[1.02] duration-300 ring-1 ring-zinc-200/50 dark:ring-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-300">
                  {stat.title}
                </CardTitle>
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-[1.25rem] transition-all duration-300",
                  colorVariants[stat.color]
                )}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {stat.value}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black tabular-nums",
                    stat.trend === "up" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300"
                  )}>
                    {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {stat.change}
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-300 uppercase tracking-widest">
                    vs mes pasado
                  </span>
                </div>
              </CardContent>
              {/* Subtle accent line */}
              <div className={cn(
                "absolute bottom-0 left-0 h-1 w-full opacity-30",
                stat.color === "blue" && "bg-blue-600",
                stat.color === "indigo" && "bg-indigo-600",
                stat.color === "emerald" && "bg-emerald-600",
                stat.color === "amber" && "bg-amber-600"
              )} />
            </Card>
          ))}
        </div>

        {/* Main Content Sections */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Recent Services */}
          <Card className="lg:col-span-2 border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 ring-1 ring-zinc-200/50 dark:ring-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-50 dark:border-zinc-800/50 pb-6">
              <div>
                <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3 text-zinc-900 dark:text-zinc-50">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  Servicios Recientes
                </CardTitle>
                <p className="text-sm text-zinc-500 dark:text-zinc-300 font-medium mt-1">
                  Últimas 5 órdenes de servicio generadas.
                </p>
              </div>
              <button className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 dark:text-claro-azul-4 transition-colors">
                Ver todos
              </button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between group cursor-pointer border-b border-zinc-100 pb-4 last:border-0 last:pb-0 dark:border-zinc-800/50">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-[1rem] transition-colors",
                        i % 2 === 0 ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300" : "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
                      )}>
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-claro-azul-4 transition-colors">
                          Mantenimiento AC - Cliente #{i}54
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-300 font-medium">
                          Técnico: Carlos Ruiz · Hace {i} horas
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-zinc-900 dark:text-zinc-50 tabular-nums">$120.00</p>
                      <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                        Completado
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions / Activity */}
          <Card className="border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 ring-1 ring-zinc-200/50 dark:ring-zinc-800">
            <CardHeader>
              <CardTitle className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <button className="group flex w-full items-center justify-between rounded-2xl bg-azul-1 p-4 text-zinc-50 transition-all hover:bg-blue-700 dark:hover:bg-blue-600 shadow-lg shadow-azul-1/20">
                <span className="text-sm font-black uppercase tracking-widest">Nueva Orden</span>
                <div className="bg-white/20 p-2 rounded-lg transition-transform group-hover:rotate-45">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </button>
              <button className="group flex w-full items-center justify-between rounded-2xl border-2 border-zinc-100 p-4 text-zinc-900 transition-all hover:bg-indigo-50 hover:border-indigo-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-indigo-950/30">
                <span className="text-sm font-black uppercase tracking-widest group-hover:text-indigo-600 dark:group-hover:text-claro-azul-4">Añadir Cliente</span>
                <Users className="h-5 w-5 text-zinc-400 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-claro-azul-4" />
              </button>
              <button className="group flex w-full items-center justify-between rounded-2xl border-2 border-zinc-100 p-4 text-zinc-900 transition-all hover:bg-emerald-50 hover:border-emerald-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-emerald-950/30">
                <span className="text-sm font-black uppercase tracking-widest group-hover:text-emerald-600 dark:group-hover:text-claro-azul-4">Generar Reporte</span>
                <TrendingUp className="h-5 w-5 text-zinc-400 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-claro-azul-4" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
