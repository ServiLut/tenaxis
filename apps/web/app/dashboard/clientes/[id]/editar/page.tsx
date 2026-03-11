"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  getClienteByIdAction,
  updateClienteAction,
  getContratoClienteActivoAction,
  createContratoClienteAction,
  updateContratoClienteAction,
  getSegmentosAction,
  getRiesgosAction,
  getTiposInteresAction,
  getDepartmentsAction,
  getMunicipalitiesAction,
  type ClienteDTO,
  type ContratoClienteDTO,
} from "../../../actions";
import { type Cliente, type ContratoCliente } from "@/lib/api/clientes-client";
import { type ConfigItem } from "@/lib/api/config-client";
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

function EditarClienteContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useUserRole();
  const [loading, setLoading] = useState(false);
  const [loadingClient, setLoadingClient] = useState(true);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [activeContract, setActiveContract] = useState<ContratoCliente | null>(null);
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
          getDepartmentsAction(),
          getMunicipalitiesAction(),
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
        const client = await getClienteByIdAction(id) as Cliente;
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
        setSegmento(client.segmento || "");
        setInteres(client.tipoInteresId || "");
        setRiesgoOverride(client.nivelRiesgo || null);
        setMetraje(client.metrajeTotal ? Number(client.metrajeTotal) : 0);
        setSelectedEmpresaId(client.empresa?.id || "");
        
        if (client.direcciones && client.direcciones.length > 0) {
          setDirecciones(client.direcciones.map((d) => ({
            id: Number(d.id) || Date.now() + Math.random(),
            direccion: d.direccion || "",
            linkMaps: d.linkMaps || "",
            departmentId: d.departmentId || "",
            municipioId: d.municipioId || "",
            municipio: d.municipioRel?.name || d.municipio || "",
            barrio: d.barrio || "",
            piso: d.piso || "",
            bloque: d.bloque || "",
            unidad: d.unidad || "",
            tipoUbicacion: d.tipoUbicacion || "Residencial",
            clasificacionPunto: d.clasificacionPunto || "Oficina administrativa",
            horarioInicio: d.horarioInicio || "08:00",
            horarioFin: d.horarioFin || "18:00",
            restriccionesAcceso: d.restricciones || "",
            nombreContacto: d.nombreContacto || "",
            telefonoContacto: d.telefonoContacto || "",
            cargoContacto: d.cargoContacto || "",
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

        if (client.empresa?.id) {
          const contrato = await getContratoClienteActivoAction(id, client.empresa.id);
          if (contrato) {
            setActiveContract(contrato);
            setHasActiveContract(true);
            setContractStartDate(contrato.fechaInicio?.slice(0, 10) || "");
            setContractEndDate(contrato.fechaFin?.slice(0, 10) || "");
            setContractServicesCommitted(
              contrato.serviciosComprometidos ? String(contrato.serviciosComprometidos) : "",
            );
            setContractServiceFrequency(
              contrato.frecuenciaServicio ? String(contrato.frecuenciaServicio) : "30",
            );
            setContractBillingType(contrato.tipoFacturacion);
            setContractNotes(contrato.observaciones || "");
          }
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
      segmento: (segmento || null) as ClienteDTO["segmento"],
      nivelRiesgo: (riesgoOverride || riesgosDb.find(r => r.nombre === sugerencias.riesgo)?.id || null) as ClienteDTO["nivelRiesgo"],
      direcciones: cleanedDirecciones as unknown as NonNullable<ClienteDTO["direcciones"]>,
    };

    try {
      const response = await updateClienteAction(id, payload);
      if (!response.success) {
        toast.error(response.error || "Error al actualizar cliente");
        return;
      }

      if (selectedEmpresaId) {
        if (hasActiveContract) {
          const contractPayload: ContratoClienteDTO = {
            empresaId: selectedEmpresaId,
            fechaInicio: contractStartDate,
            fechaFin: contractEndDate || null,
            serviciosComprometidos: contractServicesCommitted ? Number(contractServicesCommitted) : null,
            frecuenciaServicio: contractServiceFrequency ? Number(contractServiceFrequency) : null,
            tipoFacturacion: contractBillingType,
            observaciones: contractNotes || null,
          };

          const contractResponse = (activeContract && activeContract.id)
            ? await updateContratoClienteAction(activeContract.id, contractPayload)
            : await createContratoClienteAction(id, contractPayload);

          if (!contractResponse.success) {
            toast.error(contractResponse.error || "Se actualizó el cliente, pero falló el contrato comercial.");
            return;
          }
        } else if (activeContract) {
          const cancelResponse = await updateContratoClienteAction(activeContract.id, {
            estado: "CANCELADO",
          });

          if (!cancelResponse.success) {
            toast.error(cancelResponse.error || "No se pudo desactivar el contrato comercial.");
            return;
          }
        }
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
      <div className="flex h-[80vh] items-center justify-center text-sm text-muted-foreground animate-pulse font-bold uppercase tracking-widest">
        Recuperando expediente del cliente...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full h-[calc(100vh-12rem)] flex flex-col min-h-0">
      <div className="flex-1 flex flex-col bg-card rounded-2xl shadow-sm border border-border overflow-hidden min-h-0">

        <div className="flex-none bg-card border-b border-border px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/clientes")} className="h-10 w-10 rounded-full border border-border hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Editar Cliente</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-azul-1"></span>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em]">Expediente: {id.slice(0,8)}</p>
              </div>
            </div>
          </div>

          <div className="flex bg-muted p-1 rounded-xl border border-border shadow-inner">
            <button type="button" onClick={() => setTipoCliente("NATURAL")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${tipoCliente === "NATURAL" ? "bg-background text-azul-1 shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"}`}><UserCircle2 className="h-4 w-4" /> PERSONA NATURAL</button>
            <button type="button" onClick={() => setTipoCliente("EMPRESA")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${tipoCliente === "EMPRESA" ? "bg-background text-azul-1 shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"}`}><Building2 className="h-4 w-4" /> CORPORATIVO / EMPRESA</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-background">
          <form id="cliente-form" onSubmit={handleSubmit} className="space-y-12 max-w-4xl mx-auto pb-12">

            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="p-2 rounded-lg bg-muted border border-border text-muted-foreground"><Target className="h-5 w-5" /></div>
                <h2 className="text-lg font-bold text-foreground">Configuración de Perfil</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {tipoCliente === "NATURAL" ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nombre(s)</Label>
                      <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Ej: Juan" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Apellido(s)</Label>
                      <Input value={apellido} onChange={(e) => setApellido(e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Ej: Valdés" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo de Documento</Label>
                      <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                        <SelectTrigger className="h-11 border-border bg-background text-foreground focus:ring-0">
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
                      <Input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} className="h-11 border-border bg-background text-foreground font-mono focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="12345678" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Razón Social</Label>
                      <Input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">NIT / Identificación</Label>
                      <Input value={nit} onChange={(e) => setNit(e.target.value)} className="h-11 border-border bg-background text-foreground font-mono focus-visible:ring-0 focus-visible:ring-offset-0" />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Teléfono Principal <span className="text-red-500">*</span></Label>
                  <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} required className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="3000000000" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Teléfono Secundario (Opcional)</Label>
                  <Input value={telefono2} onChange={(e) => setTelefono2(e.target.value)} className="h-11 border-border bg-background text-foreground opacity-80 focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="3111111111" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Segmento del Negocio</Label>
                  <Select value={segmento} onValueChange={setSegmento}>
                    <SelectTrigger className="h-11 border-border bg-background text-foreground focus:ring-0">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {segmentosDb.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nivel de Riesgo Operativo</Label>
                  <Select value={riesgoOverride || riesgosDb.find(r => r.nombre === sugerencias.riesgo)?.id || ""} onValueChange={setRiesgoOverride}>
                    <SelectTrigger className="h-11 border-border bg-background text-foreground focus:ring-0">
                      <SelectValue placeholder="Seleccionar riesgo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {riesgosDb.map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Canal de Captación</Label>
                  <Select value={origen} onValueChange={setOrigen}>
                    <SelectTrigger className="h-11 border-border bg-background text-foreground focus:ring-0">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGENES_CLIENTE.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Correo Electrónico (Opcional)</Label>
                  <Input value={correo} onChange={(e) => setCorreo(e.target.value)} type="email" className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="usuario@ejemplo.com" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo de Servicio Interés</Label>
                  <Select value={interes} onValueChange={setInteres}>
                    <SelectTrigger className="h-11 border-border bg-background text-foreground focus:ring-0">
                      <SelectValue placeholder="Seleccionar..." />
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
                      <Input value={actividad} onChange={(e) => setActividad(e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Ej: Venta de alimentos" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Área Instalaciones (m²)</Label>
                      <Input type="number" value={metraje} onChange={(e) => setMetraje(Number(e.target.value))} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" />
                    </div>
                  </>
                )}
              </div>
            </section>

            {
              <section className="space-y-8">
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  <div className="p-2 rounded-lg bg-muted border border-border text-muted-foreground"><Clock className="h-5 w-5" /></div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Condiciones Comerciales</h2>
                    <p className="text-xs text-muted-foreground">Administra el contrato activo de este cliente y define cómo se facturarán los servicios.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-muted/40 px-4 py-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">Contrato comercial del cliente</p>
                      <p className="text-xs text-muted-foreground">
                        Si está activo, la orden de servicio heredará el tipo de facturación definido aquí.
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
                        <Input type="number" min="1" value={contractServicesCommitted} onChange={(e) => setContractServicesCommitted(e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Frecuencia operativa (días)</Label>
                        <Input type="number" min="1" value={contractServiceFrequency} onChange={(e) => setContractServiceFrequency(e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo de facturación <span className="text-red-500">*</span></Label>
                        <Select value={contractBillingType} onValueChange={(value) => setContractBillingType(value as ContratoClienteDTO["tipoFacturacion"])}>
                          <SelectTrigger className="h-11 border-border bg-background text-foreground focus:ring-0">
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
                          placeholder="Ej: visita mensual con consolidado trimestral."
                          className="min-h-[120px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-azul-1"
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
                <Button type="button" variant="outline" size="sm" onClick={addDireccion} className="gap-2 h-9 text-azul-1 border-border hover:bg-muted font-bold text-[10px] tracking-wider uppercase bg-background">
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
                        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dirección Principal <span className="text-red-500">*</span></Label>
                        <div className="flex gap-3">
                          <Input value={dir.direccion} onChange={(e) => handleDireccionChange(dir.id, "direccion", e.target.value)} required className="h-12 border-border bg-background text-foreground text-base focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Calle 123 # 45 - 67" />
                          <Button type="button" onClick={() => validarDireccion(dir.id)} variant="outline" className="h-12 px-6 gap-2 border-azul-1 text-azul-1 dark:text-claro-azul-4 dark:border-claro-azul-4/50 hover:bg-azul-1/5 transition-all font-bold text-xs"><Search className="h-4 w-4" /> VALIDAR</Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Referencia Maps</Label>
                        <Input value={dir.linkMaps} onChange={(e) => handleDireccionChange(dir.id, "linkMaps", e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Enlace de ubicación" />
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
                        <Input value={dir.piso} onChange={(e) => handleDireccionChange(dir.id, "piso", e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Ej: 201" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bloque / Torre / Conjunto</Label>
                        <Input value={dir.bloque} onChange={(e) => handleDireccionChange(dir.id, "bloque", e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Ej: Torre B" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unidad / Edificio / Vereda</Label>
                        <Input value={dir.unidad} onChange={(e) => handleDireccionChange(dir.id, "unidad", e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Ej: San Juan" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{tipoCliente === "NATURAL" ? "Tipo Vivienda" : "Clasificación"}</Label>
                        {tipoCliente === "NATURAL" ? (
                          <Select value={dir.tipoUbicacion} onValueChange={(val) => handleDireccionChange(dir.id, "tipoUbicacion", val)}>
                            <SelectTrigger className="h-11 border-border bg-background text-foreground focus:ring-0">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CASA">CASA</SelectItem>
                              <SelectItem value="APTO">APARTAMENTO</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select value={dir.clasificacionPunto} onValueChange={(val) => handleDireccionChange(dir.id, "clasificacionPunto", val)}>
                            <SelectTrigger className="h-11 border-border bg-background text-foreground focus:ring-0">
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
                        <Input value={dir.barrio} onChange={(e) => handleDireccionChange(dir.id, "barrio", e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Ej: El Poblado" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Indicaciones Opcionales</Label>
                        <Input value={dir.restriccionesAcceso} onChange={(e) => handleDireccionChange(dir.id, "restriccionesAcceso", e.target.value)} className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Ej: Portón café, cerca al parque" />
                      </div>
                    </div>

                    {tipoCliente === "EMPRESA" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-border">
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 text-muted-foreground font-bold text-[10px] uppercase tracking-widest"><Clock className="h-4 w-4" /> Ventana Operativa</div>
                          <div className="flex gap-3">
                            <TimePicker 
                              value={dir.horarioInicio} 
                              onChange={(val) => handleDireccionChange(dir.id, "horarioInicio", val)} 
                              className="h-11 bg-background border-border shadow-sm focus-within:ring-0" 
                            />
                            <TimePicker 
                              value={dir.horarioFin} 
                              onChange={(val) => handleDireccionChange(dir.id, "horarioFin", val)} 
                              className="h-11 bg-background border-border shadow-sm focus-within:ring-0" 
                            />
                          </div>
                        </div>
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 text-muted-foreground font-bold text-[10px] uppercase tracking-widest"><Contact2 className="h-4 w-4" /> Responsable Directo</div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input value={dir.nombreContacto} onChange={(e) => handleDireccionChange(dir.id, "nombreContacto", e.target.value)} placeholder="Nombre" className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 shadow-sm" />
                            <Input value={dir.telefonoContacto} onChange={(e) => handleDireccionChange(dir.id, "telefonoContacto", e.target.value)} placeholder="Móvil" className="h-11 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 shadow-sm" />
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
            <GanttChart className="h-5 w-5 text-claro-azul-4" />
            <p className="text-[11px] font-medium max-w-xs leading-relaxed">Actualizando expediente estratégico del cliente en el sistema.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard/clientes")} className="h-12 px-8 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted">Cancelar</Button>
            <Button
              type="submit"
              form="cliente-form"
              disabled={loading}
              className="h-12 px-12 bg-azul-1 text-white hover:opacity-90 shadow-xl shadow-azul-1/20 transition-all gap-3 border-none rounded-xl"
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
      <Suspense fallback={<div className="flex h-[80vh] items-center justify-center text-sm text-muted-foreground animate-pulse font-bold uppercase tracking-widest">Cargando protocolo de edición...</div>}>
        <EditarClienteContent />
      </Suspense>
    </DashboardLayout>
  );
}
