"use client";

import { useState, useEffect, Suspense, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  getClientesAction,
  getMetodosPagoAction,
  getOperatorsAction,
  updateOrdenServicioAction,
  getOrdenServicioByIdAction,
  getServiciosAction,
  notifyServiceOperatorWebhookAction,
} from "../../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  ArrowLeft,
  User,
  Calendar,
  CreditCard,
  Briefcase,
  GanttChart,
  Loader2,
  Trash2,
  Plus,
  Save
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { cn } from "@/components/ui/utils";

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

const TIPOS_FACTURACION = [
  { value: "UNICO", label: "Servicio único / Eventual" },
  { value: "CONTRATO_MENSUAL", label: "Parte de contrato mensual" },
  { value: "PLAN_TRIMESTRAL", label: "Parte de plan trimestral" },
  { value: "PLAN_SEMESTRAL", label: "Parte de plan semestral" },
  { value: "PLAN_ANUAL", label: "Parte de plan anual" },
];

const ESTADOS_ORDEN = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "PROCESO", label: "En Proceso" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "PROGRAMADO", label: "Programado" },
  { value: "LIQUIDADO", label: "Liquidado" },
  { value: "TECNICO_FINALIZO", label: "Técnico Finalizó" },
  { value: "REPROGRAMADO", label: "Reprogramado" },
  { value: "SIN_CONCRETAR", label: "Sin Concretar" },
];

interface Direccion {
  id: string;
  direccion: string;
  nombreSede?: string | null;
  barrio?: string | null;
  municipio?: string | null;
  linkMaps?: string | null;
}

interface Cliente {
  id: string;
  tipoCliente: "PERSONA" | "EMPRESA";
  nombre?: string | null;
  apellido?: string | null;
  razonSocial?: string | null;
  direcciones?: Direccion[];
}

interface Operador {
  id: string;
  nombre: string;
  telefono?: string;
}

interface BreakdownLine {
  metodo: string;
  monto: string | number;
  banco?: string;
  referencia?: string;
}

function EditarServicioContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [serviciosEmpresa, setServiciosEmpresa] = useState<Array<{id: string, nombre: string}>>([]);

  // Form State
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedDireccion, setSelectedDireccion] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState("");
  const [selectedOperador, setSelectedOperador] = useState("");
  const [initialOperadorId, setInitialOperadorId] = useState("");
  const [numeroOrden, setNumeroOrden] = useState("");
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
  const [breakdown, setBreakdown] = useState<Array<{ metodo: string; monto: string; banco?: string; referencia?: string }>>([
    { metodo: "EFECTIVO", monto: "" }
  ]);
  const [tipoFacturacion, setTipoFacturacion] = useState("");
  const [estadoServicio, setEstadoServicio] = useState("");

  const fetchOperadores = useCallback(async (empId: string) => {
    if (!empId) return;
    try {
      const ops = await getOperatorsAction(empId);
      setOperadores(Array.isArray(ops) ? ops : ops?.data || []);
    } catch (e) {
      console.error("Error loading operators", e);
    }
  }, []);

  const fetchServicios = useCallback(async (empId: string) => {
    if (!empId) return;
    try {
      const svs = await getServiciosAction(empId);
      setServiciosEmpresa(Array.isArray(svs) ? svs : svs?.data || []);
    } catch (e) {
      console.error("Error loading services", e);
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
        setInitialOperadorId(orderData.tecnicoId || "");
        setNumeroOrden(orderData.numeroOrden || id.slice(0, 8).toUpperCase());
        setServicioEspecifico(orderData.servicio?.nombre || "");
        setTipoVisita(orderData.tipoVisita || "");
        setNivelInfestacion(orderData.nivelInfestacion || "");
        setFrecuenciaRecomendada(orderData.frecuenciaSugerida || "");
        setUrgencia(orderData.urgencia || "");
        setObservacion(orderData.observacion || "");
        
        const numericCotizado = orderData.valorCotizado?.toString() || "";
        const formattedCotizado = numericCotizado.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        setValorCotizado(formattedCotizado);

        // Cargar desglose de pago si existe
        if (orderData.desglosePago && Array.isArray(orderData.desglosePago) && orderData.desglosePago.length > 0) {
          setBreakdown((orderData.desglosePago as unknown as BreakdownLine[]).map(l => ({
            metodo: l.metodo,
            banco: l.banco,
            referencia: l.referencia,
            monto: l.monto.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".")
          })));
        } else {
          // Fallback para órdenes sin desglose
          setBreakdown([{ metodo: "EFECTIVO", monto: formattedCotizado }]);
        }

        setTipoFacturacion(orderData.tipoFacturacion || "");
        setEstadoServicio(orderData.estadoServicio || "NUEVO");
        
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
          fetchServicios(orderData.empresaId),
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
  }, [id, router, fetchMetodosPago, fetchOperadores, fetchServicios]);

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
      tecnicoId: selectedOperador || undefined,
      direccionId: selectedDireccion || undefined,
      servicioEspecifico,
      urgencia: urgencia || undefined,
      observacion: observacion || undefined,
      nivelInfestacion: nivelInfestacion || undefined,
      tipoVisita: tipoVisita || undefined,
      frecuenciaSugerida: frecuenciaRecomendada ? Number(frecuenciaRecomendada) : undefined,
      tipoFacturacion: tipoFacturacion || undefined,
      valorCotizado: valorCotizado ? Number(valorCotizado.replace(/\./g, "")) : undefined,
      desglosePago: breakdown.map(line => ({
        ...line,
        monto: parseFloat(line.monto.replace(/\./g, "")) || 0
      })),
      estadoServicio: estadoServicio || undefined,
      fechaVisita: fechaVisita ? new Date(fechaVisita).toISOString() : undefined,
      horaInicio: (fechaVisita && horaInicio) ? new Date(`${fechaVisita}T${horaInicio}:00`).toISOString() : undefined,
      duracionMinutos: Number(duracionMinutos),
    };

    try {
      const res = await updateOrdenServicioAction(id, payload);
      if (!res.success) throw new Error(res.error);

      // Webhook Notification if operator changed
      console.log("Checking for operator change and service status...", { 
        selectedOperador, 
        initialOperadorId, 
        estadoServicio 
      });

      const isFinishedOrLiquidated = estadoServicio === "TECNICO_FINALIZO" || estadoServicio === "LIQUIDADO";

      if (selectedOperador && selectedOperador !== initialOperadorId && !isFinishedOrLiquidated) {
        const operator = operadores.find(o => o.id === selectedOperador);
        const client = clientes.find(c => c.id === selectedCliente);
        const direccion = direccionesCliente.find(d => d.id === selectedDireccion);
        
        console.log("Operator found:", operator);
        
        if (operator?.telefono) {
          toast.info(`Notificando al operador ${operator.nombre}...`);
          
          // Formatear fecha legible
          const dateObj = new Date(`${fechaVisita}T${horaInicio}:00`);
          const formattedDate = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'numeric', year: 'numeric' });
          const formattedTime = dateObj.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });

          // Formatear métodos de pago
          const metodosFormatted = breakdown
            .map(b => `${b.metodo} ($ ${b.monto})`)
            .join(", ");

          notifyServiceOperatorWebhookAction({
            telefonoOperador: operator.telefono,
            numeroOrden: `#${numeroOrden}`,
            cliente: client ? (client.tipoCliente === "EMPRESA" ? (client.razonSocial || "") : `${client.nombre} ${client.apellido}`) : "Cliente desconocido",
            servicio: servicioEspecifico.toUpperCase(),
            programacion: `${formattedDate} a las ${formattedTime}`,
            tecnico: operator.nombre,
            estado: estadoServicio,
            urgencia: urgencia,
            direccion: direccion ? direccion.direccion : "N/A",
            linkMaps: (direccion && direccion.linkMaps) ? direccion.linkMaps : "N/A",
            municipio: (direccion && direccion.municipio) ? direccion.municipio : "N/A",
            barrio: (direccion && direccion.barrio) ? direccion.barrio : "N/A",
            detalles: "Sin detalles adicionales",
            valorCotizado: `$ ${valorCotizado}`,
            metodosPago: metodosFormatted,
            observaciones: observacion || "Sin observaciones",
            idServicio: id
          }).then(webhookRes => {
            if (webhookRes.success) {
              toast.success("Operador notificado correctamente");
            } else {
              toast.error("Error al notificar al operador");
            }
          }).catch(err => {
            console.error("Error triggering operator notification webhook", err);
            toast.error("Error crítico al notificar operador");
          });
        } else {
          console.warn("Operator has no phone number, skipping notification");
          toast.warning("El operador no tiene teléfono registrado. No se pudo enviar la notificación.");
        }
      }

      toast.success("Orden de servicio actualizada correctamente");
      router.push(returnTo || "/dashboard/servicios");
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
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-700 dark:border-zinc-800 overflow-hidden min-h-0">

        {/* Header Fijo */}
        <div className="flex-none bg-white dark:bg-zinc-950 border-b border-zinc-700 dark:border-zinc-800 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-full border border-zinc-700 dark:border-zinc-800 hover:bg-zinc-50">
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
              <div className="flex items-center gap-3 border-b border-zinc-700 dark:border-zinc-800 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-700 dark:border-zinc-800 text-zinc-400">
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
                  <Combobox
                    options={[
                      { value: "", label: selectedCliente ? "Seleccionar sede disponible..." : "Primero seleccione un cliente" },
                      ...(Array.isArray(direccionesCliente) ? direccionesCliente : []).map(d => ({
                        value: d.id,
                        label: `${d.direccion} - ${d.nombreSede || d.barrio}`
                      }))
                    ]}
                    value={selectedDireccion}
                    onChange={setSelectedDireccion}
                    disabled={!selectedCliente}
                    placeholder="Seleccionar sede..."
                    hideSearch
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: ESPECIFICACIONES TÉCNICAS */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-700 dark:border-zinc-800 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-700 dark:border-zinc-800 text-zinc-400">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Especificaciones Técnicas</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado del Servicio <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={[
                      { value: "", label: "Seleccionar estado..." },
                      ...ESTADOS_ORDEN.map(est => ({ value: est.value, label: est.label }))
                    ]}
                    value={estadoServicio}
                    onChange={setEstadoServicio}
                    placeholder="Estado..."
                    hideSearch
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Servicio Específico <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={[
                      { value: "", label: "Seleccionar servicio..." },
                      ...(Array.isArray(serviciosEmpresa) ? serviciosEmpresa : []).map(s => ({ value: s.nombre, label: s.nombre }))
                    ]}
                    value={servicioEspecifico}
                    onChange={setServicioEspecifico}
                    placeholder="Servicio..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo de Visita <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={[
                      { value: "", label: "Seleccionar visita..." },
                      ...TIPOS_VISITA.map(t => ({ value: t.value, label: t.label }))
                    ]}
                    value={tipoVisita}
                    onChange={setTipoVisita}
                    placeholder="Visita..."
                    hideSearch
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nivel de Infestación <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={[
                      { value: "", label: "Seleccionar nivel..." },
                      ...NIVELES_INFESTACION.map(n => ({ value: n.value, label: n.label }))
                    ]}
                    value={nivelInfestacion}
                    onChange={handleNivelInfestacionChange}
                    placeholder="Nivel..."
                    hideSearch
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Frecuencia Sugerida (Días)</Label>
                  <Input
                    type="number"
                    value={frecuenciaRecomendada}
                    onChange={(e) => setFrecuenciaRecomendada(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Días"
                    className="h-11 border-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Urgencia <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={[
                      { value: "", label: "Seleccionar urgencia..." },
                      ...URGENCIAS.map(u => ({ value: u.value, label: u.label }))
                    ]}
                    value={urgencia}
                    onChange={setUrgencia}
                    placeholder="Urgencia..."
                    hideSearch
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Observaciones</Label>
                  <textarea
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-700 dark:border-zinc-800 rounded-xl p-4 text-sm font-medium resize-none min-h-[100px] focus:ring-[var(--color-azul-1)] focus:border-[var(--color-azul-1)] outline-none"
                    placeholder="Detalles adicionales, requerimientos específicos o notas importantes..."
                  ></textarea>
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: AGENDA OPERATIVA */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-700 dark:border-zinc-800 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-700 dark:border-zinc-800 text-zinc-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Agenda Operativa</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha de Ejecución <span className="text-red-500">*</span></Label>
                  <DatePicker 
                    date={fechaVisita ? new Date(fechaVisita + "T00:00:00") : undefined} 
                    onChange={(d) => setFechaVisita(d ? d.toISOString().split("T")[0] : "")} 
                    className="h-11 border-zinc-700" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Hora de Inicio <span className="text-red-500">*</span></Label>
                  <TimePicker 
                    value={horaInicio} 
                    onChange={setHoraInicio} 
                    className="h-11 border-zinc-700" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Duración Labor <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={[
                      { value: "60", label: "60 Minutos" },
                      { value: "90", label: "90 Minutos" },
                      { value: "120", label: "120 Minutos" },
                      { value: "180", label: "180 Minutos" }
                    ]}
                    value={duracionMinutos}
                    onChange={setDuracionMinutos}
                    placeholder="Duración..."
                    hideSearch
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Operador</Label>
                  <Combobox
                    options={[
                      { value: "", label: "Por asignar / Automático" },
                      ...(Array.isArray(operadores) ? operadores : []).map(o => ({ value: o.id, label: o.nombre }))
                    ]}
                    value={selectedOperador}
                    onChange={setSelectedOperador}
                    placeholder="Operador..."
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 4: CONDICIONES DE PAGO */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-700 dark:border-zinc-800 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-700 dark:border-zinc-800 text-zinc-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Condiciones de Pago</h2>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2"
                    onClick={() => setBreakdown([...breakdown, { metodo: "EFECTIVO", monto: "" }])}
                  >
                    <Plus className="h-3 w-3" /> Añadir Método
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tarifa del Servicio (COP) <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                      <Input 
                        type="text" 
                        value={valorCotizado} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const formatted = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                          setValorCotizado(formatted);
                          
                          if (breakdown.length === 1 && (!breakdown[0].monto || breakdown[0].monto === valorCotizado)) {
                            const newBreakdown = [...breakdown];
                            newBreakdown[0].monto = formatted;
                            setBreakdown(newBreakdown);
                          }
                        }} 
                        placeholder="0" 
                        required 
                        className="h-11 border-zinc-700 pl-8 font-bold" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo de Facturación <span className="text-red-500">*</span></Label>
                    <Combobox
                      options={[
                        { value: "", label: "Seleccionar facturación..." },
                        ...TIPOS_FACTURACION.map(m => ({ value: m.value, label: m.label }))
                      ]}
                      value={tipoFacturacion}
                      onChange={setTipoFacturacion}
                      placeholder="Facturación..."
                      hideSearch
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block px-1">Desglose de Cobro</Label>
                  <div className="grid grid-cols-1 gap-4">
                    {breakdown.map((line, index) => (
                      <div key={index} className="p-5 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-700 dark:border-zinc-800 space-y-4 relative group">
                        {breakdown.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => setBreakdown(breakdown.filter((_, i) => i !== index))}
                            className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-zinc-500 uppercase">Método</Label>
                            <Combobox
                              options={METODOS_PAGO_BASE.map(m => ({ value: m.value, label: m.label }))}
                              value={line.metodo}
                              onChange={(val) => {
                                const newBreakdown = [...breakdown];
                                newBreakdown[index] = { ...line, metodo: val };
                                setBreakdown(newBreakdown);
                              }}
                              placeholder="Método..."
                              hideSearch
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-zinc-500 uppercase">Monto</Label>
                            <Input 
                              type="text"
                              value={line.monto}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                const formatted = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                const newBreakdown = [...breakdown];
                                newBreakdown[index] = { ...line, monto: formatted };
                                setBreakdown(newBreakdown);
                              }}
                              placeholder="0"
                              className="h-10 rounded-xl bg-white dark:bg-zinc-950 border-zinc-700 font-bold"
                            />
                          </div>
                        </div>

                        {line.metodo === "TRANSFERENCIA" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-zinc-500 uppercase">Banco / Entidad</Label>
                              <Input 
                                value={line.banco || ""}
                                onChange={(e) => {
                                  const newBreakdown = [...breakdown];
                                  newBreakdown[index] = { ...line, banco: e.target.value };
                                  setBreakdown(newBreakdown);
                                }}
                                placeholder="Ej: Bancolombia, Nequi..."
                                className="h-10 rounded-xl bg-white dark:bg-zinc-950 border-zinc-700 font-medium"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-zinc-500 uppercase">Referencia</Label>
                              <Input 
                                value={line.referencia || ""}
                                onChange={(e) => {
                                  const newBreakdown = [...breakdown];
                                  newBreakdown[index] = { ...line, referencia: e.target.value };
                                  setBreakdown(newBreakdown);
                                }}
                                placeholder="Nº comprobante"
                                className="h-10 rounded-xl bg-white dark:bg-zinc-950 border-zinc-700 font-medium"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center px-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total Desglose</span>
                      <span className={cn(
                        "text-sm font-black",
                        breakdown.reduce((sum, l) => sum + (parseFloat(l.monto.replace(/\./g, "")) || 0), 0) === (parseFloat(valorCotizado.replace(/\./g, "")) || 0)
                          ? "text-emerald-500"
                          : "text-amber-500"
                      )}>
                        $ {breakdown.reduce((sum, l) => sum + (parseFloat(l.monto.replace(/\./g, "")) || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer Fijo */}
        <div className="flex-none bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-700 dark:border-zinc-800 px-10 py-5 flex items-center justify-between">
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
              className="h-12 px-12 bg-azul-1 dark:bg-azul-1 text-white hover:opacity-90 shadow-xl shadow-azul-1/20 transition-all gap-3 border-none rounded-xl"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="font-bold text-xs tracking-[0.1em] uppercase text-white dark:text-zinc-200">Guardar Cambios</span>
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
