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

export default function MonitoreoPage() {
  const [activeTab, setActiveTab] = useState<"actividad" | "auditoria">("actividad");

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-8">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Monitoreo</h2>
            <p className="text-muted-foreground">
              Sigue de cerca la actividad del sistema y los registros de auditoría.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="dark:text-zinc-300 dark:border-zinc-800">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button variant="outline" size="sm" className="dark:text-zinc-300 dark:border-zinc-800">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800 w-fit">
          <button
            onClick={() => setActiveTab("actividad")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "actividad"
                ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
          >
            <Activity className="h-4 w-4" />
            Actividad
          </button>
          <button
            onClick={() => setActiveTab("auditoria")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "auditoria"
                ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
          >
            <History className="h-4 w-4" />
            Auditoría
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {activeTab === "actividad" ? (
            <div className="space-y-4">
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 w-full">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 pt-2 px-3">
                    <CardTitle className="text-[10px] font-semibold text-zinc-950 dark:text-zinc-300 uppercase tracking-wider">Sesiones Activas</CardTitle>
                    <Activity className="h-3 w-3 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-2 px-3">
                    <div className="text-lg font-bold leading-tight text-zinc-950 dark:text-zinc-300">12</div>
                    <p className="text-[9px] text-muted-foreground font-medium">+2 desde la última hora</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 pt-2 px-3">
                    <CardTitle className="text-[10px] font-semibold text-zinc-950 dark:text-zinc-300 uppercase tracking-wider">Peticiones API</CardTitle>
                    <Zap className="h-3 w-3 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-2 px-3">
                    <div className="text-lg font-bold leading-tight text-zinc-950 dark:text-zinc-300">2,345</div>
                    <p className="text-[9px] text-muted-foreground font-medium">+18% vs ayer</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 pt-2 px-3">
                    <CardTitle className="text-[10px] font-semibold text-zinc-950 dark:text-zinc-300 uppercase tracking-wider">Tasa de Errores</CardTitle>
                    <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-2 px-3">
                    <div className="text-lg font-bold leading-tight text-zinc-950 dark:text-zinc-300">0.04%</div>
                    <p className="text-[9px] text-muted-foreground font-medium">-0.01% estable</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 pt-2 px-3">
                    <CardTitle className="text-[10px] font-semibold text-zinc-950 dark:text-zinc-300 uppercase tracking-wider">Latencia Promedio</CardTitle>
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-2 px-3">
                    <div className="text-lg font-bold leading-tight text-zinc-950 dark:text-zinc-300">145ms</div>
                    <p className="text-[9px] text-muted-foreground font-medium">-12ms de promedio</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="w-full">
                <CardHeader className="pb-6 pt-8 px-8">
                  <CardTitle className="text-2xl font-bold">Actividad Reciente</CardTitle>
                  <CardDescription className="text-sm">Eventos en tiempo real del sistema.</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-azul-1/10 text-azul-1">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-base font-bold leading-none text-zinc-950 dark:text-zinc-100">
                            Usuario inició sesión
                          </p>
                          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            <span className="text-zinc-900 dark:text-zinc-300 font-bold">admin@tenaxis.com</span> desde 192.168.1.1
                          </p>
                        </div>
                        <div className="text-sm font-bold text-zinc-400">Hace {i * 5} min</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 w-full">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar en los registros de auditoría..." className="pl-12 h-12 text-base" />
                </div>
                <Button variant="outline" size="lg" className="h-12 px-6 text-zinc-950 dark:text-zinc-300 dark:border-zinc-800">
                  <Filter className="mr-2 h-5 w-5 text-zinc-950 dark:text-zinc-300" />
                  Filtros
                </Button>
              </div>

              <Card className="w-full">
                <CardHeader className="pb-6 pt-8 px-8">
                  <CardTitle className="text-2xl font-bold">Registros de Auditoría</CardTitle>
                  <CardDescription className="text-sm">Historial detallado de cambios y accesos.</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <table className="w-full text-base">
                      <thead>
                        <tr className="border-b bg-zinc-50/50 dark:bg-zinc-900/50">
                          <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs text-zinc-500">Fecha</th>
                          <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs text-zinc-500">Usuario</th>
                          <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs text-zinc-500">Acción</th>
                          <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs text-zinc-500">Entidad</th>
                          <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs text-zinc-500">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                            <td className="px-6 py-5 text-muted-foreground font-medium">26 Feb, 2026 10:2{i} AM</td>
                            <td className="px-6 py-5 font-bold text-zinc-950 dark:text-zinc-300">Daniela G.</td>
                            <td className="px-6 py-5 font-medium text-zinc-600 dark:text-zinc-300">Actualización</td>
                            <td className="px-6 py-5 text-muted-foreground font-medium">Cliente #1023</td>
                            <td className="px-6 py-5">
                              <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-green-700">
                                Exitoso
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
