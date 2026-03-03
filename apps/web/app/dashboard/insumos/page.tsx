"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/components/ui/utils";
import {
  Package,
  Search,
  Check,
  X,
  History,
  MoreVertical,
  AlertCircle,
  TrendingDown,
  Download,
} from "lucide-react";

const mockSolicitudes = [
  { id: 1, fecha: "19 Feb 2026", tecnico: "Carlos Ruiz", producto: "Gas Refrigerante R410A", cantidad: "5kg", estado: "Pendiente", historial: "2 previas", categoria: "Consumibles" },
  { id: 2, fecha: "18 Feb 2026", tecnico: "Ana Beltrán", producto: "Filtros de Aire 20x20", cantidad: "10 unidades", estado: "Aprobado", historial: "0 previas", categoria: "Repuestos" },
  { id: 3, fecha: "18 Feb 2026", tecnico: "David López", producto: "Cable de Cobre 14AWG", cantidad: "50m", estado: "Rechazado", historial: "1 previa", categoria: "Eléctrico" },
  { id: 4, fecha: "17 Feb 2026", tecnico: "Roberto Méndez", producto: "Capacitor 35uF", cantidad: "2 unidades", estado: "Pendiente", historial: "5 previas", categoria: "Eléctrico" },
  { id: 5, fecha: "17 Feb 2026", tecnico: "Elena Gómez", producto: "Cinta Aislante", cantidad: "5 rollos", estado: "Aprobado", historial: "3 previas", categoria: "Consumibles" },
  { id: 6, fecha: "16 Feb 2026", tecnico: "Mario Soto", producto: "Tornillos 1/4", cantidad: "100 unidades", estado: "Pendiente", historial: "10 previas", categoria: "Ferretería" },
];

const mockStock = [
  { id: 1, producto: "Gas Refrigerante R410A", categoria: "Consumibles", stockActual: 25, unidad: "kg", estado: "Normal" },
  { id: 2, producto: "Filtros de Aire 20x20", categoria: "Repuestos", stockActual: 5, unidad: "unidades", estado: "Bajo" },
  { id: 3, producto: "Cable de Cobre 14AWG", categoria: "Eléctrico", stockActual: 200, unidad: "m", estado: "Normal" },
  { id: 4, producto: "Capacitor 35uF", categoria: "Eléctrico", stockActual: 2, unidad: "unidades", estado: "Crítico" },
  { id: 5, producto: "Termostato Digital", categoria: "Repuestos", stockActual: 0, unidad: "unidades", estado: "Agotado" },
];

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "relative overflow-hidden rounded-3xl border border-white bg-white/40 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60",
    className
  )}>
    {children}
  </div>
);

export default function InsumosPage() {
  const [activeTab, setActiveTab] = useState<"solicitudes" | "stock">("solicitudes");
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const [solSearch, setSolSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  const filteredSolicitudes = mockSolicitudes.filter(sol => 
    sol.producto.toLowerCase().includes(solSearch.toLowerCase()) || 
    sol.tecnico.toLowerCase().includes(solSearch.toLowerCase())
  );

  const filteredStock = mockStock.filter(item => 
    item.producto.toLowerCase().includes(stockSearch.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-10" onClick={() => setOpenActionMenu(null)}>
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-black dark:text-white lg:text-5xl">
              Gestión de <span className="text-[#01ADFB]">Insumos</span>
            </h1>
            <p className="text-lg font-medium text-[#706F71]">
              Controla las solicitudes de materiales y el inventario en tiempo real.
            </p>
          </div>
          <button className="flex h-12 items-center gap-2 rounded-2xl bg-[#01ADFB] px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95">
            <Download className="h-4 w-4" />
            Descargar Inventario
          </button>
        </div>

        {/* Custom Tabs */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-[#706F71]/5 p-1.5 w-fit border border-[#706F71]/10">
          <button
            onClick={() => setActiveTab("solicitudes")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300",
              activeTab === "solicitudes"
                ? "bg-white text-[#01ADFB] shadow-md dark:bg-zinc-900"
                : "text-[#706F71] hover:text-black dark:hover:text-white"
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
                ? "bg-white text-[#01ADFB] shadow-md dark:bg-zinc-900"
                : "text-[#706F71] hover:text-black dark:hover:text-white"
            )}
          >
            <Package className="h-4 w-4" />
            Stock / Almacén
          </button>
        </div>

        {/* Content */}
        <div className="mt-8 space-y-8">
          {activeTab === "solicitudes" ? (
            <div className="space-y-6">
              <div className="flex justify-end">
                <div className="relative w-full sm:w-80 group">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#706F71] group-focus-within:text-[#01ADFB] transition-colors" />
                  <input
                    type="text"
                    placeholder="Buscar técnico o producto..."
                    value={solSearch}
                    onChange={(e) => setSolSearch(e.target.value)}
                    className="h-12 w-full rounded-2xl border-none bg-white px-12 text-sm font-bold shadow-sm ring-1 ring-[#706F71]/20 focus:ring-2 focus:ring-[#01ADFB]/20 transition-all outline-none"
                  />
                </div>
              </div>

              <GlassCard className="w-full overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#706F71]/5 bg-[#706F71]/5">
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#706F71]">Fecha</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#706F71]">Técnico</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#706F71]">Producto</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#706F71] text-center">Cantidad</th>
                        <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-[#706F71]">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#706F71]/5">
                      {filteredSolicitudes.map((sol) => (
                        <tr key={sol.id} className="hover:bg-white/40 transition-colors group">
                          <td className="px-6 py-5 text-[#706F71] font-bold text-xs">{sol.fecha}</td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#021359] text-white text-[10px] font-black">
                                {sol.tecnico.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="font-black text-black dark:text-white text-sm uppercase">{sol.tecnico}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-bold text-[#021359] dark:text-[#01ADFB] text-sm uppercase">{sol.producto}</td>
                          <td className="px-6 py-5 font-black text-black dark:text-white text-sm text-center tabular-nums">{sol.cantidad}</td>
                          <td className="px-6 py-5 text-right">
                            <span className={cn(
                              "inline-flex items-center rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border shadow-sm",
                              sol.estado === "Aprobado" && "bg-[#01ADFB]/10 text-[#01ADFB] border-[#01ADFB]/20",
                              sol.estado === "Pendiente" && "bg-[#021359]/5 text-[#021359] border-[#021359]/10",
                              sol.estado === "Rechazado" && "bg-red-50 text-red-600 border-red-100"
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
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#706F71] group-focus-within:text-[#01ADFB] transition-colors" />
                  <input
                    type="text"
                    placeholder="Buscar en almacén..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="h-12 w-full rounded-2xl border-none bg-white px-12 text-sm font-bold shadow-sm ring-1 ring-[#706F71]/20 focus:ring-2 focus:ring-[#01ADFB]/20 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <GlassCard className="bg-[#021359] border-none text-white">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-[#01ADFB]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Alertas Críticas</p>
                      <p className="text-2xl font-black">1 Producto Agotado</p>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard className="bg-white/60 border-white">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-[#01ADFB]/10 flex items-center justify-center text-[#01ADFB]">
                      <TrendingDown className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#706F71]">Stock Bajo</p>
                      <p className="text-2xl font-black text-black">2 Referencias</p>
                    </div>
                  </div>
                </GlassCard>
              </div>

              <GlassCard className="w-full overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#706F71]/5 bg-[#706F71]/5">
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#706F71]">Producto</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#706F71] text-center">Categoría</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#706F71] text-center">Stock</th>
                        <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-[#706F71]">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#706F71]/5">
                      {filteredStock.map((item) => (
                        <tr key={item.id} className="hover:bg-white/40 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#706F71]/10 text-[#706F71]">
                                <Package className="h-5 w-5" />
                              </div>
                              <span className="font-black text-black dark:text-white text-sm uppercase">{item.producto}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="inline-block rounded-lg bg-[#706F71]/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[#706F71]">
                              {item.categoria}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center font-black text-black text-sm tabular-nums">
                            {item.stockActual} <span className="text-[10px] font-bold text-[#706F71] opacity-60 ml-1 uppercase">{item.unidad}</span>
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
    </DashboardLayout>
  );
}
