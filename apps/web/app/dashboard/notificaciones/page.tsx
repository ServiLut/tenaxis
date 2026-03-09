"use client";

import React from "react";
import { DashboardLayout } from "@/components/dashboard";
import { Bell, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/components/ui/utils";

const notifications = [
  {
    id: 1,
    title: "Nueva solicitud de membresía",
    description: "Un nuevo usuario ha solicitado unirse a Tenaxis Operaciones SAS.",
    time: "Hace 5 minutos",
    type: "info",
    icon: Shield,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: 2,
    title: "Alerta de sistema",
    description: "El servicio de monitoreo detectó una latencia inusual en la API.",
    time: "Hace 15 minutos",
    type: "warning",
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    id: 3,
    title: "Tarea completada",
    description: "La sincronización de departamentos y municipios finalizó correctamente.",
    time: "Hace 1 hora",
    type: "success",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
];

export default function NotificacionesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
              Notificaciones
            </h1>
            <p className="text-zinc-500 font-medium">
              Mantente al tanto de lo que sucede en tu organización.
            </p>
          </div>
        </div>

        <div className="grid gap-4 max-w-4xl">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="group relative flex items-start gap-5 p-6 rounded-[2rem] bg-white dark:bg-zinc-950 border-2 border-border/50 hover:border-border transition-all hover:shadow-xl"
            >
              <div className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner",
                notif.bg,
                notif.color
              )}>
                <notif.icon className="h-6 w-6" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-black uppercase tracking-tight text-foreground">
                    {notif.title}
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                    {notif.time}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {notif.description}
                </p>
              </div>

              <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="text-[10px] font-black uppercase tracking-[0.2em] text-[#01ADFB] hover:underline">
                  Marcar como leída
                </button>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black tracking-tight">Sin notificaciones</h3>
                <p className="text-muted-foreground font-medium">
                  No tienes mensajes pendientes por revisar.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
