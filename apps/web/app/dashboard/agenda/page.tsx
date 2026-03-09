"use client";

import React, { useState, useEffect, Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { 
  Button, 
  Combobox
} from "@/components/ui";
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarClock,
  RotateCcw
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { 
  getOperatorsAction, 
  getOrdenesServicioAction
} from "../actions";
import {
  addDaysToYmd,
  startOfBogotaWeekYmd,
  toBogotaYmd,
} from "@/utils/date-utils";

type ViewType = "SEMANA" | "DIA";

interface Operador { id: string; nombre: string; user?: { nombre: string; apellido: string; }; }
interface OrdenServicio {
  id: string;
  cliente: { nombre: string; apellido?: string; razonSocial?: string; numeroDocumento?: string; };
  servicio: { id: string; nombre: string; };
  fechaVisita: string;
  horaInicio: string;
  horaFin?: string;
  tecnicoId: string;
  tecnico?: { user: { nombre: string; apellido: string; }; };
  direccionTexto: string;
  barrio?: string;
  municipio?: string;
  departamento?: string;
  zonaId?: string;
  zona?: { id: string; nombre: string; };
  numeroOrden?: string;
  estadoServicio: string;
}

function AgendaContent() {
  const [view, setView] = useState<ViewType>("SEMANA");
  const [currentDate, setCurrentDate] = useState<string>(() => toBogotaYmd());
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [, setOrdenes] = useState<OrdenServicio[]>([]);
  const [selectedTecnico, setSelectedTecnico] = useState("TODOS");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const empresaId = localStorage.getItem("current-enterprise-id");
        const [ops, ords] = await Promise.all([
          empresaId ? getOperatorsAction(empresaId) : Promise.resolve([]),
          empresaId ? getOrdenesServicioAction(empresaId) : Promise.resolve([]),
        ]);
        setOperadores(Array.isArray(ops) ? ops : ops?.data || []);
        setOrdenes(Array.isArray(ords) ? ords : ords?.data || []);
      } catch (e) {
        console.error("Error loading initial data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const parseYmd = (dateYmd: string) => {
    const [year, month, day] = dateYmd.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const getDaysInWeek = (dateYmd: string) => {
    const mondayYmd = startOfBogotaWeekYmd(dateYmd);
    return Array.from({ length: 7 }, (_, i) => addDaysToYmd(mondayYmd, i));
  };

  const daysToShow = view === "SEMANA" ? getDaysInWeek(currentDate) : [currentDate];
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#01ADFB]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Sub-Header */}
      <div className="shrink-0 py-10 px-6 lg:px-10 border-b border-border mb-8 bg-muted/30">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
            <CalendarClock className="h-5 w-5 text-[#01ADFB]" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">
              Agenda <span className="text-[#01ADFB]">{view === "SEMANA" ? "Semanal" : "Diaria"}</span>
            </h1>
            <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest">
              Visualización horaria de la programación técnica.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-10 pb-10">
        <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col bg-card border border-border rounded-[2.5rem] shadow-sm overflow-hidden">
          
          {/* Controls */}
          <div className="px-8 py-6 border-b border-border flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-card shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-48">
                <Combobox
                  options={[{ value: "TODOS", label: "TODOS LOS TÉCNICOS" }, ...operadores.map(op => ({ value: op.id, label: (op.user ? `${op.user.nombre} ${op.user.apellido}` : op.nombre).toUpperCase() }))]}
                  value={selectedTecnico}
                  onChange={setSelectedTecnico}
                  placeholder="Técnicos"
                />
              </div>
              <div className="flex items-center gap-2 bg-muted p-1 rounded-xl">
                {(["DIA", "SEMANA"] as ViewType[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all",
                      view === v ? "bg-background text-[#01ADFB] shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(prev => addDaysToYmd(prev, view === "SEMANA" ? -7 : -1))} className="rounded-xl border-border bg-background">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 py-2 bg-background border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-foreground">
                {parseYmd(currentDate).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </div>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(prev => addDaysToYmd(prev, view === "SEMANA" ? 7 : 1))} className="rounded-xl border-border bg-background">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 min-h-0 overflow-auto bg-card">
            <div className={cn("min-w-[1200px]", view === "DIA" && "min-w-full")}>
              {/* Header */}
              <div className={cn("grid border-b border-border bg-muted/50 sticky top-0 z-10", view === "SEMANA" ? "grid-cols-[100px_repeat(7,1fr)]" : "grid-cols-[100px_1fr]")}>
                <div className="h-20 border-r border-border/50"></div>
                {daysToShow.map((d, i) => {
                  const dayDate = parseYmd(d);
                  const isToday = d === toBogotaYmd();
                  return (
                    <div key={i} className={cn("h-20 flex flex-col items-center justify-center border-r border-border/50 last:border-r-0", isToday && "bg-[#01ADFB]/5")}>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{dayDate.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                      <span className={cn("text-xl font-black", isToday ? "text-[#01ADFB]" : "text-foreground")}>{dayDate.getDate()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Body */}
              <div className="relative">
                {hours.map((h) => (
                  <div key={h} className={cn("grid border-b border-border/50 min-h-[100px]", view === "SEMANA" ? "grid-cols-[100px_repeat(7,1fr)]" : "grid-cols-[100px_1fr]")}>
                    <div className="p-4 text-[10px] font-black text-muted-foreground text-right pr-6 border-r border-border/50 bg-muted/20">
                      {h}
                    </div>
                    {daysToShow.map((d, dIdx) => (
                      <div key={dIdx} className="border-r border-border/50 p-2 last:border-r-0 hover:bg-muted/30 transition-colors">
                        {/* Placeholder for services mapping */}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => <div className={cn("animate-spin text-[#01ADFB]", className)}><RotateCcw /></div>;

export default function AgendaPage() {
  return (
    <DashboardLayout overflowHidden>
      <Suspense fallback={<div className="flex h-[80vh] items-center justify-center text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando cronograma operativo...</div>}>
        <AgendaContent />
      </Suspense>
    </DashboardLayout>
  );
}
