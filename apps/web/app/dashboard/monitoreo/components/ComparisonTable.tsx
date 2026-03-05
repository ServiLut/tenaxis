"use client";

import React from "react";
import { MoveRight } from "lucide-react";
import { cn } from "@/components/ui/utils";

interface ComparisonTableProps {
  detalles: {
    anterior?: unknown;
    nuevo?: unknown;
  };
}

export function ComparisonTable({ detalles }: ComparisonTableProps) {
  if (!detalles) return <p className="text-muted-foreground italic p-4 text-xs">No hay datos registrados.</p>;

  const anterior = (detalles.anterior && typeof detalles.anterior === 'object' ? detalles.anterior : {}) as Record<string, unknown>;
  const nuevo = (detalles.nuevo && typeof detalles.nuevo === 'object' ? detalles.nuevo : {}) as Record<string, unknown>;
  
  const allKeys = Array.from(new Set([...Object.keys(anterior), ...Object.keys(nuevo)]))
    .filter(k => k !== 'id' && k !== 'empresaId');

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-muted/5">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="px-4 py-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Campo</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Valor Anterior</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground w-8 text-center"></th>
            <th className="px-4 py-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Valor Nuevo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {allKeys.map((key) => {
            const valAnt = anterior[key];
            const valNue = nuevo[key];
            const isChanged = JSON.stringify(valAnt) !== JSON.stringify(valNue);

            return (
              <tr key={key} className={cn("transition-colors", isChanged ? "bg-accent/[0.02]" : "opacity-60")}>
                <td className="px-4 py-3 font-bold text-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </td>
                <td className="px-4 py-3 font-medium text-muted-foreground italic">
                  {valAnt !== undefined ? String(valAnt) : <span className="opacity-20">-</span>}
                </td>
                <td className="px-2 py-3 text-center">
                  {isChanged && <MoveRight className="h-3 w-3 text-accent inline" />}
                </td>
                <td className={cn("px-4 py-3 font-bold", isChanged ? "text-emerald-500" : "text-muted-foreground font-medium")}>
                  {valNue !== undefined ? String(valNue) : <span className="opacity-20">-</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
