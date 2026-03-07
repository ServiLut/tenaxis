"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard";
import {
  Input,
  Button,
  Skeleton,
  Label,
  DatePicker,
  Combobox
} from "@/components/ui";
import {
  Search,
  Filter,
  RotateCcw,
  FileText,
  Plus,
  Calendar,
  Clock,
  User,
  MoreHorizontal,
  Eye,
  EyeOff,
  Pencil,
  Copy,
  Bell,
  Send,
  CreditCard,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Upload,
  Receipt,
  Image as ImageIcon,
  ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import { toast } from "sonner";
import { uploadFile, type StorageFolder } from "@/lib/supabase-storage";
import {
  getOrdenesServicioAction,
  getEstadoServiciosAction,
  getOperatorsAction,
  updateOrdenServicioAction,
  addOrdenServicioEvidenciasAction,
  getMetodosPagoAction,
  notifyLiquidationWebhookAction,
  notifyServiceOperatorWebhookAction,
  getMunicipalitiesAction,
  type ClienteDTO,
} from "../actions";
import { Suspense } from "react";

interface DesglosePago {
  metodo: string;
  monto: number;
  banco?: string;
  referencia?: string;
  observacion?: string;
}

interface Operator {
  id: string;
  nombre: string;
  telefono?: string;
  user?: {
    nombre: string;
    apellido: string;
  }
}

interface Servicio {
  id: string;
  cliente: string;
  clienteFull: ClienteDTO;
  servicioEspecifico: string;
  fecha: string;
  hora: string;
  tecnico: string;
  tecnicoId?: string;
  estadoServicio: string;
  urgencia: string;
  empresaId: string;
  raw: OrdenServicioRaw;
}

interface OrdenServicioRaw {
  id: string;
  numeroOrden?: string;
  cliente: ClienteDTO;
  clienteId: string;
  empresaId: string;
  empresa?: { id: string; nombre: string };
  servicio?: { id: string; nombre: string };
  servicioId?: string;
  tecnicoId?: string;
  fechaVisita?: string;
  horaInicio?: string;
  horaFin?: string;
  tecnico?: { id: string; user?: { nombre: string; apellido: string } };
  creadoPor?: { id: string; user?: { nombre: string; apellido: string } };
  urgencia?: string;
  observacion?: string;
  observacionFinal?: string;
  nivelInfestacion?: string;
  condicionesHigiene?: string;
  condicionesLocal?: string;
  tipoVisita?: string;
  frecuenciaSugerida?: number;
  tipoFacturacion?: string;
  valorCotizado?: number;
  valorPagado?: number;
  valorRepuestos?: number;
  metodoPagoId?: string;
  metodoPago?: { id: string; nombre: string };
  entidadFinanciera?: { id: string; nombre: string };
  liquidadoPor?: { user: { nombre: string; apellido: string } };
  liquidadoAt?: string;
  desglosePago?: DesglosePago[];
  estadoPago?: string;
  estadoServicio?: string;
  createdAt: string;
  direccionTexto?: string;
  barrio?: string;
  municipio?: string;
  departamento?: string;
  piso?: string;
  bloque?: string;
  unidad?: string;
  zona?: { id: string; nombre: string };
  vehiculoId?: string;
  vehiculo?: {
    placa: string;
    marca?: string | null;
    modelo?: string | null;
    color?: string | null;
    tipo?: string | null;
  };
  facturaPath?: string | null;
  facturaElectronica?: string | null;
  comprobantePago?: string | null;
  referenciaPago?: string | null;
  fechaPago?: string | null;
  linkMaps?: string | null;
  evidenciaPath?: string | null;
  evidencias?: { id: string; path: string }[];
  geolocalizaciones?: {
    id: string;
    latitud: number | null;
    longitud: number | null;
    llegada: string;
    salida: string | null;
    fotoLlegada: string | null;
    fotoSalida: string | null;
    linkMaps: string | null;
    membership: {
      user: {
        nombre: string;
        apellido: string;
      };
    };
  }[];
}

const ESTADO_STYLING: Record<string, string> = {
  "NUEVO": "bg-muted text-muted-foreground border-border",
  "PROCESO": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "EN PROCESO": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "CANCELADO": "bg-destructive/10 text-destructive border-destructive/20",
  "PROGRAMADO": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "LIQUIDADO": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "TECNICO_FINALIZO": "bg-green-500/10 text-green-600 border-green-500/20",
  "TECNICO FINALIZO": "bg-green-500/10 text-green-600 border-green-500/20",
  "TECNICO FINALIZADO": "bg-green-500/10 text-green-600 border-green-500/20",
  "REPROGRAMADO": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "SIN_CONCRETAR": "bg-slate-500/10 text-slate-600 border-slate-500/20",
  "SIN CONCRETAR": "bg-slate-500/10 text-slate-600 border-slate-500/20",
  "DEFAULT": "bg-muted text-muted-foreground border-border",
};

const URGENCIA_STYLING: Record<string, string> = {
  "ALTA": "bg-red-500 text-white shadow-sm",
  "MEDIA": "bg-amber-500 text-white shadow-sm",
  "BAJA": "bg-emerald-500 text-white shadow-sm",
  "CRITICA": "bg-red-700 text-white shadow-sm",
};

function ServiciosSkeleton({ showKPIs = true }: { showKPIs?: boolean }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {showKPIs && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 mb-6 shrink-0">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4 animate-pulse">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-8" />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-border flex justify-between">
          <Skeleton className="h-12 w-1/2 rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-12 w-32 rounded-lg" />
            <Skeleton className="h-12 w-40 rounded-lg" />
          </div>
        </div>
        <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">ID Orden</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Cliente / Servicio</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Programación</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Técnico</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estado</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-8 py-6"><Skeleton className="h-8 w-24 rounded-lg" /></td>
              <td className="px-8 py-6"><div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></td>
              <td className="px-8 py-6"><div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-20" /></div></td>
              <td className="px-8 py-6"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-4 w-32" /></div></td>
              <td className="px-8 py-6"><Skeleton className="h-8 w-28 rounded-full" /></td>
              <td className="px-8 py-6 text-right"><div className="flex justify-end gap-2"><Skeleton className="h-10 w-10 rounded-xl" /><Skeleton className="h-10 w-10 rounded-xl" /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
}

function ServiciosContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisitaModalOpen, setIsVisitaModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isLiquidarModalOpen, setIsLiquidarModalOpen] = useState(false);
  const [showKPIs, setShowKPIs] = useState(true);

  const [liquidarData, setLiquidarData] = useState<{
    breakdown: Array<{
      metodo: string;
      monto: string;
      banco?: string;
      referencia?: string;
      observacion?: string;
    }>;
    observacionFinal: string;
    fechaPago: string;
  }>({
    breakdown: [{ metodo: "PENDIENTE", monto: "" }],
    observacionFinal: "",
    fechaPago: new Date().toISOString().split('T')[0],
  });
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadConfig, setUploadConfig] = useState<{ id: string; field: "facturaElectronica" | "comprobantePago" | "evidenciaPath" } | null>(null);

  const triggerUpload = (id: string, field: "facturaElectronica" | "comprobantePago" | "evidenciaPath") => {
    if (fileInputRef.current) {
      fileInputRef.current.multiple = field === "evidenciaPath";
    }
    setUploadConfig({ id, field });
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const [filters, setFilters] = useState({
    estado: searchParams.get("estado") || "all",
    tecnico: searchParams.get("tecnico") || "all",
    urgencia: searchParams.get("urgencia") || "all",
    creador: searchParams.get("creador") || "all",
    municipio: searchParams.get("municipio") || "all",
    metodoPago: searchParams.get("metodoPago") || "all",
    empresa: searchParams.get("empresa") || "all",
    tipo: searchParams.get("tipo") || "all",
    fechaInicio: searchParams.get("fechaInicio") || "",
    fechaFin: searchParams.get("fechaFin") || "",
  });
  const [filterOptions, setOptions] = useState<{
    estados: { id: string; nombre: string }[];
    tecnicos: { id: string; nombre: string }[];
    metodosPago: { id: string; nombre: string }[];
    creadores: { id: string; nombre: string }[];
    municipios: string[];
    empresas: { id: string; nombre: string }[];
    tiposVisita: string[];
  }>({
    estados: [],
    tecnicos: [],
    metodosPago: [],
    creadores: [],
    municipios: [],
    empresas: [],
    tiposVisita: [],
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchOptions = useCallback(async () => {
    try {
      const empresaId = localStorage.getItem("current-enterprise-id") || undefined;
      const [estados, tecnicos, metodos, munis] = await Promise.all([
        getEstadoServiciosAction(empresaId),
        empresaId ? getOperatorsAction(empresaId) : Promise.resolve([]),
        getMetodosPagoAction(empresaId),
        getMunicipalitiesAction(),
      ]);

      const coreEstados = [
        { id: "NUEVO", nombre: "NUEVO" },
        { id: "PROGRAMADO", nombre: "PROGRAMADO" },
        { id: "PROCESO", nombre: "EN PROCESO" },
        { id: "TECNICO_FINALIZO", nombre: "TÉCNICO FINALIZÓ" },
        { id: "LIQUIDADO", nombre: "LIQUIDADO" },
        { id: "REPROGRAMADO", nombre: "REPROGRAMADO" },
        { id: "CANCELADO", nombre: "CANCELADO" },
        { id: "SIN_CONCRETAR", nombre: "SIN CONCRETAR" },
      ];

      setOptions(prev => ({
        ...prev,
        estados: Array.isArray(estados) && estados.length > 0 ? estados : coreEstados,
        tecnicos: (Array.isArray(tecnicos) ? tecnicos : []).map(t => ({
          id: t.id,
          nombre: `${t.user?.nombre || ""} ${t.user?.apellido || ""}`.trim() || "Sin nombre"
        })),
        metodosPago: Array.isArray(metodos) ? metodos : [],
        municipios: Array.from(new Set([
          ...prev.municipios,
          ...(Array.isArray(munis) ? munis : []).map(m => m.name.toUpperCase())
        ])).sort(),
      }));
    } catch (error) {
      console.error("Error fetching filter options", error);
    }
  }, []);

  const fetchServicios = useCallback(async () => {
    setLoading(true);
    try {
      const empresaId = localStorage.getItem("current-enterprise-id") || undefined;
      const data = await getOrdenesServicioAction(empresaId);

      const mapped: Servicio[] = (Array.isArray(data) ? data : []).map((os: OrdenServicioRaw) => {
        const clienteLabel = os.cliente.tipoCliente === "EMPRESA"
          ? (os.cliente.razonSocial || "Empresa")
          : `${os.cliente.nombre || ""} ${os.cliente.apellido || ""}`.trim();

        const statusMap: Record<string, string> = {
          "PROCESO": "EN PROCESO",
          "TECNICO_FINALIZO": "TECNICO FINALIZADO",
          "SIN_CONCRETAR": "SIN CONCRETAR",
        };

        const displayStatus = statusMap[os.estadoServicio || ""] || os.estadoServicio || "NUEVO";

        return {
          id: os.numeroOrden || os.id.substring(0, 8).toUpperCase(),
          cliente: clienteLabel,
          clienteFull: os.cliente,
          servicioEspecifico: os.servicio?.nombre || "Servicio General",
          fecha: os.fechaVisita ? new Date(os.fechaVisita).toLocaleDateString() : "Sin fecha",
          hora: os.horaInicio ? new Date(os.horaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Sin hora",
          tecnico: os.tecnico?.user ? `${os.tecnico.user.nombre} ${os.tecnico.user.apellido}` : "Sin asignar",
          tecnicoId: os.tecnicoId,
          estadoServicio: displayStatus,
          urgencia: os.urgencia || "BAJA",
          empresaId: os.empresaId,
          raw: os,
        };
      });

      setServicios(mapped);

      const muniSet = new Set<string>();
      const creatorsMap = new Map<string, string>();
      const companiesMap = new Map<string, string>();
      const techniciansMap = new Map<string, string>();
      const typesSet = new Set<string>();

      (Array.isArray(data) ? data : []).forEach((os: OrdenServicioRaw) => {
        if (os.municipio) muniSet.add(os.municipio.trim().toUpperCase());
        if (os.creadoPor?.user) {
          const name = `${os.creadoPor.user.nombre} ${os.creadoPor.user.apellido}`.trim();
          if (name) creatorsMap.set(os.creadoPor.id, name);
        } else {
          creatorsMap.set("SISTEMA", "SISTEMA");
        }
        if (os.tecnico?.user) {
          const name = `${os.tecnico.user.nombre} ${os.tecnico.user.apellido}`.trim();
          if (name && os.tecnicoId) techniciansMap.set(os.tecnicoId, name);
        }
        if (os.empresa) {
          companiesMap.set(os.empresa.id, os.empresa.nombre);
        }
        if (os.tipoVisita) {
          typesSet.add(os.tipoVisita.trim().toUpperCase());
        }
      });

      setOptions(prev => {
        const mergedTechnicians = new Map();
        prev.tecnicos.forEach(t => mergedTechnicians.set(t.id, t.nombre));
        techniciansMap.forEach((nombre, id) => mergedTechnicians.set(id, nombre));

        return {
          ...prev,
          municipios: Array.from(new Set([...prev.municipios, ...muniSet])).sort(),
          creadores: Array.from(creatorsMap.entries()).map(([id, nombre]) => ({ id, nombre })),
          tecnicos: Array.from(mergedTechnicians.entries())
            .map(([id, nombre]) => ({ id, nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
          empresas: Array.from(companiesMap.entries()).map(([id, nombre]) => ({ id, nombre })),
          tiposVisita: Array.from(typesSet).sort(),
        };
      });

    } catch (error) {
      console.error("Error loading services", error);
      toast.error("Error al cargar las órdenes de servicio");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadConfig || isUploading) return;

    setIsUploading(true);
    const labelMap: Record<string, string> = {
      "facturaElectronica": "factura",
      "comprobantePago": "comprobante",
      "evidenciaPath": "evidencia"
    };
    const label = labelMap[uploadConfig.field] || "archivo";
    const toastId = toast.loading(`Subiendo ${label}...`);

    try {
      if (uploadConfig.field === "evidenciaPath") {
        const formData = new FormData();
        Array.from(files).forEach((file) => {
          formData.append("files", file);
        });

        const result = await addOrdenServicioEvidenciasAction(uploadConfig.id, formData);

        if (result.success) {
          toast.success(`${files.length} evidencia(s) subida(s) exitosamente`, { id: toastId });
          fetchServicios();
        } else {
          toast.error(result.error || `Error al subir las evidencias`, { id: toastId });
        }
      } else {
        const file = files[0]!;
        const folderMap: Record<string, StorageFolder> = {
          "facturaElectronica": "facturaOrdenServicio",
          "comprobantePago": "comprobanteOrdenServicio",
          "evidenciaPath": "EvidenciaOrdenServicio"
        };

        const folder = folderMap[uploadConfig.field] || 'EvidenciaOrdenServicio';
        const { fileId } = await uploadFile(file, folder);

        const result = await updateOrdenServicioAction(uploadConfig.id, {
          [uploadConfig.field]: fileId
        });

        if (result.success) {
          toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} subida exitosamente`, { id: toastId });
          fetchServicios();
        } else {
          toast.error(result.error || `Error al actualizar la orden`, { id: toastId });
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Error al subir el archivo`, { id: toastId });
    } finally {
      setIsUploading(false);
      setUploadConfig(null);
      if (e.target) e.target.value = "";
    }
  };

  const handleLiquidar = async () => {
    if (!selectedServicio) return;

    setIsUploading(true);
    const toastId = toast.loading("Liquidando servicio...");

    try {
      let comprobanteUrl = "";
      if (comprobanteFile) {
        const { fileId } = await uploadFile(comprobanteFile, 'comprobanteOrdenServicio');
        comprobanteUrl = fileId;
      }

      const processedBreakdown = liquidarData.breakdown.map(line => ({
        ...line,
        monto: parseFloat(line.monto.replace(/\./g, "")) || 0
      }));

      const result = await updateOrdenServicioAction(selectedServicio.raw.id, {
        desglosePago: processedBreakdown,
        observacionFinal: liquidarData.observacionFinal,
        fechaPago: liquidarData.fechaPago,
        comprobantePago: comprobanteUrl || undefined,
        estadoServicio: "LIQUIDADO"
      });

      if (result.success) {
        toast.success("Servicio liquidado exitosamente", { id: toastId });

        notifyLiquidationWebhookAction({
          telefono: selectedServicio.clienteFull.telefono,
          cliente: selectedServicio.cliente,
          fecha: selectedServicio.fecha,
          servicio: selectedServicio.servicioEspecifico,
        }).catch(err => console.error("Error notifying webhook:", err));

        setIsLiquidarModalOpen(false);
        setLiquidarData({
          breakdown: [{ metodo: "PENDIENTE", monto: "" }],
          observacionFinal: "",
          fechaPago: new Date().toISOString().split('T')[0]
        });
        setComprobanteFile(null);
        fetchServicios();
      } else {
        toast.error(result.error || "Error al liquidar el servicio", { id: toastId });
      }
    } catch (error) {
      console.error("Liquidation error:", error);
      toast.error("Error al procesar la liquidación", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const currentParams = new URLSearchParams(window.location.search);
    const currentSearch = currentParams.get("search") || "";

    if (currentSearch !== search) {
      const newParams = new URLSearchParams(currentParams.toString());
      if (search) {
        newParams.set("search", search);
      } else {
        newParams.delete("search");
      }
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    }
  }, [search, pathname, router]);

  useEffect(() => {
    fetchServicios();
    fetchOptions();
  }, [fetchServicios, fetchOptions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredServicios = servicios.filter((s: Servicio) => {
    const matchesSearch =
      s.cliente.toLowerCase().includes(search.toLowerCase()) ||
      s.servicioEspecifico.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.raw.id.toLowerCase().includes(search.toLowerCase());

    const matchesEstado = filters.estado === "all" || s.raw.estadoServicio === filters.estado;
    const matchesTecnico = filters.tecnico === "all" || s.tecnicoId === filters.tecnico;
    const matchesUrgencia = filters.urgencia === "all" || s.urgencia === filters.urgencia;
    const matchesCreador = filters.creador === "all" || (filters.creador === "SISTEMA" ? !s.raw.creadoPor : s.raw.creadoPor?.id === filters.creador);
    const matchesMunicipio = filters.municipio === "all" || s.raw.municipio?.toUpperCase() === filters.municipio;
    const matchesMetodoPago = filters.metodoPago === "all" || s.raw.metodoPagoId === filters.metodoPago;
    const matchesEmpresa = filters.empresa === "all" || s.raw.empresaId === filters.empresa;
    const matchesTipo = filters.tipo === "all" || s.raw.tipoVisita?.toUpperCase() === filters.tipo;

    let matchesFecha = true;
    if (filters.fechaInicio && s.raw.fechaVisita) {
      const visitDate = new Date(s.raw.fechaVisita);
      visitDate.setHours(0,0,0,0);
      const start = new Date(filters.fechaInicio);
      start.setHours(0,0,0,0);
      matchesFecha = matchesFecha && visitDate >= start;
    }
    if (filters.fechaFin && s.raw.fechaVisita) {
      const visitDate = new Date(s.raw.fechaVisita);
      visitDate.setHours(0,0,0,0);
      const end = new Date(filters.fechaFin);
      end.setHours(0,0,0,0);
      matchesFecha = matchesFecha && visitDate <= end;
    }

    return matchesSearch && matchesEstado && matchesTecnico && matchesUrgencia && matchesCreador && matchesMunicipio && matchesMetodoPago && matchesEmpresa && matchesTipo && matchesFecha;
  });

  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServicios = filteredServicios.slice(startIndex, startIndex + itemsPerPage);

  const stats = {
    total: servicios.length,
    programados: servicios.filter(s => s.estadoServicio === "PROGRAMADO").length,
    enProceso: servicios.filter(s => s.estadoServicio === "PROCESO" || s.estadoServicio === "EN PROCESO").length,
    liquidado: servicios.filter(s => s.estadoServicio === "LIQUIDADO").length,
    tecnicoFinalizado: servicios.filter(s => s.estadoServicio === "TECNICO_FINALIZO" || s.estadoServicio === "TECNICO FINALIZO" || s.estadoServicio === "TECNICO FINALIZADO").length,
    cancelados: servicios.filter(s => s.estadoServicio === "CANCELADO").length,
    sinConcretar: servicios.filter(s => s.estadoServicio === "SIN_CONCRETAR" || s.estadoServicio === "SIN CONCRETAR").length,
  };

  const handleCopy = (servicio: Servicio) => {
    const formattedValor = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(servicio.raw.valorCotizado || 0);
    const detalles = [servicio.raw.bloque && `Bloque: ${servicio.raw.bloque}`, servicio.raw.piso && `Piso: ${servicio.raw.piso}`, servicio.raw.unidad && `Unidad: ${servicio.raw.unidad}`].filter(Boolean).join(" - ") || "Sin detalles adicionales";
    const text = `ORDEN DE SERVICIO: #${servicio.id}\n*Cliente:* ${servicio.cliente}\n*Servicio:* ${servicio.servicioEspecifico}\n*Programación:* ${servicio.fecha} a las ${servicio.hora}\n*Técnico:* ${servicio.tecnico}\n*Estado:* ${servicio.estadoServicio}\n*Urgencia:* ${servicio.urgencia}\n*Dirección:* ${servicio.raw.direccionTexto || "No especificada"}\n*Link Maps:* ${servicio.raw.linkMaps || "N/A"}\n*Municipio:* ${servicio.raw.municipio || "N/A"}\n*Barrio:* ${servicio.raw.barrio || "N/A"}\n*Detalles:* ${detalles}\n*Valor Cotizado:* ${formattedValor}\n*Observaciones:* ${servicio.raw.observacion || "Sin observaciones"}`;
    navigator.clipboard.writeText(text).then(() => toast.success("Información copiada")).catch(() => toast.error("Error al copiar"));
  };

  const handleWhatsAppNotify = (servicio: Servicio) => {
    const rawPhone = servicio.clienteFull.telefono || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    if (!cleanPhone) { toast.error("El cliente no tiene un número de teléfono registrado"); return; }
    const finalPhone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;
    const empresaNombre = servicio.raw.empresa?.nombre || "CPM";
    const message = `Hola *${servicio.cliente}*, le saludamos de *${empresaNombre}*. Le recordamos su servicio de *${servicio.servicioEspecifico}* programado para:\n\n📅 *Fecha:* ${servicio.fecha}\n⏰ *Hora:* ${servicio.hora}\n📍 *Dirección:* ${servicio.raw.direccionTexto || "No especificada"}\n👤 *Técnico:* ${servicio.tecnico}`;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleNotifyOperator = async (servicio: Servicio) => {
    const tecnicoId = servicio.raw.tecnicoId;
    if (!tecnicoId) { toast.error("No hay un técnico asignado"); return; }
    const toastId = toast.loading(`Notificando al técnico...`);
    try {
      const ops = await getOperatorsAction(servicio.raw.empresaId);
      const operator = (Array.isArray(ops) ? ops : ops?.data || []).find((o: Operator) => o.id === tecnicoId);
      if (!operator?.telefono) { toast.error("El técnico no tiene teléfono registrado", { id: toastId }); return; }
      const os = servicio.raw;
      const dateObj = os.fechaVisita && os.horaInicio ? new Date(os.horaInicio) : new Date();
      const res = await notifyServiceOperatorWebhookAction({
        telefonoOperador: operator.telefono,
        numeroOrden: `#${os.numeroOrden || os.id.slice(0, 8).toUpperCase()}`,
        cliente: servicio.cliente,
        servicio: servicio.servicioEspecifico.toUpperCase(),
        programacion: `${dateObj.toLocaleDateString()} a las ${dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
        tecnico: operator.nombre,
        estado: os.estadoServicio || "NUEVO",
        urgencia: os.urgencia || "BAJA",
        direccion: os.direccionTexto || "N/A",
        linkMaps: os.linkMaps || "N/A",
        municipio: os.municipio || "N/A",
        barrio: os.barrio || "N/A",
        detalles: [os.bloque && `B: ${os.bloque}`, os.piso && `P: ${os.piso}`, os.unidad && `U: ${os.unidad}`].filter(Boolean).join(" - ") || "N/A",
        valorCotizado: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(os.valorCotizado || 0),
        metodosPago: os.metodoPago?.nombre || "Pendiente",
        idServicio: os.id,
        observaciones: os.observacion || "Sin observaciones"
      });
      if (res.success) toast.success("Técnico notificado", { id: toastId });
      else toast.error("Error al notificar", { id: toastId });
    } catch (_error) { toast.error("Error al procesar notificación", { id: toastId }); }
  };

  const isSixSeven = search === "67";

  return (
    <DashboardLayout overflowHidden>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes six-seven-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-40px); }
        }
        .animate-six-seven {
          animation: six-seven-bounce 0.4s infinite ease-in-out;
        }
      `}} />
      <div className={cn("flex flex-col h-full bg-background transition-all duration-500", isSixSeven && "animate-six-seven")}>
        <div className="shrink-0 py-10 px-6 lg:px-10 border-b border-border mb-8 bg-muted/30">
          <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
              <FileText className="h-5 w-5 text-[#01ADFB]" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase">Órdenes de <span className="text-[#01ADFB]">Servicio</span></h1>
              <p className="text-muted-foreground font-medium mt-1 text-[10px] uppercase tracking-widest">Control operativo y trazabilidad de servicios técnicos.</p>
            </div>
            <div className="md:ml-auto">
              <Button variant="outline" size="sm" onClick={() => setShowKPIs(!showKPIs)} className="h-10 px-4 rounded-xl border-border bg-card text-[10px] font-black uppercase tracking-widest gap-2">
                {showKPIs ? <><EyeOff className="h-4 w-4" /> Ocultar KPI</> : <><Eye className="h-4 w-4" /> Ver KPI</>}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-10 pb-10">
          <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col">
            {loading ? <ServiciosSkeleton showKPIs={showKPIs} /> : (
              <>
                {showKPIs && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 mb-6 shrink-0">
                    {[
                      { label: "Total", val: stats.total, icon: FileText, color: "bg-primary" },
                      { label: "Prog.", val: stats.programados, icon: Calendar, color: "bg-[#01ADFB]" },
                      { label: "Proceso", val: stats.enProceso, icon: Activity, color: "bg-[#01ADFB]" },
                      { label: "Liq.", val: stats.liquidado, icon: CheckCircle2, color: "bg-[#01ADFB]" },
                      { label: "Fin.", val: stats.tecnicoFinalizado, icon: CheckCircle2, color: "bg-primary" },
                      { label: "Can.", val: stats.cancelados, icon: XCircle, color: "bg-muted-foreground" },
                      { label: "S.C.", val: stats.sinConcretar, icon: AlertCircle, color: "bg-muted-foreground" },
                    ].map((item, i) => (
                      <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white", item.color)}><item.icon className="h-5 w-5" /></div>
                        <div><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{item.label}</p><p className="text-xl font-black text-foreground">{item.val}</p></div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex-1 min-h-0 flex flex-col bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                  <div className="px-8 py-6 border-b border-border flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-card shrink-0">
                    <div className="flex flex-1 items-center gap-3 max-w-2xl">
                      <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-[#01ADFB] transition-colors" />
                        <Input placeholder="Buscar servicios..." className="h-12 pl-12 rounded-xl border-none bg-muted focus:ring-2 focus:ring-[#01ADFB]/20 transition-all font-bold text-sm text-foreground" value={search} onChange={(e) => setSearch(e.target.value)} />
                      </div>
                      <button onClick={() => setShowFilters(!showFilters)} className={cn("h-12 px-5 rounded-xl bg-card border border-border text-muted-foreground font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all", showFilters && "bg-primary text-primary-foreground")}>
                        <Filter className="h-4 w-4" /> Filtros
                      </button>
                    </div>
                    <Link href="/dashboard/servicios/nuevo"><div className="flex items-center h-12 px-8 rounded-xl bg-[#01ADFB] text-white gap-3 shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95 cursor-pointer"><Plus className="h-5 w-5" /><span className="font-black uppercase tracking-widest text-[10px]">Nueva Orden</span></div></Link>
                  </div>

                  {showFilters && (
                    <div className="px-8 py-8 border-b border-border bg-muted/50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                          <div><h3 className="text-sm font-black uppercase text-foreground flex items-center gap-3"><Filter className="h-5 w-5 text-[#01ADFB]" /> Panel de Filtros</h3><p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">Refine los resultados de búsqueda</p></div>
                          <button onClick={() => setFilters({ estado: "all", tecnico: "all", urgencia: "all", creador: "all", municipio: "all", metodoPago: "all", empresa: "all", tipo: "all", fechaInicio: "", fechaFin: "" })} className="text-[10px] font-black uppercase text-muted-foreground hover:text-[#01ADFB] flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-card border border-border"><RotateCcw className="h-3.5 w-3.5" /> Reiniciar</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                          <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Creador</Label><Combobox value={filters.creador} onChange={(v) => setFilters(f => ({ ...f, creador: v }))} options={[{ value: "all", label: "TODOS LOS CREADORES" }, ...filterOptions.creadores.map(c => ({ value: c.id, label: c.nombre.toUpperCase() }))]} /></div>
                          <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Técnico</Label><Combobox value={filters.tecnico} onChange={(v) => setFilters(f => ({ ...f, tecnico: v }))} options={[{ value: "all", label: "TODOS LOS TECNICOS" }, ...filterOptions.tecnicos.map(t => ({ value: t.id, label: t.nombre.toUpperCase() }))]} /></div>
                          <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Municipio</Label><Combobox value={filters.municipio} onChange={(v) => setFilters(f => ({ ...f, municipio: v }))} options={[{ value: "all", label: "TODOS LOS MUNICIPIOS" }, ...filterOptions.municipios.map(m => ({ value: m, label: m.toUpperCase() }))]} /></div>
                          <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estado</Label><Combobox value={filters.estado} onChange={(v) => setFilters(f => ({ ...f, estado: v }))} options={[{ value: "all", label: "TODOS LOS ESTADOS" }, ...filterOptions.estados.map(e => ({ value: e.id, label: e.nombre.toUpperCase() }))]} /></div>
                          <div className="lg:col-span-2 space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Rango de Fechas</Label><div className="flex gap-3"><DatePicker date={filters.fechaInicio ? new Date(filters.fechaInicio + "T00:00:00") : undefined} onChange={(d) => setFilters(f => ({ ...f, fechaInicio: d ? d.toISOString().split('T')[0] : "" }))} className="flex-1 h-10 bg-background border-border" placeholder="INICIO" /><DatePicker date={filters.fechaFin ? new Date(filters.fechaFin + "T00:00:00") : undefined} onChange={(d) => setFilters(f => ({ ...f, fechaFin: d ? d.toISOString().split('T')[0] : "" }))} className="flex-1 h-10 bg-background border-border" placeholder="FIN" /></div></div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-border flex justify-end"><Button onClick={() => setShowFilters(false)} className="h-10 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest bg-foreground text-background shadow-lg hover:opacity-90">Finalizar y Cerrar</Button></div>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left border-collapse">
                        <thead><tr className="border-b border-border bg-muted/50 sticky top-0 z-10"><th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">ID Orden</th><th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Cliente / Servicio</th><th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Programación</th><th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Técnico</th><th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estado</th><th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Acciones</th></tr></thead>
                        <tbody className="divide-y divide-border">
                          {paginatedServicios.map((s) => (
                            <tr key={s.id} className="group hover:bg-muted/50 transition-colors">
                              <td className="px-8 py-6"><span className="font-mono text-xs font-black text-[#01ADFB] bg-[#01ADFB]/10 px-3 py-1.5 rounded-lg border border-[#01ADFB]/20">{s.id}</span></td>
                              <td className="px-8 py-6"><div className="space-y-1"><p className="font-black text-foreground tracking-tight uppercase">{s.cliente}</p><div className="flex items-center gap-2"><span className="text-[10px] font-bold text-muted-foreground uppercase">{s.servicioEspecifico}</span><span className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase", URGENCIA_STYLING[s.urgencia])}>{s.urgencia}</span></div></div></td>
                              <td className="px-8 py-6"><div className="space-y-1.5"><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> {s.fecha}</div><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {s.hora}</div></div></td>
                              <td className="px-8 py-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><User className="h-4 w-4 text-muted-foreground" /></div><span className="text-sm font-bold text-foreground uppercase">{s.tecnico}</span></div></td>
                              <td className="px-8 py-6"><span className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border shadow-sm", ESTADO_STYLING[s.estadoServicio] || ESTADO_STYLING["DEFAULT"])}>{s.estadoServicio}</span></td>
                              <td className="px-8 py-6 text-right"><div className="flex justify-end gap-2">
                                <DropdownMenu><DropdownMenuTrigger asChild><button className="h-10 w-10 rounded-xl bg-muted hover:bg-foreground hover:text-background text-muted-foreground transition-all flex items-center justify-center"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl bg-card border-border shadow-2xl">
                                    <DropdownMenuItem onClick={() => { setSelectedServicio(s); setIsModalOpen(true); }} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted"><Eye className="h-4 w-4 text-[#01ADFB]" /> VER DETALLES</DropdownMenuItem>
                                    <Link href={`/dashboard/servicios/${s.raw.id}/editar?returnTo=/dashboard/servicios`}><DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted"><Pencil className="h-4 w-4 text-amber-600" /> EDITAR ORDEN</DropdownMenuItem></Link>
                                    <DropdownMenuItem onClick={() => handleCopy(s)} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted"><Copy className="h-4 w-4 text-purple-600" /> COPIAR INFO</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleWhatsAppNotify(s)} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted"><Bell className="h-4 w-4 text-pink-500" /> RECORDATORIO WPP</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleNotifyOperator(s)} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted"><Send className="h-4 w-4 text-[#01ADFB]" /> ENVIAR A TECNICO</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setSelectedServicio(s); setIsVisitaModalOpen(true); }} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted"><MapPin className="h-4 w-4 text-emerald-500" /> EVIDENCIA DE VISITA</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => triggerUpload(s.raw.id, "facturaElectronica")} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted"><Upload className="h-4 w-4 text-blue-500" /> SUBIR FACTURA</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => triggerUpload(s.raw.id, "comprobantePago")} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted"><Receipt className="h-4 w-4 text-orange-500" /> SUBIR COMPROBANTE</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => triggerUpload(s.raw.id, "evidenciaPath")} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted"><ImageIcon className="h-4 w-4 text-indigo-500" /> SUBIR EVIDENCIAS</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {s.estadoServicio === "LIQUIDADO" ? (
                                      <DropdownMenuItem onClick={() => { setSelectedServicio(s); }} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-emerald-600 hover:bg-emerald-500/10"><CheckCircle2 className="h-4 w-4" /> VER LIQUIDACION</DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => { setSelectedServicio(s); setLiquidarData({ breakdown: [{ metodo: "EFECTIVO", monto: (s.raw.valorCotizado || "").toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") }], observacionFinal: s.raw.observacionFinal || "", fechaPago: new Date().toISOString().split('T')[0] }); setIsLiquidarModalOpen(true); }} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-emerald-600 hover:bg-emerald-500/10"><CreditCard className="h-4 w-4" /> LIQUIDAR SERVICIO</DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent></DropdownMenu>
                              </div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!loading && filteredServicios.length === 0 && <div className="py-32 text-center flex-1 flex flex-col justify-center items-center"><AlertCircle className="h-12 w-12 text-muted/30 mb-4" /><h2 className="text-xl font-black text-foreground uppercase">Sin resultados</h2><p className="text-muted-foreground font-medium">No se encontraron órdenes para su búsqueda.</p></div>}
                    <div className="px-8 py-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-black uppercase text-muted-foreground">Mostrando <span className="text-foreground">{Math.min(startIndex + 1, filteredServicios.length)}-{Math.min(startIndex + itemsPerPage, filteredServicios.length)}</span> de <span className="text-foreground">{filteredServicios.length}</span></span>
                      <div className="flex gap-2"><Button variant="outline" size="sm" className="h-8 rounded-xl border-border bg-background" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button><Button variant="outline" size="sm" className="h-8 rounded-xl border-border bg-background" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</Button></div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader><DialogTitle className="text-xl font-black uppercase text-foreground">Detalle de Orden</DialogTitle><DialogDescription className="text-muted-foreground">Información operativa completa.</DialogDescription></DialogHeader>
        {selectedServicio && (
          <div className="space-y-8 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-muted/50 rounded-2xl border border-border">
              <div className="space-y-1"><p className="text-[9px] font-black text-muted-foreground uppercase">ID Orden</p><p className="font-mono text-sm font-black text-[#01ADFB]">#{selectedServicio.id}</p></div>
              <div className="space-y-1"><p className="text-[9px] font-black text-muted-foreground uppercase">Urgencia</p><span className={cn("px-2 py-0.5 rounded text-[10px] font-black", URGENCIA_STYLING[selectedServicio.urgencia])}>{selectedServicio.urgencia}</span></div>
              <div className="space-y-1"><p className="text-[9px] font-black text-muted-foreground uppercase">Técnico</p><p className="text-xs font-bold text-foreground uppercase">{selectedServicio.tecnico}</p></div>
              <div className="space-y-1"><p className="text-[9px] font-black text-muted-foreground uppercase">Estado</p><span className={cn("text-[9px] font-black px-2 py-0.5 rounded border", ESTADO_STYLING[selectedServicio.estadoServicio] || ESTADO_STYLING["DEFAULT"])}>{selectedServicio.estadoServicio}</span></div>
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Información de Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-6 rounded-2xl border border-border">
                <div><p className="text-[9px] font-black text-muted-foreground uppercase">Cliente</p><p className="text-base font-black text-foreground uppercase">{selectedServicio.cliente}</p></div>
                <div><p className="text-[9px] font-black text-muted-foreground uppercase">Dirección</p><p className="text-sm font-bold text-foreground">{selectedServicio.raw.direccionTexto || "N/A"}</p></div>
                <div><p className="text-[9px] font-black text-muted-foreground uppercase">Teléfono</p><p className="text-sm font-bold text-foreground">{selectedServicio.clienteFull.telefono}</p></div>
                <div><p className="text-[9px] font-black text-muted-foreground uppercase">Municipio</p><p className="text-sm font-bold text-foreground uppercase">{selectedServicio.raw.municipio || "N/A"}</p></div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Datos del Servicio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-6 rounded-2xl border border-border">
                <div><p className="text-[9px] font-black text-muted-foreground uppercase">Servicio</p><p className="text-sm font-black text-[#01ADFB] uppercase">{selectedServicio.servicioEspecifico}</p></div>
                <div><p className="text-[9px] font-black text-muted-foreground uppercase">Programación</p><p className="text-sm font-bold text-foreground">{selectedServicio.fecha} a las {selectedServicio.hora}</p></div>
                <div className="col-span-2"><p className="text-[9px] font-black text-muted-foreground uppercase mb-2">Observaciones</p><div className="p-4 bg-background rounded-xl border border-border text-xs font-medium text-muted-foreground leading-relaxed italic">&quot;{selectedServicio.raw.observacion || "Sin observaciones registradas"}&quot;</div></div>
              </div>
            </div>
            <div className="flex gap-3 pt-4"><Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl font-black uppercase text-[10px] border-border bg-card">Cerrar Detalle</Button><Button onClick={() => router.push(`/dashboard/servicios/${selectedServicio.raw.id}/editar`)} className="flex-1 h-12 rounded-xl bg-[#01ADFB] text-white font-black uppercase text-[10px]">Editar Orden</Button></div>
          </div>
        )}
      </DialogContent></Dialog>

      <Dialog open={isLiquidarModalOpen} onOpenChange={setIsLiquidarModalOpen}><DialogContent className="max-w-2xl bg-background border-border">
        <DialogHeader><DialogTitle className="text-xl font-black uppercase text-foreground">Liquidar Servicio</DialogTitle><DialogDescription className="text-muted-foreground">Cierre financiero de la orden.</DialogDescription></DialogHeader>
        {selectedServicio && (
          <div className="space-y-6 mt-4">
            <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
              <div><p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Total a Recaudar</p><p className="text-2xl font-black text-emerald-600">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedServicio.raw.valorCotizado || 0)}</p></div>
              <CheckCircle2 className="h-10 w-10 text-emerald-500/30" />
            </div>
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Observación Final de Liquidación</Label>
              <textarea value={liquidarData.observacionFinal} onChange={(e) => setLiquidarData({ ...liquidarData, observacionFinal: e.target.value })} className="w-full min-h-[100px] p-4 rounded-2xl bg-muted border border-border text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Ej: Servicio realizado sin novedad, cliente paga completo..." />
            </div>
            <div className="flex gap-3"><Button variant="outline" onClick={() => setIsLiquidarModalOpen(false)} className="flex-1 h-12 rounded-xl border-border bg-card text-[10px] font-black uppercase">Cancelar</Button><Button onClick={handleLiquidar} className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] shadow-lg shadow-emerald-600/20">Confirmar y Cerrar Orden</Button></div>
          </div>
        )}
      </DialogContent></Dialog>

      <Dialog open={isVisitaModalOpen} onOpenChange={setIsVisitaModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase text-foreground">Evidencia de Visita</DialogTitle>
            <DialogDescription className="text-muted-foreground">Trazabilidad geográfica y fotográfica del servicio.</DialogDescription>
          </DialogHeader>
          {selectedServicio && (
            <div className="space-y-6 mt-4">
              {selectedServicio.raw.geolocalizaciones && selectedServicio.raw.geolocalizaciones.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {selectedServicio.raw.geolocalizaciones.map((geo, idx) => (
                    <div key={geo.id} className="p-6 bg-muted/30 rounded-3xl border border-border space-y-6">
                      <div className="flex items-center justify-between border-b border-border pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-foreground uppercase">Visita #{idx + 1}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{geo.membership.user.nombre} {geo.membership.user.apellido}</p>
                          </div>
                        </div>
                        {geo.linkMaps && (
                          <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl border-border bg-card text-[10px] font-black uppercase gap-2">
                            <a href={geo.linkMaps} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" /> Ver en Maps
                            </a>
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              <p className="text-[10px] font-black text-muted-foreground uppercase">Llegada</p>
                            </div>
                            <p className="text-xs font-bold text-foreground">{new Date(geo.llegada).toLocaleString()}</p>
                          </div>
                          <div className="aspect-video relative rounded-2xl border border-border bg-muted overflow-hidden flex items-center justify-center">
                            {geo.fotoLlegada ? (
                              <img src={`https://axistestst.supabase.co/storage/v1/object/public/EvidenciaOrdenServicio/${geo.fotoLlegada}`} alt="Foto Llegada" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center space-y-2">
                                <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Sin foto de llegada</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-red-500" />
                              <p className="text-[10px] font-black text-muted-foreground uppercase">Salida</p>
                            </div>
                            <p className="text-xs font-bold text-foreground">{geo.salida ? new Date(geo.salida).toLocaleString() : "Pendiente"}</p>
                          </div>
                          <div className="aspect-video relative rounded-2xl border border-border bg-muted overflow-hidden flex items-center justify-center">
                            {geo.fotoSalida ? (
                              <img src={`https://axistestst.supabase.co/storage/v1/object/public/EvidenciaOrdenServicio/${geo.fotoSalida}`} alt="Foto Salida" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center space-y-2">
                                <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Sin foto de salida</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-muted-foreground uppercase">Coordenadas</p>
                          <p className="font-mono text-xs font-bold text-foreground">{geo.latitud?.toFixed(6) || "N/A"}, {geo.longitud?.toFixed(6) || "N/A"}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[9px] font-black text-muted-foreground uppercase">Duración</p>
                          <p className="text-xs font-bold text-foreground">
                            {geo.salida ? (
                              `${Math.floor((new Date(geo.salida).getTime() - new Date(geo.llegada).getTime()) / (1000 * 60))} minutos`
                            ) : "En curso"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center bg-muted/20 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center">
                  <MapPin className="h-12 w-12 text-muted/30 mb-4" />
                  <h3 className="text-sm font-black text-foreground uppercase">Sin registros de geolocalización</h3>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase mt-1">El técnico no ha marcado su llegada a este servicio.</p>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setIsVisitaModalOpen(false)} className="h-12 px-8 rounded-xl font-black uppercase text-[10px] border-border bg-card">Cerrar Evidencias</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf,image/*" disabled={isUploading} />
    </DashboardLayout>
  );
}

export default function ServiciosPageWrapper() {
  return (
    <Suspense fallback={<ServiciosSkeleton />}>
      <ServiciosContent />
    </Suspense>
  );
}
