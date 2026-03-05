"use client";

import React from "react";
import { Download, RefreshCcw } from "lucide-react";
import { cn } from "@/components/ui/utils";

interface MonitoreoHeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
}

export function MonitoreoHeader({ isLoading, onRefresh }: MonitoreoHeaderProps) {
  return (
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
        <button 
          onClick={onRefresh}
          className="flex h-12 items-center gap-2 rounded-2xl bg-[#01ADFB] px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          disabled={isLoading}
        >
          <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Actualizar
        </button>
      </div>
    </div>
  );
}
