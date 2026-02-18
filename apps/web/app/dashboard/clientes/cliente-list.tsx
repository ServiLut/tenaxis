"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { 
  Plus, 
  Search, 
  Building2, 
  User, 
  Trophy, 
  Phone, 
  Mail, 
  ChevronRight, 
} from "lucide-react";
import { cn } from "@/components/ui/utils";

interface Cliente {
  id: string;
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  tipoCliente: "PERSONA" | "EMPRESA";
  segmentoNegocio?: string;
  nivelRiesgo?: "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
  clasificacion?: "ORO" | "PLATA" | "BRONCE" | "RIESGO";
  score: number;
  telefono: string;
  correo?: string;
}

interface ClienteListProps {
  initialClientes: Cliente[];
}

const SCORE_COLORS = {
  ORO: "bg-amber-500 text-white shadow-amber-200",
  PLATA: "bg-zinc-400 text-white shadow-zinc-200",
  BRONCE: "bg-orange-400 text-white shadow-orange-200",
  RIESGO: "bg-red-500 text-white shadow-red-200",
};

const RIESGO_LABELS = {
  BAJO: { label: "Riesgo Bajo", color: "text-emerald-600 bg-emerald-50" },
  MEDIO: { label: "Riesgo Medio", color: "text-amber-600 bg-amber-50" },
  ALTO: { label: "Riesgo Alto", color: "text-orange-600 bg-orange-50" },
  CRITICO: { label: "Crítico", color: "text-red-600 bg-red-50" },
};

export function ClienteList({ initialClientes }: ClienteListProps) {
  const [clientes] = useState<Cliente[]>(initialClientes);
  const [search, setSearch] = useState("");

  const filteredClientes = clientes.filter(c => 
    (c.nombre?.toLowerCase().includes(search.toLowerCase()) || 
     c.apellido?.toLowerCase().includes(search.toLowerCase()) ||
     c.razonSocial?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <Input 
            placeholder="Buscar por nombre, empresa o NIT..." 
            className="h-12 pl-12 rounded-2xl border-none bg-zinc-50 dark:bg-zinc-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link href="/dashboard/clientes/nuevo">
          <div className="flex items-center h-12 px-8 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100 gap-2 shadow-xl transition-all cursor-pointer">
            <Plus className="h-5 w-5" />
            <span className="font-black uppercase tracking-widest text-xs">Nuevo Cliente</span>
          </div>
        </Link>
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredClientes.map((cliente) => (
          <Card key={cliente.id} className="group overflow-hidden border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 transition-all hover:scale-[1.02] rounded-[2.5rem]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-8 px-8">
              <div className={cn(
                "flex h-14 w-14 items-center justify-center rounded-[1.25rem] shadow-lg",
                cliente.tipoCliente === "EMPRESA" ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              )}>
                {cliente.tipoCliente === "EMPRESA" ? <Building2 className="h-7 w-7" /> : <User className="h-7 w-7" />}
              </div>
              <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                SCORE_COLORS[cliente.clasificacion || "BRONCE"]
              )}>
                <Trophy className="h-3 w-3" />
                {cliente.clasificacion || "BRONCE"}
              </div>
            </CardHeader>
            
            <CardContent className="pt-4 px-8 pb-8">
              <CardTitle className="text-2xl font-black tracking-tighter mb-1 line-clamp-1">
                {cliente.tipoCliente === "EMPRESA" ? cliente.razonSocial : `${cliente.nombre} ${cliente.apellido}`}
              </CardTitle>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-6">
                {cliente.segmentoNegocio || "Sin Segmento"}
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-zinc-500 font-medium">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800">
                    <Phone className="h-4 w-4" />
                  </div>
                  {cliente.telefono}
                </div>
                {cliente.correo && (
                  <div className="flex items-center gap-3 text-sm text-zinc-500 font-medium">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800">
                      <Mail className="h-4 w-4" />
                    </div>
                    <span className="truncate">{cliente.correo}</span>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-50 dark:border-zinc-800 flex items-center justify-between">
                <div className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                  RIESGO_LABELS[cliente.nivelRiesgo || "BAJO"].color
                )}>
                  {RIESGO_LABELS[cliente.nivelRiesgo || "BAJO"].label}
                </div>
                <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-all dark:bg-zinc-800 dark:hover:bg-zinc-700">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
