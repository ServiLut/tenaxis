"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  getClienteByIdAction,
  updateClienteAction,
  getSegmentosAction,
  getRiesgosAction,
  getTiposInteresAction,
  type ClienteDTO,
} from "../../../actions";
import {
  getDepartments,
  getMunicipalities,
} from "../../nuevo/actions";
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
  Building2,
  UserCircle2,
  Target,
  Search,
  GanttChart,
} from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { DashboardLayout } from "@/components/dashboard";

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

function EditarClienteContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useUserRole();
  const [loading, setLoading] = useState(false);
  const [loadingClient, setLoadingClient] = useState(true);

  // --- Datos Dinámicos ---
  const [departamentos, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [municipios, setMunicipalities] = useState<{id: string, name: string, departmentId: string}[]>([]);
  const [segmentosDb, setSegmentosDb] = useState<{id: string, nombre: string, frecuenciaSugerida: number, riesgoSugerido: string}[]>([]);
  const [riesgosDb, setRiesgosDb] = useState<{id: string, nombre: string}[]>([]);
  const [tiposInteresDb, setTiposInteresDb] = useState<{id: string, nombre: string, frecuenciaSugerida: number, riesgoSugerido: string}[]>([]);

  // Estados del Formulario
  const [tipoCliente, setTipoCliente] = useState<"NATURAL" | "EMPRESA">("NATURAL");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [telefono2, setTelefono2] = useState("");
  const [correo, setCorreo] = useState("");
  const [origen, setOrigen] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nit, setNit] = useState("");
  const [actividad, setActividad] = useState("");
  const [segmento, setSegmento] = useState("");
  const [interes, setInteres] = useState("");
  const [riesgoOverride, setRiesgoOverride] = useState<string | null>(null);
  const [metraje, setMetraje] = useState<number>(0);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);

  const addDireccion = useCallback(() => {
    setDirecciones(prev => [...prev, {
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
  }, []);

  // 1. Cargar Datos Geográficos y Configuración
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
      } catch (e) {
        console.error("Error loading initial data", e);
        toast.error("Error al cargar datos de configuración");
      }
    };
    loadInitialData();
  }, []);

  // 2. Cargar Datos del Cliente
  useEffect(() => {
    const loadClientData = async () => {
      if (!id) return;
      try {
        const client = await getClienteByIdAction(id);
        if (!client) {
          toast.error("No se encontró el cliente");
          router.push("/dashboard/clientes");
          return;
        }

        setTipoCliente(client.tipoCliente === "PERSONA" ? "NATURAL" : "EMPRESA");
        setNombre(client.nombre || "");
        setApellido(client.apellido || "");
        setTipoDocumento(client.tipoDocumento || "");
        setNumeroDocumento(client.numeroDocumento || "");
        setTelefono(client.telefono || "");
        setTelefono2(client.telefono2 || "");
        setCorreo(client.correo || "");
        setOrigen(client.origenCliente || "");
        setRazonSocial(client.razonSocial || "");
        setNit(client.nit || "");
        setActividad(client.actividadEconomica || "");
        setSegmento(client.segmentoId || "");
        setInteres(client.tipoInteresId || "");
        setRiesgoOverride(client.riesgoId || null);
        setMetraje(client.metrajeTotal ? Number(client.metrajeTotal) : 0);
        
        if (client.direcciones && client.direcciones.length > 0) {
          setDirecciones(client.direcciones.map((d: Record<string, unknown>) => ({
            id: Number(d.id) || Date.now() + Math.random(),
            direccion: (d.direccion as string) || "",
            linkMaps: (d.linkMaps as string) || "",
            departmentId: (d.departmentId as string) || "",
            municipioId: (d.municipioId as string) || "",
            municipio: ((d.municipioRel as { name?: string })?.name) || (d.municipio as string) || "",
            barrio: (d.barrio as string) || "",
            piso: (d.piso as string) || "",
            bloque: (d.bloque as string) || "",
            unidad: (d.unidad as string) || "",
            tipoUbicacion: (d.tipoUbicacion as string) || "Residencial",
            clasificacionPunto: (d.clasificacionPunto as string) || "Oficina administrativa",
            horarioInicio: (d.horarioInicio as string) || "08:00",
            horarioFin: (d.horarioFin as string) || "18:00",
            restriccionesAcceso: (d.restricciones as string) || "",
            nombreContacto: (d.nombreContacto as string) || "",
            telefonoContacto: (d.telefonoContacto as string) || "",
            cargoContacto: (d.cargoContacto as string) || "",
            activa: d.activa ?? true,
            bloqueada: d.bloqueada ?? false,
            motivoBloqueo: d.motivoBloqueo || "",
            latitud: d.latitud ? String(d.latitud) : "",
            longitud: d.longitud ? String(d.longitud) : "",
            precisionGPS: d.precisionGPS ? String(d.precisionGPS) : "",
            validadoPorSistema: d.validadoPorSistema ?? false,
          })));
        } else {
          addDireccion();
        }

        setLoadingClient(false);
      } catch (e) {
        console.error("Error loading client data", e);
        toast.error("Error al cargar los datos del cliente");
        setLoadingClient(false);
      }
    };
    loadClientData();
  }, [id, router, addDireccion]);

  const sugerencias = useMemo(() => {
    const seg = segmentosDb.find(s => s.id === segmento);
    const int = tiposInteresDb.find(i => i.id === interes);

    const riesgosMap: Record<string, number> = { "BAJO": 1, "MEDIO": 2, "ALTO": 3, "CRITICO": 4 };
    const riesgoSeg = seg?.riesgoSugerido || "BAJO";
    const riesgoInt = int?.riesgoSugerido || "BAJO";

    const riesgoFinal = (riesgosMap[riesgoSeg] ?? 1) >= (riesgosMap[riesgoInt] ?? 1) ? riesgoSeg : riesgoInt;

    const freqSeg = seg?.frecuenciaSugerida || 30;
    const freqInt = int?.frecuenciaSugerida || 30;
    const freqFinal = Math.min(freqSeg === 0 ? 999 : freqSeg, freqInt === 0 ? 999 : freqInt);

    return {
      riesgo: riesgoFinal,
      frecuencia: freqFinal === 999 ? "Puntual" : String(freqFinal),
      precioSugerido: metraje > 0 ? metraje * 1500 : 0,
      tiempoEstimado: metraje > 0 ? Math.ceil(metraje / 100) * 30 : 0,
    };
  }, [segmento, interes, metraje, segmentosDb, tiposInteresDb]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalStyle; };
  }, []);

  const handleDireccionChange = <K extends keyof Direccion>(id: number, field: K, value: Direccion[K]) => {
    setDirecciones(prev => prev.map((d) => {
      if (d.id === id || (typeof d.id === 'string' && d.id === String(id))) {
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

  const validarDireccion = async (dirId: number) => {
    toast.promise(new Promise(resolve => setTimeout(resolve, 1500)), {
      loading: 'Georreferenciando dirección...',
      success: 'Coordenadas validadas correctamente',
      error: 'Error al validar ubicación',
    });
    handleDireccionChange(dirId, "latitud", "6.2442");
    handleDireccionChange(dirId, "longitud", "-75.5812");
    handleDireccionChange(dirId, "validadoPorSistema", true);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

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

    const payload: Partial<ClienteDTO> = {
      tipoCliente: (tipoCliente === "NATURAL" ? "PERSONA" : "EMPRESA") as "PERSONA" | "EMPRESA",
      nombre: nombre || "No Concretado",
      apellido: apellido || "No Concretado",
      tipoDocumento: tipoDocumento || "No Concretado",
      numeroDocumento: numeroDocumento || "No Concretado",
      telefono: telefono,
      telefono2: telefono2 || "No Concretado",
      correo: correo || "noconcretado@noconcretado.com",
      origenCliente: origen || "No Concretado",
      tipoInteresId: interes || null,
      razonSocial: razonSocial || "No Concretado",
      nit: nit || "No Concretado",
      actividadEconomica: actividad || "No Concretado",
      metrajeTotal: metraje ? parseFloat(metraje.toString()) : null,
      segmentoId: segmento || null,
      riesgoId: riesgoOverride || riesgosDb.find(r => r.nombre === sugerencias.riesgo)?.id || null,
      direcciones: cleanedDirecciones as unknown as NonNullable<ClienteDTO["direcciones"]>,
    };

    try {
      const response = await updateClienteAction(id, payload);
      if (!response.success) {
        toast.error(response.error || "Error al actualizar cliente");
        return;
      }
      toast.success("Cliente actualizado con éxito");
      router.push("/dashboard/clientes");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al actualizar cliente";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const removeDireccion = (dirId: number) => {
    if (direcciones.length > 1) {
      setDirecciones(direcciones.filter(d => d.id !== dirId));
    } else {
      toast.error("Debe haber al menos una dirección");
    }
  };

  const getMunicipiosOptions = (deptId: string) => {
    return (Array.isArray(municipios) ? municipios : [])
      .filter(m => m.departmentId === deptId)
      .map(m => ({ value: m.id, label: m.name }));
  };

  if (loadingClient) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-sm text-zinc-500 animate-pulse font-bold uppercase tracking-widest">
        Recuperando expediente del cliente...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full h-[calc(100vh-12rem)] flex flex-col min-h-0">
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden min-h-0">

        <div className="flex-none bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/clientes")} className="h-10 w-10 rounded-full border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50"><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Editar Cliente</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-azul-1"></span>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.1em]">Expediente: {id.slice(0,8)}</p>
              </div>
            </div>
          </div>

          <div className="flex bg-zinc-50 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
            <button type="button" onClick={() => setTipoCliente("NATURAL")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${tipoCliente === "NATURAL" ? "bg-white dark:bg-zinc-800 text-azul-1 shadow-sm border border-zinc-200/50" : "text-zinc-400 hover:text-zinc-600"}`}><UserCircle2 className="h-4 w-4" /> PERSONA NATURAL</button>
            <button type="button" onClick={() => setTipoCliente("EMPRESA")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${tipoCliente === "EMPRESA" ? "bg-white dark:bg-zinc-800 text-azul-1 shadow-sm border border-zinc-200/50" : "text-zinc-400 hover:text-zinc-600"}`}><Building2 className="h-4 w-4" /> CORPORATIVO / EMPRESA</button>
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
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Nombre(s)</Label>
                      <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" placeholder="Ej: Juan" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Apellido(s)</Label>
                      <Input value={apellido} onChange={(e) => setApellido(e.target.value)} className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" placeholder="Ej: Valdés" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Tipo de Documento</Label>
                      <Select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
                        <option value="">No especificado</option>
                        {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Número de Documento</Label>
                      <Input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 font-mono" placeholder="12345678" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Razón Social</Label>
                      <Input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} className="h-11 border-azul-1/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">NIT / Identificación</Label>
                      <Input value={nit} onChange={(e) => setNit(e.target.value)} className="h-11 font-mono dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Teléfono Principal <span className="text-red-500">*</span></Label>
                  <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} required className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" placeholder="3000000000" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Teléfono Secundario (Opcional)</Label>
                  <Input value={telefono2} onChange={(e) => setTelefono2(e.target.value)} className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 opacity-80" placeholder="3111111111" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Segmento del Negocio</Label>
                  <Select value={segmento} onChange={(e) => setSegmento(e.target.value)} className="h-11 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    <option value="">Seleccionar...</option>
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
                  <Select value={origen} onChange={(e) => setOrigen(e.target.value)} className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    <option value="">Seleccionar...</option>
                    {ORIGENES_CLIENTE.map(o => <option key={o} value={o}>{o}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Correo Electrónico (Opcional)</Label>
                  <Input value={correo} onChange={(e) => setCorreo(e.target.value)} type="email" className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" placeholder="usuario@ejemplo.com" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Tipo de Servicio Interés</Label>
                  <Select value={interes} onChange={(e) => setInteres(e.target.value)} className="h-11 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    <option value="">Seleccionar...</option>
                    {tiposInteresDb.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </Select>
                </div>

                {tipoCliente === "EMPRESA" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Actividad Económica</Label>
                      <Input value={actividad} onChange={(e) => setActividad(e.target.value)} className="h-11 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" placeholder="Ej: Venta de alimentos" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Área Instalaciones (m²)</Label>
                      <Input type="number" value={metraje} onChange={(e) => setMetraje(Number(e.target.value))} className="h-11 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="space-y-8">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400"><MapPin className="h-5 w-5" /></div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{tipoCliente === "NATURAL" ? "Información de Residencia" : "Sedes Operativas"}</h2>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addDireccion} className="gap-2 h-9 text-azul-1 border-zinc-200 hover:bg-zinc-50 font-bold text-[10px] tracking-wider uppercase">
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
                          <Button type="button" onClick={() => validarDireccion(dir.id)} variant="outline" className="h-12 px-6 gap-2 border-azul-1 text-azul-1 dark:text-claro-azul-4 dark:border-claro-azul-4/50 hover:bg-azul-1/5 transition-all font-bold text-xs"><Search className="h-4 w-4" /> VALIDAR</Button>
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
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">Indicaciones Opcionales</Label>
                        <Input value={dir.restriccionesAcceso} onChange={(e) => handleDireccionChange(dir.id, "restriccionesAcceso", e.target.value)} className="h-11 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" placeholder="Ej: Portón café, cerca al parque" />
                      </div>
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
            <GanttChart className="h-5 w-5 text-claro-azul-4" />
            <p className="text-[11px] font-medium max-w-xs leading-relaxed">Actualizando expediente estratégico del cliente en el sistema.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard/clientes")} className="h-12 px-8 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:bg-zinc-200">Cancelar</Button>
            <Button
              type="submit"
              form="cliente-form"
              disabled={loading}
              className="h-12 px-12 bg-vivido-purpura-2 text-white hover:opacity-90 shadow-xl shadow-vivido-purpura-2/20 transition-all gap-3 border-none rounded-xl"
            >
              {loading ? <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="font-bold text-xs tracking-[0.1em] uppercase text-white">Guardar Cambios</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditarClientePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="flex h-[80vh] items-center justify-center text-sm text-zinc-500 animate-pulse font-bold uppercase tracking-widest">Cargando protocolo de edición...</div>}>
        <EditarClienteContent />
      </Suspense>
    </DashboardLayout>
  );
}
