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
} from "lucide-react";

const mockSolicitudes = [
  { id: 1, fecha: "19 Feb 2026", tecnico: "Carlos Ruiz", producto: "Gas Refrigerante R410A", cantidad: "5kg", estado: "Pendiente", historial: "2 previas", categoria: "Consumibles" },
  { id: 2, fecha: "18 Feb 2026", tecnico: "Ana Beltrán", producto: "Filtros de Aire 20x20", cantidad: "10 unidades", estado: "Aprobado", historial: "0 previas", categoria: "Repuestos" },
  { id: 3, fecha: "18 Feb 2026", tecnico: "David López", producto: "Cable de Cobre 14AWG", cantidad: "50m", estado: "Rechazado", historial: "1 previa", categoria: "Eléctrico" },
  { id: 4, fecha: "17 Feb 2026", tecnico: "Roberto Méndez", producto: "Capacitor 35uF", cantidad: "2 unidades", estado: "Pendiente", historial: "5 previas", categoria: "Eléctrico" },
  { id: 5, fecha: "17 Feb 2026", tecnico: "Elena Gómez", producto: "Cinta Aislante", cantidad: "5 rollos", estado: "Aprobado", historial: "3 previas", categoria: "Consumibles" },
  { id: 6, fecha: "16 Feb 2026", tecnico: "Mario Soto", producto: "Tornillos 1/4", cantidad: "100 unidades", estado: "Pendiente", historial: "10 previas", categoria: "Ferretería" },
  { id: 7, fecha: "16 Feb 2026", tecnico: "Laura Peña", producto: "Limpiador de Contactos", cantidad: "2 latas", estado: "Pendiente", historial: "1 previa", categoria: "Consumibles" },
  { id: 8, fecha: "15 Feb 2026", tecnico: "Jorge Rivas", producto: "Abrazaderas Plásticas", cantidad: "50 unidades", estado: "Aprobado", historial: "2 previas", categoria: "Ferretería" },
  { id: 9, fecha: "15 Feb 2026", tecnico: "Sofía Martínez", producto: "Tubería de Cobre 1/2", cantidad: "15m", estado: "Pendiente", historial: "0 previas", categoria: "Repuestos" },
  { id: 10, fecha: "14 Feb 2026", tecnico: "Pedro Infante", producto: "Aceite para Compresor", cantidad: "1 galón", estado: "Aprobado", historial: "4 previas", categoria: "Consumibles" },
  { id: 11, fecha: "14 Feb 2026", tecnico: "Carlos Ruiz", producto: "Soldadura de Plata", cantidad: "3 varillas", estado: "Pendiente", historial: "1 previa", categoria: "Consumibles" },
  { id: 12, fecha: "13 Feb 2026", tecnico: "Ana Beltrán", producto: "Termostato Honeywell", cantidad: "1 unidad", estado: "Pendiente", historial: "0 previas", categoria: "Repuestos" },
  { id: 13, fecha: "13 Feb 2026", tecnico: "David López", producto: "Canaleta 20x10", cantidad: "20m", estado: "Aprobado", historial: "2 previas", categoria: "Eléctrico" },
];

const mockStock = [
  { id: 1, producto: "Gas Refrigerante R410A", categoria: "Consumibles", stockActual: 25, unidad: "kg", estado: "Normal" },
  { id: 2, producto: "Filtros de Aire 20x20", categoria: "Repuestos", stockActual: 5, unidad: "unidades", estado: "Bajo" },
  { id: 3, producto: "Cable de Cobre 14AWG", categoria: "Eléctrico", stockActual: 200, unidad: "m", estado: "Normal" },
  { id: 4, producto: "Capacitor 35uF", categoria: "Eléctrico", stockActual: 2, unidad: "unidades", estado: "Crítico" },
  { id: 5, producto: "Termostato Digital", categoria: "Repuestos", stockActual: 0, unidad: "unidades", estado: "Agotado" },
  { id: 6, producto: "Aceite 3GS", categoria: "Consumibles", stockActual: 150, unidad: "litros", estado: "Excedente" },
  { id: 7, producto: "Válvula de Expansión", categoria: "Repuestos", stockActual: 15, unidad: "unidades", estado: "Normal" },
  { id: 8, producto: "Manómetro de Alta/Baja", categoria: "Herramientas", stockActual: 8, unidad: "unidades", estado: "Normal" },
  { id: 9, producto: "Casco de Seguridad", categoria: "Seguridad", stockActual: 12, unidad: "unidades", estado: "Normal" },
  { id: 10, producto: "Desengrasante Industrial", categoria: "Limpieza", stockActual: 4, unidad: "galones", estado: "Bajo" },
  { id: 11, producto: "Bomba de Vacío 5CFM", categoria: "Herramientas", stockActual: 3, unidad: "unidades", estado: "Normal" },
  { id: 12, producto: "Guantes de Nitrilo", categoria: "Seguridad", stockActual: 50, unidad: "pares", estado: "Normal" },
];

const allCategories = Array.from(new Set(mockStock.map(s => s.categoria)));
const allStatuses = ["Normal", "Bajo", "Crítico", "Agotado", "Excedente"];

export default function InsumosPage() {
  const [activeTab, setActiveTab] = useState<"solicitudes" | "stock">("solicitudes");
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  
  // States for Stock Filters
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("");

  // States for Solicitudes Filters
  const [solSearch, setSolSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter logic for Stock
  const filteredStock = mockStock.filter(item => {
    const matchesSearch = item.producto.toLowerCase().includes(stockSearch.toLowerCase());
    const matchesCategory = stockCategoryFilter === "" || item.categoria === stockCategoryFilter;
    const matchesStatus = stockStatusFilter === "" || item.estado === stockStatusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Filter logic for Solicitudes
  const filteredSolicitudes = mockSolicitudes.filter(sol => {
    return sol.producto.toLowerCase().includes(solSearch.toLowerCase()) || 
           sol.tecnico.toLowerCase().includes(solSearch.toLowerCase());
  });

  // Pagination logic for Solicitudes
  const totalPages = Math.ceil(filteredSolicitudes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSolicitudes = filteredSolicitudes.slice(startIndex, startIndex + itemsPerPage);

  return (
    <DashboardLayout>
      <div className="space-y-8" onClick={() => setOpenActionMenu(null)}>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
              Gestión de Insumos
            </h1>
            <p className="text-zinc-500 font-medium">
              Controla las solicitudes de materiales y el inventario en tiempo real.
            </p>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-px">
          <button
            onClick={() => {
              setActiveTab("solicitudes");
              setCurrentPage(1);
            }}
            className={cn(
              "px-6 py-4 text-sm font-black uppercase tracking-widest transition-all relative",
              activeTab === "solicitudes"
                ? "text-azul-1 after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-azul-1"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            )}
          >
            Solicitudes
          </button>
          <button
            onClick={() => setActiveTab("stock")}
            className={cn(
              "px-6 py-4 text-sm font-black uppercase tracking-widest transition-all relative",
              activeTab === "stock"
                ? "text-azul-1 after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-azul-1"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            )}
          >
            Stock
          </button>
        </div>

        {/* Content */}
        <div className="mt-8">
          {activeTab === "solicitudes" ? (
            <div className="space-y-6">
              {/* Search for Solicitudes at Top Right */}
              <div className="flex justify-end">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar técnico o producto..."
                    value={solSearch}
                    onChange={(e) => {
                      setSolSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-11 w-full rounded-2xl border-2 border-zinc-100 bg-white pl-12 pr-4 text-sm font-medium outline-none transition-all focus:border-azul-1 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </div>
              </div>

              <Card className="border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Fecha</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Técnico</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Producto</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Cantidad</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Estado</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Historial</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                      {currentSolicitudes.map((sol) => (
                        <tr key={sol.id} className="group transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="px-6 py-4 text-xs font-bold text-zinc-500">{sol.fecha}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-600 dark:text-zinc-400">
                                {sol.tecnico.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">{sol.tecnico}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-50 text-sm">{sol.producto}</td>
                          <td className="px-6 py-4 font-black text-azul-1 text-sm">{sol.cantidad}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                              sol.estado === "Aprobado" && "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
                              sol.estado === "Pendiente" && "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
                              sol.estado === "Rechazado" && "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                            )}>
                              {sol.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button className="flex items-center justify-center gap-1 mx-auto text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors">
                              <History className="h-3 w-3" />
                              {sol.historial}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right relative">
                            <div className="flex items-center justify-end">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenu(openActionMenu === sol.id ? null : sol.id);
                                }}
                                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-all text-zinc-400"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {openActionMenu === sol.id && (
                                <div className="absolute right-6 top-12 z-50 w-40 rounded-xl border border-zinc-100 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in slide-in-from-top-2 duration-200">
                                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-colors">
                                    <Check className="h-3 w-3" />
                                    Aprobar
                                  </button>
                                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors">
                                    <X className="h-3 w-3" />
                                    Rechazar
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Pagination Solicitudes - Separated */}
              <div className="flex items-center justify-between p-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Página {currentPage} de {Math.max(1, totalPages)}
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-10 px-4 rounded-xl border-2 border-zinc-100 bg-white text-[10px] font-black uppercase tracking-widest text-zinc-500 disabled:opacity-50 transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    Anterior
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="h-10 px-4 rounded-xl bg-azul-1 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50 transition-all hover:bg-blue-700 shadow-lg shadow-azul-1/20"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search and Filters for Stock at Top Right */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-end">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="h-11 w-full rounded-2xl border-2 border-zinc-100 bg-white pl-12 pr-4 text-sm font-medium outline-none transition-all focus:border-azul-1 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </div>
                <div className="w-full md:w-56">
                  <Select
                    value={stockCategoryFilter}
                    onChange={(e) => setStockCategoryFilter(e.target.value)}
                    className="h-11 border-2 border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    <option value="">Todas las categorías</option>
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>
                <div className="w-full md:w-56">
                  <Select
                    value={stockStatusFilter}
                    onChange={(e) => setStockStatusFilter(e.target.value)}
                    className="h-11 border-2 border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    <option value="">Todos los estados</option>
                    {allStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Inventory Alerts Compact & Aligned Left */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <Card className="border-none bg-red-50 dark:bg-red-950/20 shadow-none">
                  <CardContent className="py-4 flex flex-col items-center justify-center text-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center text-red-600">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-600 opacity-60">Alertas Críticas</p>
                      <p className="text-xl font-black text-red-600">1 Producto</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-none bg-amber-50 dark:bg-amber-950/20 shadow-none">
                  <CardContent className="py-4 flex flex-col items-center justify-center text-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center text-amber-600">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600 opacity-60">Stock Bajo</p>
                      <p className="text-xl font-black text-amber-600">1 Producto</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Producto</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Categoría</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Stock Actual</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Unidad</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                      {filteredStock.map((item) => (
                        <tr key={item.id} className="group transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                item.estado === "Crítico" ? "bg-red-50 text-red-600" : "bg-zinc-50 text-zinc-400"
                              )}>
                                <Package className="h-5 w-5" />
                              </div>
                              <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">{item.producto}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              {item.categoria}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "text-sm font-black tabular-nums",
                              item.estado === "Crítico" || item.estado === "Apotado" ? "text-red-600" : 
                              item.estado === "Bajo" ? "text-amber-600" : 
                              item.estado === "Excedente" ? "text-blue-600" :
                              "text-zinc-900 dark:text-zinc-50"
                            )}>
                              {item.stockActual}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">{item.unidad}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className={cn(
                                "h-2 w-2 rounded-full",
                                item.estado === "Normal" && "bg-emerald-500",
                                item.estado === "Bajo" && "bg-amber-500 animate-pulse",
                                (item.estado === "Crítico" || item.estado === "Agotado") && "bg-red-500 animate-ping",
                                item.estado === "Excedente" && "bg-blue-500"
                              )} />
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                item.estado === "Normal" && "text-emerald-600",
                                item.estado === "Bajo" && "text-amber-600",
                                (item.estado === "Crítico" || item.estado === "Agotado") && "text-red-600",
                                item.estado === "Excedente" && "text-blue-600"
                              )}>
                                {item.estado}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredStock.length === 0 && (
                    <div className="py-20 text-center">
                      <Package className="mx-auto h-12 w-12 text-zinc-200 mb-4" />
                      <p className="text-zinc-500 font-medium">No se encontraron productos con los filtros seleccionados.</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
