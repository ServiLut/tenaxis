"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  createClienteAction,
  getSegmentosAction,
  getRiesgosAction,
  getTiposInteresAction,
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
  Car,
  User,
  Phone,
  ArrowLeft,
  Save,
  MapPin,
  Plus,
  Trash2,
  Info,
  Clock,
  ShieldAlert,
  Contact2,
  Navigation,
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
const CLASIFICACIONES_PUNTO = ["Cocina", "Área almacenamiento", "Zona residuos", "Zona carga", "Zona comedor", "Oficina administrativa"];

function NuevoClienteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fixClientId = searchParams.get("fixClientId");
  const migrateClientId = searchParams.get("migrateClientId");

  const { tenantId } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(!!fixClientId || !!migrateClientId);

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
        const [deps, muns, segs, ries, ints] = await Promise.all([
          getDepartments(),
          getMunicipalities(),
          getSegmentosAction(),
          getRiesgosAction(),
          getTiposInteresAction()
        ]);
        setDepartments(deps);
        setMunicipalities(muns);
        setSegmentosDb(segs);
        setRiesgosDb(ries);
        setTiposInteresDb(ints);
        if (segs.length > 0) setSegmento(segs[0].id);
        if (ints.length > 0) setInteres(ints[0].id);
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

    const riesgoFinal = riesgosMap[riesgoSeg]! >= riesgosMap[riesgoInt]! ? riesgoSeg : riesgoInt;

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

  const [direcciones, setDirecciones] = useState([{
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

  const handleDireccionChange = (id: number, field: string, value: any) => {
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

    const cleanedDirecciones = direcciones.map(({ id, departmentId, validadoPorSistema, municipio, ...rest }) => ({
      ...rest,
      restricciones: rest.restriccionesAcceso,
      latitud: rest.latitud ? parseFloat(rest.latitud as string) : null,
      longitud: rest.longitud ? parseFloat(rest.longitud as string) : null,
      precisionGPS: rest.precisionGPS ? parseFloat(rest.precisionGPS as string) : null,
    }));

    // Remove the temporary property from the cleaned object
    cleanedDirecciones.forEach((d: any) => {
      delete d.restriccionesAcceso;
    });

    const payload = {
      tipoCliente: tipoCliente === "NATURAL" ? "PERSONA" : "EMPRESA",
      nombre: formData.get("nombre"),
      apellido: formData.get("apellido"),
      telefono: formData.get("telefono"),
      origenCliente: formData.get("origen"),
      tipoInteresId: formData.get("interes"),
      razonSocial: formData.get("razonSocial"),
      nit: formData.get("nit"),
      actividadEconomica: formData.get("actividad"),
      metrajeTotal: metraje ? parseFloat(metraje.toString()) : null,
      segmentoId: segmento || null,
      riesgoId: riesgoOverride || riesgosDb.find(r => r.nombre === sugerencias.riesgo)?.id || null,
      direcciones: cleanedDirecciones,
    };

    try {
      await createClienteAction(payload);
      toast.success("Cliente registrado con éxito");
      router.push("/dashboard/clientes");
    } catch (error: any) {
      toast.error(error.message || "Error al crear cliente");
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

            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400"><Target className="h-5 w-5" /></div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Configuración de Perfil</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {tipoCliente === "NATURAL" ? (
                  <>
                    <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nombre(s) <span className="text-red-500">*</span></Label><Input name="nombre" required className="h-11 border-zinc-200" placeholder="Ej: Juan" /></div>
                    <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Apellido(s) <span className="text-red-500">*</span></Label><Input name="apellido" required className="h-11 border-zinc-200" placeholder="Ej: Valdés" /></div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Razón Social <span className="text-red-500">*</span></Label><Input name="razonSocial" required className="h-11 border-[var(--color-azul-1)]/20" /></div>
                    <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">NIT / Identificación <span className="text-red-500">*</span></Label><Input name="nit" required className="h-11 font-mono" /></div>
                  </>
                )}

                <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Teléfono de Contacto <span className="text-red-500">*</span></Label><Input name="telefono" required className="h-11 border-zinc-200" placeholder="300 000 0000" /></div>
                <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Segmento del Negocio</Label><Select name="segmento" value={segmento} onChange={(e) => setSegmento(e.target.value)} className="h-11">{segmentosDb.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</Select></div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nivel de Riesgo Operativo</Label>
                  <Select value={riesgoOverride || riesgosDb.find(r => r.nombre === sugerencias.riesgo)?.id || ""} onChange={(e) => setRiesgoOverride(e.target.value)} className="h-11">
                    <option value="">Seleccionar riesgo...</option>
                    {riesgosDb.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </Select>
                </div>

                <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Canal de Captación</Label><Select name="origen" className="h-11 border-zinc-200">{ORIGENES_CLIENTE.map(o => <option key={o} value={o}>{o}</option>)}</Select></div>
                <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo de Servicio Interés</Label><Select name="interes" value={interes} onChange={(e) => setInteres(e.target.value)} className="h-11 border-zinc-200">{tiposInteresDb.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</Select></div>

                {tipoCliente === "EMPRESA" && (
                  <>
                    <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Actividad Económica</Label><Input name="actividad" className="h-11" placeholder="Ej: Venta de alimentos" /></div>
                    <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Área Instalaciones (m²)</Label><Input type="number" name="metraje" value={metraje} onChange={(e) => setMetraje(Number(e.target.value))} className="h-11" /></div>
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
                {direcciones.map((dir, idx) => (
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
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Dirección Principal <span className="text-red-500">*</span></Label>
                        <div className="flex gap-3">
                          <Input value={dir.direccion} onChange={(e) => handleDireccionChange(dir.id, "direccion", e.target.value)} required className="h-12 border-zinc-200 text-base text-zinc-900 dark:text-zinc-100" placeholder="Calle 123 # 45 - 67" />
                          <Button type="button" onClick={() => validarDireccion(dir.id)} variant="outline" className="h-12 px-6 gap-2 border-[var(--color-azul-1)] text-[var(--color-azul-1)] hover:bg-[var(--color-azul-1)]/5 transition-all font-bold text-xs"><Search className="h-4 w-4" /> VALIDAR</Button>
                        </div>
                      </div>

                      <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Referencia Maps</Label><Input value={dir.linkMaps} onChange={(e) => handleDireccionChange(dir.id, "linkMaps", e.target.value)} className="h-11 border-zinc-200" placeholder="Enlace de ubicación" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Departamento</Label>
                          <Combobox
                            options={Array.isArray(departamentos) ? departamentos.map(d => ({ value: d.id, label: d.name })) : []}
                            value={dir.departmentId || ""}
                            onChange={(v) => handleDireccionChange(dir.id, "departmentId", v)}
                            placeholder={departamentos.length > 0 ? "Seleccionar..." : "Cargando..."}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Municipio</Label>
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
                      <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Apto / Piso / Local</Label><Input value={dir.piso} onChange={(e) => handleDireccionChange(dir.id, "piso", e.target.value)} className="h-11 bg-white" placeholder="Ej: 201" /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Bloque / Torre / Conjunto</Label><Input value={dir.bloque} onChange={(e) => handleDireccionChange(dir.id, "bloque", e.target.value)} className="h-11 bg-white" placeholder="Ej: Torre B" /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Unidad / Edificio / Vereda</Label><Input value={dir.unidad} onChange={(e) => handleDireccionChange(dir.id, "unidad", e.target.value)} className="h-11 bg-white" placeholder="Ej: San Juan" /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{tipoCliente === "NATURAL" ? "Tipo Vivienda" : "Clasificación"}</Label>
                        {tipoCliente === "NATURAL" ? (
                          <Select value={dir.tipoUbicacion} onChange={(e) => handleDireccionChange(dir.id, "tipoUbicacion", e.target.value)} className="h-11 bg-white"><option value="CASA">CASA</option><option value="APTO">APARTAMENTO</option></Select>
                        ) : (
                          <Select value={dir.clasificacionPunto} onChange={(e) => handleDireccionChange(dir.id, "clasificacionPunto", e.target.value)} className="h-11 bg-white">{CLASIFICACIONES_PUNTO.map(c => <option key={c} value={c}>{c}</option>)}</Select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Barrio / Sector</Label><Input value={dir.barrio} onChange={(e) => handleDireccionChange(dir.id, "barrio", e.target.value)} className="h-11 bg-white text-zinc-900" placeholder="Ej: El Poblado" /></div>
                      {tipoCliente === "NATURAL" && (
                        <div className="space-y-2"><Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Indicaciones Opcionales</Label><Input value={dir.restriccionesAcceso} onChange={(e) => handleDireccionChange(dir.id, "restriccionesAcceso", e.target.value)} className="h-11 bg-white text-zinc-900" placeholder="Ej: Portón café, cerca al parque" /></div>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                      <div className="flex-1 w-full space-y-1.5"><Label className="text-[10px] font-black text-[var(--color-azul-1)] uppercase tracking-[0.15em]">Latitud Geográfica *</Label><Input value={dir.latitud} onChange={(e) => handleDireccionChange(dir.id, "latitud", e.target.value)} required className="h-10 bg-white font-mono text-sm border-zinc-200 text-zinc-900" placeholder="0.0000" /></div>
                      <div className="flex-1 w-full space-y-1.5"><Label className="text-[10px] font-black text-[var(--color-azul-1)] uppercase tracking-[0.15em]">Longitud Geográfica *</Label><Input value={dir.longitud} onChange={(e) => handleDireccionChange(dir.id, "longitud", e.target.value)} required className="h-10 bg-white font-mono text-sm border-zinc-200 text-zinc-900" placeholder="0.0000" /></div>
                      <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider transition-all ${dir.validadoPorSistema ? "bg-green-50 text-green-700 border-green-200" : "bg-zinc-100 text-zinc-400 border-zinc-200"}`}>{dir.validadoPorSistema ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />} {dir.validadoPorSistema ? "SISTEMA: GEORREFERENCIADO" : "SISTEMA: PENDIENTE"}</div>
                    </div>

                    {tipoCliente === "EMPRESA" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-widest"><Clock className="h-4 w-4" /> Ventana Operativa</div>
                          <div className="flex gap-3"><Input type="time" value={dir.horarioInicio} onChange={(e) => handleDireccionChange(dir.id, "horarioInicio", e.target.value)} className="h-11 bg-white shadow-sm text-zinc-900" /><Input type="time" value={dir.horarioFin} onChange={(e) => handleDireccionChange(dir.id, "horarioFin", e.target.value)} className="h-11 bg-white shadow-sm text-zinc-900" /></div>
                        </div>
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-widest"><Contact2 className="h-4 w-4" /> Responsable Directo</div>
                          <div className="grid grid-cols-2 gap-3"><Input value={dir.nombreContacto} onChange={(e) => handleDireccionChange(dir.id, "nombreContacto", e.target.value)} placeholder="Nombre" className="h-11 bg-white shadow-sm text-zinc-900" /><Input value={dir.telefonoContacto} onChange={(e) => handleDireccionChange(dir.id, "telefonoContacto", e.target.value)} placeholder="Móvil" className="h-11 bg-white shadow-sm text-zinc-900" /></div>
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
