"use client";

import React, { useState, useEffect, Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { 
  Card, 
  CardContent, 
  Button, 
  Select,
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  MapPin,
  CalendarClock
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { useRouter } from "next/navigation";
import { getTiposServicioAction, getOperatorsAction, getOrdenesServicioAction } from "../actions";

type ViewType = "SEMANA" | "DIA";

interface TipoServicio {
  id: string;
  nombre: string;
}

interface Operador {
  id: string;
  nombre: string;
  user?: {
    nombre: string;
    apellido: string;
  };
}

interface OrdenServicio {
  id: string;
  cliente: {
    nombre: string;
    apellido?: string;
    razonSocial?: string;
    numeroDocumento?: string;
  };
  servicio: {
    id: string;
    nombre: string;
  };
  fechaVisita: string;
  horaInicio: string;
  horaFin?: string;
  tecnicoId: string;
  tecnico?: {
    user: {
      nombre: string;
      apellido: string;
    };
  };
  direccionTexto: string;
  barrio?: string;
  municipio?: string;
  numeroOrden?: string;
  estadoServicio: string;
}

const ESTADO_STYLING: Record<string, string> = {
  "NUEVO": "bg-zinc-50 text-zinc-600 border-zinc-100 dark:bg-zinc-900/20 dark:text-zinc-400 dark:border-zinc-800/50",
  "PROCESO": "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50",
  "CANCELADO": "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50",
  "PROGRAMADO": "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50",
  "LIQUIDADO": "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50",
  "TECNICO_FINALIZO": "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50",
  "REPROGRAMADO": "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50",
  "SIN_CONCRETAR": "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/50",
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
  const [startHour, setStartHour] = useState("00:00");
  const [endHour, setEndHour] = useState("23:00");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const empresaId = localStorage.getItem("current-enterprise-id");
        
        const [servs, ops, ords] = await Promise.all([
          getTiposServicioAction(),
          empresaId ? getOperatorsAction(empresaId) : Promise.resolve([]),
          empresaId ? getOrdenesServicioAction(empresaId) : Promise.resolve([])
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
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const formatAMPM = (time24: string) => {
    const [hour] = time24.split(':');
    const h = parseInt(hour || "0");
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:00 ${ampm}`;
  };

  const filteredHours = hours.filter(h => {
    const hNum = parseInt(h.split(':')[0] || "0");
    const startNum = parseInt(startHour.split(':')[0] || "0");
    const endNum = parseInt(endHour.split(':')[0] || "0");
    return hNum >= startNum && hNum <= endNum;
  });

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-azul-1 border-t-transparent"></div>
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 animate-pulse">Sincronizando agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-Header Estratégico */}
      <div className="shrink-0 py-10 px-6 lg:px-10 border-b border-zinc-200/60 dark:border-zinc-800/50 mb-8 bg-gray-50 dark:bg-zinc-900/50">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azul-1 text-white shadow-xl shadow-azul-1/20">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              Agenda <span className="text-azul-1 dark:text-claro-azul-4">{view === "SEMANA" ? "Semanal" : "Diaria"}</span>
            </h1>
            <p className="text-zinc-500 font-medium mt-1">
              Visualización horaria de la programación técnica.
            </p>
          </div>
        </div>
      </div>

      {/* Contenedor Principal de Datos */}
      <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-10 pb-4 sm:pb-6 lg:pb-10">
        <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden">
          
          {/* Barra de Controles (Filtros) */}
          <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 shrink-0">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-full sm:w-40">
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

              <div className="w-full sm:w-40">
                <Select 
                  value={selectedTecnico} 
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTecnico(e.target.value)}
                  className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none text-xs font-bold"
                >
                  <option value="TODOS">Todos los técnicos</option>
                  {operadores.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.user ? `${op.user.nombre} ${op.user.apellido}` : op.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="w-full sm:w-40">
                <Select 
                  value={selectedEstado} 
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedEstado(e.target.value)}
                  className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none text-xs font-bold"
                >
                  <option value="TODOS">Todos los estados</option>
                  {Object.keys(ESTADO_STYLING).map(est => (
                    <option key={est} value={est}>{est}</option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-32">
                  <Select 
                    value={startHour} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStartHour(e.target.value)}
                    className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none text-[10px] font-bold"
                  >
                    {hours.map(h => (
                      <option key={h} value={h}>{formatAMPM(h)}</option>
                    ))}
                  </Select>
                </div>
                <span className="text-[10px] font-black text-zinc-400">A</span>
                <div className="w-32">
                  <Select 
                    value={endHour} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEndHour(e.target.value)}
                    className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none text-[10px] font-bold"
                  >
                    {hours.map(h => (
                      <option key={h} value={h}>{formatAMPM(h)}</option>
                    ))}
                  </Select>
                </div>
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
                        ? "bg-white dark:bg-zinc-800 text-azul-1 shadow-sm border border-zinc-200/50" 
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

          {/* Grid de Agenda (Scrollable) */}
          <div className="flex-1 min-h-0 overflow-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
            <div className={cn("min-w-[1200px] h-full", view === "DIA" && "min-w-full")}>
              {/* Grid Header (Sticky) */}
              <div className={cn(
                "grid border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 sticky top-0 z-10",
                view === "SEMANA" ? "grid-cols-[100px_repeat(7,minmax(0,1fr))]" : "grid-cols-[100px_1fr]"
              )}>
                <div className="py-6 border-r border-zinc-100 dark:border-zinc-800"></div>
                {daysToShow.map((d, i) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "py-6 text-center border-r border-zinc-100 dark:border-zinc-800 last:border-r-0 min-w-0 overflow-hidden",
                        isToday && "bg-blue-50/30 dark:bg-blue-900/10"
                      )}
                    >
                      <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-1">
                        {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                      </p>
                      <p className={cn(
                        "text-xl font-black",
                        isToday ? "text-azul-1" : "text-zinc-900 dark:text-zinc-100"
                      )}>
                        {d.getDate()}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Grid Body */}
              <div className="relative">
                {filteredHours.map((h) => {
                  const hourNum = parseInt(h.split(':')[0] || "0");
                  const displayTime = formatAMPM(h);

                  return (
                    <div 
                      key={h} 
                      id={`hour-${hourNum}`} 
                      className={cn(
                        "grid border-b border-zinc-50 dark:border-zinc-800/50 min-h-[120px]",
                        view === "SEMANA" ? "grid-cols-[100px_repeat(7,minmax(0,1fr))]" : "grid-cols-[100px_1fr]"
                      )}
                    >
                      <div className="p-4 text-[10px] font-black text-zinc-400 text-right pr-6 border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-800/20">
                        {displayTime}
                      </div>
                      {daysToShow.map((d, dIdx) => {
                        const isToday = d.toDateString() === new Date().toDateString();
                        
                        const servicesInSlot = ordenes.filter(s => {
                          if (!s.fechaVisita || !s.horaInicio) return false;
                          
                          const sDate = new Date(s.fechaVisita);
                          const matchesDate = 
                            sDate.getFullYear() === d.getFullYear() &&
                            sDate.getMonth() === d.getMonth() &&
                            sDate.getDate() === d.getDate();
                          
                          const sHour = new Date(s.horaInicio);
                          const sHourNum = sHour.getHours();
                          
                          const matchesHour = sHourNum === hourNum;
                          
                          if (!matchesDate || !matchesHour) return false;
                          
                          const matchesTipo = selectedTipo === "TODOS" || s.servicio.id === selectedTipo;
                          const matchesTecnico = selectedTecnico === "TODOS" || s.tecnicoId === selectedTecnico;
                          const matchesEstado = selectedEstado === "TODOS" || s.estadoServicio === selectedEstado;
                            
                          return matchesTipo && matchesTecnico && matchesEstado;
                        });

                        return (
                          <div 
                            key={dIdx} 
                            className={cn(
                              "border-r border-zinc-50 dark:border-zinc-800/50 p-2 relative group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors last:border-r-0 min-w-0 overflow-hidden",
                              isToday && "bg-blue-50/[0.15] dark:bg-blue-900/5"
                            )}
                          >
                            {servicesInSlot.map(s => {
                              const clientName = s.cliente.razonSocial || `${s.cliente.nombre} ${s.cliente.apellido || ''}`;
                              const serviceTime = new Date(s.horaInicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
                              const serviceTimeFin = s.horaFin ? new Date(s.horaFin).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }) : "--";
                              
                              const statusStyle = ESTADO_STYLING[s.estadoServicio] || ESTADO_STYLING["NUEVO"];

                              return (
                                <Popover key={s.id}>
                                  <PopoverTrigger asChild>
                                    <div className={cn(
                                      "p-3 mb-2 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group/item",
                                      statusStyle
                                    )}>
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-[9px] font-black uppercase truncate opacity-90">
                                          {clientName}
                                        </p>
                                        <span className="text-[7px] px-1.5 py-0.5 rounded-full font-black tracking-tighter border border-current/20">
                                          {s.estadoServicio}
                                        </span>
                                      </div>
                                      <p className="text-[8px] font-bold mb-2 truncate opacity-80">
                                        {s.servicio.nombre}
                                      </p>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-[8px] font-bold opacity-70">
                                          <Clock className="h-2.5 w-2.5" /> {serviceTime}
                                        </div>
                                        {s.tecnico && (
                                          <div className="text-[7px] font-black uppercase opacity-60">
                                            {s.tecnico.user.nombre.charAt(0)}. {s.tecnico.user.apellido}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-80 p-0 overflow-hidden rounded-[1.5rem] border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-950"
                                    align="start"
                                    side="right"
                                  >
                                    <div className="bg-zinc-50 dark:bg-zinc-900/50 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                      <span className="font-black text-[11px] uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                                        Detalle del Servicio
                                      </span>
                                      <div className={cn(
                                        "text-[9px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase border shadow-sm",
                                        statusStyle
                                      )}>
                                        {s.estadoServicio}
                                      </div>
                                    </div>
                                    <div className="p-6 space-y-5">
                                      <div>
                                        <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                                          Cliente
                                        </div>
                                        <div className="font-bold text-[15px] text-zinc-900 dark:text-zinc-50 leading-tight">
                                          {clientName}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                                          Servicio
                                        </div>
                                        <div className="font-bold text-[15px] text-azul-1 dark:text-claro-azul-4 uppercase tracking-tight">
                                          {s.servicio.nombre}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-6">
                                        <div>
                                          <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                                            Horario Operativo
                                          </div>
                                          <div className="font-bold text-sm flex items-center gap-2 text-zinc-800 dark:text-zinc-200 tabular-nums">
                                            <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                              <Clock className="h-4 w-4 text-azul-1" />
                                            </div>
                                            <div className="flex flex-col">
                                              <span className="text-[13px]">{serviceTime}</span>
                                              <span className="text-[10px] text-zinc-400">A {serviceTimeFin}</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                                            Técnico Asignado
                                          </div>
                                          <div className="font-bold text-sm text-zinc-800 dark:text-zinc-200 leading-tight">
                                            {s.tecnico ? (
                                              <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 font-black text-[10px] text-zinc-500">
                                                  {s.tecnico.user.nombre.charAt(0)}
                                                </div>
                                                <span className="text-[13px]">{s.tecnico.user.nombre} {s.tecnico.user.apellido}</span>
                                              </div>
                                            ) : "Sin asignar"}
                                          </div>
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                                          Ubicación / Dirección
                                        </div>
                                        <div className="font-bold text-[13px] flex items-start gap-2 text-zinc-800 dark:text-zinc-200 tabular-nums">
                                          <div className="h-7 w-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                            <MapPin className="h-4 w-4 text-red-500" />
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="leading-snug">{s.direccionTexto}</span>
                                            {(s.barrio || s.municipio) && (
                                              <span className="text-[11px] font-bold text-zinc-400 mt-0.5">
                                                {s.barrio}{s.barrio && s.municipio ? ", " : ""}{s.municipio}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="pt-2 flex justify-end">
                                        <Button
                                          size="sm"
                                          className="rounded-xl font-black text-[10px] uppercase tracking-[0.1em] h-10 px-5 shadow-lg shadow-azul-1/20"
                                          onClick={() => {
                                            const searchTerm = 
                                              s.numeroOrden || 
                                              s.cliente.numeroDocumento || 
                                              s.cliente.apellido || 
                                              "";
                                            router.push(
                                              `/dashboard/servicios?term=${encodeURIComponent(searchTerm)}`
                                            );
                                          }}
                                        >
                                          Ver Ficha Completa
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgendaPage() {
  return (
    <DashboardLayout overflowHidden>
      <Suspense fallback={<div className="flex h-[80vh] items-center justify-center text-sm text-zinc-500 animate-pulse font-bold uppercase tracking-widest">Sincronizando cronograma operativo...</div>}>
        <AgendaContent />
      </Suspense>
    </DashboardLayout>
  );
}
