"use client";

import React, { useState } from "react";
import { cn } from "@/components/ui/utils";
import {
  Package,
  Search,
  History,
  AlertCircle,
  TrendingDown,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "relative overflow-hidden rounded-3xl border border-border bg-card/40 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md",
    className
  )}>
    {children}
  </div>
);

type InsumosClientProps = {
  initialStock: any[];
  initialSolicitudes: any[];
};

export function InsumosClient({ initialStock, initialSolicitudes }: InsumosClientProps) {
  const [activeTab, setActiveTab] = useState<"solicitudes" | "stock">("solicitudes");
  const [solSearch, setSolSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  const formattedSolicitudes = initialSolicitudes.map(sol => ({
    id: sol.id,
    fecha: sol.createdAt ? format(new Date(sol.createdAt), "dd MMM yyyy", { locale: es }) : "N/A",
    tecnico: sol.membership?.user ? `${sol.membership.user.nombre} ${sol.membership.user.apellido}` : "Desconocido",
    producto: sol.producto?.nombre || "Producto desconocido",
    cantidad: sol.cantidad,
    unidad: sol.unidadMedida || sol.producto?.unidadMedida || "",
    estado: sol.estado === "ACEPTADA" ? "Aprobado" : sol.estado === "RECHAZADA" ? "Rechazado" : "Pendiente",
    categoria: sol.producto?.categoria || "General",
  }));

  const formattedStock = initialStock.map(item => {
    const stockActual = item.stockActual || 0;
    const stockMinimo = item.stockMinimo || 0;
    
    let estado = "Normal";
    if (stockActual === 0) estado = "Agotado";
    else if (stockActual > 0 && stockActual <= stockMinimo * 0.25) estado = "Crítico";
    else if (stockActual > stockMinimo * 0.25 && stockActual <= stockMinimo) estado = "Bajo";

    return {
      id: item.id,
      producto: item.nombre,
      categoria: item.categoria || "General",
      stockActual,
      unidad: item.unidadMedida || "unidades",
      estado,
    };
  });

  const filteredSolicitudes = formattedSolicitudes.filter(sol => 
    sol.producto.toLowerCase().includes(solSearch.toLowerCase()) || 
    sol.tecnico.toLowerCase().includes(solSearch.toLowerCase())
  );

  const filteredStock = formattedStock.filter(item => 
    item.producto.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const outOfStockCount = formattedStock.filter(s => s.estado === "Agotado").length;
  const lowStockCount = formattedStock.filter(s => s.estado === "Bajo" || s.estado === "Crítico").length;

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-foreground lg:text-5xl">
            Gestión de <span className="text-[#01ADFB]">Insumos</span>
          </h1>
          <p className="text-lg font-medium text-muted-foreground">
            Controla las solicitudes de materiales y el inventario en tiempo real.
          </p>
        </div>
        <button className="flex h-12 items-center gap-2 rounded-2xl bg-[#01ADFB] px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95">
          <Download className="h-4 w-4" />
          Descargar Inventario
        </button>
      </div>

      <div className="flex items-center gap-1.5 rounded-2xl bg-muted p-1.5 w-fit border border-border">
        <button
          onClick={() => setActiveTab("solicitudes")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300",
            activeTab === "solicitudes"
              ? "bg-background text-[#01ADFB] shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <History className="h-4 w-4" />
          Solicitudes
        </button>
        <button
          onClick={() => setActiveTab("stock")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300",
            activeTab === "stock"
              ? "bg-background text-[#01ADFB] shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="h-4 w-4" />
          Stock / Almacén
        </button>
      </div>

      <div className="mt-8 space-y-8">
        {activeTab === "solicitudes" ? (
          <div className="space-y-6">
            <div className="flex justify-end">
              <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-[#01ADFB] transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar técnico o producto..."
                  value={solSearch}
                  onChange={(e) => setSolSearch(e.target.value)}
                  className="h-12 w-full rounded-2xl border-none bg-card px-12 text-sm font-bold shadow-sm ring-1 ring-border focus:ring-2 focus:ring-[#01ADFB]/20 transition-all outline-none text-foreground"
                />
              </div>
            </div>

            <GlassCard className="w-full overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Técnico</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Producto</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Cantidad</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSolicitudes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm font-bold text-muted-foreground">
                          No se encontraron solicitudes.
                        </td>
                      </tr>
                    )}
                    {filteredSolicitudes.map((sol) => (
                      <tr key={sol.id} className="hover:bg-muted transition-colors group">
                        <td className="px-6 py-5 text-muted-foreground font-bold text-xs">{sol.fecha}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-[10px] font-black">
                              {sol.tecnico.split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase()}
                            </div>
                            <span className="font-black text-foreground text-sm uppercase">{sol.tecnico}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-bold text-primary dark:text-[#01ADFB] text-sm uppercase">{sol.producto}</td>
                        <td className="px-6 py-5 font-black text-foreground text-sm text-center tabular-nums">{sol.cantidad} {sol.unidad}</td>
                        <td className="px-6 py-5 text-right">
                          <span className={cn(
                            "inline-flex items-center rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border shadow-sm",
                            sol.estado === "Aprobado" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                            sol.estado === "Pendiente" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                            sol.estado === "Rechazado" && "bg-destructive/10 text-destructive border-destructive/20"
                          )}>
                            {sol.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-end">
              <div className="relative w-full md:w-80 group">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-[#01ADFB] transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar en almacén..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="h-12 w-full rounded-2xl border-none bg-card px-12 text-sm font-bold shadow-sm ring-1 ring-border focus:ring-2 focus:ring-[#01ADFB]/20 transition-all outline-none text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
              <GlassCard className="bg-primary border-none text-white dark:bg-muted dark:text-foreground">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-[#01ADFB]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Alertas Críticas</p>
                    <p className="text-2xl font-black">{outOfStockCount} Producto{outOfStockCount !== 1 && 's'} Agotado{outOfStockCount !== 1 && 's'}</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="bg-card/60 border-border">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#01ADFB]/10 flex items-center justify-center text-[#01ADFB]">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Stock Bajo</p>
                    <p className="text-2xl font-black text-foreground">{lowStockCount} Referencia{lowStockCount !== 1 && 's'}</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="w-full overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Producto</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Categoría</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Stock</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStock.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-sm font-bold text-muted-foreground">
                          No se encontraron productos.
                        </td>
                      </tr>
                    )}
                    {filteredStock.map((item) => (
                      <tr key={item.id} className="hover:bg-muted transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground">
                              <Package className="h-5 w-5" />
                            </div>
                            <span className="font-black text-foreground text-sm uppercase">{item.producto}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-block rounded-lg bg-muted px-2 py-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-border">
                            {item.categoria}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center font-black text-foreground text-sm tabular-nums">
                          {item.stockActual} <span className="text-[10px] font-bold text-muted-foreground opacity-60 ml-1 uppercase">{item.unidad}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={cn(
                              "h-2 w-2 rounded-full",
                              item.estado === "Normal" && "bg-emerald-500",
                              item.estado === "Bajo" && "bg-amber-500",
                              (item.estado === "Crítico" || item.estado === "Agotado") && "bg-red-500 animate-pulse",
                              item.estado === "Excedente" && "bg-[#01ADFB]"
                            )} />
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              item.estado === "Normal" && "text-emerald-600",
                              item.estado === "Bajo" && "text-amber-600",
                              (item.estado === "Crítico" || item.estado === "Agotado") && "text-red-600",
                              item.estado === "Excedente" && "text-[#01ADFB]"
                            )}>
                              {item.estado}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}