"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getClientesAction,
  getMetodosPagoAction,
  getEnterprisesAction,
  getOperatorsAction,
  getServiciosAction,
  createOrdenServicioAction,
  getClienteConfigsAction,
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
  CreditCard,
  Briefcase,
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

interface Empresa {
  id: string;
  nombre: string;
}

interface Servicio {
  id: string;
  nombre: string;
}

function NuevoServicioContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [serviciosEmpresa, setServiciosEmpresa] = useState<Servicio[]>([]);
  const [clienteConfigs, setClienteConfigs] = useState<any[]>([]);

  // Form State
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedDireccion, setSelectedDireccion] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState("");
  const [selectedOperador, setSelectedOperador] = useState("");
  const [direccionesCliente, setDireccionesCliente] = useState<Direccion[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

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
  const [estadoServicio, setEstadoServicio] = useState("NUEVO");

  const applyConfigToForm = useCallback((configs: any[], dirId?: string) => {
    // 1. Try to find config for specific address
    // 2. Fallback to global config (direccionId is null or undefined)
    const targetConfig = configs.find(c => c.direccionId === dirId) || 
                         configs.find(c => !c.direccionId);

    if (targetConfig) {
      if (targetConfig.duracionEstimada) setDuracionMinutos(String(targetConfig.duracionEstimada));
      if (targetConfig.frecuenciaSugerida) setFrecuenciaRecomendada(targetConfig.frecuenciaSugerida);
      
      const notes = [];
      if (targetConfig.protocoloServicio) notes.push(`PROTOCOLO: ${targetConfig.protocoloServicio}`);
      if (targetConfig.observacionesFijas) notes.push(`OBSERVACIONES FIJAS: ${targetConfig.observacionesFijas}`);
      
      if (notes.length > 0) {
        setObservacion(notes.join('\n\n'));
      }
    }
  }, []);

  const handleNivelInfestacionChange = (val: string) => {
    setNivelInfestacion(val);

    if (!val) {
      setFrecuenciaRecomendada("");
      return;
    }

    let suggestedDays = 30; // Default monthly
    switch (val) {
      case "CRITICO": suggestedDays = 7; break; // Weekly
      case "ALTO": suggestedDays = 15; break; // Bi-weekly
      case "MEDIO": suggestedDays = 30; break; // Monthly
      case "BAJO": suggestedDays = 60; break; // Bi-monthly
      case "PREVENTIVO": suggestedDays = 90; break; // Quarterly
    }

    setFrecuenciaRecomendada(suggestedDays);
  };

  // Carga de métodos de pago cuando cambia la empresa seleccionada
  const fetchMetodosPago = useCallback(async (empId: string) => {
    if (!empId) return;
    try {
      const mps = await getMetodosPagoAction(empId);
      setMetodosPago(Array.isArray(mps) ? mps : mps?.data || []);
    } catch (e) {
      console.error("Error loading payment methods", e);
    }
  }, []);

  // Carga de operadores cuando cambia la empresa
  const fetchOperadores = useCallback(async (empId: string) => {
    if (!empId) return;
    try {
      const ops = await getOperatorsAction(empId);
      setOperadores(Array.isArray(ops) ? ops : ops?.data || []);
    } catch (e) {
      console.error("Error loading operators", e);
    }
  }, []);

  // Carga de servicios cuando cambia la empresa
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
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    const loadData = async () => {
      const userData = localStorage.getItem("user");
      // Obtener empresa seleccionada actualmente en el selector de la barra lateral
      const currentEmpresaId = localStorage.getItem("current-enterprise-id") ||
                              document.cookie.split("; ").find(row => row.startsWith("x-enterprise-id="))?.split("=")[1];

      let uRole = null;

      if (userData && userData !== "undefined") {
        try {
          const user = JSON.parse(userData);
          uRole = user.role;
          setUserRole(uRole);
        } catch (_e) { /* ignore */ }
      }

      try {
        const [cls, emps] = await Promise.all([
          getClientesAction(),
          getEnterprisesAction(),
        ]);

        // Clientes usually returns an array or { data: [] }
        const loadedClientes = (
          Array.isArray(cls) ? cls : cls?.data || []
        ) as Cliente[];
        setClientes(loadedClientes);

        // Enterprises returns { items: [], count: X, maxEmpresas: Y }
        const loadedEmpresas = (
          Array.isArray(emps) ? emps : emps?.items || emps?.data || []
        ) as Empresa[];

        setEmpresas(loadedEmpresas);

        // LÓGICA DE PRE-SELECCIÓN DE EMPRESA
        let targetEmpresaId = "";

        // 1. Priorizar la empresa seleccionada actualmente en el sistema
        if (currentEmpresaId && loadedEmpresas.some(e => e.id === currentEmpresaId)) {
          targetEmpresaId = currentEmpresaId;
        }
        // 2. Si no hay selección actual, pero solo hay una empresa disponible
        else if (loadedEmpresas.length === 1) {
          targetEmpresaId = loadedEmpresas[0].id;
        }

        if (targetEmpresaId) {
          setSelectedEmpresa(targetEmpresaId);
          fetchMetodosPago(targetEmpresaId);
          fetchOperadores(targetEmpresaId);
          fetchServicios(targetEmpresaId);
        }
      } catch (e) {
        console.error("Error loading initial data", e);
        toast.error("Error al cargar datos básicos");
      }
    };

    loadData();

    return () => { document.body.style.overflow = originalStyle; };
  }, [fetchMetodosPago, fetchOperadores, fetchServicios]);

  const handleEmpresaChange = (val: string) => {
    setSelectedEmpresa(val);
    fetchMetodosPago(val);
    fetchOperadores(val);
    fetchServicios(val);
    setServicioEspecifico("");
  };

  const handleClienteChange = async (clientId: string) => {
    setSelectedCliente(clientId);
    setClienteConfigs([]);
    
    if (clientId) {
      const configsResult = await getClienteConfigsAction(clientId);
      const configs = Array.isArray(configsResult) ? configsResult : configsResult?.data || [];
      setClienteConfigs(configs);

      const cliente = (clientes || []).find(c => c.id === clientId);
      const dirs = cliente?.direcciones || [];
      setDireccionesCliente(dirs);
      
      let dirId = "";
      if (dirs.length > 0) {
        dirId = dirs[0].id;
        setSelectedDireccion(dirId);
      } else {
        setSelectedDireccion("");
      }

      applyConfigToForm(configs, dirId);
    } else {
      setDireccionesCliente([]);
      setSelectedDireccion("");
      setObservacion("");
      setDuracionMinutos("60");
      setFrecuenciaRecomendada("");
    }
  };

  const handleDireccionChange = (dirId: string) => {
    setSelectedDireccion(dirId);
    applyConfigToForm(clienteConfigs, dirId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedCliente || !selectedEmpresa || !servicioEspecifico) {
      toast.error("Por favor complete los campos obligatorios");
      setLoading(false);
      return;
    }

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
      valorCotizado: valorCotizado ? Number(valorCotizado) : undefined,
      metodoPagoId: metodoPagoId || undefined,
      estadoPago: estadoPago || undefined,
      estadoServicio: estadoServicio || undefined,
      fechaVisita: fechaVisita ? new Date(fechaVisita).toISOString() : undefined,
      horaInicio: (fechaVisita && horaInicio) ? new Date(`${fechaVisita}T${horaInicio}:00`).toISOString() : undefined,
      duracionMinutos: Number(duracionMinutos),
    };

    toast.promise(
      createOrdenServicioAction(payload).then((res) => {
        if (!res.success) throw new Error(res.error);
        return res;
      }),
      {
        loading: 'Generando orden técnica y vinculando disponibilidad...',
        success: () => {
          router.push("/dashboard/servicios");
          return "Orden de servicio generada correctamente";
        },
        error: (err) => {
          setLoading(false);
          return err.message;
        },
      }
    );
  };

  const isEmpresaLocked = userRole === "COORDINADOR" || userRole === "ASESOR";

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
                      label: c.tipoCliente === "EMPRESA"
                        ? (c.razonSocial || "Empresa sin nombre")
                        : `${c.nombre || ""} ${c.apellido || ""}`.trim() || "Cliente sin nombre"
                    }))}
                    value={selectedCliente}
                    onChange={handleClienteChange}
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
                  <Select value={selectedDireccion} onChange={(e) => handleDireccionChange(e.target.value)} disabled={!selectedCliente} required className="h-11 border-zinc-200">
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
                  <Select
                    value={selectedEmpresa}
                    onChange={(e) => handleEmpresaChange(e.target.value)}
                    required
                    disabled={isEmpresaLocked}
                    className="h-11 border-zinc-200 disabled:opacity-50 disabled:bg-zinc-50 dark:disabled:bg-zinc-900"
                  >
                    <option value="">Seleccionar empresa...</option>
                    {(Array.isArray(empresas) ? empresas : []).map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </Select>
                  {isEmpresaLocked && (
                    <p className="text-[9px] font-bold text-azul-1 uppercase tracking-widest ml-1">Pre-asignada por coordinación</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado del Servicio <span className="text-red-500">*</span></Label>
                  <Select
                    value={estadoServicio}
                    onChange={(e) => setEstadoServicio(e.target.value)}
                    required
                    className="h-11 border-zinc-200"
                  >
                    {ESTADOS_ORDEN.map(est => (
                      <option key={est.value} value={est.value}>{est.label}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Servicio Específico <span className="text-red-500">*</span></Label>
                  <Select 
                    value={servicioEspecifico} 
                    onChange={(e) => setServicioEspecifico(e.target.value)} 
                    disabled={!selectedEmpresa}
                    required 
                    className="h-11 border-zinc-200"
                  >
                    <option value="">{selectedEmpresa ? "Seleccionar servicio..." : "Primero seleccione una empresa"}</option>
                    {(Array.isArray(serviciosEmpresa) ? serviciosEmpresa : []).map(s => (
                      <option key={s.id} value={s.nombre}>{s.nombre}</option>
                    ))}
                  </Select>
                  {!selectedEmpresa && (
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest ml-1">⚠ Seleccione una empresa para cargar servicios</p>
                  )}
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
                  {nivelInfestacion && (
                     <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">Calculado por nivel de infestación</p>
                  )}
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
            <p className="text-[11px] font-medium max-w-xs leading-relaxed">Se generará una orden de trabajo automática para el técnico asignado.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} className="h-12 px-8 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:bg-zinc-200">Descartar</Button>
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
