"use client";

import React from "react";
import { Search, Filter, Database, ShieldCheck, ShieldAlert, Eye, ChevronLeft, ChevronRight, History } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { GlassCard } from "./utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";

import { Audit } from "../types";

interface AuditsTableProps {
  audits: Audit[];
  meta: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  currentPage: number;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onPageChange: (page: number) => void;
  onOpenAudit: (audit: Audit) => void;
}

export function AuditsTable({ 
  audits, 
  meta, 
  currentPage, 
  isLoading, 
  searchQuery, 
  onSearchChange, 
  onPageChange, 
  onOpenAudit 
}: AuditsTableProps) {
  const totalPages = meta.totalPages ?? 1;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row items-center gap-4 w-full">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <input 
            placeholder="Buscar por entidad, acción o usuario..." 
            aria-label="Buscar registros de auditoría"
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-card text-foreground border-none shadow-sm ring-1 ring-border focus:ring-2 focus:ring-accent/20 text-sm font-bold transition-all outline-none"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button className="h-14 px-8 flex items-center gap-2 rounded-2xl bg-card text-muted-foreground font-black uppercase tracking-widest text-[11px] shadow-sm border border-border hover:bg-accent/5 hover:text-foreground transition-all active:scale-95">
          <Filter className="h-4 w-4" />
          Filtros Avanzados
        </button>
      </div>

      <GlassCard className="w-full overflow-hidden">
        <div className="pb-8 pt-2 border-b border-border mb-6 px-2">
          <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Registros de Auditoría</h3>
          <p className="text-sm font-medium text-muted-foreground">Historial detallado de cambios y transacciones (CRUD).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Fecha</th>
                <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Usuario</th>
                <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Acción</th>
                <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">Entidad</th>
                <th className="px-6 py-5 text-right font-black uppercase tracking-widest text-[10px] text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {audits.length > 0 ? (
                audits.map((audit) => {
                  const isSuccess = !audit.accion.includes('FAILED');
                  const actionName = audit.accion.split('_')[0];
                  return (
                    <tr key={audit.id} className="hover:bg-accent/5 transition-colors group">
                      <td className="px-6 py-5 text-muted-foreground font-medium text-xs">{format(new Date(audit.createdAt), "dd MMM, yyyy • HH:mm:ss", { locale: es })}</td>
                      <td className="px-6 py-5">
                        <div className="space-y-0.5">
                          <p className="font-black text-foreground uppercase tracking-tight text-sm">{audit.membership?.user.nombre} {audit.membership?.user.apellido}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">@{audit.membership?.username || "sistema"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn("font-bold text-sm uppercase tracking-tight", actionName === 'CREACIÓN' ? "text-emerald-500" : actionName === 'ACTUALIZACIÓN' ? "text-amber-500" : actionName === 'ELIMINACIÓN' ? "text-red-500" : "text-accent")}>{actionName}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-muted text-muted-foreground"><Database className="h-3.5 w-3.5" /></div>
                            <span className="text-foreground font-black text-xs uppercase tracking-tight">{audit.entidad}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-muted-foreground/70 bg-muted/30 px-2 py-0.5 rounded-md w-fit border border-border/50">ID: {audit.entidadId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right flex items-center justify-end gap-3">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border shadow-sm", isSuccess ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                          {isSuccess ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                          {isSuccess ? "EXITOSA" : "FALLIDA"}
                        </span>
                        <button 
                          onClick={() => onOpenAudit(audit)} 
                          aria-label={`Ver detalles de auditoría para ${audit.entidad}`}
                          className="h-8 w-8 rounded-full hover:bg-accent/10 flex items-center justify-center text-muted-foreground hover:text-accent transition-all"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={5} className="px-6 py-20 text-center"><History className="h-8 w-8 mx-auto text-muted-foreground mb-4" /><p className="font-black uppercase tracking-widest text-xs text-muted-foreground">No se encontraron registros</p></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-6 border-t border-border bg-muted/10">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Mostrando {audits.length} de {meta.total} registros
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || isLoading}
              className="h-9 w-9 p-0 rounded-xl"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = currentPage;
                if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                if (pageNum <= 0 || pageNum > totalPages) return null;

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className={cn(
                      "h-9 w-9 p-0 rounded-xl text-[10px] font-black",
                      currentPage === pageNum ? "bg-[#01ADFB] text-white shadow-lg shadow-[#01ADFB]/20" : ""
                    )}
                    disabled={isLoading}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || isLoading}
              className="h-9 w-9 p-0 rounded-xl"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
