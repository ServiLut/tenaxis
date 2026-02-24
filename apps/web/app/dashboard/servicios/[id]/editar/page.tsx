"use client";

import { useState, useEffect, Suspense, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getClientesAction,
  getMetodosPagoAction,
  getOperatorsAction,
  updateOrdenServicioAction,
  getOrdenServicioByIdAction,
  getEstadoServiciosAction,
} from "../../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  ArrowLeft,
  User,
  Calendar,
  CreditCard,
  Briefcase,
  Save,
  GanttChart,
  Loader2
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";

const URGENCIAS = [
  { value: "BAJA", label: "Baja (SLA 48h)" },
  { value: "MEDIA", label: "Media (SLA 24h)" },
  { value: "ALTA", label: "Alta (SLA 12h)" },
  { value: "CRITICA", label: "Crítica (SLA Inmediato)" },
];

const NIVELES_INFESTACION = [
  { value: "BAJO", label: "Bajo - Presencia ocasional" },
  { value: "MEDIO", label: "Medio - Avistamientos regulares" },
  { value: "ALTO", label: "Alto - Foco establecido" },
  { value: "CRITICO", label: "Crítico - Plaga fuera de control" },
  { value: "PREVENTIVO", label: "Preventivo - Sin presencia" },
];

const TIPOS_VISITA = [
  { value: "DIAGNOSTICO", label: "Diagnóstico inicial" },
  { value: "PREVENTIVO", label: "Servicio Preventivo" },
  { value: "CORRECTIVO", label: "Servicio Correctivo" },
  { value: "SEGUIMIENTO", label: "Seguimiento/Monitoreo" },
  { value: "REINCIDENCIA", label: "Atención por Reincidencia (Garantía)" },
];

const ESTADOS_PAGO = [
  { value: "PENDIENTE", label: "Pendiente de cobro" },
  { value: "ANTICIPO", label: "Anticipo recibido" },
  { value: "PAGADO", label: "Pagado en su totalidad" },
  { value: "CREDITO", label: "A crédito (Cuenta corriente)" },
];

const TIPOS_FACTURACION = [
  { value: "UNICO", label: "Servicio único / Eventual" },
  { value: "CONTRATO_MENSUAL", label: "Parte de contrato mensual" },
  { value: "PLAN_TRIMESTRAL", label: "Parte de plan trimestral" },
  { value: "PLAN_SEMESTRAL", label: "Parte de plan semestral" },
  { value: "PLAN_ANUAL", label: "Parte de plan anual" },
];

interface Direccion {
  id: string;
  direccion: string;
  nombreSede?: string | null;
  barrio?: string | null;
}

interface Cliente {
  id: string;
  tipoCliente: "PERSONA" | "EMPRESA";
  nombre?: string | null;
  apellido?: string | null;
  razonSocial?: string | null;
  direcciones?: Direccion[];
}

interface MetodoPago {
  id: string;
  nombre: string;
}

interface Operador {
  id: string;
  nombre: string;
}

interface EstadoServicio {
  id: string;
  nombre: string;
}

function EditarServicioContent({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [estados, setEstados] = useState<EstadoServicio[]>([]);

  // Form State
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedDireccion, setSelectedDireccion] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState("");
  const [selectedOperador, setSelectedOperador] = useState("");
  const [direccionesCliente, setDireccionesCliente] = useState<Direccion[]>([]);

  // Custom logic states
  const [nivelInfestacion, setNivelInfestacion] = useState("");
  const [frecuenciaRecomendada, setFrecuenciaRecomendada] = useState<number | "">("");

  // Form Fields
  const [servicioEspecifico, setServicioEspecifico] = useState("");
  const [tipoVisita, setTipoVisita] = useState("");
  const [urgencia, setUrgencia] = useState("");
  const [observacion, setObservacion] = useState("");
  const [fechaVisita, setFechaVisita] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState("60");
  const [valorCotizado, setValorCotizado] = useState("");
  const [metodoPagoId, setMetodoPagoId] = useState("");
  const [estadoPago, setEstadoPago] = useState("");
  const [tipoFacturacion, setTipoFacturacion] = useState("");
  const [estadoServicioId, setEstadoServicioId] = useState("");

  const fetchMetodosPago = useCallback(async (empId: string) => {
    if (!empId) return;
    try {
      const mps = await getMetodosPagoAction(empId);
      setMetodosPago(Array.isArray(mps) ? mps : mps?.data || []);
    } catch (e) {
      console.error("Error loading payment methods", e);
    }
  }, []);

  const fetchOperadores = useCallback(async (empId: string) => {
    if (!empId) return;
    try {
      const ops = await getOperatorsAction(empId);
      setOperadores(Array.isArray(ops) ? ops : ops?.data || []);
    } catch (e) {
      console.error("Error loading operators", e);
    }
  }, []);

  const fetchEstados = useCallback(async (empId: string) => {
    if (!empId) return;
    try {
      const ests = await getEstadoServiciosAction(empId);
      setEstados(Array.isArray(ests) ? ests : ests?.data || []);
    } catch (e) {
      console.error("Error loading states", e);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cls, orderData] = await Promise.all([
          getClientesAction(),
          getOrdenServicioByIdAction(id),
        ]);

        if (!orderData) {
          toast.error("No se encontró la orden de servicio");
          router.push("/dashboard/servicios");
          return;
        }

        setClientes(Array.isArray(cls) ? cls : cls?.data || []);

        // Populating form with order data
        setSelectedCliente(orderData.clienteId);
        setSelectedEmpresa(orderData.empresaId);
        setSelectedOperador(orderData.tecnicoId || "");
        setServicioEspecifico(orderData.servicio?.nombre || "");
        setTipoVisita(orderData.tipoVisita || "");
        setNivelInfestacion(orderData.nivelInfestacion || "");
        setFrecuenciaRecomendada(orderData.frecuenciaSugerida || "");
        setUrgencia(orderData.urgencia || "");
        setObservacion(orderData.observacion || "");
        setValorCotizado(orderData.valorCotizado?.toString() || "");
        setMetodoPagoId(orderData.metodoPagoId || "");
        setEstadoPago(orderData.estadoPago || "");
        setTipoFacturacion(orderData.tipoFacturacion || "");
        setEstadoServicioId(orderData.estadoServicioId || "");
        
        if (orderData.fechaVisita) {
          setFechaVisita(new Date(orderData.fechaVisita).toISOString().split('T')[0]);
        }
        if (orderData.horaInicio) {
          setHoraInicio(new Date(orderData.horaInicio).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        }

        // Load specific data for the enterprise
        await Promise.all([
          fetchMetodosPago(orderData.empresaId),
          fetchOperadores(orderData.empresaId),
          fetchEstados(orderData.empresaId)
        ]);

        // Load addresses for selected client
        const client = (Array.isArray(cls) ? cls : cls?.data || []).find((c: Cliente) => c.id === orderData.clienteId);
        if (client) {
          setDireccionesCliente(client.direcciones || []);
          setSelectedDireccion(orderData.direccionId || "");
        }

      } catch (e) {
        console.error("Error loading order data", e);
        toast.error("Error al cargar los datos de la orden");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, router, fetchMetodosPago, fetchOperadores, fetchEstados]);

  const handleClienteChange = (clientId: string) => {
    setSelectedCliente(clientId);
    if (clientId) {
      const cliente = (clientes || []).find(c => c.id === clientId);
      const dirs = cliente?.direcciones || [];
      setDireccionesCliente(dirs);
      if (dirs.length > 0) {
        setSelectedDireccion(dirs[0].id);
      } else {
        setSelectedDireccion("");
      }
    } else {
      setDireccionesCliente([]);
      setSelectedDireccion("");
    }
  };

  const handleNivelInfestacionChange = (val: string) => {
    setNivelInfestacion(val);
    if (!val) {
      setFrecuenciaRecomendada("");
      return;
    }
    let suggestedDays = 30;
    switch (val) {
      case "CRITICO": suggestedDays = 7; break;
      case "ALTO": suggestedDays = 15; break;
      case "MEDIO": suggestedDays = 30; break;
      case "BAJO": suggestedDays = 60; break;
      case "PREVENTIVO": suggestedDays = 90; break;
    }
    setFrecuenciaRecomendada(suggestedDays);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      clienteId: selectedCliente,
      empresaId: selectedEmpresa,
      tecnicoId: selectedOperador || null,
      direccionId: selectedDireccion || undefined,
      servicioEspecifico,
      urgencia: urgencia || undefined,
      observacion: observacion || undefined,
      nivelInfestacion: nivelInfestacion || undefined,
      tipoVisita: tipoVisita || undefined,
      frecuenciaSugerida: frecuenciaRecomendada ? Number(frecuenciaRecomendada) : undefined,
      tipoFacturacion: tipoFacturacion || undefined,
      valorCotizado: valorCotizado ? Number(valorCotizado) : undefined,
      metodoPagoId: metodoPagoId || undefined,
      estadoPago: estadoPago || undefined,
      estadoServicioId: estadoServicioId || undefined,
      fechaVisita: fechaVisita ? new Date(fechaVisita).toISOString() : undefined,
      horaInicio: (fechaVisita && horaInicio) ? new Date(`${fechaVisita}T${horaInicio}:00`).toISOString() : undefined,
      duracionMinutos: Number(duracionMinutos),
    };

    try {
      const res = await updateOrdenServicioAction(id, payload);
      if (!res.success) throw new Error(res.error);
      toast.success("Orden de servicio actualizada correctamente");
      router.push("/dashboard/servicios");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar la orden";
      toast.error(errorMessage);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-azul-1" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando protocolo de edición...</p>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Editar Orden de Servicio</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--color-azul-1)]"></span>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.1em]">Protocolo de actualización de servicios operativos</p>
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
                      label: c.tipoCliente === "EMPRESA"
                        ? (c.razonSocial || "Empresa sin nombre")
                        : `${c.nombre || ""} ${c.apellido || ""}`.trim() || "Cliente sin nombre"
                    }))}
                    value={selectedCliente}
                    onChange={handleClienteChange}
                    placeholder="Buscar por nombre o razón social..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Dirección <span className="text-red-500">*</span></Label>
                  <Select value={selectedDireccion} onChange={(e) => setSelectedDireccion(e.target.value)} disabled={!selectedCliente} required className="h-11 border-zinc-200">
                    <option value="">{selectedCliente ? "Seleccionar sede disponible..." : "Primero seleccione un cliente"}</option>
                    {(Array.isArray(direccionesCliente) ? direccionesCliente : []).map(d => (
                      <option key={d.id} value={d.id}>{d.direccion} - {d.nombreSede || d.barrio}</option>
                    ))}
                  </Select>
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
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado del Servicio <span className="text-red-500">*</span></Label>
                  <Select
                    value={estadoServicioId}
                    onChange={(e) => setEstadoServicioId(e.target.value)}
                    required
                    className="h-11 border-zinc-200"
                  >
                    {estados.map(est => (
                      <option key={est.id} value={est.id}>{est.nombre}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Servicio Específico <span className="text-red-500">*</span></Label>
                  <Input value={servicioEspecifico} onChange={(e) => setServicioEspecifico(e.target.value)} placeholder="Ej: Control de Roedores" required className="h-11 border-zinc-200" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo de Visita <span className="text-red-500">*</span></Label>
                  <Select value={tipoVisita} onChange={(e) => setTipoVisita(e.target.value)} required className="h-11 border-zinc-200">
                    <option value="">Seleccionar visita...</option>
                    {TIPOS_VISITA.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nivel de Infestación <span className="text-red-500">*</span></Label>
                  <Select value={nivelInfestacion} onChange={(e) => handleNivelInfestacionChange(e.target.value)} required className="h-11 border-zinc-200">
                    <option value="">Seleccionar nivel...</option>
                    {NIVELES_INFESTACION.map(n => (
                      <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Frecuencia Sugerida (Días)</Label>
                  <Input
                    type="number"
                    value={frecuenciaRecomendada}
                    onChange={(e) => setFrecuenciaRecomendada(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Días"
                    className="h-11 border-zinc-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Urgencia <span className="text-red-500">*</span></Label>
                  <Select value={urgencia} onChange={(e) => setUrgencia(e.target.value)} required className="h-11 border-zinc-200">
                    <option value="">Seleccionar urgencia...</option>
                    {URGENCIAS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Observaciones</Label>
                  <textarea
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha de Ejecución <span className="text-red-500">*</span></Label>
                  <Input type="date" value={fechaVisita} onChange={(e) => setFechaVisita(e.target.value)} required className="h-11 border-zinc-200" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Hora de Inicio <span className="text-red-500">*</span></Label>
                  <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required className="h-11 border-zinc-200" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Duración Labor <span className="text-red-500">*</span></Label>
                  <Select value={duracionMinutos} onChange={(e) => setDuracionMinutos(e.target.value)} required className="h-11 border-zinc-200">
                    <option value="60">60 Minutos</option>
                    <option value="90">90 Minutos</option>
                    <option value="120">120 Minutos</option>
                    <option value="180">180 Minutos</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Operador</Label>
                  <Select value={selectedOperador} onChange={(e) => setSelectedOperador(e.target.value)} className="h-11 border-zinc-200">
                    <option value="">Por asignar / Automático</option>
                    {(Array.isArray(operadores) ? operadores : []).map(o => (
                      <option key={o.id} value={o.id}>{o.nombre}</option>
                    ))}
                  </Select>
                </div>
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
                    <Input type="number" value={valorCotizado} onChange={(e) => setValorCotizado(e.target.value)} placeholder="0.00" required className="h-11 border-zinc-200 pl-8 font-bold" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Método de Recaudo</Label>
                  <Select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} className="h-11 border-zinc-200">
                    <option value="">No definido aún</option>
                    {(Array.isArray(metodosPago) ? metodosPago : []).map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado del Pago <span className="text-red-500">*</span></Label>
                  <Select value={estadoPago} onChange={(e) => setEstadoPago(e.target.value)} required className="h-11 border-zinc-200">
                    <option value="">Seleccionar estado...</option>
                    {ESTADOS_PAGO.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo de Facturación <span className="text-red-500">*</span></Label>
                  <Select value={tipoFacturacion} onChange={(e) => setTipoFacturacion(e.target.value)} required className="h-11 border-zinc-200">
                    <option value="">Seleccionar facturación...</option>
                    {TIPOS_FACTURACION.map(m => (
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
            <p className="text-[11px] font-medium max-w-xs leading-relaxed">Actualizando los parámetros operativos de la orden técnica.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} className="h-12 px-8 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:bg-zinc-200">Descartar</Button>
            <Button
              type="submit"
              form="servicio-form"
              disabled={saving}
              className="h-12 px-12 bg-vivido-purpura-2 text-white hover:opacity-90 shadow-xl shadow-vivido-purpura-2/20 transition-all gap-3 border-none rounded-xl"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="font-bold text-xs tracking-[0.1em] uppercase text-white">Guardar Cambios</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditarServicioPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="flex h-[80vh] items-center justify-center text-sm text-zinc-500 animate-pulse font-bold uppercase tracking-widest">Iniciando protocolo de edición...</div>}>
        <EditarServicioContent id={resolvedParams.id} />
      </Suspense>
    </DashboardLayout>
  );
}
