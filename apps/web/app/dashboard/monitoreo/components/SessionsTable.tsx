"use client";

import React from "react";
import { Activity, RefreshCcw, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { GlassCard } from "./utils";
import { cn } from "@/components/ui/utils";

import { Session } from "../types";

interface SessionsTableProps {
  sessions: Session[];
  isLoading: boolean;
  onOpenLogs: (session: Session) => void;
}

export function SessionsTable({ sessions, isLoading, onOpenLogs }: SessionsTableProps) {
  return (
    <GlassCard className="w-full overflow-hidden">
      <div className="pb-8 pt-2 border-b border-border mb-6 px-2">
        <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Estado de Usuarios en Tiempo Real</h3>
        <p className="text-sm font-medium text-muted-foreground">Monitoreo detallado de actividad y sesiones de usuarios.</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Usuario</th>
              <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Inicio Sesión</th>
              <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Fin Sesión</th>
              <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Estado</th>
              <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Tiempo Inactivo</th>
              <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Último Evento</th>
              <th className="px-6 py-5 text-right font-black uppercase tracking-widest text-[10px] text-muted-foreground">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.isArray(sessions) && sessions.length > 0 ? (
              sessions.map((session) => {
                const lastEvent = session.logs?.[0];
                const isActive = !session.fechaFin;
                const isAway = (session.tiempoInactivo || 0) > 0;
                
                return (
                  <tr key={session.id} className="hover:bg-accent/5 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black">
                          {session.membership?.user?.nombre?.[0] || "?"}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-black text-foreground uppercase tracking-tight text-sm">
                            {session.membership?.user?.nombre} {session.membership?.user?.apellido}
                          </p>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            @{session.membership?.username} • {session.membership?.role}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-bold text-foreground text-sm">
                      {format(new Date(session.fechaInicio), "HH:mm")}
                    </td>
                    <td className="px-6 py-5 font-bold text-muted-foreground text-sm">
                      {session.fechaFin ? format(new Date(session.fechaFin), "HH:mm") : "--:--"}
                    </td>
                    <td className="px-6 py-5">
                      {isActive ? (
                        <span className={cn(
                          "inline-flex items-center rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border shadow-sm",
                          isAway 
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        )}>
                          {isAway ? `Ausente (${session.tiempoInactivo}m)` : "Activo"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-lg bg-muted px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-border shadow-sm">
                          Sesión Finalizada
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 font-bold text-muted-foreground text-sm">
                      {session.tiempoInactivo > 0 ? `${session.tiempoInactivo} min` : "-"}
                    </td>
                    <td className="px-6 py-5">
                      {lastEvent && (
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-foreground tracking-tight uppercase">
                            {lastEvent.tipo}
                          </p>
                          <p className="text-[10px] font-medium text-muted-foreground">
                            hace {formatDistanceToNow(new Date(lastEvent.createdAt), { locale: es })}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={() => onOpenLogs(session)}
                        className="inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-[10px] font-black uppercase tracking-widest text-accent border border-accent/20 shadow-sm hover:bg-accent hover:text-white transition-all"
                      >
                        Ver Logs
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center">
                  {isLoading ? (
                    <RefreshCcw className="h-8 w-8 animate-spin mx-auto text-accent mb-4" />
                  ) : (
                    <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                  )}
                  <p className="font-black uppercase tracking-widest text-xs text-muted-foreground">
                    {isLoading ? "Cargando sesiones..." : "No se encontraron sesiones de actividad"}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
