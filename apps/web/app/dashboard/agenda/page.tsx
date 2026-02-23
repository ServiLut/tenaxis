"use client";

import React, { useState, useEffect, Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { 
  Card, 
  CardContent, 
  Button, 
  Select,
  Input 
} from "@/components/ui";
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Clock,
  User,
  MapPin,
  Search,
  CalendarDays
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { getTiposInteresAction } from "../actions";

// Mock services for the agenda
const MOCK_AGENDA_SERVICES = [
  {
    id: "1",
    cliente: "Restaurante El Gourmet",
    tipoServicio: "Control de Plagas",
    fecha: "2026-02-19",
    hora: "09:00",
    tecnico: "Carlos Ruiz",
    direccion: "Calle 45 # 12-34",
    estado: "PROGRAMADO"
  },
  {
    id: "2",
    cliente: "Juan Pérez",
    tipoServicio: "Desinfección",
    fecha: "2026-02-19",
    hora: "14:30",
    tecnico: "Ana María López",
    direccion: "Circular 4 # 70-10",
    estado: "EN_RUTA"
  },
  {
    id: "3",
    cliente: "Hotel Plaza",
    tipoServicio: "Mantenimiento AC",
    fecha: "2026-02-20",
    hora: "10:00",
    tecnico: "Carlos Ruiz",
    direccion: "Av. El Poblado # 5-67",
    estado: "PROGRAMADO"
  }
];

type ViewType = "DIA" | "SEMANA" | "MES" | "AÑO";

interface TipoInteres {
  id: string;
  nombre: string;
}

function AgendaContent() {
  const [view, setView] = useState<ViewType>("MES");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tiposServicio, setTiposServicio] = useState<TipoInteres[]>([]);
  const [selectedTipo, setSelectedTipo] = useState("TODOS");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const ints = await getTiposInteresAction();
        setTiposServicio(Array.isArray(ints) ? ints : ints?.data || []);
      } catch (e) {
        console.error("Error loading service types", e);
      }
    };
    loadData();
  }, []);

  const nextDate = () => {
    const newDate = new Date(currentDate);
    if (view === "MES") newDate.setMonth(newDate.getMonth() + 1);
    else if (view === "DIA") newDate.setDate(newDate.getDate() + 1);
    else if (view === "SEMANA") newDate.setDate(newDate.getDate() + 7);
    else if (view === "AÑO") newDate.setFullYear(newDate.getFullYear() + 1);
    setCurrentDate(newDate);
  };

  const prevDate = () => {
    const newDate = new Date(currentDate);
    if (view === "MES") newDate.setMonth(newDate.getMonth() - 1);
    else if (view === "DIA") newDate.setDate(newDate.getDate() - 1);
    else if (view === "SEMANA") newDate.setDate(newDate.getDate() - 7);
    else if (view === "AÑO") newDate.setFullYear(newDate.getFullYear() - 1);
    setCurrentDate(newDate);
  };

  const formatHeaderDate = () => {
    if (view === "MES") {
      return currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).toUpperCase();
    }
    if (view === "DIA") {
      return currentDate.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }).toUpperCase();
    }
    if (view === "AÑO") {
      return currentDate.getFullYear().toString();
    }
    if (view === "SEMANA") {
      return `SEMANA ${Math.ceil(currentDate.getDate() / 7)} - ${currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).toUpperCase()}`;
    }
    return "";
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Main Filters */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
            Agenda Operativa
          </h1>
          <p className="text-zinc-500 font-medium italic">
            Visualización y control de la programación técnica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            {(["DIA", "SEMANA", "MES", "AÑO"] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all",
                  view === v 
                    ? "bg-white dark:bg-zinc-800 text-[var(--color-azul-1)] shadow-sm border border-zinc-200/50" 
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 h-11">
            <Button variant="ghost" size="icon" onClick={prevDate} className="h-8 w-8 rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-[10px] font-black tracking-widest px-2 min-w-[140px] text-center">
              {formatHeaderDate()}
            </span>
            <Button variant="ghost" size="icon" onClick={nextDate} className="h-8 w-8 rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800">
        <div className="flex-1 flex flex-col sm:flex-row gap-4 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input 
              placeholder="Buscar cliente, técnico o zona..." 
              className="h-11 pl-11 rounded-xl border-none bg-zinc-50 dark:bg-zinc-800 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="w-full sm:w-64">
            <Select 
              value={selectedTipo} 
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none text-xs font-bold"
            >
              <option value="TODOS">Todos los servicios</option>
              {tiposServicio.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="h-11 px-5 rounded-xl gap-2 border-zinc-200 font-bold text-[10px] uppercase tracking-widest">
            <Filter className="h-3.5 w-3.5" /> Más filtros
          </Button>
          <Button className="h-11 px-6 rounded-xl bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-200 font-black text-[10px] uppercase tracking-widest gap-2">
            <CalendarDays className="h-3.5 w-3.5" /> Hoy
          </Button>
        </div>
      </div>

      {/* Calendar Grid / Content Area */}
      <Card className="border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden min-h-[600px]">
        <CardContent className="p-0">
          {view === "MES" && (
            <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800">
              {["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"].map((d) => (
                <div key={d} className="py-4 text-center border-r border-zinc-100 dark:border-zinc-800 last:border-r-0">
                  <span className="text-[10px] font-black tracking-[0.2em] text-zinc-400">{d}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className={cn(
            "grid gap-px bg-zinc-100 dark:bg-zinc-800",
            view === "MES" ? "grid-cols-7" : "grid-cols-1"
          )}>
            {/* Simple representation of days for Month view */}
            {view === "MES" ? (
              Array.from({ length: 35 }).map((_, i) => {
                const day = i + 1 - 2; // Offset for mock
                const hasService = day === 19 || day === 20;
                return (
                  <div key={i} className="bg-white dark:bg-zinc-900 min-h-[140px] p-4 group transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "text-xs font-black",
                        day === new Date().getDate() ? "text-[var(--color-azul-1)] h-6 w-6 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100" : "text-zinc-400"
                      )}>
                        {day > 0 && day <= 28 ? day : ""}
                      </span>
                    </div>
                    
                    {hasService && (
                      <div className="space-y-1 mt-2">
                        {MOCK_AGENDA_SERVICES.filter(s => new Date(s.fecha).getDate() === day).map(s => (
                          <div key={s.id} className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 cursor-pointer hover:scale-[1.02] transition-transform">
                            <p className="text-[9px] font-black text-blue-700 dark:text-blue-400 truncate uppercase">{s.cliente}</p>
                            <div className="flex items-center gap-1 text-[8px] text-zinc-500 font-bold mt-0.5">
                              <Clock className="h-2 w-2" /> {s.hora}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              /* Simple List for other views */
              <div className="bg-white dark:bg-zinc-900 p-8">
                <div className="space-y-6 max-w-4xl mx-auto">
                  {MOCK_AGENDA_SERVICES.map((s) => (
                    <div key={s.id} className="flex items-center gap-6 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 hover:shadow-xl transition-all group">
                      <div className="h-16 w-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex flex-col items-center justify-center shrink-0 border border-zinc-100 dark:border-zinc-700">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{s.fecha.split('-')[2]}</span>
                        <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-none">FEB</span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-black text-lg tracking-tight group-hover:text-[var(--color-azul-1)] transition-colors">{s.cliente}</h3>
                          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                            {s.estado}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4">{s.tipoServicio}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500">
                            <Clock className="h-3.5 w-3.5 text-zinc-400" /> {s.hora}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500">
                            <User className="h-3.5 w-3.5 text-zinc-400" /> {s.tecnico}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 col-span-2 md:col-span-1">
                            <MapPin className="h-3.5 w-3.5 text-zinc-400" /> {s.direccion}
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AgendaPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="flex h-[80vh] items-center justify-center text-sm text-zinc-500 animate-pulse font-bold uppercase tracking-widest">Sincronizando cronograma operativo...</div>}>
        <AgendaContent />
      </Suspense>
    </DashboardLayout>
  );
}
