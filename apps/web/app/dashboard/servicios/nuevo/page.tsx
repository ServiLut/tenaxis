"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  getClientesAction,
  getContratoClienteActivoAction,
  getMetodosPagoAction,
  getEnterprisesAction,
  getOperatorsAction,
  getServiciosAction,
  getClienteConfigsAction,
  ConfiguracionOperativa,
  getClienteByIdAction,
  updateClienteAction,
  getDepartmentsAction,
  getMunicipalitiesAction,
} from "../../actions";
import { type ContratoCliente } from "@/lib/api/clientes-client";
import {
  completeFollowUp,
  createOrdenServicio,
  getMyFollowUpStatus,
  notifyServiceOperatorWebhook,
  type FollowUpStatusItem,
  type FollowUpStatusResponse,
} from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-shadcn";
import {
  ArrowLeft,
  User,
  Calendar,
  CreditCard,
  Briefcase,
  Info,
  Save,
  GanttChart,
  Trash2,
  Plus,
  MapPin,
  Clock,
  Contact2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { cn } from "@/components/ui/utils";
import {
  bogotaDateTimeToUtcIso,
  bogotaDateToUtcIso,
  formatBogotaDate,
  formatBogotaTime,
  pickerDateToYmd,
  ymdToPickerDate,
} from "@/utils/date-utils";

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
  { value: "DIAGNOSTICO_INICIAL", label: "Diagnóstico Inicial" },
  { value: "NUEVO", label: "Nuevo" },
  { value: "CITA_VERIFICACION", label: "Cita de Verificación" },
  { value: "SERVICIO_REFUERZO", label: "Servicio Refuerzo" },
  { value: "REPROGRAMADO", label: "Reprogramado" },
  { value: "NO_CONCRETADO", label: "No Concretado" },
  { value: "GARANTIA", label: "Garantía" },
];

const GARANTIA_VISIT_TYPE = "GARANTIA";

const normalizeVisitTypeValue = (value?: string | null) => {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return "";

  if (normalized === "DIAGNOSTICO") return "DIAGNOSTICO_INICIAL";
  if (normalized === "SEGUIMIENTO") return "CITA_VERIFICACION";
  if (normalized === "REINCIDENCIA") return "GARANTIA";
  if (normalized === "PREVENTIVO" || normalized === "CORRECTIVO") return "SERVICIO_REFUERZO";

  return normalized;
};

const METODOS_PAGO_BASE = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia Bancaria" },
  { value: "CREDITO", label: "Crédito / Por Cobrar" },
  { value: "BONO", label: "Bono / Descuento" },
  { value: "CORTESIA", label: "Cortesía (No se cobra)" },
  { value: "PENDIENTE", label: "Pendiente por definir" },
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

const FOLLOW_UP_CHANNEL_OPTIONS = [
  { value: "LLAMADA", label: "Llamada" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "CORREO", label: "Correo" },
  { value: "VISITA", label: "Visita" },
];

const FOLLOW_UP_OUTCOME_OPTIONS = [
  { value: "CONTACTADO", label: "Contactado" },
  { value: "NO_CONTESTA", label: "No contesta" },
  { value: "REPROGRAMAR", label: "Reprogramar" },
  { value: "CIERRE_EXITOSO", label: "Cierre exitoso" },
  { value: "REQUIERE_ESCALACION", label: "Requiere escalación" },
];

interface Direccion {
  id: string;
  direccion: string;
  nombreSede?: string | null;
  barrio?: string | null;
  municipio?: string | null;
  municipioId?: string | null;
  departmentId?: string | null;
  linkMaps?: string | null;
  piso?: string | null;
  bloque?: string | null;
  unidad?: string | null;
  tipoUbicacion?: string | null;
  clasificacionPunto?: string | null;
  horarioInicio?: string | null;
  horarioFin?: string | null;
  restriccionesAcceso?: string | null;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  cargoContacto?: string | null;
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

interface Empresa {
  id: string;
  nombre: string;
}

interface Servicio {
  id: string;
  nombre: string;
}

const formatContractDate = (value?: string | null) => {
  if (!value) return "Sin fecha definida";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
};

function NuevoServicioContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [serviciosEmpresa, setServiciosEmpresa] = useState<Servicio[]>([]);
  const [clienteConfigs, setClienteConfigs] = useState<ConfiguracionOperativa[]>([]);

  // Form State
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedDireccion, setSelectedDireccion] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState("");
  const [selectedOperador, setSelectedOperador] = useState("");
  const [direccionesCliente, setDireccionesCliente] = useState<Direccion[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [departamentos, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [municipios, setMunicipalities] = useState<{id: string, name: string, departmentId: string}[]>([]);
  
  // New Address State
  const [newDir, setNewDir] = useState({
    direccion: "",
    nombreSede: "",
    barrio: "",
    departmentId: "",
    municipioId: "",
    linkMaps: "",
    piso: "",
    bloque: "",
    unidad: "",
    tipoUbicacion: "RESIDENCIAL",
    clasificacionPunto: "Cocina",
    horarioInicio: "08:00",
    horarioFin: "18:00",
    restriccionesAcceso: "",
    nombreContacto: "",
    telefonoContacto: "",
    cargoContacto: ""
  });

  // Custom logic states
  const [nivelInfestacion, setNivelInfestacion] = useState("");
  const [frecuenciaRecomendada, setFrecuenciaRecomendada] = useState<number | "">("");

  // Form Fields
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([]);
  const [tipoVisita, setTipoVisita] = useState("");
  const [urgencia, setUrgencia] = useState("");
  const [diagnosticoTecnico, setDiagnosticoTecnico] = useState("");
  const [intervencionRealizada, setIntervencionRealizada] = useState("");
  const [hallazgosEstructurales, setHallazgosEstructurales] = useState("");
  const [recomendacionesObligatorias, setRecomendacionesObligatorias] =
    useState("");
  const [huboSellamiento, setHuboSellamiento] = useState("");
  const [huboRecomendacionEstructural, setHuboRecomendacionEstructural] =
    useState("");
  const [fechaVisita, setFechaVisita] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaInicioReal, setHoraInicioReal] = useState("");
  const [horaFinReal, setHoraFinReal] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState("60");
  const [valorCotizado, setValorCotizado] = useState("");
  const [breakdown, setBreakdown] = useState<Array<{ metodo: string; monto: string; banco?: string; referencia?: string }>>([
    { metodo: "EFECTIVO", monto: "" }
  ]);
  const [tipoFacturacion, setTipoFacturacion] = useState("");
  const [contratoActivo, setContratoActivo] = useState<ContratoCliente | null>(null);
  const [loadingContrato, setLoadingContrato] = useState(false);
  const [estadoServicio, setEstadoServicio] = useState("NUEVO");

  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatusResponse | null>(null);
  const [checkingFollowUps, setCheckingFollowUps] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpStatusItem | null>(null);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    contactedAt: "",
    channel: "LLAMADA",
    outcome: "CONTACTADO",
    resolution: "ACEPTADO" as "ACEPTADO" | "RECHAZADO",
    notes: "",
    nextActionAt: "",
  });
  const isGarantia = tipoVisita === GARANTIA_VISIT_TYPE;

  // --- URL PERSISTENCE LOGIC ---
  const syncToUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedCliente) params.set("cliente", selectedCliente);
    if (selectedDireccion) params.set("direccion", selectedDireccion);
    if (selectedEmpresa) params.set("empresa", selectedEmpresa);
    if (selectedOperador) params.set("operador", selectedOperador);
    if (serviciosSeleccionados.length > 0) params.set("servicios", serviciosSeleccionados.join(','));
    if (tipoVisita) params.set("tipoVisita", tipoVisita);
    if (nivelInfestacion) params.set("nivel", nivelInfestacion);
    if (urgencia) params.set("urgencia", urgencia);
    if (fechaVisita) params.set("fecha", fechaVisita);
    if (horaInicio) params.set("hora", horaInicio);
    if (duracionMinutos) params.set("duracion", duracionMinutos);
    if (valorCotizado) params.set("valor", valorCotizado);
    if (tipoFacturacion) params.set("facturacion", tipoFacturacion);
    if (estadoServicio) params.set("estado", estadoServicio);
    if (diagnosticoTecnico) params.set("diag", diagnosticoTecnico);
    if (intervencionRealizada) params.set("interv", intervencionRealizada);
    if (hallazgosEstructurales) params.set("hallazgos", hallazgosEstructurales);
    if (recomendacionesObligatorias) {
      params.set("recomendaciones", recomendacionesObligatorias);
    }
    if (huboSellamiento) params.set("sellamiento", huboSellamiento);
    if (huboRecomendacionEstructural) {
      params.set("recomendacionEstructural", huboRecomendacionEstructural);
    }
    if (horaInicioReal) params.set("horaInicioReal", horaInicioReal);
    if (horaFinReal) params.set("horaFinReal", horaFinReal);
    if (frecuenciaRecomendada) params.set("frecuencia", frecuenciaRecomendada.toString());
    
    if (breakdown.length > 0 && (breakdown.length > 1 || breakdown[0].monto !== "")) {
      params.set("breakdown", JSON.stringify(breakdown));
    }

    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [
    selectedCliente, selectedDireccion, selectedEmpresa, selectedOperador, 
    serviciosSeleccionados, tipoVisita, nivelInfestacion, urgencia, fechaVisita, 
    horaInicio, duracionMinutos, valorCotizado, tipoFacturacion, estadoServicio, 
    diagnosticoTecnico,
    intervencionRealizada,
    hallazgosEstructurales,
    recomendacionesObligatorias,
    huboSellamiento,
    huboRecomendacionEstructural,
    horaInicioReal,
    horaFinReal,
    frecuenciaRecomendada,
    breakdown
  ]);

  useEffect(() => {
    syncToUrl();
  }, [syncToUrl]);
  // --- END URL PERSISTENCE LOGIC ---

  useEffect(() => {
    if (!isGarantia) {
      return;
    }

    setValorCotizado("0");
    setBreakdown([{ metodo: "CORTESIA", monto: "0" }]);
  }, [isGarantia]);

  const empresaSeleccionadaNombre =
    empresas.find((empresa) => empresa.id === selectedEmpresa)?.nombre ||
    selectedEmpresa;

  const resumenContratoActivo = contratoActivo
    ? [
        {
          label: "Empresa vinculada",
          value: empresaSeleccionadaNombre || "Sin empresa",
        },
        {
          label: "Vigencia",
          value: contratoActivo.fechaFin
            ? `${formatContractDate(contratoActivo.fechaInicio)} - ${formatContractDate(contratoActivo.fechaFin)}`
            : `Desde ${formatContractDate(contratoActivo.fechaInicio)}`,
        },
        {
          label: "Frecuencia operativa",
          value: contratoActivo.frecuenciaServicio
            ? `Cada ${contratoActivo.frecuenciaServicio} dias`
            : "No definida",
        },
        {
          label: "Servicios comprometidos",
          value: contratoActivo.serviciosComprometidos
            ? String(contratoActivo.serviciosComprometidos)
            : "No definidos",
        },
      ]
    : [];

  const applyConfigToForm = useCallback((configs: ConfiguracionOperativa[], dirId?: string) => {
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
        setRecomendacionesObligatorias(notes.join('\n\n'));
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
      await getMetodosPagoAction(empId);
      // setMetodosPago(...) removed as it was unused
    } catch (e) {
      console.error("Error loading payment methods", e);
    }
  }, []);

  // Carga de operadores cuando cambia la empresa
  const fetchOperadores = useCallback(async (empId: string) => {
    if (!empId) return;
    try {
      const ops = await getOperatorsAction(empId);
      setOperadores(Array.isArray(ops) ? (ops as Operador[]) : []);
    } catch (e) {
      console.error("Error loading operators", e);
    }
  }, []);

  // Carga de servicios cuando cambia la empresa
  const fetchServicios = useCallback(async (empId: string) => {
    if (!empId) return;
    try {
      const svs = await getServiciosAction(empId);
      setServiciosEmpresa(Array.isArray(svs) ? (svs as Servicio[]) : []);
    } catch (e) {
      console.error("Error loading services", e);
    }
  }, []);

  const refreshFollowUpStatus = useCallback(async (empresaId?: string) => {
    if (!empresaId || !membershipId) {
      setFollowUpStatus(null);
      return null;
    }

    setCheckingFollowUps(true);
    try {
      const status = await getMyFollowUpStatus(empresaId);
      setFollowUpStatus(status);
      return status;
    } catch (e) {
      console.error("Error loading follow-up status", e);
      return null;
    } finally {
      setCheckingFollowUps(false);
    }
  }, [membershipId]);

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
          setMembershipId(user.membershipId || null);
        } catch (_e) { /* ignore */ }
      }

      try {
        const [cls, emps, deps, muns] = await Promise.all([
          getClientesAction(),
          getEnterprisesAction(),
          getDepartmentsAction(),
          getMunicipalitiesAction(),
        ]);

        // Clientes usually returns an array or { data: [] }
        const loadedClientes = (
          Array.isArray(cls) ? (cls as Cliente[]) : []
        ) as Cliente[];
        setClientes(loadedClientes);
        setDepartments(deps);
        setMunicipalities(muns);

        // Enterprises returns { items: [], count: X, maxEmpresas: Y }
        const loadedEmpresas = (
          Array.isArray(emps) ? emps : (emps as { items: Empresa[] })?.items || (emps as { data: Empresa[] })?.data || []
        ) as Empresa[];

        setEmpresas(loadedEmpresas);

        // --- URL OVERRIDE LOGIC ---
        const urlParams = new URLSearchParams(window.location.search);
        
        // 1. Empresa Pre-selection
        let targetEmpresaId = urlParams.get("empresa") || "";
        
        // If not in URL, try from cookie/localStorage
        if (!targetEmpresaId && currentEmpresaId && loadedEmpresas.some(e => e.id === currentEmpresaId)) {
          targetEmpresaId = currentEmpresaId;
        }

        // If still no target, or target not in list, pick the first one
        if (!targetEmpresaId || !loadedEmpresas.some(e => e.id === targetEmpresaId)) {
          if (loadedEmpresas.length > 0) {
            targetEmpresaId = loadedEmpresas[0].id;
          }
        }

        if (targetEmpresaId) {
          setSelectedEmpresa(targetEmpresaId);
          fetchMetodosPago(targetEmpresaId);
          fetchOperadores(targetEmpresaId);
          fetchServicios(targetEmpresaId);
          void refreshFollowUpStatus(targetEmpresaId);
        }

        // 2. Cliente and dependent data
        const urlClientId = urlParams.get("cliente");
        if (urlClientId) {
          setSelectedCliente(urlClientId);
          
          // Fetch configs
          getClienteConfigsAction(urlClientId).then(configsResult => {
            const configs = Array.isArray(configsResult) ? (configsResult as ConfiguracionOperativa[]) : [];
            setClienteConfigs(configs);
            
            const urlDirId = urlParams.get("direccion");
            const cliente = loadedClientes.find(c => c.id === urlClientId);
            const dirs = cliente?.direcciones || [];
            setDireccionesCliente(dirs);
            
            if (urlDirId) {
              setSelectedDireccion(urlDirId);
              applyConfigToForm(configs, urlDirId);
            } else if (dirs.length > 0) {
              setSelectedDireccion(dirs[0].id);
              applyConfigToForm(configs, dirs[0].id);
            }
          });
        }

        // 3. Other fields
        if (urlParams.get("operador")) setSelectedOperador(urlParams.get("operador")!);
        const urlServicios = urlParams.get("servicios") || urlParams.get("servicio");
        if (urlServicios) setServiciosSeleccionados(urlServicios.split(','));
        if (urlParams.get("tipoVisita")) setTipoVisita(normalizeVisitTypeValue(urlParams.get("tipoVisita")));
        if (urlParams.get("nivel")) setNivelInfestacion(urlParams.get("nivel")!);
        if (urlParams.get("urgencia")) setUrgencia(urlParams.get("urgencia")!);
        if (urlParams.get("diag")) setDiagnosticoTecnico(urlParams.get("diag")!);
        if (urlParams.get("interv")) {
          setIntervencionRealizada(urlParams.get("interv")!);
        }
        if (urlParams.get("hallazgos")) {
          setHallazgosEstructurales(urlParams.get("hallazgos")!);
        }
        if (urlParams.get("recomendaciones")) {
          setRecomendacionesObligatorias(urlParams.get("recomendaciones")!);
        }
        if (urlParams.get("sellamiento")) {
          setHuboSellamiento(urlParams.get("sellamiento")!);
        }
        if (urlParams.get("recomendacionEstructural")) {
          setHuboRecomendacionEstructural(
            urlParams.get("recomendacionEstructural")!,
          );
        }
        if (urlParams.get("fecha")) setFechaVisita(urlParams.get("fecha")!);
        if (urlParams.get("hora")) setHoraInicio(urlParams.get("hora")!);
        if (urlParams.get("horaInicioReal")) {
          setHoraInicioReal(urlParams.get("horaInicioReal")!);
        }
        if (urlParams.get("horaFinReal")) {
          setHoraFinReal(urlParams.get("horaFinReal")!);
        }
        if (urlParams.get("duracion")) setDuracionMinutos(urlParams.get("duracion")!);
        if (urlParams.get("valor")) setValorCotizado(urlParams.get("valor")!);
        if (urlParams.get("facturacion")) setTipoFacturacion(urlParams.get("facturacion")!);
        if (urlParams.get("estado")) setEstadoServicio(urlParams.get("estado")!);
        if (urlParams.get("frecuencia")) setFrecuenciaRecomendada(Number(urlParams.get("frecuencia")));

        const urlBreakdown = urlParams.get("breakdown");
        if (urlBreakdown) {
          try {
            setBreakdown(JSON.parse(urlBreakdown));
          } catch (e) {
            console.error("Error parsing breakdown from URL", e);
          }
        }
        // --- END URL OVERRIDE LOGIC ---
      } catch (e) {
        console.error("Error loading initial data", e);
        toast.error("Error al cargar datos básicos");
      }
    };

    loadData();

    return () => { document.body.style.overflow = originalStyle; };
  }, [fetchMetodosPago, fetchOperadores, fetchServicios, refreshFollowUpStatus, applyConfigToForm]);

  const loadContratoActivo = useCallback(async (clientId: string, empresaId: string) => {
    if (!clientId || !empresaId) {
      setContratoActivo(null);
      return;
    }

    setLoadingContrato(true);
    try {
      const contrato = await getContratoClienteActivoAction(
        clientId,
        empresaId,
      );
      
      if (contrato) {
        setContratoActivo(contrato as ContratoCliente);
        if (contrato.tipoFacturacion) {
          setTipoFacturacion(contrato.tipoFacturacion);
        } else {
          setTipoFacturacion("UNICO");
        }
      } else {
        setContratoActivo(null);
        setTipoFacturacion("UNICO");
      }
    } catch (error) {
      console.error("Error loading active contract", error);
      setContratoActivo(null);
      setTipoFacturacion("UNICO");
    } finally {
      setLoadingContrato(false);
    }
  }, []);

  const handleEmpresaChange = (val: string) => {
    setSelectedEmpresa(val);
    fetchMetodosPago(val);
    fetchOperadores(val);
    fetchServicios(val);
    void refreshFollowUpStatus(val);
    setServiciosSeleccionados([]);
    
    if (selectedCliente) {
      void loadContratoActivo(selectedCliente, val);
    }
  };

  const handleClienteChange = async (clientId: string) => {
    setSelectedCliente(clientId);
    setClienteConfigs([]);
    
    if (clientId) {
      const configsResult = await getClienteConfigsAction(clientId);
      const configs = Array.isArray(configsResult) ? (configsResult as ConfiguracionOperativa[]) : [];
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
      
      if (selectedEmpresa) {
        void loadContratoActivo(clientId, selectedEmpresa);
      }
    } else {
      setDireccionesCliente([]);
      setSelectedDireccion("");
      setRecomendacionesObligatorias("");
      setDuracionMinutos("60");
      setFrecuenciaRecomendada("");
      setContratoActivo(null);
    }
  };

  const handleDireccionChange = (dirId: string) => {
    setSelectedDireccion(dirId);
    applyConfigToForm(clienteConfigs, dirId);
  };

  useEffect(() => {
    if (selectedCliente && selectedEmpresa) {
      void loadContratoActivo(selectedCliente, selectedEmpresa);
    }
  }, [selectedCliente, selectedEmpresa, loadContratoActivo]);

  const toUtcIsoFromDateTimeLocal = (value: string) => {
    const [datePart, timePart] = value.split("T");
    if (!datePart || !timePart) return "";
    return bogotaDateTimeToUtcIso(datePart, timePart);
  };

  const openFollowUpModal = (item: FollowUpStatusItem) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");

    setSelectedFollowUp(item);
    setFollowUpForm({
      contactedAt: `${yyyy}-${mm}-${dd}T${hh}:${min}`,
      channel: "LLAMADA",
      outcome: "CONTACTADO",
      resolution: "ACEPTADO",
      notes: "",
      nextActionAt: "",
    });
    setIsFollowUpModalOpen(true);
  };

  const handleCompleteFollowUp = async () => {
    if (!selectedFollowUp) return;
    if (!followUpForm.contactedAt || !followUpForm.channel || !followUpForm.outcome || !followUpForm.notes.trim()) {
      toast.error("Completa fecha, canal, resultado y notas del seguimiento");
      return;
    }

    setSavingFollowUp(true);
    try {
      await completeFollowUp(selectedFollowUp.id, {
        contactedAt: toUtcIsoFromDateTimeLocal(followUpForm.contactedAt),
        channel: followUpForm.channel,
        outcome: followUpForm.outcome,
        resolution: followUpForm.resolution,
        notes: followUpForm.notes.trim(),
        nextActionAt: followUpForm.nextActionAt
          ? toUtcIsoFromDateTimeLocal(followUpForm.nextActionAt)
          : undefined,
      });

      toast.success("Seguimiento registrado correctamente");

      const updatedStatus = await refreshFollowUpStatus(selectedEmpresa);
      if (!updatedStatus?.blocked) {
        setIsFollowUpModalOpen(false);
      } else if (updatedStatus.overdueItems.length > 0) {
        const nextPending = updatedStatus.overdueItems.find(
          (item) => item.id !== selectedFollowUp.id,
        );
        setSelectedFollowUp(nextPending || null);
        if (nextPending) {
            setFollowUpForm((current) => ({
              ...current,
              notes: "",
              resolution: "ACEPTADO",
              nextActionAt: "",
            }));
        }
      }
    } catch (error) {
      console.error("Error completing follow-up", error);
      toast.error(
        error instanceof Error ? error.message : "No se pudo registrar el seguimiento",
      );
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleAddAddress = async () => {
    if (!selectedCliente) return;
    if (!newDir.direccion || !newDir.municipioId) {
      toast.error("Dirección y municipio son obligatorios");
      return;
    }

    setLoadingAddress(true);
    try {
      const client = await getClienteByIdAction(selectedCliente) as Cliente | null;
      if (!client) throw new Error("Cliente no encontrado");

      // CLEANUP: We must remove relations and system-managed fields that Prisma rejects in a 'create' nested block
      const existingDirs = (client.direcciones || []).map((d: Direccion) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, municipio, municipioId, departmentId, linkMaps, ...rest } = d;
        return {
          ...rest,
          municipioId: municipioId || null,
          departmentId: departmentId || null,
          linkMaps: linkMaps || null
        };
      });

      // Explicitly construct the new address to avoid any unexpected fields from state
      const newAddress = {
        direccion: newDir.direccion,
        nombreSede: newDir.nombreSede || null,
        barrio: newDir.barrio || null,
        departmentId: newDir.departmentId || null,
        municipioId: newDir.municipioId || null,
        linkMaps: newDir.linkMaps || null,
        piso: newDir.piso || null,
        bloque: newDir.bloque || null,
        unidad: newDir.unidad || null,
        tipoUbicacion: newDir.tipoUbicacion || null,
        clasificacionPunto: newDir.clasificacionPunto || null,
        horarioInicio: newDir.horarioInicio || null,
        horarioFin: newDir.horarioFin || null,
        restricciones: newDir.restriccionesAcceso || null,
        nombreContacto: newDir.nombreContacto || null,
        telefonoContacto: newDir.telefonoContacto || null,
        cargoContacto: newDir.cargoContacto || null,
        activa: true,
        validadoPorSistema: false,
      };

      const updatedDirs = [...existingDirs, newAddress];

      console.log("[AddressModal] Sending updated addresses:", updatedDirs);

      const res = await updateClienteAction(selectedCliente, {
        direcciones: updatedDirs as unknown as Direccion[]
      });

      if (res.success) {
        toast.success("Dirección añadida correctamente");
        setIsAddressModalOpen(false);
        // Refresh client data
        const updatedClient = await getClienteByIdAction(selectedCliente) as Cliente | null;
        if (updatedClient) {
          const dirs = updatedClient.direcciones || [];
          setDireccionesCliente(dirs);
          if (dirs.length > 0) {
            const latestDir = dirs[dirs.length - 1];
            setSelectedDireccion(latestDir.id);
            applyConfigToForm(clienteConfigs, latestDir.id);
          }
          
          // Update clients list in state to keep it consistent
          setClientes(prev => prev.map(c => c.id === selectedCliente ? updatedClient : c));
        }
        // Reset form
        setNewDir({
          direccion: "",
          nombreSede: "",
          barrio: "",
          departmentId: "",
          municipioId: "",
          linkMaps: "",
          piso: "",
          bloque: "",
          unidad: "",
          tipoUbicacion: "RESIDENCIAL",
          clasificacionPunto: "Cocina",
          horarioInicio: "08:00",
          horarioFin: "18:00",
          restriccionesAcceso: "",
          nombreContacto: "",
          telefonoContacto: "",
          cargoContacto: ""
        });
      } else {
        toast.error(res.error || "Error al añadir dirección");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error inesperado al añadir dirección");
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (
      !selectedCliente ||
      !selectedEmpresa ||
      serviciosSeleccionados.length === 0 ||
      !diagnosticoTecnico.trim() ||
      !intervencionRealizada.trim() ||
      !huboSellamiento ||
      !huboRecomendacionEstructural
    ) {
      toast.error("Por favor complete los campos obligatorios");
      setLoading(false);
      return;
    }

    const payload = {
      clienteId: selectedCliente,
      empresaId: selectedEmpresa,
      tecnicoId: selectedOperador || undefined,
      direccionId: selectedDireccion || undefined,
      creadoPorId: membershipId || undefined,
      servicioId: serviciosEmpresa.find((item) => item.nombre === serviciosSeleccionados[0])?.id,
      serviciosSeleccionados,
      urgencia: urgencia || undefined,
      diagnosticoTecnico: diagnosticoTecnico.trim() || undefined,
      intervencionRealizada: intervencionRealizada.trim() || undefined,
      hallazgosEstructurales: hallazgosEstructurales.trim() || undefined,
      recomendacionesObligatorias:
        recomendacionesObligatorias.trim() || undefined,
      huboSellamiento: huboSellamiento === "true",
      huboRecomendacionEstructural:
        huboRecomendacionEstructural === "true",
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
      fechaVisita: fechaVisita ? bogotaDateToUtcIso(fechaVisita) : undefined,
      horaInicio: (fechaVisita && horaInicio) ? bogotaDateTimeToUtcIso(fechaVisita, horaInicio) : undefined,
      horaInicioReal: horaInicioReal
        ? new Date(horaInicioReal).toISOString()
        : undefined,
      horaFinReal: horaFinReal ? new Date(horaFinReal).toISOString() : undefined,
      duracionMinutos: Number(duracionMinutos),
    };

    const latestFollowUpStatus = await refreshFollowUpStatus(selectedEmpresa);
    if (latestFollowUpStatus?.blocked) {
      toast.error("Tienes seguimientos vencidos pendientes. Completa las llamadas antes de asignar más servicios.");
      setLoading(false);
      return;
    }

    toast.promise(
      createOrdenServicio(payload).then(async (orderData) => {
        // Webhook Notification after creation
        const targetTecnicoId = orderData.tecnicoId as string;

        if (targetTecnicoId) {
          const operator = operadores.find(o => o.id === targetTecnicoId);
          const client = clientes.find(c => c.id === selectedCliente);
          const direccion = direccionesCliente.find(d => d.id === selectedDireccion);

          console.log("[Webhook] Service created, checking for operator notification...", { targetTecnicoId, operator });

          if (operator?.telefono) {
            // Formatear fecha legible
            const utcDateTime = bogotaDateTimeToUtcIso(fechaVisita, horaInicio);
            const formattedDate = formatBogotaDate(utcDateTime);
            const formattedTime = formatBogotaTime(utcDateTime, "es-CO", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            // Formatear métodos de pago
            const metodosFormatted = breakdown
              .map(b => `${b.metodo} ($ ${b.monto})`)
              .join(", ");

            notifyServiceOperatorWebhook({
              telefonoOperador: operator.telefono,
              numeroOrden: `#${(orderData.numeroOrden as string) || (orderData.id as string).slice(0, 8).toUpperCase()}`,
              cliente: client ? (client.tipoCliente === "EMPRESA" ? (client.razonSocial || "") : `${client.nombre} ${client.apellido}`) : "Cliente desconocido",
              servicio: serviciosSeleccionados.join(', ').toUpperCase(),
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
              observaciones: diagnosticoTecnico || "Sin diagnóstico técnico",
              idServicio: String(orderData.id)
            }).then(webhookRes => {
              if (webhookRes.success) {
                toast.success("Operador notificado correctamente");
              } else {
                toast.error("Error al notificar al operador");
              }
            }).catch(err => {
              console.error("Error triggering operator notification webhook", err);
            });
          } else {
            console.warn("[Webhook] Operator has no phone number, skipping notification");
            toast.warning("El operador asignado no tiene teléfono registrado. No se envió notificación.");
          }
        }

        return orderData;
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

  const isEmpresaLocked = userRole === "ASESOR";
  const isCreationBlocked = Boolean(followUpStatus?.blocked);

  return (
    <div className="max-w-5xl mx-auto w-full h-[calc(100vh-12rem)] flex flex-col min-h-0">
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800/50 overflow-hidden min-h-0">

        {/* Header Fijo */}
        <div className="flex-none bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/50 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-full border border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50">
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
            {followUpStatus && (isCreationBlocked || followUpStatus.activeOverride) ? (
              <section
                className={cn(
                  "rounded-2xl border px-5 py-4",
                  isCreationBlocked
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-emerald-200 bg-emerald-50 text-emerald-950",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 rounded-full p-2",
                      isCreationBlocked ? "bg-amber-100" : "bg-emerald-100",
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.08em]">
                        {isCreationBlocked
                          ? "Asignación bloqueada por seguimientos pendientes"
                          : "Desbloqueo temporal activo"}
                      </p>
                      <p className="text-sm">
                        {isCreationBlocked
                          ? `Tienes ${followUpStatus.overdueCount} seguimiento(s) vencido(s) de servicios creados por ti.`
                          : "Puedes seguir asignando servicios mientras esté vigente el permiso temporal."}
                      </p>
                    </div>

                    {followUpStatus.activeOverride ? (
                      <p className="text-xs font-semibold">
                        Vigente hasta {formatBogotaDate(followUpStatus.activeOverride.endsAt)} {formatBogotaTime(followUpStatus.activeOverride.endsAt)}
                        {followUpStatus.activeOverride.reason ? ` • ${followUpStatus.activeOverride.reason}` : ""}
                      </p>
                    ) : null}

                    {followUpStatus.overdueItems.length > 0 ? (
                      <div className="space-y-2">
                        {followUpStatus.overdueItems.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-current/10 bg-white/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs font-medium">
                              {item.cliente} • {item.servicio} • {formatBogotaDate(item.dueAt)}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => openFollowUpModal(item)}
                              className="h-9 rounded-xl border-current/20 bg-white/70 text-[10px] font-black uppercase tracking-[0.14em]"
                            >
                              Registrar seguimiento
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {isCreationBlocked ? (
                      <div className="flex flex-wrap gap-3 pt-1">
                        <Button
                          type="button"
                          onClick={() => {
                            if (followUpStatus.overdueItems[0]) {
                              openFollowUpModal(followUpStatus.overdueItems[0]);
                            }
                          }}
                          className="h-10 rounded-xl bg-amber-600 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-white hover:bg-amber-700"
                        >
                          Resolver bloqueo ahora
                        </Button>
                        <Link href="/dashboard/servicios?tab=seguimientos">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-xl border-amber-300 bg-white/70 px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                          >
                            Ver tab de seguimientos
                          </Button>
                        </Link>
                        <p className="self-center text-xs font-medium">
                          Registra la llamada y el resultado para volver a asignar servicios.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {/* SECCIÓN 1: IDENTIFICACIÓN DEL CLIENTE */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/50 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 text-zinc-400">
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
                    <Button variant="link" className="text-[10px] font-black p-0 h-auto text-zinc-900 dark:text-zinc-100 uppercase tracking-widest hover:no-underline" onClick={() => router.push('/dashboard/clientes/nuevo')}>
                      + Registrar nuevo cliente
                    </Button>
                  </div>
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
                    onChange={handleDireccionChange}
                    disabled={!selectedCliente}
                    placeholder="Seleccionar sede..."
                    hideSearch
                  />
                  {selectedCliente && (
                    <div className="flex justify-start px-1">
                      <Button 
                        variant="link" 
                        type="button"
                        className="text-[10px] font-black p-0 h-auto text-zinc-900 dark:text-zinc-100 uppercase tracking-widest hover:no-underline" 
                        onClick={() => setIsAddressModalOpen(true)}
                      >
                        + Añadir nueva dirección
                      </Button>
                    </div>
                  )}
                  {!selectedCliente && (
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest ml-1">⚠ Debe vincular un cliente para cargar sedes</p>
                  )}
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: ESPECIFICACIONES TÉCNICAS */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/50 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 text-zinc-400">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Especificaciones Técnicas</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Empresa Asociada <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={[
                      { value: "", label: "Seleccionar empresa..." },
                      ...(Array.isArray(empresas) ? empresas : []).map(e => ({ value: e.id, label: e.nombre }))
                    ]}
                    value={selectedEmpresa}
                    onChange={handleEmpresaChange}
                    disabled={isEmpresaLocked}
                    placeholder="Empresa..."
                    hideSearch
                  />
                  {isEmpresaLocked && (
                    <p className="text-[9px] font-bold text-azul-1 uppercase tracking-widest ml-1">Pre-asignada por coordinación</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado del Servicio <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={ESTADOS_ORDEN.map(est => ({ value: est.value, label: est.label }))}
                    value={estadoServicio}
                    onChange={setEstadoServicio}
                    placeholder="Estado..."
                    hideSearch
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Servicio(s) Específico(s) <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={[
                      { value: "", label: selectedEmpresa ? "Seleccionar servicio para añadir..." : "Primero seleccione una empresa" },
                      ...(Array.isArray(serviciosEmpresa) ? serviciosEmpresa : [])
                        .filter(s => !serviciosSeleccionados.includes(s.nombre))
                        .map(s => ({ value: s.nombre, label: s.nombre }))
                    ]}
                    value={""}
                    onChange={(val) => {
                      if (val && !serviciosSeleccionados.includes(val)) {
                        setServiciosSeleccionados([...serviciosSeleccionados, val]);
                      }
                    }}
                    disabled={!selectedEmpresa}
                    placeholder="Buscar servicio..."
                  />
                  {serviciosSeleccionados.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {serviciosSeleccionados.map((srv, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-[var(--color-azul-1)]/10 text-[var(--color-azul-1)] px-2 py-1 rounded-md border border-[var(--color-azul-1)]/20 text-xs font-semibold">
                          <span>{srv}</span>
                          <button
                            type="button"
                            onClick={() => setServiciosSeleccionados(serviciosSeleccionados.filter(s => s !== srv))}
                            className="text-[var(--color-azul-1)] hover:text-red-500 ml-1 focus:outline-none"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {!selectedEmpresa && (
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest ml-1">⚠ Seleccione una empresa para cargar servicios</p>
                  )}
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
                  {isGarantia ? (
                    <p className="text-[10px] font-bold text-amber-700">
                      La garantía solo se autoriza si el cliente ya tiene un servicio previo y un refuerzo realizado. El backend valida esta regla y la liquidación queda en 0.
                    </p>
                  ) : null}
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
                    className="h-11 !border !border-zinc-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-200 dark:border-zinc-800/50"
                  />
                  {nivelInfestacion && (
                     <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">Calculado por nivel de infestación</p>
                  )}
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

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Hubo Sellamiento <span className="text-red-500">*</span>
                  </Label>
                  <Combobox
                    options={[
                      { value: "", label: "Seleccionar..." },
                      { value: "true", label: "Sí" },
                      { value: "false", label: "No" },
                    ]}
                    value={huboSellamiento}
                    onChange={setHuboSellamiento}
                    placeholder="Sellamiento..."
                    hideSearch
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Hubo Recomendación Estructural <span className="text-red-500">*</span>
                  </Label>
                  <Combobox
                    options={[
                      { value: "", label: "Seleccionar..." },
                      { value: "true", label: "Sí" },
                      { value: "false", label: "No" },
                    ]}
                    value={huboRecomendacionEstructural}
                    onChange={setHuboRecomendacionEstructural}
                    placeholder="Recomendación..."
                    hideSearch
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Diagnóstico Técnico <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    value={diagnosticoTecnico}
                    onChange={(e) => setDiagnosticoTecnico(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800/50 rounded-xl p-4 text-sm font-medium resize-none min-h-[100px] focus:ring-0 focus:border-zinc-300 outline-none"
                    placeholder="Describe la causa del problema, evaluación técnica y contexto encontrado..."
                    required
                  ></textarea>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Intervención Realizada <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    value={intervencionRealizada}
                    onChange={(e) => setIntervencionRealizada(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800/50 rounded-xl p-4 text-sm font-medium resize-none min-h-[100px] focus:ring-0 focus:border-zinc-300 outline-none"
                    placeholder="Detalla el trabajo ejecutado por el técnico..."
                    required
                  ></textarea>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Hallazgos Estructurales
                  </Label>
                  <textarea
                    value={hallazgosEstructurales}
                    onChange={(e) => setHallazgosEstructurales(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800/50 rounded-xl p-4 text-sm font-medium resize-none min-h-[100px] focus:ring-0 focus:border-zinc-300 outline-none"
                    placeholder="Registra grietas, accesos, filtraciones u otros hallazgos físicos..."
                  ></textarea>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Recomendaciones Obligatorias
                  </Label>
                  <textarea
                    value={recomendacionesObligatorias}
                    onChange={(e) => setRecomendacionesObligatorias(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800/50 rounded-xl p-4 text-sm font-medium resize-none min-h-[100px] focus:ring-0 focus:border-zinc-300 outline-none"
                    placeholder="Indica correcciones o acciones que el cliente debe ejecutar..."
                  ></textarea>
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: AGENDA OPERATIVA */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/50 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 text-zinc-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Agenda Operativa</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha de Ejecución <span className="text-red-500">*</span></Label>
                  <DatePicker 
                    date={fechaVisita ? ymdToPickerDate(fechaVisita) : undefined} 
                    onChange={(d) => setFechaVisita(pickerDateToYmd(d))} 
                    className="h-11 !border !border-zinc-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-200 dark:border-zinc-800/50" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Hora de Inicio <span className="text-red-500">*</span></Label>
                  <TimePicker 
                    value={horaInicio} 
                    onChange={setHoraInicio} 
                    className="h-11 !border !border-zinc-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-200 dark:border-zinc-800/50" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Hora Inicio Real
                  </Label>
                  <Input
                    type="datetime-local"
                    value={horaInicioReal}
                    onChange={(e) => setHoraInicioReal(e.target.value)}
                    className="h-11 !border !border-zinc-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-200 dark:border-zinc-800/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Hora Fin Real
                  </Label>
                  <Input
                    type="datetime-local"
                    value={horaFinReal}
                    onChange={(e) => setHoraFinReal(e.target.value)}
                    className="h-11 !border !border-zinc-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-200 dark:border-zinc-800/50"
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
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/50 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 text-zinc-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Condiciones de Pago</h2>
                  <Button 
                    type="button" 
                    className="h-9 px-4 rounded-xl bg-azul-1 text-white hover:bg-blue-700 transition-all text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-azul-1/20 border-none"
                    onClick={() => setBreakdown([...breakdown, { metodo: "EFECTIVO", monto: "" }])}
                    disabled={isGarantia}
                  >
                    <Plus className="h-3.5 w-3.5" /> Añadir Método
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
                          
                          // Si solo hay una línea de pago, actualizarla automáticamente
                          if (breakdown.length === 1 && (!breakdown[0].monto || breakdown[0].monto === valorCotizado)) {
                            const newBreakdown = [...breakdown];
                            newBreakdown[0].monto = formatted;
                            setBreakdown(newBreakdown);
                          }
                        }} 
                        placeholder="0" 
                        required 
                        disabled={isGarantia}
                        className="h-11 !border !border-zinc-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-200 dark:border-zinc-800/50 pl-8 font-bold" 
                      />
                    </div>
                    {isGarantia ? (
                      <p className="text-[10px] font-bold text-emerald-700">
                        La garantía se registra con tarifa 0 y no admite cobro manual.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo de Facturación <span className="text-red-500">*</span></Label>
                    {contratoActivo ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                          Segun contrato activo
                        </p>
                        <p className="text-sm font-bold text-zinc-900">
                          {TIPOS_FACTURACION.find((item) => item.value === tipoFacturacion)?.label || tipoFacturacion}
                        </p>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {resumenContratoActivo.map((item) => (
                            <div
                              key={item.label}
                              className="rounded-xl border border-emerald-100 bg-white/70 px-3 py-3"
                            >
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                                {item.label}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-zinc-900">
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>
                        {contratoActivo.observaciones ? (
                          <div className="rounded-xl border border-emerald-100 bg-white/70 px-3 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                              Observaciones comerciales
                            </p>
                            <p className="mt-1 text-sm text-zinc-700">
                              {contratoActivo.observaciones}
                            </p>
                          </div>
                        ) : null}
                        <p className="text-xs text-zinc-600">
                          Los nuevos servicios heredan este esquema automaticamente desde el contrato del cliente.
                        </p>
                        {isGarantia ? (
                          <p className="text-xs font-semibold text-amber-700">
                            Esta orden es garantía, así que el backend ignorará la facturación del contrato y la dejará en 0.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <Combobox
                        options={[
                          { value: "", label: "Seleccionar facturación..." },
                          ...TIPOS_FACTURACION.map(m => ({ value: m.value, label: m.label }))
                        ]}
                        value={tipoFacturacion}
                        onChange={setTipoFacturacion}
                        placeholder={loadingContrato ? "Consultando contrato..." : "Facturación..."}
                        hideSearch
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block px-1">Desglose de Cobro</Label>
                  <div className="grid grid-cols-1 gap-4">
                    {breakdown.map((line, index) => (
                      <div key={index} className="p-5 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 space-y-4 relative group">
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
                              disabled={isGarantia}
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
                              disabled={isGarantia}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                const formatted = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                const newBreakdown = [...breakdown];
                                newBreakdown[index] = { ...line, monto: formatted };
                                setBreakdown(newBreakdown);
                              }}
                              placeholder="0"
                              className="h-10 rounded-xl bg-white dark:bg-zinc-950 !border !border-zinc-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-200 dark:border-zinc-800/50 font-bold"
                            />
                          </div>
                        </div>

                        {line.metodo === "TRANSFERENCIA" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-zinc-500 uppercase">Banco / Entidad</Label>
                                <Input 
                                  value={line.banco || ""}
                                  disabled={isGarantia}
                                  onChange={(e) => {
                                    const newBreakdown = [...breakdown];
                                    newBreakdown[index] = { ...line, banco: e.target.value };
                                  setBreakdown(newBreakdown);
                                }}
                                placeholder="Ej: Bancolombia, Nequi..."
                                className="h-10 rounded-xl bg-white dark:bg-zinc-950 !border !border-zinc-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-200 dark:border-zinc-800/50 font-medium"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-zinc-500 uppercase">Referencia</Label>
                                <Input 
                                  value={line.referencia || ""}
                                  disabled={isGarantia}
                                  onChange={(e) => {
                                    const newBreakdown = [...breakdown];
                                    newBreakdown[index] = { ...line, referencia: e.target.value };
                                  setBreakdown(newBreakdown);
                                }}
                                placeholder="Nº comprobante"
                                className="h-10 rounded-xl bg-white dark:bg-zinc-950 !border !border-zinc-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-200 dark:border-zinc-800/50 font-medium"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center px-2">
                    <div className="flex gap-4">
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
              </div>
            </section>
          </form>
        </div>

        {/* Footer Fijo */}
        <div className="flex-none bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800/50 px-10 py-5 flex items-center justify-between">
          <div className="hidden lg:flex items-center gap-3 text-zinc-400">
            <GanttChart className="h-5 w-5 text-[var(--color-claro-azul-4)]" />
            <p className="text-[11px] font-medium max-w-xs leading-relaxed">Se generará una orden de trabajo automática para el técnico asignado.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} className="h-12 px-8 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:bg-zinc-200">Descartar</Button>
            <Button
              type="submit"
              form="servicio-form"
              disabled={loading || checkingFollowUps || isCreationBlocked}
              className="h-12 px-12 bg-azul-1 text-white hover:bg-blue-700 shadow-xl shadow-azul-1/20 transition-all gap-3 border-none rounded-xl"
            >
              {loading || checkingFollowUps ? <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="font-bold text-xs tracking-[0.1em] uppercase text-white">
                {isCreationBlocked ? "Seguimientos pendientes" : "Generar y Asignar"}
              </span>
            </Button>
          </div>
        </div>

        {/* MODAL PARA AÑADIR DIRECCIÓN */}
        <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-azul-1" />
                Nueva Dirección / Sede
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-6 gap-x-6 gap-y-5 py-4">
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-zinc-400">Dirección <span className="text-red-500">*</span></Label>
                <Input 
                  value={newDir.direccion}
                  onChange={(e) => setNewDir({...newDir, direccion: e.target.value})}
                  placeholder="Ej: Calle 123 # 45-67"
                  className="h-9 text-sm border-zinc-200 rounded-lg focus:border-azul-1 focus:ring-0"
                />
              </div>
              
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-zinc-400">Nombre de Sede / Referencia</Label>
                <Input 
                  value={newDir.nombreSede}
                  onChange={(e) => setNewDir({...newDir, nombreSede: e.target.value})}
                  placeholder="Ej: Sede Principal, Casa, Local 1"
                  className="h-9 text-sm border-zinc-200 rounded-lg focus:border-azul-1 focus:ring-0"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-zinc-400">Departamento <span className="text-red-500">*</span></Label>
                <Select 
                  value={newDir.departmentId} 
                  onValueChange={(val) => setNewDir({...newDir, departmentId: val, municipioId: ""})}
                >
                  <SelectTrigger className="h-9 text-sm border-zinc-200 rounded-lg">
                    <SelectValue placeholder="Departamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentos.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-zinc-400">Municipio <span className="text-red-500">*</span></Label>
                <Select 
                  value={newDir.municipioId} 
                  onValueChange={(val) => setNewDir({...newDir, municipioId: val})}
                  disabled={!newDir.departmentId}
                >
                  <SelectTrigger className="h-9 text-sm border-zinc-200 rounded-lg">
                    <SelectValue placeholder="Municipio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {municipios
                      .filter(m => m.departmentId === newDir.departmentId)
                      .map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-zinc-400">Barrio</Label>
                <Input 
                  value={newDir.barrio}
                  onChange={(e) => setNewDir({...newDir, barrio: e.target.value})}
                  placeholder="Nombre del barrio"
                  className="h-9 text-sm border-zinc-200 rounded-lg focus:border-azul-1 focus:ring-0"
                />
              </div>

              <div className="md:col-span-6 space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-zinc-400">Link Google Maps</Label>
                <Input 
                  value={newDir.linkMaps}
                  onChange={(e) => setNewDir({...newDir, linkMaps: e.target.value})}
                  placeholder="https://maps.app.goo.gl/..."
                  className="h-9 text-sm border-zinc-200 rounded-lg focus:border-azul-1 focus:ring-0"
                />
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 md:col-span-6 my-1 pt-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                  <Contact2 className="h-3.5 w-3.5" /> Datos de Contacto en Sitio
                </h3>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-zinc-400">Nombre Contacto</Label>
                <Input 
                  value={newDir.nombreContacto}
                  onChange={(e) => setNewDir({...newDir, nombreContacto: e.target.value})}
                  placeholder="Persona que recibe el servicio"
                  className="h-9 text-sm border-zinc-200 rounded-lg focus:border-azul-1 focus:ring-0"
                />
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-zinc-400">Teléfono Contacto</Label>
                <Input 
                  value={newDir.telefonoContacto}
                  onChange={(e) => setNewDir({...newDir, telefonoContacto: e.target.value})}
                  placeholder="Teléfono móvil o fijo"
                  className="h-9 text-sm border-zinc-200 rounded-lg focus:border-azul-1 focus:ring-0"
                />
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 md:col-span-6 my-1 pt-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Horarios y Restricciones
                </h3>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-zinc-400">Horario Inicio</Label>
                <TimePicker 
                  value={newDir.horarioInicio}
                  onChange={(val) => setNewDir({...newDir, horarioInicio: val})}
                  className="h-9 !rounded-lg !py-0 !px-3"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-zinc-400">Horario Fin</Label>
                <TimePicker 
                  value={newDir.horarioFin}
                  onChange={(val) => setNewDir({...newDir, horarioFin: val})}
                  className="h-9 !rounded-lg !py-0 !px-3"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-zinc-400">Restricciones de Acceso</Label>
                <Input 
                  value={newDir.restriccionesAcceso}
                  onChange={(e) => setNewDir({...newDir, restriccionesAcceso: e.target.value})}
                  placeholder="Ej: Solo ingreso con ARL..."
                  className="h-9 text-sm border-zinc-200 rounded-lg focus:border-azul-1 focus:ring-0"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-6">
              <Button variant="ghost" size="sm" onClick={() => setIsAddressModalOpen(false)} disabled={loadingAddress}>
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={handleAddAddress} 
                disabled={loadingAddress}
                className="bg-azul-1 hover:bg-blue-700 text-white min-w-[140px]"
              >
                {loadingAddress ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : "Guardar Dirección"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isFollowUpModalOpen}
          onOpenChange={(open) => {
            if (!savingFollowUp) {
              setIsFollowUpModalOpen(open);
            }
          }}
        >
          <DialogContent className="max-w-2xl border-zinc-200 bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-[0.08em] text-zinc-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Validar seguimiento
              </DialogTitle>
            </DialogHeader>

            {selectedFollowUp ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                    Seguimiento pendiente
                  </p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-bold uppercase text-zinc-900">
                      {selectedFollowUp.cliente}
                    </p>
                    <p className="text-sm text-zinc-700">{selectedFollowUp.servicio}</p>
                    <p className="text-xs font-medium text-zinc-500">
                      Vencido desde {formatBogotaDate(selectedFollowUp.dueAt)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                      Fecha y hora de contacto
                    </Label>
                    <Input
                      type="datetime-local"
                      value={followUpForm.contactedAt}
                      onChange={(e) =>
                        setFollowUpForm((current) => ({
                          ...current,
                          contactedAt: e.target.value,
                        }))
                      }
                      className="h-11 rounded-xl border-zinc-200 font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                      Canal
                    </Label>
                    <Select
                      value={followUpForm.channel}
                      onValueChange={(value) =>
                        setFollowUpForm((current) => ({ ...current, channel: value }))
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl border-zinc-200">
                        <SelectValue placeholder="Selecciona un canal" />
                      </SelectTrigger>
                      <SelectContent>
                        {FOLLOW_UP_CHANNEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                      Resultado
                    </Label>
                    <Select
                      value={followUpForm.outcome}
                      onValueChange={(value) =>
                        setFollowUpForm((current) => ({ ...current, outcome: value }))
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl border-zinc-200">
                        <SelectValue placeholder="Selecciona un resultado" />
                      </SelectTrigger>
                      <SelectContent>
                        {FOLLOW_UP_OUTCOME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                      Decisión del cliente
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={followUpForm.resolution === "ACEPTADO" ? "default" : "outline"}
                        onClick={() => setFollowUpForm((current) => ({ ...current, resolution: "ACEPTADO" }))}
                        className="h-11 rounded-xl text-[10px] font-black uppercase tracking-[0.16em]"
                      >
                        Aceptado
                      </Button>
                      <Button
                        type="button"
                        variant={followUpForm.resolution === "RECHAZADO" ? "destructive" : "outline"}
                        onClick={() => setFollowUpForm((current) => ({ ...current, resolution: "RECHAZADO" }))}
                        className="h-11 rounded-xl text-[10px] font-black uppercase tracking-[0.16em]"
                      >
                        Rechazado
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                      Notas del seguimiento
                    </Label>
                    <textarea
                      value={followUpForm.notes}
                      onChange={(e) =>
                        setFollowUpForm((current) => ({
                          ...current,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Ej: Se llamó al cliente, confirmó satisfacción y no requiere nueva visita."
                      className="min-h-[120px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-azul-1"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                      Próxima acción opcional
                    </Label>
                    <Input
                      type="datetime-local"
                      value={followUpForm.nextActionAt}
                      onChange={(e) =>
                        setFollowUpForm((current) => ({
                          ...current,
                          nextActionAt: e.target.value,
                        }))
                      }
                      className="h-11 rounded-xl border-zinc-200 font-medium"
                    />
                    <p className="text-xs text-zinc-500">
                      Si dejas una próxima acción, el sistema crea un seguimiento adicional.
                    </p>
                  </div>
                </div>

                <DialogFooter className="gap-3 border-t border-zinc-100 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFollowUpModalOpen(false)}
                    disabled={savingFollowUp}
                    className="h-11 rounded-xl border-zinc-200 px-5 text-[10px] font-black uppercase tracking-[0.16em]"
                  >
                    Cerrar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCompleteFollowUp}
                    disabled={savingFollowUp}
                    className="h-11 rounded-xl bg-emerald-600 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-white hover:bg-emerald-700"
                  >
                    {savingFollowUp ? "Guardando..." : "Guardar seguimiento"}
                  </Button>
                </DialogFooter>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
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
