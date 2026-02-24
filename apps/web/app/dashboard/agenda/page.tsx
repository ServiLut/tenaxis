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
import { getTiposInteresAction, getOperatorsAction } from "../actions";

// Mock services for the agenda
const MOCK_AGENDA_SERVICES = [
  {
    id: "1",
    cliente: "Restaurante El Gourmet",
    tipoServicio: "Control de Plagas",
    fecha: "2026-02-19",
    hora: "09:00",
    tecnico: "Carlos Ruiz",
    tecnicoId: "tecnico-1",
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
    tecnicoId: "tecnico-2",
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
    tecnicoId: "tecnico-1",
    direccion: "Av. El Poblado # 5-67",
    estado: "PROGRAMADO"
  }
];

type ViewType = "SEMANA" | "DIA";

interface TipoInteres {
  id: string;
  nombre: string;
}

interface Operador {
  id: string;
  nombre: string;
  email: string;
}

function AgendaContent() {
  const [view, setView] = useState<ViewType>("SEMANA");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tiposServicio, setTiposServicio] = useState<TipoInteres[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [selectedTipo, setSelectedTipo] = useState("TODOS");
  const [selectedTecnico, setSelectedTecnico] = useState("TODOS");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const empresaId = localStorage.getItem("current-enterprise-id");
        
        const [ints, ops] = await Promise.all([
          getTiposInteresAction(),
          empresaId ? getOperatorsAction(empresaId) : Promise.resolve([])
        ]);

        setTiposServicio(Array.isArray(ints) ? ints : ints?.data || []);
        setOperadores(Array.isArray(ops) ? ops : ops?.data || []);
      } catch (e) {
        console.error("Error loading initial data", e);
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

  const nextDate = () => {
    const newDate = new Date(currentDate);
    if (view === "SEMANA") newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const prevDate = () => {
    const newDate = new Date(currentDate);
    if (view === "SEMANA") newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const formatHeaderDate = () => {
    if (view === "DIA") {
      return currentDate.toLocaleDateString("es-ES", { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
    }
    const days = getDaysInWeek(currentDate);
    const start = days[0];
    const end = days[6];
    
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('es-ES', options)} - ${end.toLocaleDateString('es-ES', options)}`.toUpperCase();
  };

  const daysInWeek = getDaysInWeek(currentDate);
  const daysToShow = view === "SEMANA" ? daysInWeek : [currentDate];
  const hours = Array.from({ length: 15 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setView("DIA");
    
    // Pequeno delay para esperar el re-render y luego hacer scroll
    setTimeout(() => {
      const currentHour = new Date().getHours();
      const hourElement = document.getElementById(`hour-${currentHour}`);
      if (hourElement) {
        hourElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
            Agenda <span className="text-[var(--color-azul-1)]">{view === "SEMANA" ? "Semanal" : "Diaria"}</span>
          </h1>
          <p className="text-zinc-500 font-medium italic">
            Visualización horaria de la programación técnica.
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-60">
            <Select 
              value={selectedTipo} 
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTipo(e.target.value)}
              className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none text-xs font-bold"
            >
              <option value="TODOS">Todos los servicios</option>
              {tiposServicio.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
          </div>

          <div className="w-full sm:w-60">
            <Select 
              value={selectedTecnico} 
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTecnico(e.target.value)}
              className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none text-xs font-bold"
            >
              <option value="TODOS">Todos los técnicos</option>
              {operadores.map(op => (
                <option key={op.id} value={op.id}>
                  {op.nombre}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 h-11 items-center">
            {(["DIA", "SEMANA"] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 h-full rounded-lg text-[10px] font-black tracking-widest transition-all",
                  view === v 
                    ? "bg-white dark:bg-zinc-800 text-[var(--color-azul-1)] shadow-sm border border-zinc-200/50" 
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl px-2 h-11">
            <Button variant="ghost" size="icon" onClick={prevDate} className="h-8 w-8 rounded-lg">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[10px] font-black tracking-widest px-2 min-w-[120px] text-center">
              {formatHeaderDate()}
            </span>
            <Button variant="ghost" size="icon" onClick={nextDate} className="h-8 w-8 rounded-lg">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <Card className="border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className={cn("min-w-[1200px]", view === "DIA" && "min-w-full")}>
              {/* Grid Header */}
              <div className={cn(
                "grid border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50",
                view === "SEMANA" ? "grid-cols-[100px_repeat(7,1fr)]" : "grid-cols-[100px_1fr]"
              )}>
                <div className="py-6 border-r border-zinc-100 dark:border-zinc-800"></div>
                {daysToShow.map((d, i) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <div 
                      key={i} 
                      id={isToday ? 'today-column' : undefined}
                      className={cn(
                        "py-6 text-center border-r border-zinc-100 dark:border-zinc-800 last:border-r-0",
                        isToday && "bg-blue-50/30 dark:bg-blue-900/10"
                      )}
                    >
                      <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-1">
                        {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                      </p>
                      <p className={cn(
                        "text-xl font-black",
                        isToday ? "text-[var(--color-azul-1)]" : "text-zinc-900 dark:text-zinc-100"
                      )}>
                        {d.getDate()}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Grid Body with Scroll */}
              <div className="relative max-h-[700px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                {hours.map((h) => {
                  const hourNum = parseInt(h.split(':')[0]);
                  const ampm = hourNum >= 12 ? 'PM' : 'AM';
                  const displayHour = hourNum % 12 || 12;
                  const displayTime = `${displayHour}:00 ${ampm}`;

                  return (
                    <div 
                      key={h} 
                      id={`hour-${hourNum}`} 
                      className={cn(
                        "grid border-b border-zinc-50 dark:border-zinc-800/50 min-h-[120px]",
                        view === "SEMANA" ? "grid-cols-[100px_repeat(7,1fr)]" : "grid-cols-[100px_1fr]"
                      )}
                    >
                      <div className="p-4 text-[10px] font-black text-zinc-400 text-right pr-6 border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-800/20">
                        {displayTime}
                      </div>
                      {daysToShow.map((d, dIdx) => {
                        const isToday = d.toDateString() === new Date().toDateString();
                        const dayStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
                        
                        const servicesInSlot = MOCK_AGENDA_SERVICES.filter(s => {
                          const sDate = s.fecha;
                          const sHour = parseInt(s.hora.split(':')[0]);
                          const matchesDate = sDate === dayStr && sHour === hourNum;
                          
                          if (!matchesDate) return false;
                          
                          const matchesTipo = selectedTipo === "TODOS" || s.tipoServicio === selectedTipo; // Mock logic needs to be careful with IDs
                          const matchesTecnico = selectedTecnico === "TODOS" || s.tecnicoId === selectedTecnico;
                          const matchesSearch = !search || 
                            s.cliente.toLowerCase().includes(search.toLowerCase()) ||
                            s.tecnico.toLowerCase().includes(search.toLowerCase());
                            
                          return matchesTipo && matchesTecnico && matchesSearch;
                        });

                        return (
                          <div 
                            key={dIdx} 
                            className={cn(
                              "border-r border-zinc-50 dark:border-zinc-800/50 p-2 relative group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors last:border-r-0",
                              isToday && "bg-blue-50/[0.15] dark:bg-blue-900/5"
                            )}
                          >
                            {servicesInSlot.map(s => (
                              <div key={s.id} className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-all cursor-pointer">
                                <p className="text-[9px] font-black text-blue-700 dark:text-blue-400 uppercase truncate mb-1">{s.cliente}</p>
                                <div className="flex items-center gap-1 text-[8px] text-zinc-500 font-bold">
                                  <Clock className="h-2.5 w-2.5" /> {s.hora}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
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
