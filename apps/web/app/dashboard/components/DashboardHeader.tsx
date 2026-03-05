"use client";

import React from "react";
import { Download, Plus, Settings2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";

interface DashboardHeaderProps {
  isConfiguring: boolean;
  onToggleConfig: () => void;
}

export function DashboardHeader({ isConfiguring, onToggleConfig }: DashboardHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <h1 className="text-4xl font-black tracking-tight text-foreground lg:text-5xl">
          Dashboard <span className="text-[#01ADFB]">Analytics</span>
        </h1>
        <p className="text-lg font-medium text-muted-foreground">
          Bienvenido de nuevo. Aquí tienes un resumen del rendimiento actual.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleConfig}
          className={cn(
            "rounded-2xl border-border bg-card font-black uppercase tracking-widest text-foreground hover:bg-muted h-12",
            isConfiguring && "border-[#01ADFB] text-[#01ADFB] bg-[#01ADFB]/5"
          )}
        >
          {isConfiguring ? (
            <><Check className="mr-2 h-4 w-4" /> Finalizar</>
          ) : (
            <><Settings2 className="mr-2 h-4 w-4" /> Personalizar</>
          )}
        </Button>

        <button className="flex h-12 items-center gap-2 rounded-2xl bg-card px-6 text-sm font-black uppercase tracking-widest text-foreground shadow-sm border border-border transition-all hover:bg-muted">
          <Download className="h-4 w-4" />
          Reporte
        </button>
        
        <button
          onClick={() => router.push('/dashboard/servicios/nuevo')}
          className="flex h-12 items-center gap-2 rounded-2xl bg-[#01ADFB] px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Nueva Orden
        </button>
      </div>
    </div>
  );
}
