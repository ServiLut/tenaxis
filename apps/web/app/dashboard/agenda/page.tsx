"use client";

import React, { useState, useEffect, Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { 
  Button, 
  Popover,
  PopoverTrigger,
  PopoverContent,
  Combobox,
  DatePicker
} from "@/components/ui";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  MapPin,
  CalendarClock,
  Filter,
  RotateCcw
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { useRouter } from "next/navigation";
import { 
  getTiposServicioAction, 
  getOperatorsAction, 
  getOrdenesServicioAction,
  getDepartmentsAction,
  getMunicipalitiesAction,
  getZonasAction
} from "../actions";

type ViewType = "SEMANA" | "DIA";

interface TipoServicio { id: string; nombre: string; }
interface Operador { id: string; nombre: string; user?: { nombre: string; apellido: string; }; }
interface Departamento { id: string; name: string; }
interface Municipio { id: string; name: string; departmentId: string; }
interface Zona { id: string; nombre: string; }
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

const ESTADO_STYLING: Record<string, string> = {
  "NUEVO": "bg-[#706F71]/5 text-[#706F71] border-[#706F71]/10",
  "PROCESO": "bg-amber-50 text-amber-600 border-amber-100",
  "CANCELADO": "bg-red-50 text-red-600 border-red-100",
  "PROGRAMADO": "bg-[#01ADFB]/5 text-[#01ADFB] border-[#01ADFB]/10",
  "LIQUIDADO": "bg-emerald-50 text-emerald-600 border-emerald-100",
  "TECNICO_FINALIZO": "bg-[#021359]/5 text-[#021359] border-[#021359]/10",
  "REPROGRAMADO": "bg-indigo-50 text-indigo-600 border-indigo-100",
};

function AgendaContent() {
  const router = useRouter();
  const [view, setView] = useState<ViewType>("SEMANA");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([]);
  const [selectedTipo, setSelectedTipo] = useState("TODOS");
  const [selectedTecnico, setSelectedTecnico] = useState("TODOS");
  const [selectedEstado, setSelectedEstado] = useState("TODOS");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const empresaId = localStorage.getItem("current-enterprise-id");
        const [servs, ops, ords] = await Promise.all([
          getTiposServicioAction(),
          empresaId ? getOperatorsAction(empresaId) : Promise.resolve([]),
          empresaId ? getOrdenesServicioAction(empresaId) : Promise.resolve([]),
        ]);
        setTiposServicio(Array.isArray(servs) ? servs : servs?.data || []);
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

  const getDaysInWeek = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
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
    <div className="flex flex-col h-full">
      {/* Sub-Header */}
      <div className="shrink-0 py-10 px-6 lg:px-10 border-b border-[#706F71]/10 mb-8 bg-[#F8FAFC]">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#021359] text-white shadow-xl shadow-[#021359]/20">
            <CalendarClock className="h-5 w-5 text-[#01ADFB]" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-black dark:text-white">
              Agenda <span className="text-[#01ADFB]">{view === "SEMANA" ? "Semanal" : "Diaria"}</span>
            </h1>
            <p className="text-[#706F71] font-medium mt-1 uppercase text-[10px] tracking-widest">
              Visualización horaria de la programación técnica.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-10 pb-10">
        <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col bg-white border border-[#706F71]/10 rounded-[2.5rem] shadow-sm overflow-hidden">
          
          {/* Controls */}
          <div className="px-8 py-6 border-b border-[#706F71]/5 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-48">
                <Combobox
                  options={[{ value: "TODOS", label: "TODOS LOS TÉCNICOS" }, ...operadores.map(op => ({ value: op.id, label: (op.user ? `${op.user.nombre} ${op.user.apellido}` : op.nombre).toUpperCase() }))]}
                  value={selectedTecnico}
                  onChange={setSelectedTecnico}
                  placeholder="Técnicos"
                />
              </div>
              <div className="flex items-center gap-2 bg-[#706F71]/5 p-1 rounded-xl">
                {(["DIA", "SEMANA"] as ViewType[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all",
                      view === v ? "bg-white text-[#01ADFB] shadow-sm" : "text-[#706F71] hover:text-black"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - (view === "SEMANA" ? 7 : 1))))} className="rounded-xl border-[#706F71]/20">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 py-2 bg-white border border-[#706F71]/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#021359]">
                {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </div>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + (view === "SEMANA" ? 7 : 1))))} className="rounded-xl border-[#706F71]/20">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 min-h-0 overflow-auto">
            <div className={cn("min-w-[1200px]", view === "DIA" && "min-w-full")}>
              {/* Header */}
              <div className={cn("grid border-b border-[#706F71]/10 bg-[#F8FAFC] sticky top-0 z-10", view === "SEMANA" ? "grid-cols-[100px_repeat(7,1fr)]" : "grid-cols-[100px_1fr]")}>
                <div className="h-20 border-r border-[#706F71]/5"></div>
                {daysToShow.map((d, i) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <div key={i} className={cn("h-20 flex flex-col items-center justify-center border-r border-[#706F71]/5 last:border-r-0", isToday && "bg-[#01ADFB]/5")}>
                      <span className="text-[10px] font-black text-[#706F71] uppercase tracking-[0.2em] mb-1">{d.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                      <span className={cn("text-xl font-black", isToday ? "text-[#01ADFB]" : "text-black")}>{d.getDate()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Body */}
              <div className="relative">
                {hours.map((h) => (
                  <div key={h} className={cn("grid border-b border-[#706F71]/5 min-h-[100px]", view === "SEMANA" ? "grid-cols-[100px_repeat(7,1fr)]" : "grid-cols-[100px_1fr]")}>
                    <div className="p-4 text-[10px] font-black text-[#706F71] text-right pr-6 border-r border-[#706F71]/5 bg-[#F8FAFC]/50">
                      {h}
                    </div>
                    {daysToShow.map((d, dIdx) => (
                      <div key={dIdx} className="border-r border-[#706F71]/5 p-2 last:border-r-0 hover:bg-[#706F71]/5 transition-colors">
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

const Loader2 = ({ className }: { className?: string }) => <div className={cn("animate-spin", className)}><RotateCcw /></div>;

export default function AgendaPage() {
  return (
    <DashboardLayout overflowHidden>
      <Suspense fallback={<div className="flex h-[80vh] items-center justify-center text-[10px] font-black uppercase tracking-widest text-[#706F71] animate-pulse">Sincronizando cronograma operativo...</div>}>
        <AgendaContent />
      </Suspense>
    </DashboardLayout>
  );
}
