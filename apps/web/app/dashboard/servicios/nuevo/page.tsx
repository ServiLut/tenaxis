"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getClientesAction,
  getTiposInteresAction,
  getEnterprisesAction,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  CreditCard,
  Briefcase,
  AlertTriangle,
  ChevronRight,
  Info,
  Save,
  GanttChart
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";

const URGENCIAS = [
  { value: "BAJA", label: "Baja (SLA 48h)" },
  { value: "MEDIA", label: "Media (SLA 24h)" },
  { value: "ALTA", label: "Alta (SLA 12h)" },
  { value: "CRITICA", label: "Crítica (SLA Inmediato)" },
];

const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "QR", label: "QR / Link de Pago" },
  { value: "CREDITO", label: "Crédito (Empresas)" },
  { value: "CONTRATO", label: "Contrato Mensual" },
];

function NuevoServicioContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [tiposInteres, setTiposInteres] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  
  // Form State
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedDireccion, setSelectedDireccion] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState("");
  const [direccionesCliente, setDireccionesCliente] = useState<any[]>([]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalStyle; };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cls, ints, emps] = await Promise.all([
          getClientesAction(),
          getTiposInteresAction(),
          getEnterprisesAction(),
        ]);
        setClientes(Array.isArray(cls) ? cls : cls?.data || []);
        setTiposInteres(Array.isArray(ints) ? ints : ints?.data || []);
        setEmpresas(Array.isArray(emps) ? emps : emps?.data || []);
      } catch (e) {
        console.error("Error loading service data", e);
        toast.error("Error al cargar datos básicos");
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      const cliente = (clientes || []).find(c => c.id === selectedCliente);
      setDireccionesCliente(cliente?.direcciones || []);
      if (cliente?.direcciones?.length > 0) {
        setSelectedDireccion(cliente.direcciones[0].id);
      }
    } else {
      setDireccionesCliente([]);
      setSelectedDireccion("");
    }
  }, [selectedCliente, clientes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    toast.promise(
      new Promise((resolve, reject) => {
        // Simular creación por ahora
        setTimeout(() => {
          const success = true; // Simulación de éxito/fallo
          if (success) {
            resolve({ message: "Orden de servicio generada correctamente" });
            router.push("/dashboard/servicios");
          } else {
            reject(new Error("Error al procesar la orden técnica"));
            setLoading(false);
          }
        }, 2000);
      }),
      {
        loading: 'Generando orden técnica y vinculando disponibilidad...',
        success: (data: any) => data.message,
        error: (err) => err.message,
      }
    );
  };

  return (
    <div className="max-w-5xl mx-auto w-full h-[calc(100vh-12rem)] flex flex-col min-h-0">
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden min-h-0">
        
        {/* Header Fijo */}
        <div className="flex-none bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-full border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Nueva Orden de Servicio</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--color-azul-1)]"></span>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.1em]">Protocolo de creación de servicios operativos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar scroll-smooth bg-white dark:bg-zinc-950">
          <form id="servicio-form" onSubmit={handleSubmit} className="space-y-12 max-w-4xl mx-auto pb-12">
            
            {/* SECCIÓN 1: IDENTIFICACIÓN DEL CLIENTE */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                  <User className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Identificación del Cliente</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cliente Solicitante <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={(Array.isArray(clientes) ? clientes : []).map(c => ({ 
                      value: c.id, 
                      label: c.tipoCliente === "EMPRESA" ? c.razonSocial : `${c.nombre} ${c.apellido}` 
                    }))}
                    value={selectedCliente}
                    onChange={(v) => setSelectedCliente(v)}
                    placeholder="Buscar por nombre o razón social..."
                  />
                  <div className="flex justify-start px-1">
                    <Button variant="link" className="text-[10px] font-black p-0 h-auto text-vivido-purpura-2 uppercase tracking-widest hover:no-underline" onClick={() => router.push('/dashboard/clientes/nuevo')}>
                      + Registrar nuevo cliente
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Dirección <span className="text-red-500">*</span></Label>
                  <Select value={selectedDireccion} onChange={(e) => setSelectedDireccion(e.target.value)} disabled={!selectedCliente} required className="h-11 border-zinc-200">
                    <option value="">{selectedCliente ? "Seleccionar sede disponible..." : "Primero seleccione un cliente"}</option>
                    {(Array.isArray(direccionesCliente) ? direccionesCliente : []).map(d => (
                      <option key={d.id} value={d.id}>{d.direccion} - {d.nombreSede || d.barrio}</option>
                    ))}
                  </Select>
                  {!selectedCliente && (
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest ml-1">⚠ Debe vincular un cliente para cargar sedes</p>
                  )}
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: ESPECIFICACIONES TÉCNICAS */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Especificaciones Técnicas</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Empresa Asociada <span className="text-red-500">*</span></Label>
                  <Select value={selectedEmpresa} onChange={(e) => setSelectedEmpresa(e.target.value)} required className="h-11 border-zinc-200">
                    <option value="">Seleccionar empresa...</option>
                    {(Array.isArray(empresas) ? empresas : []).map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo de Servicio <span className="text-red-500">*</span></Label>
                  <Select required className="h-11 border-zinc-200">
                    <option value="">Seleccionar tipo...</option>
                    {(Array.isArray(tiposInteres) ? tiposInteres : []).map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Servicio Específico <span className="text-red-500">*</span></Label>
                  <Input placeholder="Ej: Control de Roedores" required className="h-11 border-zinc-200" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Urgencia <span className="text-red-500">*</span></Label>
                  <Select required className="h-11 border-zinc-200">
                    {URGENCIAS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Observaciones</Label>
                  <textarea 
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm font-medium resize-none min-h-[100px] focus:ring-[var(--color-azul-1)] focus:border-[var(--color-azul-1)] outline-none"
                    placeholder="Detalles adicionales, requerimientos específicos o notas importantes..."
                  ></textarea>
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: AGENDA OPERATIVA */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Agenda Operativa</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha de Ejecución <span className="text-red-500">*</span></Label>
                  <Input type="date" required className="h-11 border-zinc-200" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Hora de Inicio <span className="text-red-500">*</span></Label>
                  <Input type="time" required className="h-11 border-zinc-200" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Duración Labor <span className="text-red-500">*</span></Label>
                  <Select required className="h-11 border-zinc-200">
                    <option value="60">60 Minutos</option>
                    <option value="90">90 Minutos</option>
                    <option value="120">120 Minutos</option>
                    <option value="180">180 Minutos</option>
                  </Select>
                </div>
              </div>

              <div className="p-6 bg-azul-1/5 dark:bg-azul-1/10 border border-azul-1/20 rounded-2xl flex gap-4">
                <Info className="h-5 w-5 text-[var(--color-azul-1)] shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block mb-1">Verificación de disponibilidad</span>
                  El sistema validará automáticamente que el técnico de la zona no tenga servicios agendados en este bloque horario.
                </p>
              </div>
            </section>

            {/* SECCIÓN 4: CONDICIONES DE PAGO */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Condiciones de Pago</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tarifa del Servicio (COP) <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                    <Input type="number" placeholder="0.00" required className="h-11 border-zinc-200 pl-8 font-bold" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Método de Recaudo <span className="text-red-500">*</span></Label>
                  <Select required className="h-11 border-zinc-200">
                    {METODOS_PAGO.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer Fijo */}
        <div className="flex-none bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 px-10 py-5 flex items-center justify-between">
          <div className="hidden lg:flex items-center gap-3 text-zinc-400">
            <GanttChart className="h-5 w-5 text-[var(--color-claro-azul-4)]" />
            <p className="text-[11px] font-medium max-w-xs leading-relaxed">Se generará una orden de trabajo automática para el técnico asignado.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard/servicios")} className="h-12 px-8 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:bg-zinc-200">Descartar</Button>
            <Button
              type="submit"
              form="servicio-form"
              disabled={loading}
              className="h-12 px-12 bg-vivido-purpura-2 text-white hover:opacity-90 shadow-xl shadow-vivido-purpura-2/20 transition-all gap-3 border-none rounded-xl"
            >
              {loading ? <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="font-bold text-xs tracking-[0.1em] uppercase text-white">Generar y Asignar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NuevoServicioPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="flex h-[80vh] items-center justify-center text-sm text-zinc-500 animate-pulse font-bold uppercase tracking-widest">Iniciando protocolo de registro...</div>}>
        <NuevoServicioContent />
      </Suspense>
    </DashboardLayout>
  );
}
