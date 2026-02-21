"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  createClienteAction,
  getSegmentosAction,
  getRiesgosAction,
  getTiposInteresAction,
  type ClienteDTO,
} from "../../actions";
import {
  getDepartments,
  getMunicipalities,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Select } from "@/components/ui/select";
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
// owo
// --- Constantes Estratégicas ---
const ORIGENES_CLIENTE = ["Google Ads", "Referido", "Orgánico", "Recurrente", "Campaña", "WhatsApp directo"];
const TIPOS_DOCUMENTO = ["Cédula de Ciudadanía", "Cédula de Extranjería", "Pasaporte", "Permiso Especial", "NIT"];
const CLASIFICACIONES_PUNTO = ["Cocina", "Área almacenamiento", "Zona residuos", "Zona carga", "Zona comedor", "Oficina administrativa"];

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

  // --- Datos Dinámicos ---
  const [departamentos, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [municipios, setMunicipalities] = useState<{id: string, name: string, departmentId: string}[]>([]);
  const [segmentosDb, setSegmentosDb] = useState<{id: string, nombre: string, frecuenciaSugerida: number, riesgoSugerido: string}[]>([]);
  const [riesgosDb, setRiesgosDb] = useState<{id: string, nombre: string}[]>([]);
  const [tiposInteresDb, setTiposInteresDb] = useState<{id: string, nombre: string, frecuenciaSugerida: number, riesgoSugerido: string}[]>([]);

  // 1. Cargar Datos Geográficos y Configuración al iniciar
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const { getEnterprisesAction } = await import("@/app/dashboard/actions");
        const [deps, muns, segs, ries, ints, empresasData] = await Promise.all([
          getDepartments(),
          getMunicipalities(),
          getSegmentosAction(),
          getRiesgosAction(),
          getTiposInteresAction(),
          getEnterprisesAction()
        ]);
        setDepartments(deps);
        setMunicipalities(muns);
        setSegmentosDb(segs);
        setRiesgosDb(ries);
        setTiposInteresDb(ints);
        if (segs.length > 0) setSegmento(segs[0]?.id || "");
        if (ints.length > 0) setInteres(ints[0]?.id || "");
        
        // Cargar empresas del usuario
        const items = empresasData?.items || [];
        setEmpresasUser(items);
        
        const cookieId = document.cookie
          .split("; ")
          .find((row) => row.startsWith("x-enterprise-id="))
          ?.split("=")[1];
          
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
      departmentId: _departmentId,
      validadoPorSistema: _validadoPorSistema,
      municipio: _municipio,
      restriccionesAcceso,
      ...rest
    }) => ({
      ...rest,
      municipioId: rest.municipioId || null,
      restricciones: restriccionesAcceso || null,
      latitud: rest.latitud ? parseFloat(rest.latitud) : null,
      longitud: rest.longitud ? parseFloat(rest.longitud) : null,
      precisionGPS: rest.precisionGPS ? parseFloat(rest.precisionGPS) : null,
    }));

    const payload: ClienteDTO = {
      tipoCliente: (tipoCliente === "NATURAL" ? "PERSONA" : "EMPRESA") as "PERSONA" | "EMPRESA",
      nombre: (formData.get("nombre") as string) || "No Concretado",
      apellido: (formData.get("apellido") as string) || "No Concretado",
      tipoDocumento: (formData.get("tipoDocumento") as string) || "No Concretado",
      numeroDocumento: (formData.get("numeroDocumento") as string) || "No Concretado",
      telefono: (formData.get("telefono") as string),
      telefono2: (formData.get("telefono2") as string) || "No Concretado",
      correo: (formData.get("correo") as string) || "noconcretado@noconcretado.com",
      origenCliente: (formData.get("origen") as string) || "No Concretado",
      tipoInteresId: (formData.get("interes") as string) || null,
      razonSocial: (formData.get("razonSocial") as string) || "No Concretado",
      nit: (formData.get("nit") as string) || "No Concretado",
      actividadEconomica: (formData.get("actividad") as string) || "No Concretado",
      metrajeTotal: metraje ? parseFloat(metraje.toString()) : null,
      segmentoId: segmento || null,
      riesgoId: riesgoOverride || riesgosDb.find(r => r.nombre === sugerencias.riesgo)?.id || null,
      direcciones: cleanedDirecciones,
    };

    // A hack to bypass the DTO interface locally if it's missing, since backend extracts it
    const finalPayload = { ...payload, empresaId: selectedEmpresaId || undefined } as unknown as ClienteDTO;

    try {
      const response = await createClienteAction(finalPayload);
      if (!response.success) {
        const errorMsg = Array.isArray(response.error) ? response.error[0] : response.error;
        toast.error(errorMsg ? String(errorMsg) : "Error al crear cliente");
        return;
      }
      toast.success("Cliente registrado con éxito");
      router.push("/dashboard/clientes");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al crear cliente";
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
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden min-h-0">

        <div className="flex-none bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/clientes")} className="h-10 w-10 rounded-full border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50"><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Registro de Clientes</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--color-azul-1)]"></span>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.1em]">Pipeline Comercial & Operativo</p>
              </div>
            </div>
          </div>

          <div className="flex bg-zinc-50 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
            <button onClick={() => setTipoCliente("NATURAL")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${tipoCliente === "NATURAL" ? "bg-white dark:bg-zinc-800 text-[var(--color-azul-1)] shadow-sm border border-zinc-200/50" : "text-zinc-400 hover:text-zinc-600"}`}><UserCircle2 className="h-4 w-4" /> PERSONA NATURAL</button>
            <button onClick={() => setTipoCliente("EMPRESA")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${tipoCliente === "EMPRESA" ? "bg-white dark:bg-zinc-800 text-[var(--color-azul-1)] shadow-sm border border-zinc-200/50" : "text-zinc-400 hover:text-zinc-600"}`}><Building2 className="h-4 w-4" /> CORPORATIVO / EMPRESA</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white dark:bg-zinc-950">
          <form id="cliente-form" onSubmit={handleSubmit} className="space-y-12 max-w-4xl mx-auto pb-12">

            <div className="p-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex gap-4 items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Nota importante</p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed font-medium">
                  Todos los campos que no estén marcados con un asterisco rojo (<span className="text-red-500 font-bold">*</span>) son opcionales. Si decide dejarlos vacíos, el sistema los guardará automáticamente con el valor <span className="font-bold">&quot;No Concretado&quot;</span> (o <span className="font-bold">&quot;noconcretado@noconcretado.com&quot;</span> para el correo) para mantener la integridad de los registros.
                </p>
              </div>
            </div>

            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400"><Target className="h-5 w-5" /></div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Configuración de Perfil</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Asignar a Empresa <span className="text-red-500">*</span></Label>
                  <Select 
                    value={selectedEmpresaId} 
                    onChange={(e) => setSelectedEmpresaId(e.target.value)} 
                    className="h-11 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    required
                  >
                    {empresasUser.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </Select>
                </div>

                {tipoCliente === "NATURAL" ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Nombre(s)</Label>
                      <Input name="nombre" className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500" placeholder="Ej: Juan" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Apellido(s)</Label>
                      <Input name="apellido" className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500" placeholder="Ej: Valdés" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Tipo de Documento</Label>
                      <Select name="tipoDocumento" className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
                        <option value="">No especificado</option>
                        {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Número de Documento</Label>
                      <Input name="numeroDocumento" className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 font-mono" placeholder="12345678" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9.\-]/g, ''); }} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Razón Social</Label>
                      <Input name="razonSocial" className="h-11 border-[var(--color-azul-1)]/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                    </div>
                    <input type="hidden" name="tipoDocumento" value="NIT" />
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">NIT / Identificación</Label>
                      <Input name="nit" className="h-11 font-mono dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9.\-]/g, ''); }} />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Teléfono Principal <span className="text-red-500">*</span></Label>
                  <Input name="telefono" required className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500" placeholder="3000000000" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9.\-]/g, ''); }} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Teléfono Secundario (Opcional)</Label>
                  <Input name="telefono2" className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 opacity-80" placeholder="3111111111" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9.\-]/g, ''); }} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Segmento del Negocio</Label>
                  <Select name="segmento" value={segmento} onChange={(e) => setSegmento(e.target.value)} className="h-11 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    {segmentosDb.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Nivel de Riesgo Operativo</Label>
                  <Select value={riesgoOverride || riesgosDb.find(r => r.nombre === sugerencias.riesgo)?.id || ""} onChange={(e) => setRiesgoOverride(e.target.value)} className="h-11 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    <option value="">Seleccionar riesgo...</option>
                    {riesgosDb.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Canal de Captación</Label>
                  <Select name="origen" className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    {ORIGENES_CLIENTE.map(o => <option key={o} value={o}>{o}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Correo Electrónico (Opcional)</Label>
                  <Input name="correo" type="email" pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$" title="Debe incluir un '@' y un '.'" className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500" placeholder="usuario@ejemplo.com" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Tipo de Servicio Interés</Label>
                  <Select name="interes" value={interes} onChange={(e) => setInteres(e.target.value)} className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    {tiposInteresDb.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </Select>
                </div>

                {tipoCliente === "EMPRESA" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Actividad Económica</Label>
                      <Input name="actividad" className="h-11 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500" placeholder="Ej: Venta de alimentos" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Área Instalaciones (m²)</Label>
                      <Input type="number" name="metraje" value={metraje} onChange={(e) => setMetraje(Number(e.target.value))} className="h-11 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                    </div>
                  </>
                )}
              </div>

              {(segmento || interes) && (
                <div className="p-6 bg-azul-1/5 dark:bg-azul-1/10 border border-azul-1/20 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-azul-1">
                    <Lightbulb className="h-5 w-5" />
                    <span className="text-sm font-black uppercase tracking-wider">Recomendación Estratégica</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                    Basado en el segmento <span className="font-bold text-zinc-900 dark:text-zinc-100">{segmentosDb.find(s => s.id === segmento)?.nombre}</span> y el interés <span className="font-bold text-zinc-900 dark:text-zinc-100">{tiposInteresDb.find(i => i.id === interes)?.nombre}</span>, el sistema sugiere un riesgo <span className="font-bold text-azul-1">{sugerencias.riesgo}</span> con una frecuencia <span className="font-bold text-azul-1">{sugerencias.frecuencia === "Puntual" ? "Única" : `cada ${sugerencias.frecuencia} días`}</span>.
                  </p>
                </div>
              )}

              {tipoCliente === "EMPRESA" && segmento && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                  <div className="space-y-1.5"><p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em]">Frecuencia Ideal</p><div className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300 text-sm"><CalendarClock className="h-3.5 w-3.5 text-[var(--color-claro-azul-4)]" /> {sugerencias.frecuencia} días</div></div>
                  <div className="space-y-1.5"><p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em]">Tiempo de Labor</p><div className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300 text-sm"><Clock className="h-3.5 w-3.5 text-[var(--color-claro-azul-4)]" /> {sugerencias.tiempoEstimado} min</div></div>
                  <div className="space-y-1.5"><p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em]">Tarifa Sugerida</p><div className="flex items-center gap-2 font-bold text-[var(--color-oscuro-verde-azulado-3)] text-sm">$ {sugerencias.precioSugerido.toLocaleString()}</div></div>
                  <div className="space-y-1.5"><p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em]">Estatus de Cuenta</p><div className="flex items-center gap-2 font-bold text-amber-600 text-sm"><Zap className="h-3.5 w-3.5 fill-amber-600" /> POTENCIAL</div></div>
                </div>
              )}
            </section>

            <section className="space-y-8">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400"><MapPin className="h-5 w-5" /></div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{tipoCliente === "NATURAL" ? "Información de Residencia" : "Sedes Operativas"}</h2>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addDireccion} className="gap-2 h-9 text-[var(--color-azul-1)] border-zinc-200 hover:bg-zinc-50 font-bold text-[10px] tracking-wider uppercase">
                  <Plus className="h-3.5 w-3.5" /> {tipoCliente === "NATURAL" ? "AGREGAR OTRA DIRECCIÓN" : "AGREGAR OTRA SEDE"}
                </Button>
              </div>

              <div className="space-y-10">
                {direcciones.map((dir) => (
                  <div key={dir.id} className="relative bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 space-y-10 transition-all hover:shadow-md">
                    {direcciones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDireccion(dir.id)}
                        className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Dirección Principal <span className="text-red-500">*</span></Label>
                        <div className="flex gap-3">
                          <Input value={dir.direccion} onChange={(e) => handleDireccionChange(dir.id, "direccion", e.target.value)} required className="h-12 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 text-base" placeholder="Calle 123 # 45 - 67" />
                          <Button type="button" onClick={() => validarDireccion(dir.id)} variant="outline" className="h-12 px-6 gap-2 border-[var(--color-azul-1)] text-[var(--color-azul-1)] dark:text-claro-azul-4 dark:border-claro-azul-4/50 hover:bg-[var(--color-azul-1)]/5 transition-all font-bold text-xs"><Search className="h-4 w-4" /> VALIDAR</Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Referencia Maps</Label>
                        <Input value={dir.linkMaps} onChange={(e) => handleDireccionChange(dir.id, "linkMaps", e.target.value)} className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" placeholder="Enlace de ubicación" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Departamento</Label>
                          <Combobox
                            options={Array.isArray(departamentos) ? departamentos.map(d => ({ value: d.id, label: d.name })) : []}
                            value={dir.departmentId || ""}
                            onChange={(v) => handleDireccionChange(dir.id, "departmentId", v)}
                            placeholder={departamentos.length > 0 ? "Seleccionar..." : "Cargando..."}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Municipio</Label>
                          <Combobox
                            options={getMunicipiosOptions(dir.departmentId || "")}
                            value={dir.municipioId || ""}
                            onChange={(v) => handleDireccionChange(dir.id, "municipioId", v)}
                            placeholder={dir.departmentId ? "Seleccionar..." : "Elija departamento"}
                            disabled={!dir.departmentId}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Apto / Piso / Local</Label>
                        <Input value={dir.piso} onChange={(e) => handleDireccionChange(dir.id, "piso", e.target.value)} className="h-11 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" placeholder="Ej: 201" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Bloque / Torre / Conjunto</Label>
                        <Input value={dir.bloque} onChange={(e) => handleDireccionChange(dir.id, "bloque", e.target.value)} className="h-11 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" placeholder="Ej: Torre B" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Unidad / Edificio / Vereda</Label>
                        <Input value={dir.unidad} onChange={(e) => handleDireccionChange(dir.id, "unidad", e.target.value)} className="h-11 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" placeholder="Ej: San Juan" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">{tipoCliente === "NATURAL" ? "Tipo Vivienda" : "Clasificación"}</Label>
                        {tipoCliente === "NATURAL" ? (
                          <Select value={dir.tipoUbicacion} onChange={(e) => handleDireccionChange(dir.id, "tipoUbicacion", e.target.value)} className="h-11 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
                            <option value="CASA">CASA</option>
                            <option value="APTO">APARTAMENTO</option>
                          </Select>
                        ) : (
                          <Select value={dir.clasificacionPunto} onChange={(e) => handleDireccionChange(dir.id, "clasificacionPunto", e.target.value)} className="h-11 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
                            {CLASIFICACIONES_PUNTO.map(c => <option key={c} value={c}>{c}</option>)}
                          </Select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Barrio / Sector</Label>
                        <Input value={dir.barrio} onChange={(e) => handleDireccionChange(dir.id, "barrio", e.target.value)} className="h-11 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" placeholder="Ej: El Poblado" />
                      </div>
                      {tipoCliente === "NATURAL" && (
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Indicaciones Opcionales</Label>
                          <Input value={dir.restriccionesAcceso} onChange={(e) => handleDireccionChange(dir.id, "restriccionesAcceso", e.target.value)} className="h-11 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" placeholder="Ej: Portón café, cerca al parque" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                      <div className="flex-1 w-full space-y-1.5"><Label className="text-[10px] font-black text-[var(--color-azul-1)] dark:text-claro-azul-4 uppercase tracking-[0.15em]">Latitud Geográfica</Label><Input value={dir.latitud} onChange={(e) => handleDireccionChange(dir.id, "latitud", e.target.value.replace(/[^0-9.-]/g, ''))} pattern="^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)$" title="Latitud válida entre -90 y 90" className="h-10 bg-white dark:bg-zinc-800 dark:text-zinc-100 font-mono text-sm border-zinc-200 dark:border-zinc-700" placeholder="0.0000" /></div>
                      <div className="flex-1 w-full space-y-1.5"><Label className="text-[10px] font-black text-[var(--color-azul-1)] dark:text-claro-azul-4 uppercase tracking-[0.15em]">Longitud Geográfica</Label><Input value={dir.longitud} onChange={(e) => handleDireccionChange(dir.id, "longitud", e.target.value.replace(/[^0-9.-]/g, ''))} pattern="^[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$" title="Longitud válida entre -180 y 180" className="h-10 bg-white dark:bg-zinc-800 dark:text-zinc-100 font-mono text-sm border-zinc-200 dark:border-zinc-700" placeholder="0.0000" /></div>
                      <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider transition-all ${dir.validadoPorSistema ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" : "bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700"}`}>{dir.validadoPorSistema ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />} {dir.validadoPorSistema ? "SISTEMA: GEORREFERENCIADO" : "SISTEMA: PENDIENTE"}</div>
                    </div>

                    {tipoCliente === "EMPRESA" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-300 font-bold text-[10px] uppercase tracking-widest"><Clock className="h-4 w-4" /> Ventana Operativa</div>
                          <div className="flex gap-3"><Input type="time" value={dir.horarioInicio} onChange={(e) => handleDireccionChange(dir.id, "horarioInicio", e.target.value)} className="h-11 bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 shadow-sm" /><Input type="time" value={dir.horarioFin} onChange={(e) => handleDireccionChange(dir.id, "horarioFin", e.target.value)} className="h-11 bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 shadow-sm" /></div>
                        </div>
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-300 font-bold text-[10px] uppercase tracking-widest"><Contact2 className="h-4 w-4" /> Responsable Directo</div>
                          <div className="grid grid-cols-2 gap-3"><Input value={dir.nombreContacto} onChange={(e) => handleDireccionChange(dir.id, "nombreContacto", e.target.value)} placeholder="Nombre" className="h-11 bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 shadow-sm" /><Input value={dir.telefonoContacto} onChange={(e) => handleDireccionChange(dir.id, "telefonoContacto", e.target.value)} placeholder="Móvil" className="h-11 bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 shadow-sm" /></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </form>
        </div>

        <div className="flex-none bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 px-10 py-5 flex items-center justify-between">
          <div className="hidden lg:flex items-center gap-3 text-zinc-400">
            <GanttChart className="h-5 w-5 text-[var(--color-claro-azul-4)]" />
            <p className="text-[11px] font-medium max-w-xs leading-relaxed">El registro habilita automáticamente el módulo de planificación de servicios recurrentes.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard/clientes")} className="h-12 px-8 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:bg-zinc-200">Descartar</Button>
            <Button
              type="submit"
              form="cliente-form"
              disabled={loading}
              className="h-12 px-12 bg-vivido-purpura-2 text-white hover:opacity-90 shadow-xl shadow-vivido-purpura-2/20 transition-all gap-3 border-none rounded-xl"
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
      <Suspense fallback={<div className="flex h-[80vh] items-center justify-center text-sm text-zinc-500 animate-pulse font-bold uppercase tracking-widest">Iniciando protocolo de registro...</div>}>
        <NuevoClienteContent />
      </Suspense>
    </DashboardLayout>
  );
}
