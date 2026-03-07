"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
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
  ExternalLink,
  Trash2,
  ChevronDown
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
import {
  confirmOrdenUpload,
  createSignedUploadUrl,
  getEstadoServicios,
  getMetodosPago,
  getMunicipalities,
  getOperators,
  getOrdenesServicio,
  getServiciosKpis,
  notifyLiquidationWebhook,
  notifyServiceOperatorWebhook,
  type ClienteDTO,
  type ServiciosKpis,
  updateOrdenServicio,
  uploadToSupabaseSignedUrl,
} from "./api";
import {
  createDashboardPreset,
  deleteDashboardPreset,
  listDashboardPresets,
  PRESET_COLOR_STYLES,
  type DashboardPreset,
  type DashboardPresetColorToken,
  updateDashboardPreset,
} from "../presets-api";

interface DesglosePago {
  metodo: string;
  monto: number;
  banco?: string;
  referencia?: string;
  observacion?: string;
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
  valorRepuestosTecnico?: number;
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

const PRESET_OPTIONS = [
  { key: "all", label: "TODOS" },
  { key: "HOY", label: "HOY" },
  { key: "MANANA", label: "MAÑANA" },
  { key: "SEMANA", label: "SEMANA" },
  { key: "VENCIDOS", label: "VENCIDOS" },
  { key: "SIN_TECNICO", label: "SIN TÉCNICO" },
  { key: "PENDIENTES_LIQUIDAR", label: "PEND. LIQUIDAR" },
] as const;

const CUSTOM_PRESET_COLORS: DashboardPresetColorToken[] = [
  "slate",
  "red",
  "orange",
  "amber",
  "emerald",
  "teal",
  "sky",
  "blue",
  "indigo",
  "pink",
];

const toLocalYmd = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
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
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Dirección</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Programación</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Técnico</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tipo</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estado</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-8 py-6"><Skeleton className="h-8 w-24 rounded-lg" /></td>
              <td className="px-8 py-6"><div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></td>
              <td className="px-8 py-6"><Skeleton className="h-4 w-32" /></td>
              <td className="px-8 py-6"><div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-20" /></div></td>
              <td className="px-8 py-6"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-4 w-32" /></div></td>
              <td className="px-8 py-6"><Skeleton className="h-6 w-20" /></td>
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
  const [activePreset, setActivePreset] = useState(searchParams.get("preset") || "all");
  const [kpis, setKpis] = useState<ServiciosKpis | null>(null);
  const [kpisLoading, setKpisLoading] = useState(false);
  const [customPresets, setCustomPresets] = useState<DashboardPreset[]>([]);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetForm, setPresetForm] = useState<{
    name: string;
    colorToken: DashboardPresetColorToken;
    isShared: boolean;
  }>({
    name: "",
    colorToken: "sky",
    isShared: false,
  });

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
        getEstadoServicios(empresaId),
        empresaId ? getOperators(empresaId) : Promise.resolve([]),
        getMetodosPago(empresaId),
        getMunicipalities(),
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
      const data = await getOrdenesServicio(empresaId);
      const ordenesData = (Array.isArray(data) ? data : []) as unknown as OrdenServicioRaw[];

      const mapped: Servicio[] = ordenesData.map((os: OrdenServicioRaw) => {
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

      ordenesData.forEach((os: OrdenServicioRaw) => {
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
      const kind =
        uploadConfig.field === "facturaElectronica"
          ? "facturaElectronica"
          : uploadConfig.field === "comprobantePago"
            ? "comprobantePago"
            : "evidencias";

      const uploadedPaths: string[] = [];
      for (const file of Array.from(files)) {
        const signed = await createSignedUploadUrl(uploadConfig.id, kind, file.name);
        await uploadToSupabaseSignedUrl(signed.path, signed.token, file);
        uploadedPaths.push(signed.path);
      }

      await confirmOrdenUpload(uploadConfig.id, kind, uploadedPaths);
      toast.success(
        uploadConfig.field === "evidenciaPath"
          ? `${uploadedPaths.length} evidencia(s) subida(s) exitosamente`
          : `${label.charAt(0).toUpperCase() + label.slice(1)} subida exitosamente`,
        { id: toastId },
      );
      fetchServicios();
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
        const signed = await createSignedUploadUrl(
          selectedServicio.raw.id,
          "comprobantePago",
          comprobanteFile.name,
        );
        await uploadToSupabaseSignedUrl(signed.path, signed.token, comprobanteFile);
        await confirmOrdenUpload(selectedServicio.raw.id, "comprobantePago", [signed.path]);
        comprobanteUrl = signed.path;
      }

      const processedBreakdown = liquidarData.breakdown.map(line => ({
        ...line,
        monto: parseFloat(line.monto.replace(/\./g, "")) || 0
      }));

      await updateOrdenServicio(selectedServicio.raw.id, {
        desglosePago: processedBreakdown,
        observacionFinal: liquidarData.observacionFinal,
        fechaPago: liquidarData.fechaPago,
        comprobantePago: comprobanteUrl || undefined,
        estadoServicio: "LIQUIDADO"
      });
      toast.success("Servicio liquidado exitosamente", { id: toastId });

      notifyLiquidationWebhook({
        telefono: selectedServicio.clienteFull.telefono || "",
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
    } catch (error) {
      console.error("Liquidation error:", error);
      toast.error("Error al procesar la liquidación", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const fetchKpis = useCallback(async () => {
    setKpisLoading(true);
    try {
      const empresaId = localStorage.getItem("current-enterprise-id") || undefined;
      const data = await getServiciosKpis({
        empresaId,
        search,
        estado: filters.estado,
        tecnicoId: filters.tecnico,
        urgencia: filters.urgencia,
        creadorId: filters.creador,
        municipio: filters.municipio,
        metodoPagoId: filters.metodoPago,
        tipoVisita: filters.tipo,
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        preset: activePreset,
      });
      setKpis(data);
    } catch (error) {
      console.error("Error loading KPI data", error);
    } finally {
      setKpisLoading(false);
    }
  }, [activePreset, filters, search]);

  const fetchCustomPresets = useCallback(async () => {
    try {
      const data = await listDashboardPresets("SERVICIOS");
      setCustomPresets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading custom presets", error);
    }
  }, []);

  const buildServiciosPresetSnapshot = () => ({
    search,
    filters,
    activePreset,
  });

  const applyCustomPreset = (preset: DashboardPreset) => {
    const payload = (preset.filters || {}) as {
      search?: string;
      filters?: typeof filters;
      activePreset?: string;
    };

    setSearch(payload.search || "");
    setFilters(payload.filters || {
      estado: "all",
      tecnico: "all",
      urgencia: "all",
      creador: "all",
      municipio: "all",
      metodoPago: "all",
      empresa: "all",
      tipo: "all",
      fechaInicio: "",
      fechaFin: "",
    });
    setActivePreset(payload.activePreset || "all");
    setCurrentPage(1);
  };

  const openCreatePresetModal = () => {
    setEditingPresetId(null);
    setPresetForm({
      name: "",
      colorToken: "sky",
      isShared: false,
    });
    setIsPresetModalOpen(true);
  };

  const openEditPresetModal = (preset: DashboardPreset) => {
    setEditingPresetId(preset.id);
    setPresetForm({
      name: preset.name,
      colorToken: preset.colorToken,
      isShared: preset.isShared,
    });
    setIsPresetModalOpen(true);
  };

  const handleSavePreset = async () => {
    if (!presetForm.name.trim()) {
      toast.error("El preset necesita un nombre");
      return;
    }

    try {
      if (editingPresetId) {
        await updateDashboardPreset(editingPresetId, {
          name: presetForm.name.trim(),
          colorToken: presetForm.colorToken,
          isShared: presetForm.isShared,
          filters: buildServiciosPresetSnapshot(),
        });
        toast.success("Preset actualizado");
      } else {
        await createDashboardPreset({
          module: "SERVICIOS",
          name: presetForm.name.trim(),
          colorToken: presetForm.colorToken,
          isShared: presetForm.isShared,
          filters: buildServiciosPresetSnapshot(),
        });
        toast.success("Preset creado");
      }
      setIsPresetModalOpen(false);
      fetchCustomPresets();
    } catch (error) {
      console.error("Error saving preset", error);
      toast.error("No fue posible guardar el preset");
    }
  };

  const handleDeletePreset = async (id: string) => {
    try {
      await deleteDashboardPreset(id);
      setCustomPresets((prev) => prev.filter((p) => p.id !== id));
      toast.success("Preset eliminado");
    } catch (error) {
      console.error("Error deleting preset", error);
      toast.error("No fue posible eliminar el preset");
    }
  };

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (search) nextParams.set("search", search);
    if (activePreset !== "all") nextParams.set("preset", activePreset);
    if (filters.estado !== "all") nextParams.set("estado", filters.estado);
    if (filters.tecnico !== "all") nextParams.set("tecnico", filters.tecnico);
    if (filters.urgencia !== "all") nextParams.set("urgencia", filters.urgencia);
    if (filters.creador !== "all") nextParams.set("creador", filters.creador);
    if (filters.municipio !== "all") nextParams.set("municipio", filters.municipio);
    if (filters.metodoPago !== "all") nextParams.set("metodoPago", filters.metodoPago);
    if (filters.empresa !== "all") nextParams.set("empresa", filters.empresa);
    if (filters.tipo !== "all") nextParams.set("tipo", filters.tipo);
    if (filters.fechaInicio) nextParams.set("fechaInicio", filters.fechaInicio);
    if (filters.fechaFin) nextParams.set("fechaFin", filters.fechaFin);

    const nextQuery = nextParams.toString();
    const currentQuery = window.location.search.replace(/^\?/, "");
    if (nextQuery !== currentQuery) {
      router.replace(`${pathname}?${nextQuery}`, { scroll: false });
    }
  }, [activePreset, filters, pathname, router, search]);

  useEffect(() => {
    fetchServicios();
    fetchOptions();
  }, [fetchServicios, fetchOptions]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  useEffect(() => {
    fetchCustomPresets();
  }, [fetchCustomPresets]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activePreset, filters, search]);

  const applyPreset = (preset: string) => {
    setActivePreset(preset);

    const now = new Date();
    const today = toLocalYmd(now);
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrow = toLocalYmd(tomorrowDate);
    const baseFilters = {
      estado: "all",
      tecnico: "all",
      urgencia: "all",
      creador: "all",
      municipio: "all",
      metodoPago: "all",
      empresa: "all",
      tipo: "all",
      fechaInicio: "",
      fechaFin: "",
    };

    if (preset === "HOY") {
      setFilters({ ...baseFilters, fechaInicio: today, fechaFin: today });
      return;
    }

    if (preset === "MANANA") {
      setFilters({ ...baseFilters, fechaInicio: tomorrow, fechaFin: tomorrow });
      return;
    }

    if (preset === "SEMANA") {
      const start = new Date(now);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setFilters({
        ...baseFilters,
        fechaInicio: toLocalYmd(start),
        fechaFin: toLocalYmd(end),
      });
      return;
    }

    if (preset === "SIN_TECNICO") {
      setFilters(baseFilters);
      return;
    }

    if (preset === "PENDIENTES_LIQUIDAR") {
      setFilters({ ...baseFilters, estado: "TECNICO_FINALIZO" });
      return;
    }

    if (preset === "VENCIDOS") {
      setFilters({ ...baseFilters, fechaFin: today });
      return;
    }

    setFilters(baseFilters);
  };

  const resetAllFilters = useCallback(() => {
    setSearch("");
    setActivePreset("all");
    setFilters({
      estado: "all",
      tecnico: "all",
      urgencia: "all",
      creador: "all",
      municipio: "all",
      metodoPago: "all",
      empresa: "all",
      tipo: "all",
      fechaInicio: "",
      fechaFin: "",
    });
    setCurrentPage(1);
    toast.info("Filtros restablecidos");
  }, []);

  const hasActiveFilters = search !== "" || 
    activePreset !== "all" || 
    filters.estado !== "all" || 
    filters.tecnico !== "all" || 
    filters.urgencia !== "all" || 
    filters.creador !== "all" || 
    filters.municipio !== "all" || 
    filters.metodoPago !== "all" || 
    filters.empresa !== "all" || 
    filters.tipo !== "all" || 
    filters.fechaInicio !== "" || 
    filters.fechaFin !== "";

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
    const isVencido =
      !!s.raw.fechaVisita &&
      new Date(s.raw.fechaVisita) < new Date(new Date().setHours(0, 0, 0, 0)) &&
      !["LIQUIDADO", "CANCELADO", "SIN_CONCRETAR", "SIN CONCRETAR"].includes(s.estadoServicio);
    const presetPass =
      activePreset === "all" ||
      (activePreset === "VENCIDOS" && isVencido) ||
      (activePreset === "SIN_TECNICO" && !s.tecnicoId) ||
      (activePreset === "PENDIENTES_LIQUIDAR" && s.raw.estadoServicio === "TECNICO_FINALIZO") ||
      ["HOY", "MANANA", "SEMANA"].includes(activePreset);

    return matchesSearch && matchesEstado && matchesTecnico && matchesUrgencia && matchesCreador && matchesMunicipio && matchesMetodoPago && matchesEmpresa && matchesTipo && matchesFecha && presetPass;
  });

  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServicios = filteredServicios.slice(startIndex, startIndex + itemsPerPage);

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
      const ops = await getOperators(servicio.raw.empresaId);
      const operator = (Array.isArray(ops) ? ops : []).find((o) => o.id === tecnicoId);
      if (!operator?.telefono) { toast.error("El técnico no tiene teléfono registrado", { id: toastId }); return; }
      const os = servicio.raw;
      const dateObj = os.fechaVisita && os.horaInicio ? new Date(os.horaInicio) : new Date();
      const operatorName = operator.nombre || `${operator.user?.nombre || ""} ${operator.user?.apellido || ""}`.trim() || "TECNICO";
      const res = await notifyServiceOperatorWebhook({
        telefonoOperador: operator.telefono,
        numeroOrden: `#${os.numeroOrden || os.id.slice(0, 8).toUpperCase()}`,
        cliente: servicio.cliente,
        servicio: servicio.servicioEspecifico.toUpperCase(),
        programacion: `${dateObj.toLocaleDateString()} a las ${dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
        tecnico: operatorName,
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
                      { label: "Total", val: kpis?.total ?? 0, icon: FileText, color: "bg-primary", preset: "all" },
                      { label: "Prog. Hoy", val: kpis?.programadosHoy ?? 0, icon: Calendar, color: "bg-[#01ADFB]", preset: "HOY" },
                      { label: "En Curso", val: kpis?.enCurso ?? 0, icon: Activity, color: "bg-[#01ADFB]", preset: "all" },
                      { label: "Vencidos", val: kpis?.vencidosSla ?? 0, icon: AlertCircle, color: "bg-muted-foreground", preset: "VENCIDOS" },
                      { label: "% SLA", val: `${(kpis?.cumplimientoSlaPct ?? 0).toFixed(1)}%`, icon: CheckCircle2, color: "bg-primary", preset: "all" },
                      { label: "Recaudo Hoy", val: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(kpis?.recaudoHoy ?? 0), icon: CreditCard, color: "bg-[#01ADFB]", preset: "HOY" },
                      { label: "Sin Evid.", val: kpis?.sinEvidencia ?? 0, icon: XCircle, color: "bg-muted-foreground", preset: "all" },
                    ].map((item, i) => (
                      <button key={i} onClick={() => applyPreset(item.preset)} disabled={kpisLoading} className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4 text-left hover:bg-muted/60 transition-colors disabled:opacity-60">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white", item.color)}><item.icon className="h-5 w-5" /></div>
                        <div><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{item.label}</p><p className="text-xl font-black text-foreground">{item.val}</p></div>
                      </button>
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
                      {hasActiveFilters && (
                        <button 
                          onClick={resetAllFilters} 
                          className="h-12 px-5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-destructive hover:text-white"
                        >
                          <RotateCcw className="h-4 w-4" /> Borrar Filtros
                        </button>
                      )}
                    </div>
                    <Link href="/dashboard/servicios/nuevo"><div className="flex items-center h-12 px-8 rounded-xl bg-[#01ADFB] text-white gap-3 shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95 cursor-pointer"><Plus className="h-5 w-5" /><span className="font-black uppercase tracking-widest text-[10px]">Nueva Orden</span></div></Link>
                  </div>
                  <div className="px-8 py-4 border-b border-border bg-card">
                    <div className="flex flex-wrap gap-2 items-center">
                      {PRESET_OPTIONS.map((preset) => (
                        <button
                          key={preset.key}
                          onClick={() => applyPreset(preset.key)}
                          className={cn(
                            "h-8 px-3 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors",
                            activePreset === preset.key
                              ? "bg-[#01ADFB] text-white border-[#01ADFB]"
                              : "bg-background text-muted-foreground border-border hover:bg-muted",
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                      {customPresets.map((preset) => (
                        <div key={preset.id} className="inline-flex items-center gap-1">
                          <button
                            onClick={() => applyCustomPreset(preset)}
                            className={cn(
                              "h-8 px-3 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors",
                              PRESET_COLOR_STYLES[preset.colorToken] || "border-border bg-background text-foreground",
                            )}
                          >
                            {preset.name}
                          </button>
                          <button
                            onClick={() => openEditPresetModal(preset)}
                            className="h-8 w-8 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
                            title="Editar preset"
                          >
                            <Pencil className="h-3.5 w-3.5 mx-auto" />
                          </button>
                          <button
                            onClick={() => handleDeletePreset(preset.id)}
                            className="h-8 w-8 rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive"
                            title="Eliminar preset"
                          >
                            <Trash2 className="h-3.5 w-3.5 mx-auto" />
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openCreatePresetModal}
                        className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider"
                      >
                        + Nuevo preset
                      </Button>
                    </div>
                  </div>

                  {showFilters && (
                    <div className="px-8 py-8 border-b border-border bg-muted/50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                          <div><h3 className="text-sm font-black uppercase text-foreground flex items-center gap-3"><Filter className="h-5 w-5 text-[#01ADFB]" /> Panel de Filtros</h3><p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">Refine los resultados de búsqueda</p></div>
                          <button onClick={() => { setActivePreset("all"); setFilters({ estado: "all", tecnico: "all", urgencia: "all", creador: "all", municipio: "all", metodoPago: "all", empresa: "all", tipo: "all", fechaInicio: "", fechaFin: "" }); }} className="text-[10px] font-black uppercase text-muted-foreground hover:text-[#01ADFB] flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-card border border-border"><RotateCcw className="h-3.5 w-3.5" /> Reiniciar</button>
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
                        <thead>
                          <tr className="border-b border-border bg-muted/50 sticky top-0 z-10">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">ID Orden</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Cliente / Servicio</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Dirección</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Programación</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Técnico</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tipo</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estado</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paginatedServicios.map((s) => (
                            <tr key={s.id} className="group hover:bg-muted/50 transition-colors">
                              <td className="px-8 py-6"><span className="font-mono text-xs font-black text-[#01ADFB] bg-[#01ADFB]/10 px-3 py-1.5 rounded-lg border border-[#01ADFB]/20">{s.id}</span></td>
                              <td className="px-8 py-6"><div className="space-y-1"><p className="font-black text-foreground tracking-tight uppercase">{s.cliente}</p><div className="flex items-center gap-2"><span className="text-[10px] font-bold text-muted-foreground uppercase">{s.servicioEspecifico}</span><span className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase", URGENCIA_STYLING[s.urgencia])}>{s.urgencia}</span></div></div></td>
                              <td className="px-8 py-6"><p className="text-xs font-bold text-muted-foreground truncate max-w-[200px] uppercase" title={s.raw.direccionTexto}>{s.raw.direccionTexto || "N/A"}</p></td>
                              <td className="px-8 py-6"><div className="space-y-1.5"><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> {s.fecha}</div><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {s.hora}</div></div></td>
                              <td className="px-8 py-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><User className="h-4 w-4 text-muted-foreground" /></div><span className="text-sm font-bold text-foreground uppercase">{s.tecnico}</span></div></td>
                              <td className="px-8 py-6"><span className="text-[10px] font-black text-muted-foreground uppercase bg-muted/50 px-2 py-1 rounded-md border border-border">{s.raw.tipoVisita || "N/A"}</span></td>
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

      <Dialog open={isPresetModalOpen} onOpenChange={setIsPresetModalOpen}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-foreground">
              {editingPresetId ? "Editar Preset" : "Nuevo Preset"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Guarda los filtros actuales con nombre, color y visibilidad.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Nombre</Label>
              <Input
                value={presetForm.name}
                onChange={(e) => setPresetForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Vencidos Zona Norte"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Color</Label>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPresetForm((prev) => ({ ...prev, colorToken: color }))}
                    className={cn(
                      "h-8 px-2 rounded-md border text-[9px] font-black uppercase",
                      PRESET_COLOR_STYLES[color],
                      presetForm.colorToken === color && "ring-2 ring-[#01ADFB]",
                    )}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Visibilidad</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPresetForm((prev) => ({ ...prev, isShared: false }))}
                  className={cn(
                    "h-9 rounded-lg border text-[10px] font-black uppercase",
                    !presetForm.isShared ? "bg-[#01ADFB] text-white border-[#01ADFB]" : "bg-background border-border text-muted-foreground",
                  )}
                >
                  Privado
                </button>
                <button
                  type="button"
                  onClick={() => setPresetForm((prev) => ({ ...prev, isShared: true }))}
                  className={cn(
                    "h-9 rounded-lg border text-[10px] font-black uppercase",
                    presetForm.isShared ? "bg-[#01ADFB] text-white border-[#01ADFB]" : "bg-background border-border text-muted-foreground",
                  )}
                >
                  Compartido
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsPresetModalOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-[#01ADFB] text-white" onClick={handleSavePreset}>
                Guardar Preset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}><DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden bg-background border-border">
        <div className="p-6 border-b shrink-0 bg-background relative">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-none tracking-tight text-foreground">Detalle Completo de Orden</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">Expediente maestro con toda la información del cliente y el servicio</DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          {selectedServicio && (
            <div className="space-y-8">
              {/* 1. INFORMACIÓN GENERAL */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Información General</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block">ID Servicio</span>
                    <span className="font-mono text-sm font-medium text-[#01ADFB]">{selectedServicio.raw.id.substring(0, 8).toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Número Orden</span>
                    <span className="font-medium">{selectedServicio.id || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Estado Actual</span>
                    <div className="mt-0.5">
                      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors uppercase", ESTADO_STYLING[selectedServicio.estadoServicio] || ESTADO_STYLING["DEFAULT"])}>
                        {selectedServicio.estadoServicio}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Fecha Creación</span>
                    <span className="font-medium text-sm">{new Date(selectedServicio.raw.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-xs text-slate-500 block">Creado Por</span>
                    <span className="font-medium text-sm uppercase">
                      {selectedServicio.raw.creadoPor?.user ? `${selectedServicio.raw.creadoPor.user.nombre} ${selectedServicio.raw.creadoPor.user.apellido}` : "SISTEMA"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Prioridad</span>
                    <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mt-1", URGENCIA_STYLING[selectedServicio.urgencia])}>
                      {selectedServicio.urgencia}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. CLIENTE Y CONTACTO */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Cliente y Contacto</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-xs text-slate-500 block">Nombre Completo / Razón Social</span>
                    <span className="font-medium text-base uppercase">{selectedServicio.cliente}</span>
                    <span className="text-[10px] text-[#01ADFB] font-bold block">{selectedServicio.clienteFull.tipoCliente}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Representante Legal</span>
                    <span className="font-medium uppercase text-sm">{selectedServicio.clienteFull.representanteLegal || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Documento / NIT</span>
                    <span className="font-medium uppercase">
                      {selectedServicio.clienteFull.tipoDocumento || "CC/NIT"} {selectedServicio.clienteFull.numeroDocumento || selectedServicio.clienteFull.nit || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Teléfono Principal</span>
                    <span className="font-medium">{selectedServicio.clienteFull.telefono || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Teléfono Secundario</span>
                    <span className="font-medium">{selectedServicio.clienteFull.telefono2 || "N/A"}</span>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-xs text-slate-500 block">Correo Electrónico</span>
                    <span className="font-medium text-sm lowercase">{selectedServicio.clienteFull.correo || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Score / Calificación</span>
                    <span className="font-bold text-[#01ADFB]">{selectedServicio.clienteFull.score ?? 0} pts</span>
                  </div>
                </div>
              </div>

              {/* 3. SEGMENTACIÓN DEL CLIENTE */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Perfil y Segmentación</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block">Segmento</span>
                    <span className="font-medium uppercase text-sm">{selectedServicio.clienteFull.segmento || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Subsegmento</span>
                    <span className="font-medium uppercase text-sm">{selectedServicio.clienteFull.subsegmento || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Nivel de Riesgo</span>
                    <span className="font-medium uppercase text-sm">{selectedServicio.clienteFull.nivelRiesgo || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Clasificación</span>
                    <span className="font-medium uppercase text-sm">{selectedServicio.clienteFull.clasificacion || "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-500 block">Actividad Económica</span>
                    <span className="font-medium uppercase text-sm">{selectedServicio.clienteFull.actividadEconomica || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Origen</span>
                    <span className="font-medium uppercase text-sm">{selectedServicio.clienteFull.origenCliente || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Ticket Promedio</span>
                    <span className="font-medium uppercase text-sm">{selectedServicio.clienteFull.ticketPromedio ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(selectedServicio.clienteFull.ticketPromedio) : "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Última Visita</span>
                    <span className="font-medium text-sm">{selectedServicio.clienteFull.ultimaVisita ? new Date(selectedServicio.clienteFull.ultimaVisita).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Próxima Visita</span>
                    <span className="font-medium text-sm text-[#01ADFB]">{selectedServicio.clienteFull.proximaVisita ? new Date(selectedServicio.clienteFull.proximaVisita).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Frecuencia Base</span>
                    <span className="font-medium uppercase text-sm">{selectedServicio.clienteFull.frecuenciaServicio ? `${selectedServicio.clienteFull.frecuenciaServicio} días` : "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* VEHÍCULO (SI APLICA) */}
              {selectedServicio.raw.vehiculo && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Vehículo Asociado</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <span className="text-xs text-slate-500 block">Placa</span>
                      <span className="font-black text-[#01ADFB] uppercase">{selectedServicio.raw.vehiculo.placa}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Marca</span>
                      <span className="font-medium uppercase text-sm">{selectedServicio.raw.vehiculo.marca || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Modelo</span>
                      <span className="font-medium uppercase text-sm">{selectedServicio.raw.vehiculo.modelo || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Color</span>
                      <span className="font-medium uppercase text-sm">{selectedServicio.raw.vehiculo.color || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Tipo</span>
                      <span className="font-medium uppercase text-sm">{selectedServicio.raw.vehiculo.tipo || "N/A"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. UBICACIÓN DEL SERVICIO */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Ubicación del Servicio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <span className="text-xs text-slate-500 block">Dirección Principal</span>
                    <span className="font-medium text-base flex items-center gap-2 uppercase">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      {selectedServicio.raw.direccionTexto || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Municipio / Depto</span>
                    <span className="font-medium uppercase">
                      {selectedServicio.raw.municipio || "N/A"} {selectedServicio.raw.departamento ? `/ ${selectedServicio.raw.departamento}` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Zona / Sector</span>
                    <span className="font-medium uppercase">{selectedServicio.raw.zona?.nombre || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Barrio</span>
                    <span className="font-medium uppercase">{selectedServicio.raw.barrio || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Detalles Interior (B/P/U)</span>
                    <span className="text-sm font-medium uppercase">
                      {[
                        selectedServicio.raw.bloque && `Bloque: ${selectedServicio.raw.bloque}`,
                        selectedServicio.raw.piso && `Piso: ${selectedServicio.raw.piso}`,
                        selectedServicio.raw.unidad && `Unidad: ${selectedServicio.raw.unidad}`
                      ].filter(Boolean).join(" - ") || "N/A"}
                    </span>
                  </div>
                  {selectedServicio.raw.linkMaps && (
                    <div className="md:col-span-2">
                      <a href={selectedServicio.raw.linkMaps} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 uppercase">
                        <ExternalLink className="h-3 w-3" /> Ver en Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. DETALLE DEL SERVICIO */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Detalle del Servicio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block">Empresa Prestadora</span>
                    <span className="font-medium uppercase">{selectedServicio.raw.empresa?.nombre || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Tipo de Visita</span>
                    <span className="font-medium uppercase">{selectedServicio.raw.tipoVisita || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Servicio Específico</span>
                    <span className="font-medium uppercase text-[#01ADFB]">{selectedServicio.servicioEspecifico}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Técnico Asignado</span>
                    <span className="font-medium uppercase">{selectedServicio.tecnico}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Tipo Facturación</span>
                    <span className="font-medium uppercase text-sm">{selectedServicio.raw.tipoFacturacion || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Frecuencia Sugerida</span>
                    <span className="font-medium uppercase text-sm">{selectedServicio.raw.frecuenciaSugerida ? `${selectedServicio.raw.frecuenciaSugerida} días` : "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* 6. PROGRAMACIÓN */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Programación y Tiempos</h3>
                <div className="grid grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div>
                    <span className="text-xs text-slate-500 block">Fecha Programada</span>
                    <span className="font-medium">{selectedServicio.fecha}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Hora Inicio</span>
                    <span className="font-medium">{selectedServicio.hora}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Hora Fin Estimada</span>
                    <span className="font-medium">
                      {selectedServicio.raw.horaFin ? new Date(selectedServicio.raw.horaFin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 7. ESTADO Y OBSERVACIONES */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Estado Operativo y Observaciones</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block">Nivel Infestación</span>
                    <span className="font-medium uppercase">{selectedServicio.raw.nivelInfestacion || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Cond. Higiene</span>
                    <span className="font-medium uppercase">{selectedServicio.raw.condicionesHigiene || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Cond. Local</span>
                    <span className="font-medium uppercase">{selectedServicio.raw.condicionesLocal || "N/A"}</span>
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <span className="text-xs text-slate-500 block mb-1">Observaciones Iniciales (Registro)</span>
                    <p className="text-sm bg-slate-50 p-3 rounded-md border border-slate-100 min-h-[60px] italic">
                      {selectedServicio.raw.observacion || "Sin observaciones registradas."}
                    </p>
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <span className="text-xs text-slate-500 block mb-1">Observación Final (Cierre Técnico)</span>
                    <p className="text-sm bg-slate-50 p-3 rounded-md border border-slate-100 min-h-[60px] italic">
                      {selectedServicio.raw.observacionFinal || "Sin observación final registrada."}
                    </p>
                  </div>
                </div>
              </div>

              {/* 8. INFORMACIÓN FINANCIERA */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Información Financiera y Pago</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block">Valor Cotizado</span>
                    <span className="font-bold text-slate-900 text-base">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(selectedServicio.raw.valorCotizado || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Repuestos (C/T)</span>
                    <span className="font-medium text-amber-600">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format((selectedServicio.raw.valorRepuestos || 0) + (selectedServicio.raw.valorRepuestosTecnico || 0))}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Valor Recaudado</span>
                    <span className="font-bold text-emerald-600 text-base">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(selectedServicio.raw.valorPagado || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Método de Pago</span>
                    <span className="font-medium uppercase text-sm">{selectedServicio.raw.metodoPago?.nombre || "PENDIENTE"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Estado Pago</span>
                    <span className="text-[10px] font-bold uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{selectedServicio.raw.estadoPago || "PENDIENTE"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Fecha Pago</span>
                    <span className="font-medium text-sm">{selectedServicio.raw.fechaPago ? new Date(selectedServicio.raw.fechaPago).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-500 block">Entidad / Ref. Pago</span>
                    <span className="font-medium text-sm uppercase">
                      {selectedServicio.raw.entidadFinanciera?.nombre || "N/A"} {selectedServicio.raw.referenciaPago ? `- ${selectedServicio.raw.referenciaPago}` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* 9. TRAZABILIDAD Y CIERRE */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1">Trazabilidad y Liquidación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block">Liquidado Por</span>
                    <span className="font-medium text-sm uppercase">
                      {selectedServicio.raw.liquidadoPor?.user ? `${selectedServicio.raw.liquidadoPor.user.nombre} ${selectedServicio.raw.liquidadoPor.user.apellido}` : "PENDIENTE"}
                    </span>
                    {selectedServicio.raw.liquidadoAt && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">{new Date(selectedServicio.raw.liquidadoAt).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block">Última Actualización</span>
                    <span className="font-medium text-sm uppercase">SISTEMA / USUARIO</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{new Date(selectedServicio.raw.updatedAt || selectedServicio.raw.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedServicio && (
          <div className="p-6 border-t shrink-0 bg-background flex gap-3 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-11 rounded-xl font-bold uppercase text-[11px] border-slate-200">
              Cerrar Expediente
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex-1 h-11 rounded-xl bg-[#01ADFB] hover:bg-[#01ADFB]/90 text-white font-bold uppercase text-[11px] shadow-lg shadow-[#01ADFB]/20 gap-2">
                  Editar Información <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl bg-card border-border shadow-2xl">
                <DropdownMenuItem onClick={() => router.push(`/dashboard/servicios/${selectedServicio.raw.id}/editar`)} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted">
                  <FileText className="h-4 w-4 text-[#01ADFB]" /> EDITAR ORDEN (SERVICIO)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/dashboard/clientes/${selectedServicio.raw.clienteId}/editar`)} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted">
                  <User className="h-4 w-4 text-emerald-600" /> EDITAR PERFIL CLIENTE
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                              <img src={geo.fotoLlegada} alt="Foto Llegada" className="w-full h-full object-cover" />
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
                              <img src={geo.fotoSalida} alt="Foto Salida" className="w-full h-full object-cover" />
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
