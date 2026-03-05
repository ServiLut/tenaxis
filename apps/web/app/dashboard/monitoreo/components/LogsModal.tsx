"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Terminal, RefreshCcw, CheckCircle2, Smartphone, Monitor, Activity, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { sanitizeString } from "./utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";

import { Membership, Log } from "../types";

interface LogsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership | null;
  logs: Log[];
  isLoading: boolean;
}

export function LogsModal({ 
  isOpen, 
  onOpenChange, 
  membership, 
  logs, 
  isLoading 
}: LogsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl flex flex-col p-0 gap-0">
        
        {/* Modal Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-6 border-b border-border bg-muted/30 space-y-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Terminal className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground text-left">
                Historial de Actividad
              </DialogTitle>
              {membership && (
                <DialogDescription className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-left">
                  {membership.user.nombre} {membership.user.apellido} • @{membership.username}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <RefreshCcw className="h-10 w-10 animate-spin text-accent mb-4" />
              <p className="font-black uppercase tracking-widest text-xs text-muted-foreground">Cargando registros...</p>
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-6 rounded-2xl border border-border p-5 transition-all hover:bg-accent/5">
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg",
                      log.tipo === 'LOGIN' ? "bg-emerald-500 shadow-emerald-500/20" :
                      log.tipo.includes('FOCO') ? "bg-amber-500 shadow-amber-500/20" :
                      log.tipo.includes('INACTIVIDAD') ? "bg-red-500 shadow-red-500/20" : "bg-blue-500 shadow-blue-500/20"
                    )}>
                      {log.tipo === 'LOGIN' ? <CheckCircle2 className="h-5 w-5" /> :
                       log.sesion.dispositivo?.toLowerCase().includes('phone') ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                    </div>
                    <div className="w-px h-full bg-border" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black uppercase tracking-tight text-foreground">
                        {sanitizeString(log.tipo).replace(/_/g, ' ')}
                      </p>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        {format(new Date(log.createdAt), "HH:mm:ss")}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                      {log.descripcion || "Sin descripción adicional registrada."}
                    </p>
                    {log.ruta && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-accent/70">Ruta:</span>
                        <code className="text-[10px] bg-accent/5 text-accent px-2 py-0.5 rounded border border-accent/10 font-bold">
                          {sanitizeString(log.ruta)}
                        </code>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">
                      <span className="flex items-center gap-1.5">
                        <Monitor className="h-3 w-3" />
                        {log.sesion.ip}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        hace {formatDistanceToNow(new Date(log.createdAt), { locale: es })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center">
              <Activity className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="font-black uppercase tracking-widest text-xs text-muted-foreground">No hay logs para mostrar hoy.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-border bg-muted/10">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full h-12 rounded-2xl font-black uppercase tracking-widest"
          >
            Cerrar Ventana
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
