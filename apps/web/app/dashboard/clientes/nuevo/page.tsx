"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  clientesClient,
  type ContratoClientePayload as ContratoClienteDTO,
} from "@/lib/api/clientes-client";
import { type ConfigItem } from "@/lib/api/config-client";
import { configClient } from "@/lib/api/config-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-shadcn";
import { TimePicker } from "@/components/ui/time-picker";
import {
  ArrowLeft,
  Save,
  MapPin,
  Plus,
  Trash2,
  Clock,
  Contact2,
  CheckCircle2,
  Building2,
  UserCircle2,
  Target,
  Zap,
  CalendarClock,
  Search,
  AlertCircle,
  GanttChart,
  Lightbulb
} from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { DashboardLayout } from "@/components/dashboard";
import { getBrowserCookie } from "@/lib/api/browser-client";
import { enterpriseClient } from "@/lib/api/enterprise-client";
import { geoClient } from "@/lib/api/geo-client";

type ClienteDTO = Record<string, unknown>;

// --- Constantes Estratégicas ---
const ORIGENES_CLIENTE = ["Google Ads", "Referido", "Orgánico", "Recurrente", "Campaña", "WhatsApp directo"];
const TIPOS_DOCUMENTO = ["Cédula de Ciudadanía", "Cédula de Extranjería", "Pasaporte", "Permiso Especial", "NIT"];
const CLASIFICACIONES_PUNTO = ["Cocina", "Área almacenamiento", "Zona residuos", "Zona carga", "Zona comedor", "Oficina administrativa"];
const TIPOS_FACTURACION_CONTRATO = [
  { value: "CONTRATO_MENSUAL", label: "Cobro por servicio ejecutado" },
  { value: "PLAN_TRIMESTRAL", label: "Cobro trimestral acumulado" },
  { value: "PLAN_SEMESTRAL", label: "Cobro semestral" },
  { value: "PLAN_ANUAL", label: "Cobro anual" },
] as const;

interface Direccion {
  id: number;
  direccion: string;
  linkMaps: string;
  departmentId: string;
  municipioId: string;
  municipio: string;
  barrio: string;
  piso: string;
  bloque: string;
  unidad: string;
  tipoUbicacion: string;
  clasificacionPunto: string;
  horarioInicio: string;
  horarioFin: string;
  restriccionesAcceso: string;
  nombreContacto: string;
  telefonoContacto: string;
  cargoContacto: string;
  activa: boolean;
  bloqueada: boolean;
  motivoBloqueo: string;
  latitud: string;
  longitud: string;
  precisionGPS: string;
  validadoPorSistema: boolean;
}

function NuevoClienteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const _fixClientId = searchParams.get("fixClientId");
  const _migrateClientId = searchParams.get("migrateClientId");

  useUserRole();
  const [loading, setLoading] = useState(false);
  const [empresasUser, setEmpresasUser] = useState<{id: string, nombre: string}[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [hasActiveContract, setHasActiveContract] = useState(false);
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [contractServicesCommitted, setContractServicesCommitted] = useState("");
  const [contractServiceFrequency, setContractServiceFrequency] = useState("30");
  const [contractBillingType, setContractBillingType] =
    useState<ContratoClienteDTO["tipoFacturacion"]>("CONTRATO_MENSUAL");
  const [contractNotes, setContractNotes] = useState("");

  // --- Datos Dinámicos ---
  const [departamentos, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [municipios, setMunicipalities] = useState<{id: string, name: string, departmentId: string}[]>([]);
  const [segmentosDb, setSegmentosDb] = useState<ConfigItem[]>([]);
  const [riesgosDb, setRiesgosDb] = useState<ConfigItem[]>([]);
  const [tiposInteresDb, setTiposInteresDb] = useState<ConfigItem[]>([]);

  // 1. Cargar Datos Geográficos y Configuración al iniciar
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [deps, muns, segs, ries, ints, empresasData] = await Promise.all([
          geoClient.getDepartments(),
          geoClient.getMunicipalities(),
          configClient.getSegmentos(),
          configClient.getRiesgos(),
          configClient.getIntereses(),
          enterpriseClient.getAll(),
        ]);
        setDepartments(deps);
        setMunicipalities(muns);
        setSegmentosDb(segs);
        setRiesgosDb(ries);
        setTiposInteresDb(ints);
        if (segs.length > 0) setSegmento(segs[0]?.id || "");
        if (ints.length > 0) setInteres(ints[0]?.id || "");
        
        // Cargar empresas del usuario
        const items = (empresasData as { items?: { id: string, nombre: string }[] })?.items || [];
        setEmpresasUser(items);
        
        const cookieId = getBrowserCookie("x-enterprise-id");
          
        if (cookieId && items.find((e: {id: string}) => e.id === cookieId)) {
          setSelectedEmpresaId(cookieId);
        } else if (items.length > 0) {
          setSelectedEmpresaId(items[0].id);
        }

      } catch (e) {
        console.error("Error loading initial data", e);
        toast.error("Error al cargar datos de configuración");
      }
    };
    loadInitialData();
  }, []);

  const [tipoCliente, setTipoCliente] = useState<"NATURAL" | "EMPRESA">("NATURAL");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [origen, setOrigen] = useState("");
  const [segmento, setSegmento] = useState("");
  const [interes, setInteres] = useState("");
  const [riesgoOverride, setRiesgoOverride] = useState<string | null>(null);
  const [metraje, setMetraje] = useState<number>(0);

  const sugerencias = useMemo(() => {
    const seg = segmentosDb.find(s => s.id === segmento);
    const int = tiposInteresDb.find(i => i.id === interes);

    // Lógica inteligente: tomar el riesgo más alto y la frecuencia más corta
    const riesgosMap: Record<string, number> = { "BAJO": 1, "MEDIO": 2, "ALTO": 3, "CRITICO": 4 };
    const riesgoSeg = seg?.riesgoSugerido || "BAJO";
    const riesgoInt = int?.riesgoSugerido || "BAJO";

    const riesgoFinal = (riesgosMap[riesgoSeg] ?? 1) >= (riesgosMap[riesgoInt] ?? 1) ? riesgoSeg : riesgoInt;

    const freqSeg = seg?.frecuenciaSugerida || 30;
    const freqInt = int?.frecuenciaSugerida || 30;
    const freqFinal = Math.min(freqSeg === 0 ? 999 : freqSeg, freqInt === 0 ? 999 : freqInt);

    return {
      riesgo: riesgoOverride || riesgoFinal,
      frecuencia: freqFinal === 999 ? "Puntual" : String(freqFinal),
      precioSugerido: metraje > 0 ? metraje * 1500 : 0,
      tiempoEstimado: metraje > 0 ? Math.ceil(metraje / 100) * 30 : 0,
    };
  }, [segmento, interes, riesgoOverride, metraje, segmentosDb, tiposInteresDb]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalStyle; };
  }, []);

  const [direcciones, setDirecciones] = useState<Direccion[]>([{
    id: Date.now(),
    direccion: "",
    linkMaps: "",
    departmentId: "",
    municipioId: "",
    municipio: "",
    barrio: "",
    piso: "",
    bloque: "",
    unidad: "",
    tipoUbicacion: "Residencial",
    clasificacionPunto: "Oficina administrativa",
    horarioInicio: "08:00",
    horarioFin: "18:00",
    restriccionesAcceso: "",
    nombreContacto: "",
    telefonoContacto: "",
    cargoContacto: "",
    activa: true,
    bloqueada: false,
    motivoBloqueo: "",
    latitud: "",
    longitud: "",
    precisionGPS: "",
    validadoPorSistema: false,
  }]);

  const handleDireccionChange = <K extends keyof Direccion>(id: number, field: K, value: Direccion[K]) => {
    setDirecciones(direcciones.map((d) => {
      if (d.id === id) {
        const update = { ...d, [field]: value };
        if (field === "departmentId") {
          update.municipioId = "";
          update.municipio = "";
        }
        if (field === "municipioId") {
          const mun = municipios.find(m => m.id === value);
          update.municipio = mun?.name || "";
        }
        return update;
      }
      return d;
    }));
  };

  const validarDireccion = async (id: number) => {
    toast.promise(new Promise(resolve => setTimeout(resolve, 1500)), {
      loading: 'Georreferenciando dirección...',
      success: 'Coordenadas validadas correctamente',
      error: 'Error al validar ubicación',
    });
    handleDireccionChange(id, "latitud", "6.2442");
    handleDireccionChange(id, "longitud", "-75.5812");
    handleDireccionChange(id, "validadoPorSistema", true);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);

    const cleanedDirecciones = direcciones.map(({
      id: _id,
      restriccionesAcceso,
      ...rest
    }) => ({
      ...rest,
      municipioId: rest.municipioId || null,
      departmentId: rest.departmentId || null,
      restricciones: restriccionesAcceso || null,
      latitud: rest.latitud ? parseFloat(rest.latitud) : null,
      longitud: rest.longitud ? parseFloat(rest.longitud) : null,
      precisionGPS: rest.precisionGPS ? parseFloat(rest.precisionGPS) : null,
    }));

    const payload: ClienteDTO = {
      tipoCliente: (tipoCliente === "NATURAL" ? "PERSONA" : "EMPRESA") as "PERSONA" | "EMPRESA",
      nombre: (formData.get("nombre") as string) || "No Concretado",
      apellido: (formData.get("apellido") as string) || "No Concretado",
      tipoDocumento: tipoDocumento === "none" ? "No Concretado" : (tipoDocumento || "No Concretado"),
      numeroDocumento: (formData.get("numeroDocumento") as string) || "No Concretado",
      telefono: (formData.get("telefono") as string),
      telefono2: (formData.get("telefono2") as string) || "No Concretado",
      correo: (formData.get("correo") as string) || "noconcretado@noconcretado.com",
      origenCliente: origen || "No Concretado",
      tipoInteresId: (formData.get("interes") as string) || null,
      razonSocial: (formData.get("razonSocial") as string) || "No Concretado",
      nit: (formData.get("nit") as string) || "No Concretado",
      actividadEconomica: (formData.get("actividad") as string) || "No Concretado",
      metrajeTotal: metraje ? parseFloat(metraje.toString()) : null,
      segmento: (segmento || null) as ClienteDTO["segmento"],
      nivelRiesgo: (riesgoOverride || riesgosDb.find(r => r.nombre === sugerencias.riesgo)?.id || null) as ClienteDTO["nivelRiesgo"],
      direcciones: cleanedDirecciones,
    };

    const finalPayload = { ...payload, empresaId: selectedEmpresaId || undefined } as unknown as ClienteDTO;

    try {
      const createdClient = await clientesClient.create(finalPayload);
      const createdClientId = (createdClient as { id?: string } | undefined)?.id;
      if (
        hasActiveContract &&
        createdClientId &&
        selectedEmpresaId
      ) {
        const contractPayload: ContratoClienteDTO = {
          empresaId: selectedEmpresaId,
          fechaInicio: contractStartDate,
          fechaFin: contractEndDate || null,
          serviciosComprometidos: contractServicesCommitted ? Number(contractServicesCommitted) : null,
          frecuenciaServicio: contractServiceFrequency ? Number(contractServiceFrequency) : null,
          tipoFacturacion: contractBillingType,
          observaciones: contractNotes || null,
        };

        await clientesClient.createContrato(
          createdClientId,
          contractPayload,
        );
      }
      toast.success("Cliente registrado con éxito");
      router.push("/dashboard/clientes");
    } catch (error: unknown) {
      let message = error instanceof Error ? error.message : "Error al crear cliente";
      if (message.includes('unique constraint') || message.includes('already exists')) {
        message = "El número de teléfono o documento ya están registrados en el sistema.";
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const addDireccion = () => {
    setDirecciones([...direcciones, {
      id: Date.now(),
      direccion: "",
      linkMaps: "",
      departmentId: "",
      municipioId: "",
      municipio: "",
      barrio: "",
      piso: "",
      bloque: "",
      unidad: "",
      tipoUbicacion: "Residencial",
      clasificacionPunto: "Oficina administrativa",
      horarioInicio: "08:00",
      horarioFin: "18:00",
      restriccionesAcceso: "",
      nombreContacto: "",
      telefonoContacto: "",
      cargoContacto: "",
      activa: true,
      bloqueada: false,
      motivoBloqueo: "",
      latitud: "",
      longitud: "",
      precisionGPS: "",
      validadoPorSistema: false,
    }]);
  };

  const removeDireccion = (id: number) => {
    if (direcciones.length > 1) {
      setDirecciones(direcciones.filter(d => d.id !== id));
    } else {
      toast.error("Debe haber al menos una dirección");
    }
  };

  const getMunicipiosOptions = (deptId: string) => {
    return (Array.isArray(municipios) ? municipios : [])
      .filter(m => m.departmentId === deptId)
      .map(m => ({ value: m.id, label: m.name }));
  };

  return (
    <div className="max-w-5xl mx-auto w-full h-[calc(100vh-12rem)] flex flex-col min-h-0">
      <div className="flex-1 flex flex-col bg-card rounded-2xl shadow-sm border border-border overflow-hidden min-h-0">

        <div className="flex-none bg-card border-b border-border px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/clientes")} className="h-10 w-10 rounded-full border border-border hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Registro de Clientes</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-[#01ADFB]"></span>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em]">Pipeline Comercial & Operativo</p>
              </div>
            </div>
          </div>

          <div className="flex bg-muted p-1 rounded-xl border border-border shadow-inner">
            <button type="button" onClick={() => setTipoCliente("NATURAL")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${tipoCliente === "NATURAL" ? "bg-background text-[#01ADFB] shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"}`}><UserCircle2 className="h-4 w-4" /> PERSONA NATURAL</button>
            <button type="button" onClick={() => setTipoCliente("EMPRESA")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${tipoCliente === "EMPRESA" ? "bg-background text-[#01ADFB] shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"}`}><Building2 className="h-4 w-4" /> CORPORATIVO / EMPRESA</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-background">
          <form id="cliente-form" onSubmit={handleSubmit} className="space-y-12 max-w-4xl mx-auto pb-12">

            <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4 items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Nota importante</p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed font-medium">
                  Todos los campos que no estén marcados con un asterisco rojo (<span className="text-red-500 font-bold">*</span>) son opcionales. Si decide dejarlos vacíos, el sistema los guardará automáticamente con el valor <span className="font-bold">&quot;No Concretado&quot;</span> (o <span className="font-bold">&quot;noconcretado@noconcretado.com&quot;</span> para el correo) para mantener la integridad de los registros.
                </p>
              </div>
            </div>

            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="p-2 rounded-lg bg-muted border border-border text-muted-foreground"><Target className="h-5 w-5" /></div>
                <h2 className="text-lg font-bold text-foreground">Configuración de Perfil</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Asignar a Empresa <span className="text-red-500">*</span></Label>
                  <Select
                    value={selectedEmpresaId}
                    onValueChange={(val) => setSelectedEmpresaId(val)}
                    name="empresaId"
                    required
                  >
                    <SelectTrigger className="h-11 border-border focus:ring-0 focus:ring-offset-0 bg-background text-foreground">
                      <SelectValue placeholder="Seleccionar empresa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {empresasUser.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {tipoCliente === "NATURAL" ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nombre(s)</Label>
                      <Input name="nombre" className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" placeholder="Ej: Juan" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Apellido(s)</Label>
                      <Input name="apellido" className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" placeholder="Ej: Valdés" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo de Documento</Label>
                      <Select
                        value={tipoDocumento}
                        onValueChange={setTipoDocumento}
                        name="tipoDocumento"
                      >
                        <SelectTrigger className="h-11 border-border focus:ring-0 focus:ring-offset-0 bg-background text-foreground">
                          <SelectValue placeholder="No especificado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No especificado</SelectItem>
                          {TIPOS_DOCUMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Número de Documento</Label>
                      <Input name="numeroDocumento" className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground font-mono" placeholder="12345678" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9.\-]/g, ''); }} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Razón Social</Label>
                      <Input name="razonSocial" className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" />
                    </div>
                    <input type="hidden" name="tipoDocumento" value="NIT" />
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">NIT / Identificación</Label>
                      <Input name="nit" className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground font-mono" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9.\-]/g, ''); }} />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Teléfono Principal <span className="text-red-500">*</span></Label>
                  <Input name="telefono" required className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" placeholder="3000000000" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9.\-]/g, ''); }} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Teléfono Secundario (Opcional)</Label>
                  <Input name="telefono2" className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground opacity-80" placeholder="3111111111" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9.\-]/g, ''); }} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Segmento del Negocio</Label>
                  <Select name="segmento" value={segmento} onValueChange={setSegmento}>
                    <SelectTrigger className="h-11 border-border focus:ring-0 focus:ring-offset-0 bg-background text-foreground">
                      <SelectValue placeholder="Seleccionar segmento..." />
                    </SelectTrigger>
                    <SelectContent>
                      {segmentosDb.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nivel de Riesgo Operativo</Label>
                  <Select value={riesgoOverride || riesgosDb.find(r => r.nombre === sugerencias.riesgo)?.id || ""} onValueChange={setRiesgoOverride} name="nivelRiesgo">
                    <SelectTrigger className="h-11 border-border focus:ring-0 focus:ring-offset-0 bg-background text-foreground">
                      <SelectValue placeholder="Seleccionar riesgo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {riesgosDb.map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Canal de Captación</Label>
                  <Select name="origen" value={origen} onValueChange={setOrigen}>
                    <SelectTrigger className="h-11 border-border focus:ring-0 focus:ring-offset-0 bg-background text-foreground">
                      <SelectValue placeholder="Seleccionar origen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGENES_CLIENTE.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Correo Electrónico (Opcional)</Label>
                  <Input name="correo" type="email" pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$" title="Debe incluir un '@' y un '.'" className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" placeholder="usuario@ejemplo.com" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo de Servicio Interés</Label>
                  <Select name="interes" value={interes} onValueChange={setInteres}>
                    <SelectTrigger className="h-11 border-border focus:ring-0 focus:ring-offset-0 bg-background text-foreground">
                      <SelectValue placeholder="Seleccionar interés..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposInteresDb.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {tipoCliente === "EMPRESA" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Actividad Económica</Label>
                      <Input name="actividad" className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" placeholder="Ej: Venta de alimentos" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Área Instalaciones (m²)</Label>
                      <Input type="number" name="metraje" value={metraje} onChange={(e) => setMetraje(Number(e.target.value))} className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" />
                    </div>
                  </>
                )}
              </div>

              {(segmento || interes) && (
                <div className="p-6 bg-[#01ADFB]/5 border border-[#01ADFB]/20 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-[#01ADFB]">
                    <Lightbulb className="h-5 w-5" />
                    <span className="text-sm font-black uppercase tracking-wider">Recomendación Estratégica</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Basado en el segmento <span className="font-bold text-foreground">{segmentosDb.find(s => s.id === segmento)?.nombre}</span> y el interés <span className="font-bold text-foreground">{tiposInteresDb.find(i => i.id === interes)?.nombre}</span>, el sistema sugiere un riesgo <span className="font-bold text-[#01ADFB]">{sugerencias.riesgo}</span> con una frecuencia <span className="font-bold text-[#01ADFB]">{sugerencias.frecuencia === "Puntual" ? "Única" : `cada ${sugerencias.frecuencia} días`}</span>.
                  </p>
                </div>
              )}

              {tipoCliente === "EMPRESA" && segmento && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-muted border border-border rounded-2xl">
                  <div className="space-y-1.5"><p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">Frecuencia Ideal</p><div className="flex items-center gap-2 font-bold text-foreground text-sm"><CalendarClock className="h-3.5 w-3.5 text-[#01ADFB]" /> {sugerencias.frecuencia} días</div></div>
                  <div className="space-y-1.5"><p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">Tiempo de Labor</p><div className="flex items-center gap-2 font-bold text-foreground text-sm"><Clock className="h-3.5 w-3.5 text-[#01ADFB]" /> {sugerencias.tiempoEstimado} min</div></div>
                  <div className="space-y-1.5"><p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">Tarifa Sugerida</p><div className="flex items-center gap-2 font-bold text-emerald-600 text-sm">$ {sugerencias.precioSugerido.toLocaleString()}</div></div>
                  <div className="space-y-1.5"><p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">Estatus de Cuenta</p><div className="flex items-center gap-2 font-bold text-amber-600 text-sm"><Zap className="h-3.5 w-3.5 fill-amber-600" /> POTENCIAL</div></div>
                </div>
              )}
            </section>

            {
              <section className="space-y-8">
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  <div className="p-2 rounded-lg bg-muted border border-border text-muted-foreground"><CalendarClock className="h-5 w-5" /></div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Condiciones Comerciales</h2>
                    <p className="text-xs text-muted-foreground">Define si este cliente entra con contrato activo y cómo se cobrarán sus servicios.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-muted/40 px-4 py-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">Activar contrato comercial</p>
                      <p className="text-xs text-muted-foreground">
                        Si lo activas, los nuevos servicios de este cliente heredarán el tipo de facturación del contrato.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={hasActiveContract ? "default" : "outline"}
                      onClick={() => setHasActiveContract((current) => !current)}
                      className="min-w-[140px] rounded-xl text-[10px] font-black uppercase tracking-[0.16em]"
                    >
                      {hasActiveContract ? "Contrato activo" : "Sin contrato"}
                    </Button>
                  </div>

                  {hasActiveContract ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha inicio <span className="text-red-500">*</span></Label>
                        <Input type="date" value={contractStartDate} onChange={(e) => setContractStartDate(e.target.value)} required={hasActiveContract} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha fin</Label>
                        <Input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Servicios comprometidos</Label>
                        <Input type="number" min="1" value={contractServicesCommitted} onChange={(e) => setContractServicesCommitted(e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="12" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Frecuencia operativa (días)</Label>
                        <Input type="number" min="1" value={contractServiceFrequency} onChange={(e) => setContractServiceFrequency(e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="30" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo de facturación <span className="text-red-500">*</span></Label>
                        <Select value={contractBillingType} onValueChange={(value) => setContractBillingType(value as ContratoClienteDTO["tipoFacturacion"])}>
                          <SelectTrigger className="h-11 border-border focus:ring-0 focus:ring-offset-0 bg-background text-foreground">
                            <SelectValue placeholder="Seleccionar facturación..." />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_FACTURACION_CONTRATO.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Observaciones comerciales</Label>
                        <textarea
                          value={contractNotes}
                          onChange={(e) => setContractNotes(e.target.value)}
                          placeholder="Ej: contrato anual con 12 visitas y corte trimestral."
                          className="min-h-[120px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#01ADFB]"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            }

            <section className="space-y-8">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted border border-border text-muted-foreground"><MapPin className="h-5 w-5" /></div>
                  <h2 className="text-lg font-bold text-foreground">{tipoCliente === "NATURAL" ? "Información de Residencia" : "Sedes Operativas"}</h2>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addDireccion} className="gap-2 h-9 text-[#01ADFB] border-border hover:bg-muted font-bold text-[10px] tracking-wider uppercase bg-background">
                  <Plus className="h-3.5 w-3.5" /> {tipoCliente === "NATURAL" ? "AGREGAR OTRA DIRECCIÓN" : "AGREGAR OTRA SEDE"}
                </Button>
              </div>

              <div className="space-y-10">
                {direcciones.map((dir) => (
                  <div key={dir.id} className="relative bg-card rounded-2xl border border-border p-8 space-y-10 transition-all hover:shadow-md">
                    {direcciones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDireccion(dir.id)}
                        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dirección Principal <span className="text-red-500">*</span></Label>
                        <div className="flex gap-3">
                          <Input value={dir.direccion} onChange={(e) => handleDireccionChange(dir.id, "direccion", e.target.value)} required className="h-12 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground text-base" placeholder="Calle 123 # 45 - 67" />
                          <Button type="button" onClick={() => validarDireccion(dir.id)} className="h-12 px-6 gap-2 bg-[#01ADFB] text-white hover:bg-blue-700 transition-all font-bold text-xs shadow-lg shadow-[#01ADFB]/20 border-none rounded-xl"><Search className="h-4 w-4" /> VALIDAR</Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Referencia Maps</Label>
                        <Input value={dir.linkMaps} onChange={(e) => handleDireccionChange(dir.id, "linkMaps", e.target.value)} className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" placeholder="Enlace de ubicación" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Departamento</Label>
                          <Combobox
                            options={Array.isArray(departamentos) ? departamentos.map(d => ({ value: d.id, label: d.name })) : []}
                            value={dir.departmentId || ""}
                            onChange={(v) => handleDireccionChange(dir.id, "departmentId", v)}
                            placeholder={departamentos.length > 0 ? "Seleccionar..." : "Cargando..."}
                            className="[&>button]:border-border [&>button]:focus:ring-0 bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Municipio</Label>
                          <Combobox
                            options={getMunicipiosOptions(dir.departmentId || "")}
                            value={dir.municipioId || ""}
                            onChange={(v) => handleDireccionChange(dir.id, "municipioId", v)}
                            placeholder={dir.departmentId ? "Seleccionar..." : "Elija departamento"}
                            disabled={!dir.departmentId}
                            className="[&>button]:border-border [&>button]:focus:ring-0 bg-background"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Apto / Piso / Local</Label>
                        <Input value={dir.piso} onChange={(e) => handleDireccionChange(dir.id, "piso", e.target.value)} className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" placeholder="Ej: 201" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bloque / Torre / Conjunto</Label>
                        <Input value={dir.bloque} onChange={(e) => handleDireccionChange(dir.id, "bloque", e.target.value)} className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" placeholder="Ej: Torre B" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unidad / Edificio / Vereda</Label>
                        <Input value={dir.unidad} onChange={(e) => handleDireccionChange(dir.id, "unidad", e.target.value)} className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" placeholder="Ej: San Juan" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{tipoCliente === "NATURAL" ? "Tipo Vivienda" : "Clasificación"}</Label>
                        {tipoCliente === "NATURAL" ? (
                          <Select
                            value={dir.tipoUbicacion}
                            onValueChange={(val) => handleDireccionChange(dir.id, "tipoUbicacion", val)}
                          >
                            <SelectTrigger className="h-11 border-border focus:ring-0 focus:ring-offset-0 bg-background text-foreground">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CASA">CASA</SelectItem>
                              <SelectItem value="APTO">APARTAMENTO</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select
                            value={dir.clasificacionPunto}
                            onValueChange={(val) => handleDireccionChange(dir.id, "clasificacionPunto", val)}
                          >
                            <SelectTrigger className="h-11 border-border focus:ring-0 focus:ring-offset-0 bg-background text-foreground">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {CLASIFICACIONES_PUNTO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Barrio / Sector</Label>
                        <Input value={dir.barrio} onChange={(e) => handleDireccionChange(dir.id, "barrio", e.target.value)} className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" placeholder="Ej: El Poblado" />
                      </div>
                      {tipoCliente === "NATURAL" && (
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Indicaciones Opcionales</Label>
                          <Input value={dir.restriccionesAcceso} onChange={(e) => handleDireccionChange(dir.id, "restriccionesAcceso", e.target.value)} className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" placeholder="Ej: Portón café, cerca al parque" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-muted border border-border">
                      <div className="flex-1 w-full space-y-1.5"><Label className="text-[10px] font-black text-[#01ADFB] uppercase tracking-[0.15em]">Latitud Geográfica</Label><Input value={dir.latitud} onChange={(e) => handleDireccionChange(dir.id, "latitud", e.target.value.replace(/[^0-9.-]/g, ''))} pattern="^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)$" title="Latitud válida entre -90 y 90" className="h-10 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground font-mono text-sm" placeholder="0.0000" /></div>
                      <div className="flex-1 w-full space-y-1.5"><Label className="text-[10px] font-black text-[#01ADFB] uppercase tracking-[0.15em]">Longitud Geográfica</Label><Input value={dir.longitud} onChange={(e) => handleDireccionChange(dir.id, "longitud", e.target.value.replace(/[^0-9.-]/g, ''))} pattern="^[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$" title="Longitud válida entre -180 y 180" className="h-10 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground font-mono text-sm" placeholder="0.0000" /></div>
                      <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider transition-all ${dir.validadoPorSistema ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-background text-muted-foreground border-border"}`}>{dir.validadoPorSistema ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />} {dir.validadoPorSistema ? "SISTEMA: GEORREFERENCIADO" : "SISTEMA: PENDIENTE"}</div>
                    </div>

                    {tipoCliente === "EMPRESA" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-border">
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 text-muted-foreground font-bold text-[10px] uppercase tracking-widest"><Clock className="h-4 w-4" /> Ventana Operativa</div>
                          <div className="flex gap-3">
                            <TimePicker
                              value={dir.horarioInicio}
                              onChange={(val) => handleDireccionChange(dir.id, "horarioInicio", val)}
                              className="h-11 border-border focus-within:ring-0 focus-within:border-border bg-background"
                            />
                            <TimePicker
                              value={dir.horarioFin}
                              onChange={(val) => handleDireccionChange(dir.id, "horarioFin", val)}
                              className="h-11 border-border focus-within:ring-0 focus-within:border-border bg-background"
                            />
                          </div>
                        </div>
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 text-muted-foreground font-bold text-[10px] uppercase tracking-widest"><Contact2 className="h-4 w-4" /> Responsable Directo</div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input value={dir.nombreContacto} onChange={(e) => handleDireccionChange(dir.id, "nombreContacto", e.target.value)} placeholder="Nombre" className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" />
                            <Input value={dir.telefonoContacto} onChange={(e) => handleDireccionChange(dir.id, "telefonoContacto", e.target.value)} placeholder="Móvil" className="h-11 border-border focus-visible:ring-0 focus-visible:ring-offset-0 bg-background text-foreground" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </form>
        </div>

        <div className="flex-none bg-muted/50 border-t border-border px-10 py-5 flex items-center justify-between">
          <div className="hidden lg:flex items-center gap-3 text-muted-foreground">
            <GanttChart className="h-5 w-5 text-[#01ADFB]" />
            <p className="text-[11px] font-medium max-w-xs leading-relaxed">El registro habilita automáticamente el módulo de planificación de servicios recurrentes.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard/clientes")} className="h-12 px-8 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted">Descartar</Button>
            <Button
              type="submit"
              form="cliente-form"
              disabled={loading}
              className="h-12 px-12 bg-[#01ADFB] text-white hover:bg-blue-700 shadow-xl shadow-[#01ADFB]/20 transition-all gap-3 border-none rounded-xl"
            >
              {loading ? <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="font-bold text-xs tracking-[0.1em] uppercase text-white">Completar Registro</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NuevoClientePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="flex h-[80vh] items-center justify-center text-sm text-muted-foreground animate-pulse font-bold uppercase tracking-widest">Iniciando protocolo de registro...</div>}>
        <NuevoClienteContent />
      </Suspense>
    </DashboardLayout>
  );
}
