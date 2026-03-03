"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard";
import { 
  Input, 
  Button, 
  Skeleton,
  Select,
  Label,
  DatePicker,
  Combobox
} from "@/components/ui";
import {
  Search,
  Filter,
  RotateCcw,
  Download,
  FileSpreadsheet,
  FileText,
  FileIcon,
  Plus,
  Calendar,
  Clock,
  User,
  Camera,
  MoreHorizontal,
  Eye,
  EyeOff,
  Pencil,
  MapPin,
  Copy,
  Bell,
  Send,
  Receipt,
  Trash2,
  Info,
  Car,
  ExternalLink,
  CreditCard,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileUp,
  Navigation,
  ImageIcon
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
import { exportToExcel, exportToPDF, exportToWord } from "@/lib/utils/export-helper";
import { uploadFile, type StorageFolder } from "@/lib/supabase-storage";
import { FileManagement } from "./components/FileManagement";
import { EvidenceManagement } from "./components/EvidenceManagement";
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
  desglosePago?: any;
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
  "NUEVO": "bg-zinc-100 text-zinc-600 border-zinc-100 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-800/50",
  "PROCESO": "bg-amber-100 text-amber-700 border-zinc-100 dark:bg-zinc-900/30 dark:text-amber-400 dark:border-amber-800/50",
  "EN PROCESO": "bg-amber-100 text-amber-700 border-zinc-100 dark:bg-zinc-900/30 dark:text-amber-400 dark:border-amber-800/50",
  "CANCELADO": "bg-red-100 text-red-700 border-zinc-100 dark:bg-zinc-900/30 dark:text-red-400 dark:border-red-800/50",
  "PROGRAMADO": "bg-blue-100 text-blue-700 border-zinc-100 dark:bg-zinc-900/30 dark:text-blue-400 dark:border-blue-800/50",
  "LIQUIDADO": "bg-emerald-100 text-emerald-700 border-zinc-100 dark:bg-zinc-900/30 dark:text-emerald-400 dark:border-emerald-800/50",
  "TECNICO_FINALIZO": "bg-green-100 text-green-900 border-zinc-100 dark:bg-zinc-900/40 dark:text-green-300 dark:border-green-800/50",
  "TECNICO FINALIZO": "bg-green-100 text-green-900 border-zinc-100 dark:bg-zinc-900/40 dark:text-green-300 dark:border-green-800/50",
  "TECNICO FINALIZADO": "bg-green-100 text-green-900 border-zinc-100 dark:bg-zinc-900/40 dark:text-green-300 dark:border-green-800/50",
  "REPROGRAMADO": "bg-indigo-100 text-indigo-700 border-zinc-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50",
  "SIN_CONCRETAR": "bg-slate-100 text-slate-700 border-zinc-100 dark:bg-zinc-900/30 dark:text-slate-400 dark:border-slate-800/50",
  "SIN CONCRETAR": "bg-slate-100 text-slate-700 border-zinc-100 dark:bg-zinc-900/30 dark:text-slate-400 dark:border-slate-800/50",
  "DEFAULT": "bg-zinc-100 text-zinc-600 border-zinc-100 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-800/50",
};

const URGENCIA_STYLING: Record<string, string> = {
  "ALTA": "bg-red-500 text-white dark:text-zinc-200",
  "MEDIA": "bg-amber-500 text-white dark:text-zinc-200",
  "BAJA": "bg-emerald-500 text-white dark:text-zinc-200",
  "CRITICA": "bg-red-700 text-white dark:text-zinc-200",
};

function ServiciosSkeleton({ showKPIs = true }: { showKPIs?: boolean }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {showKPIs && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 shrink-0">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-4 animate-pulse">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100/60 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden">
        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 flex justify-between">
          <Skeleton className="h-12 w-1/2 rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-12 w-32 rounded-lg" />
            <Skeleton className="h-12 w-40 rounded-lg" />
          </div>
        </div>
        <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/50">
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">ID Orden</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Cliente / Servicio</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Programación</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Técnico</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Estado</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {[...Array(5)].map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-8 py-6">
                <Skeleton className="h-8 w-24 rounded-lg" />
              </td>
              <td className="px-8 py-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </td>
              <td className="px-8 py-6">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </td>
              <td className="px-8 py-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </td>
              <td className="px-8 py-6">
                <Skeleton className="h-8 w-28 rounded-full" />
              </td>
              <td className="px-8 py-6 text-right">
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
}

export default function ServiciosPage() {
  return (
    <Suspense fallback={<ServiciosSkeleton />}>
      <ServiciosContent />
    </Suspense>
  );
}

function ServiciosContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeoModalOpen, setIsGeoModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isLiquidarModalOpen, setIsLiquidarModalOpen] = useState(false);
  const [isLiquidationDetailsOpen, setIsLiquidationDetailsOpen] = useState(false);
  const [showKPIs, setShowKPIs] = useState(true);

  // Liquidation form state
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

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadConfig, setUploadConfig] = useState<{ id: string; field: "facturaElectronica" | "comprobantePago" | "evidenciaPath" } | null>(null);
  
  // Filter State
  const [filters, setFilters] = useState({
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

  // Pagination State
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
      
      // Core states from the system enum to ensure the filter always works
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
          
        // Map database status to requested readable status
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

      // Derive municipalities, creators, companies, types and technicians from data
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
        // Merge fetched technicians with those derived from orders
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

  const handleUploadClick = (servicio: Servicio, field: "facturaElectronica" | "comprobantePago" | "evidenciaPath") => {
    setUploadConfig({ id: servicio.raw.id, field });
    if (fileInputRef.current) {
      fileInputRef.current.multiple = field === "evidenciaPath";
      fileInputRef.current.click();
    }
  };

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
        // Usar la nueva API de evidencias para carga múltiple
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

  const handleGenericUpload = async (id: string, file: File, field: "facturaElectronica" | "comprobantePago" | "evidenciaPath") => {
    setIsUploading(true);
    const labelMap: Record<string, string> = {
      "facturaElectronica": "factura",
      "comprobantePago": "comprobante",
      "evidenciaPath": "evidencia"
    };
    const label = labelMap[field] || "archivo";
    const toastId = toast.loading(`Subiendo ${label}...`);

    try {
      const folderMap: Record<string, StorageFolder> = {
        "facturaElectronica": "facturaOrdenServicio",
        "comprobantePago": "comprobanteOrdenServicio",
        "evidenciaPath": "EvidenciaOrdenServicio"
      };
      
      const folder = folderMap[field] || 'EvidenciaOrdenServicio';
      const { fileId } = await uploadFile(file, folder);
      
      const result = await updateOrdenServicioAction(id, {
        [field]: fileId 
      });

      if (result.success) {
        toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} subida exitosamente`, { id: toastId });
        fetchServicios();
      } else {
        toast.error(result.error || `Error al actualizar la orden`, { id: toastId });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Error al subir el archivo`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEvidenceUpload = async (id: string, fileList: FileList) => {
    setIsUploading(true);
    const toastId = toast.loading(`Subiendo ${fileList.length} evidencia(s)...`);

    try {
      const formData = new FormData();
      Array.from(fileList).forEach((file) => {
        formData.append("files", file);
      });

      const result = await addOrdenServicioEvidenciasAction(id, formData);

      if (result.success) {
        toast.success(`${fileList.length} evidencia(s) subida(s) exitosamente`, { id: toastId });
        fetchServicios();
      } else {
        toast.error(result.error || `Error al subir las evidencias`, { id: toastId });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Error al subir las evidencias`, { id: toastId });
    } finally {
      setIsUploading(false);
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

      // Procesar el desglose para el API
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
        
        // Notificar via Webhook (n8n)
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

  const handleExport = async (format: 'pdf' | 'excel' | 'word') => {
    let headers = ["ID Orden", "Cliente", "Servicio", "Fecha", "Hora", "Técnico", "Estado", "Urgencia"];
    let data = filteredServicios.map((s: Servicio) => [
      s.id,
      s.cliente,
      s.servicioEspecifico,
      s.fecha,
      s.hora,
      s.tecnico,
      s.estadoServicio,
      s.urgencia
    ]);

    // Para Excel, expandimos la información a todas las columnas relevantes
    if (format === 'excel') {
      headers = [
        "ID Orden", 
        "Número Orden",
        "Cliente", 
        "Documento",
        "Teléfono",
        "Correo",
        "Servicio Específico", 
        "Tipo de Visita",
        "Fecha", 
        "Hora Inicio", 
        "Hora Fin",
        "Técnico", 
        "Estado", 
        "Urgencia",
        "Dirección",
        "Municipio",
        "Departamento",
        "Barrio",
        "Zona",
        "Detalles Ubicación",
        "Vehículo",
        "Nivel Infestación",
        "Cond. Higiene",
        "Cond. Local",
        "Observación",
        "Observación Final",
        "Valor Cotizado",
        "Valor Pagado",
        "Valor Repuestos",
        "Banco / Medio",
        "Referencia de Pago",
        "Fecha de Pago",
        "Estado de Pago",
        "Fecha Creación"
      ];

      data = filteredServicios.map((s: Servicio) => {
        const os = s.raw;
        const clienteDoc = os.cliente.tipoCliente === "EMPRESA" 
          ? (os.cliente.nit || "N/A") 
          : (os.cliente.numeroDocumento || "N/A");
        
        const ubicacionDetalle = [
          os.bloque && `Bloque: ${os.bloque}`,
          os.piso && `Piso: ${os.piso}`,
          os.unidad && `Unidad: ${os.unidad}`,
        ].filter(Boolean).join(" - ") || "N/A";

        const vehiculoInfo = os.vehiculo 
          ? `${os.vehiculo.placa}${os.vehiculo.marca ? ` - ${os.vehiculo.marca}` : ""}` 
          : "N/A";

        const formatCurrency = (val?: number) => 
          val ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val) : "$ 0";

        return [
          s.id,
          os.numeroOrden || "N/A",
          s.cliente,
          clienteDoc,
          os.cliente.telefono || "N/A",
          os.cliente.correo || "N/A",
          s.servicioEspecifico,
          os.tipoVisita || "N/A",
          s.fecha,
          s.hora,
          os.horaFin ? new Date(os.horaFin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A",
          s.tecnico,
          s.estadoServicio,
          s.urgencia,
          os.direccionTexto || "N/A",
          os.municipio || "N/A",
          os.departamento || "N/A",
          os.barrio || "N/A",
          os.zona?.nombre || "N/A",
          ubicacionDetalle,
          vehiculoInfo,
          os.nivelInfestacion || "N/A",
          os.condicionesHigiene || "N/A",
          os.condicionesLocal || "N/A",
          os.observacion || "N/A",
          os.observacionFinal || "N/A",
          formatCurrency(os.valorCotizado),
          formatCurrency(os.valorPagado),
          formatCurrency(os.valorRepuestos),
          os.metodoPago?.nombre || "N/A",
          os.referenciaPago || "N/A",
          os.fechaPago ? new Date(os.fechaPago).toLocaleDateString() : "N/A",
          os.estadoPago || "N/A",
          new Date(os.createdAt).toLocaleDateString()
        ];
      });
    }

    const exportParams = {
      headers,
      data,
      filename: `servicios_tenaxis_${new Date().getTime()}`,
      title: "REPORTE OPERATIVO DE ÓRDENES DE SERVICIO"
    };

    toast.info(`Generando archivo ${format.toUpperCase()}...`, {
      description: `Se exportarán ${filteredServicios.length} órdenes de servicio.`,
    });
    
    try {
      if (format === 'excel') exportToExcel(exportParams);
      else if (format === 'pdf') exportToPDF(exportParams);
      else if (format === 'word') await exportToWord(exportParams);

      toast.success(`${format.toUpperCase()} generado exitosamente`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Error al generar el archivo ${format.toUpperCase()}`);
    } finally {
      setShowExportMenu(false);
    }
  };

  const handleCopy = (servicio: Servicio) => {
    const formattedValor = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(servicio.raw.valorCotizado || 0);
    const detalles = [
      servicio.raw.bloque && `Bloque: ${servicio.raw.bloque}`,
      servicio.raw.piso && `Piso: ${servicio.raw.piso}`,
      servicio.raw.unidad && `Unidad: ${servicio.raw.unidad}`,
    ].filter(Boolean).join(" - ") || "Sin detalles adicionales";

    const text = `
ORDEN DE SERVICIO: #${servicio.id}
*Cliente:* ${servicio.cliente}
*Servicio:* ${servicio.servicioEspecifico}
*Programación:* ${servicio.fecha} a las ${servicio.hora}
*Técnico:* ${servicio.tecnico}
*Estado:* ${servicio.estadoServicio}
*Urgencia:* ${servicio.urgencia}
*Dirección:* ${servicio.raw.direccionTexto || "No especificada"}
*Link Maps:* ${servicio.raw.linkMaps || "N/A"}
*Municipio:* ${servicio.raw.municipio || "N/A"}
*Barrio:* ${servicio.raw.barrio || "N/A"}
*Detalles:* ${detalles}
*Valor Cotizado:* ${formattedValor}
*Observaciones:* ${servicio.raw.observacion || "Sin observaciones"}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      toast.success("Información copiada", {
        description: `Los detalles de la orden #${servicio.id} están en el portapapeles.`,
      });
    }).catch(() => {
      toast.error("Error al copiar al portapapeles");
    });
  };

  const handleWhatsAppNotify = (servicio: Servicio) => {
    // Limpiar el teléfono de caracteres no numéricos
    const rawPhone = servicio.clienteFull.telefono || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    
    if (!cleanPhone) {
      toast.error("El cliente no tiene un número de teléfono registrado");
      return;
    }

    // Asegurar que tenga el código de país (asumiendo +57 si tiene 10 dígitos)
    const finalPhone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;

    const empresaNombre = servicio.raw.empresa?.nombre || "Control de Plagas Medellin";
    const direccion = servicio.raw.direccionTexto || "No especificada";
    
    const message = `Hola *${servicio.cliente}*, le saludamos de *${empresaNombre}*. Le recordamos su servicio de *${servicio.servicioEspecifico}* programado para:\n\n📅 *Fecha:* ${servicio.fecha}\n⏰ *Hora:* ${servicio.hora}\n📍 *Dirección:* ${direccion}\n👤 *Técnico:* ${servicio.tecnico}\n\nCualquier inquietud, estamos atentos.`;

    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleNotifyOperator = async (servicio: Servicio) => {
    // 1. Validar que el técnico tenga teléfono. Para esto, necesitamos consultar los operadores
    // o confiar en que el objeto 'servicio.raw.tecnico' ya lo traiga (si lo agregamos al API).
    // Como lo agregamos al API, el objeto 'servicio.raw.tecnico' (que es un TenantMembership)
    // debería tener el user con su teléfono.
    
    // El API en findOperators devuelve tecnicoId que es el membershipId.
    // El objeto raw.tecnico es el TenantMembership.
    
    // Vamos a buscar los datos del técnico en la lista de operadores cargada para filtros
    // ya que esa lista se carga con getOperatorsAction que modificamos antes.
    
    // Pero espera, getOperatorsAction en la API devuelve:
    // { id: om.membership.id, nombre: ..., email: ..., telefono: ... }
    
    const empresaId = servicio.raw.empresaId;
    const tecnicoId = servicio.raw.tecnicoId;
    
    if (!tecnicoId) {
      toast.error("No hay un técnico asignado a esta orden");
      return;
    }

    const toastId = toast.loading(`Obteniendo datos del técnico...`);
    
    try {
      const ops = await getOperatorsAction(empresaId);
      const operadores = Array.isArray(ops) ? ops : ops?.data || [];
      const operator = operadores.find((o: any) => o.id === tecnicoId);

      console.log("[Webhook] Manual notification check...", { tecnicoId, operator });

      if (!operator?.telefono) {
        toast.error("El técnico asignado no tiene un número de teléfono registrado", { id: toastId });
        return;
      }

      toast.info(`Notificando al técnico ${operator.nombre}...`, { id: toastId });

      // Formatear datos para el webhook
      const os = servicio.raw;
      const dateObj = os.fechaVisita && os.horaInicio ? new Date(os.horaInicio) : new Date();
      const formattedDate = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'numeric', year: 'numeric' });
      const formattedTime = dateObj.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });

      // Formatear métodos de pago (del desglose si existe)
      let metodosFormatted = "Pendiente";
      if (os.desglosePago && Array.isArray(os.desglosePago)) {
        metodosFormatted = os.desglosePago
          .map((b: any) => `${b.metodo} ($ ${b.monto.toLocaleString()})`)
          .join(", ");
      } else if (os.metodoPago) {
        metodosFormatted = os.metodoPago.nombre;
      }

      const detallesUbicacion = [
        os.bloque && `Bloque: ${os.bloque}`,
        os.piso && `Piso: ${os.piso}`,
        os.unidad && `Unidad: ${os.unidad}`,
      ].filter(Boolean).join(" - ") || "Sin detalles adicionales";

      const valorFormatted = new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: 'COP', 
        maximumFractionDigits: 0 
      }).format(os.valorCotizado || 0);

      const res = await notifyServiceOperatorWebhookAction({
        telefonoOperador: operator.telefono,
        numeroOrden: `#${os.numeroOrden || os.id.slice(0, 8).toUpperCase()}`,
        cliente: servicio.cliente,
        servicio: servicio.servicioEspecifico.toUpperCase(),
        programacion: `${formattedDate} a las ${formattedTime}`,
        tecnico: operator.nombre,
        estado: os.estadoServicio || "NUEVO",
        urgencia: os.urgencia || "BAJA",
        direccion: os.direccionTexto || "N/A",
        linkMaps: os.linkMaps || "N/A",
        municipio: os.municipio || "N/A",
        barrio: os.barrio || "N/A",
        detalles: detallesUbicacion,
        valorCotizado: valorFormatted,
        metodosPago: metodosFormatted,
        idServicio: os.id,
        observaciones: os.observacion || "Sin observaciones"
      });

      if (res.success) {
        toast.success("Técnico notificado correctamente", { id: toastId });
      } else {
        toast.error("Error al enviar notificación al técnico", { id: toastId });
      }
    } catch (error) {
      console.error("Error notifying operator:", error);
      toast.error("Error crítico al procesar la notificación", { id: toastId });
    }
  };

    return (
      <DashboardLayout overflowHidden>
        <div className="flex flex-col h-full">
          {/* Sub-Header */}
          <div className="shrink-0 py-10 px-6 lg:px-10 border-b border-[#706F71]/10 mb-8 bg-[#F8FAFC]">
            <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#021359] text-white shadow-xl shadow-[#021359]/20">
                <FileText className="h-5 w-5 text-[#01ADFB]" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-black dark:text-white uppercase">
                  Órdenes de <span className="text-[#01ADFB]">Servicio</span>
                </h1>
                <p className="text-[#706F71] font-medium mt-1 text-[10px] uppercase tracking-widest">
                  Control operativo y trazabilidad de servicios técnicos.
                </p>
              </div>
              <div className="md:ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKPIs(!showKPIs)}
                  className="h-10 px-4 rounded-xl border-[#706F71]/20 bg-white text-[10px] font-black uppercase tracking-widest gap-2"
                >
                  {showKPIs ? <><EyeOff className="h-4 w-4" /> KPI</> : <><Eye className="h-4 w-4" /> KPI</>}
                </Button>
              </div>
            </div>
          </div>
  
          <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-10 pb-10">
            <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col">
              {loading ? (
                <ServiciosSkeleton showKPIs={showKPIs} />
              ) : (
                <>
                  {showKPIs && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 mb-6 shrink-0">
                      {[
                        { label: "Total", val: stats.total, icon: FileText, color: "#021359" },
                        { label: "Prog.", val: stats.programados, icon: Calendar, color: "#01ADFB" },
                        { label: "Proceso", val: stats.enProceso, icon: Activity, color: "#01ADFB" },
                        { label: "Liq.", val: stats.liquidado, icon: CheckCircle2, color: "#01ADFB" },
                        { label: "Fin.", val: stats.tecnicoFinalizado, icon: CheckCircle2, color: "#021359" },
                        { label: "Can.", val: stats.cancelados, icon: XCircle, color: "#706F71" },
                        { label: "S.C.", val: stats.sinConcretar, icon: AlertCircle, color: "#706F71" },
                      ].map((item, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-[#706F71]/10 shadow-sm flex items-center gap-4">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white")} style={{ backgroundColor: item.color }}>
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-[#706F71] uppercase tracking-widest">{item.label}</p>
                            <p className="text-xl font-black text-black">{item.val}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
  
                  <div className="flex-1 min-h-0 flex flex-col bg-white rounded-3xl border border-[#706F71]/10 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-[#706F71]/5 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white shrink-0">
                      <div className="flex flex-1 items-center gap-3 max-w-2xl">
                        <div className="relative flex-1 group">
                          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#706F71] group-focus-within:text-[#01ADFB] transition-colors" />
                          <Input 
                            placeholder="Buscar servicios..." 
                            className="h-12 pl-12 rounded-xl border-none bg-[#706F71]/5 focus:ring-2 focus:ring-[#01ADFB]/20 transition-all font-bold text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </div>
                        <button onClick={() => setShowFilters(!showFilters)} className={cn("h-12 px-5 rounded-xl bg-white border border-[#706F71]/20 text-[#706F71] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all", showFilters && "bg-[#021359] text-white")}>
                          <Filter className="h-4 w-4" /> Filtros
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link href="/dashboard/servicios/nuevo">
                          <div className="flex items-center h-12 px-8 rounded-xl bg-[#01ADFB] text-white gap-3 shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                            <Plus className="h-5 w-5" />
                            <span className="font-black uppercase tracking-widest text-[10px]">Nueva Orden</span>
                          </div>
                        </Link>
                      </div>
                    </div>

                    {/* Collapsible Filter Panel */}
                    {showFilters && (
                      <div className="px-8 py-8 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20 animate-in fade-in slide-in-from-top-2 duration-300 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="max-w-7xl mx-auto">
                          <div className="flex items-center justify-between mb-8">
                            <div>
                              <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-3">
                                <Filter className="h-5 w-5 text-azul-1" /> Panel de Filtros Avanzados
                              </h3>
                              <p className="text-[10px] font-medium text-zinc-500 mt-1 uppercase tracking-wider">
                                Refine los resultados de la búsqueda operativa
                              </p>
                            </div>
                            <button 
                              onClick={() => setFilters({ 
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
                              })}
                              className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-azul-1 flex items-center gap-2 transition-colors px-4 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Creador</Label>
                              <Combobox 
                                value={filters.creador} 
                                onChange={(val) => setFilters(f => ({ ...f, creador: val }))}
                                options={[
                                  { value: "all", label: "TODOS LOS CREADORES" },
                                  ...filterOptions.creadores.map(c => ({ value: c.id, label: c.nombre.toUpperCase() }))
                                ]}
                                className="h-10 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Técnico</Label>
                              <Combobox 
                                value={filters.tecnico} 
                                onChange={(val) => setFilters(f => ({ ...f, tecnico: val }))}
                                options={[
                                  { value: "all", label: "TODOS LOS TECNICOS" },
                                  ...filterOptions.tecnicos.map(tec => ({ value: tec.id, label: tec.nombre.toUpperCase() }))
                                ]}
                                className="h-10 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Municipio</Label>
                              <Combobox 
                                value={filters.municipio} 
                                onChange={(val) => setFilters(f => ({ ...f, municipio: val }))}
                                options={[
                                  { value: "all", label: "TODOS LOS MUNICIPIOS" },
                                  ...filterOptions.municipios.map(m => ({ value: m, label: m.toUpperCase() }))
                                ]}
                                className="h-10 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Estado</Label>
                              <Combobox 
                                value={filters.estado} 
                                onChange={(val) => setFilters(f => ({ ...f, estado: val }))}
                                options={[
                                  { value: "all", label: "TODOS LOS ESTADOS" },
                                  ...filterOptions.estados.map(est => ({ value: est.id, label: est.nombre.toUpperCase() }))
                                ]}
                                className="h-10 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Empresa</Label>
                              <Combobox 
                                value={filters.empresa} 
                                onChange={(val) => setFilters(f => ({ ...f, empresa: val }))}
                                options={[
                                  { value: "all", label: "TODAS LAS EMPRESAS" },
                                  ...filterOptions.empresas.map(emp => ({ value: emp.id, label: emp.nombre.toUpperCase() }))
                                ]}
                                className="h-10 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tipo Visita</Label>
                              <Combobox 
                                value={filters.tipo} 
                                onChange={(val) => setFilters(f => ({ ...f, tipo: val }))}
                                options={[
                                  { value: "all", label: "TODOS TIPOS DE VISITA" },
                                  ...filterOptions.tiposVisita.map(t => ({ value: t, label: t.toUpperCase() }))
                                ]}
                                className="h-10 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Medio Pago</Label>
                              <Combobox 
                                value={filters.metodoPago} 
                                onChange={(val) => setFilters(f => ({ ...f, metodoPago: val }))}
                                options={[
                                  { value: "all", label: "TODOS LOS MEDIOS DE PAGO" },
                                  ...filterOptions.metodosPago.map(mp => ({ value: mp.id, label: mp.nombre.toUpperCase() }))
                                ]}
                                className="h-10 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Urgencia</Label>
                              <Combobox 
                                value={filters.urgencia} 
                                onChange={(val) => setFilters(f => ({ ...f, urgencia: val }))}
                                options={[
                                  { value: "all", label: "TODAS LAS URGENCIAS" },
                                  { value: "ALTA", label: "ALTA" },
                                  { value: "MEDIA", label: "MEDIA" },
                                  { value: "BAJA", label: "BAJA" },
                                  { value: "CRITICA", label: "CRÍTICA" },
                                ]}
                                className="h-10 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                              />
                            </div>

                            <div className="lg:col-span-2 space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Rango de Fechas</Label>
                              <div className="flex items-center gap-3">
                                <DatePicker
                                  date={filters.fechaInicio ? new Date(filters.fechaInicio + "T00:00:00") : undefined}
                                  onChange={(date) => setFilters(f => ({ ...f, fechaInicio: date ? date.toISOString().split('T')[0] : "" }))}
                                  className="flex-1 h-10 bg-white dark:bg-zinc-900 border-zinc-300 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                                  placeholder="FECHA INICIAL"
                                />
                                <span className="text-zinc-400 text-xs">al</span>
                                <DatePicker
                                  date={filters.fechaFin ? new Date(filters.fechaFin + "T00:00:00") : undefined}
                                  onChange={(date) => setFilters(f => ({ ...f, fechaFin: date ? date.toISOString().split('T')[0] : "" }))}
                                  className="flex-1 h-10 bg-white dark:bg-zinc-900 border-zinc-300 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                                  placeholder="FECHA FINAL"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-end">
                            <Button 
                              onClick={() => setShowFilters(false)}
                              className="h-10 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/10 dark:shadow-none hover:opacity-90 transition-all"
                            >
                              Finalizar y Cerrar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tabla de Servicios con Scroll y Paginación */}
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/50">
                              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">ID Orden</th>
                              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Cliente / Servicio</th>
                              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Programación</th>
                              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Técnico</th>
                              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Estado</th>
                              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                            {paginatedServicios.map((servicio: Servicio) => (
                              <tr key={servicio.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                <td className="px-8 py-6">
                                  <span className="font-mono text-xs font-black text-[var(--color-azul-1)] bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                                    {servicio.id}
                                  </span>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="space-y-1">
                                    <p className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{servicio.cliente}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{servicio.servicioEspecifico}</span>
                                      <span className={cn(
                                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter",
                                        URGENCIA_STYLING[servicio.urgencia]
                                      )}>
                                        {servicio.urgencia}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                      {servicio.fecha}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                      {servicio.hora}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                      <User className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{servicio.tecnico}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <span className={cn(
                                    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                    ESTADO_STYLING[servicio.estadoServicio] || ESTADO_STYLING["DEFAULT"]
                                  )}>
                                    <div className="h-1.5 w-1.5 rounded-full bg-current" />
                                    {servicio.estadoServicio}
                                  </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => handleUploadClick(servicio, "evidenciaPath" as any)}
                                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-500 hover:bg-pink-100 dark:bg-pink-900/20 dark:hover:bg-pink-900/40 transition-all border border-pink-100 dark:border-pink-900/50"
                                      title="Subir Evidencia"
                                    >
                                      <Camera className="h-5 w-5" />
                                    </button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-400 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all">
                                          <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                      </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl">
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setSelectedServicio(servicio);
                                          setIsModalOpen(true);
                                        }}
                                        className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400"
                                      >
                                        <Eye className="h-4 w-4" /> VER DETALLES
                                      </DropdownMenuItem>
                                      <Link href={`/dashboard/servicios/${servicio.raw.id}/editar`}>
                                        <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400">
                                          <Pencil className="h-4 w-4" /> EDITAR ORDEN
                                        </DropdownMenuItem>
                                      </Link>
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setSelectedServicio(servicio);
                                          setIsGeoModalOpen(true);
                                        }}
                                        className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400"
                                      >
                                        <MapPin className="h-4 w-4 text-blue-500" /> REGISTRO DE VISITAS
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleCopy(servicio)}
                                        className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400"
                                      >
                                        <Copy className="h-4 w-4 text-amber-500" /> COPIAR
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />
                                      
                                      <DropdownMenuItem 
                                        onClick={() => handleWhatsAppNotify(servicio)}
                                        className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400"
                                      >
                                        <Bell className="h-4 w-4 text-purple-500" /> NOTIFICAR AL CLIENTE
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleNotifyOperator(servicio)}
                                        className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400"
                                      >
                                        <Send className="h-4 w-4 text-azul-1" /> ENVIAR AL TÉCNICO
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />
                                      
                                      <FileManagement 
                                        label="Factura"
                                        path={servicio.raw.facturaElectronica || servicio.raw.facturaPath}
                                        onUpload={(file) => handleGenericUpload(servicio.raw.id, file, "facturaElectronica")}
                                        icon={FileText}
                                        iconColor="text-orange-500"
                                        isUploading={isUploading}
                                      />

                                      <FileManagement 
                                        label="Comprobante"
                                        path={servicio.raw.comprobantePago}
                                        onUpload={(file) => handleGenericUpload(servicio.raw.id, file, "comprobantePago")}
                                        icon={Receipt}
                                        iconColor="text-blue-600"
                                        isUploading={isUploading}
                                      />

                                      <EvidenceManagement 
                                        id={servicio.raw.id}
                                        evidenciaPath={servicio.raw.evidenciaPath}
                                        evidencias={servicio.raw.evidencias}
                                        onUpload={(files) => handleEvidenceUpload(servicio.raw.id, files)}
                                        isUploading={isUploading}
                                      />

                                      <DropdownMenuSeparator />

                                      {servicio.estadoServicio === "LIQUIDADO" ? (
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            setSelectedServicio(servicio);
                                            setIsLiquidationDetailsOpen(true);
                                          }}
                                          className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-emerald-600 dark:text-emerald-400"
                                        >
                                          <CheckCircle2 className="h-4 w-4" /> VER LIQUIDACIÓN
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem 
                                          onClick={() => {
                                                                                      setSelectedServicio(servicio);
                                                                                      const initialAmount = (servicio.raw.valorCotizado || "").toString();
                                                                                      const formattedAmount = initialAmount.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                                                                      
                                                                                      setLiquidarData({
                                                                                        breakdown: [{ metodo: "EFECTIVO", monto: formattedAmount }],
                                                                                        observacionFinal: servicio.raw.observacionFinal || "",
                                                                                        fechaPago: servicio.raw.fechaPago ? new Date(servicio.raw.fechaPago).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                                                                      });
                                                                                      setIsLiquidarModalOpen(true);
                                            
                                          }}
                                          className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-zinc-600 dark:text-zinc-400"
                                        >
                                          <FileText className="h-4 w-4 text-emerald-500" /> LIQUIDAR
                                        </DropdownMenuItem>
                                      )}
                                      
                                      <DropdownMenuSeparator />
                                      
                                      <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold text-red-600 hover:text-red-600 hover:bg-red-50 cursor-pointer">
                                        <Trash2 className="h-4 w-4" /> ELIMINAR
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
  
                      {!loading && filteredServicios.length === 0 && (
                        <div className="py-32 text-center flex-1 flex flex-col justify-center">
                          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-800 mb-6">
                            <AlertCircle className="h-12 w-12 text-zinc-300" />
                          </div>
                          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">Sin resultados</h2>
                          <p className="text-zinc-500 mt-2 font-medium">No se encontraron órdenes que coincidan con su búsqueda.</p>
                        </div>
                      )}
  
                      {/* Paginación */}
                      <div className="px-8 py-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-300">
                          Mostrando <span className="text-zinc-900 dark:text-zinc-100">{Math.min(startIndex + 1, filteredServicios.length)}</span> - <span className="text-zinc-900 dark:text-zinc-100">{Math.min(startIndex + itemsPerPage, filteredServicios.length)}</span> de <span className="text-zinc-900 dark:text-zinc-100">{filteredServicios.length}</span> resultados
                        </span>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-xl text-xs font-bold" 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          >
                            Anterior
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-xl text-xs font-bold" 
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          >
                            Siguiente
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Detalle Completo de Orden</DialogTitle>
            <DialogDescription className="font-medium">
              Información detallada del servicio registrado
            </DialogDescription>
          </DialogHeader>

          {selectedServicio && (
            <div className="space-y-8 mt-2">
              {/* 1. Información General */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800/50 pb-2 flex items-center gap-2">
                  <Info className="h-3 w-3" /> Información General
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">ID Servicio</span>
                    <span className="font-mono text-sm font-black text-azul-1 dark:text-zinc-300">#{selectedServicio.raw.id.substring(0, 8).toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Número Orden</span>
                    <span className="font-black text-sm">{selectedServicio.raw.numeroOrden || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Estado Actual</span>
                    <div className="mt-1">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                        ESTADO_STYLING[selectedServicio.estadoServicio] || ESTADO_STYLING["DEFAULT"]
                      )}>
                        {selectedServicio.estadoServicio}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Fecha Creación</span>
                    <span className="font-bold text-sm">{new Date(selectedServicio.raw.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Creado Por</span>
                    <span className="font-bold text-sm">
                      {selectedServicio.raw.creadoPor?.user 
                        ? `${selectedServicio.raw.creadoPor.user.nombre} ${selectedServicio.raw.creadoPor.user.apellido}`
                        : "Sistema"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Cliente y Contacto */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800/50 pb-2 flex items-center gap-2">
                  <User className="h-3 w-3" /> Cliente y Contacto
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-zinc-50/50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Nombre Completo</span>
                    <span className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                      {selectedServicio.cliente}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Documento</span>
                    <span className="font-bold text-sm">
                      {selectedServicio.clienteFull.tipoDocumento || (selectedServicio.clienteFull.tipoCliente === "EMPRESA" ? "NIT" : "CC")} {selectedServicio.clienteFull.nit || selectedServicio.clienteFull.numeroDocumento || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Teléfono</span>
                    <span className="font-bold text-sm">{selectedServicio.clienteFull.telefono}</span>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Correo Electrónico</span>
                    <span className="font-bold text-sm text-azul-1 dark:text-claro-azul-4 truncate">{selectedServicio.clienteFull.correo || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* 3. Ubicación del Servicio */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800/50 pb-2 flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Ubicación del Servicio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                  <div className="md:col-span-2">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">
                      {selectedServicio.raw.vehiculoId && !selectedServicio.raw.municipio ? "Vehículo" : "Dirección Principal"}
                    </span>
                    <span className="font-black text-base flex items-center gap-3 text-zinc-900 dark:text-zinc-100">
                      {selectedServicio.raw.vehiculoId && !selectedServicio.raw.municipio ? (
                        <Car className="h-5 w-5 text-purple-500" />
                      ) : (
                        <MapPin className="h-5 w-5 text-azul-1" />
                      )}
                      {selectedServicio.raw.direccionTexto || "No especificada"}
                    </span>
                    {selectedServicio.raw.linkMaps && selectedServicio.raw.linkMaps !== "No Concretado" && (
                      <div className="mt-3">
                        <a 
                          href={selectedServicio.raw.linkMaps.startsWith('http') ? selectedServicio.raw.linkMaps : `https://${selectedServicio.raw.linkMaps}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-azul-1 hover:text-blue-700 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ver en Google Maps
                        </a>
                      </div>
                    )}
                  </div>

                  {selectedServicio.raw.municipio && (
                    <>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Municipio / Depto</span>
                        <span className="font-bold text-sm uppercase">
                          {selectedServicio.raw.municipio}
                          {selectedServicio.raw.departamento && `, ${selectedServicio.raw.departamento}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Zona / Barrio</span>
                        <span className="font-bold text-sm uppercase">
                          {selectedServicio.raw.zona?.nombre || "N/A"}
                          {selectedServicio.raw.barrio && ` / ${selectedServicio.raw.barrio}`}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Detalles Interior</span>
                        <span className="font-bold text-sm uppercase tracking-tight text-zinc-700 dark:text-zinc-300">
                          {[
                            selectedServicio.raw.bloque && `Bloque: ${selectedServicio.raw.bloque}`,
                            selectedServicio.raw.piso && `Piso: ${selectedServicio.raw.piso}`,
                            selectedServicio.raw.unidad && `Unidad: ${selectedServicio.raw.unidad}`,
                          ].filter(Boolean).join(" - ") || "Sin detalles adicionales"}
                        </span>
                      </div>
                    </>
                  )}

                  {selectedServicio.raw.vehiculoId && selectedServicio.raw.vehiculo && (
                    <div className="md:col-span-2 border-t border-zinc-100 dark:border-zinc-100 pt-4 mt-2 grid grid-cols-2 gap-6">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Placa / Marca / Modelo</span>
                        <span className="font-black text-sm uppercase text-purple-600 dark:text-purple-400">
                          {selectedServicio.raw.vehiculo.placa} {selectedServicio.raw.vehiculo.marca && ` - ${selectedServicio.raw.vehiculo.marca}`} {selectedServicio.raw.vehiculo.modelo && ` - ${selectedServicio.raw.vehiculo.modelo}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Color / Tipo</span>
                        <span className="font-bold text-sm uppercase">
                          {selectedServicio.raw.vehiculo.color || "N/A"} {selectedServicio.raw.vehiculo.tipo && ` - ${selectedServicio.raw.vehiculo.tipo}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Detalle del Servicio */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800/50 pb-2 flex items-center gap-2">
                  <FileText className="h-3 w-3" /> Detalle del Servicio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Empresa</span>
                    <span className="font-bold text-sm uppercase">{selectedServicio.raw.empresa?.nombre || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Tipo de Servicio</span>
                    <span className="font-bold text-sm uppercase">{selectedServicio.raw.tipoVisita || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Servicio Específico</span>
                    <span className="font-black text-sm text-azul-1 dark:text-zinc-300 uppercase">{selectedServicio.servicioEspecifico}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Técnico Asignado</span>
                    <span className="font-bold text-sm uppercase">
                      {selectedServicio.tecnico}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Programación */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800/50 pb-2 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Programación
                </h3>
                <div className="grid grid-cols-3 gap-6 bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/50 shadow-sm shadow-blue-100/20">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600/70 dark:text-zinc-300 block uppercase tracking-wider mb-1">Fecha Visita</span>
                    <span className="font-black text-sm text-blue-900 dark:text-zinc-300 uppercase">{selectedServicio.fecha}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-600/70 dark:text-zinc-300 block uppercase tracking-wider mb-1">Hora Inicio</span>
                    <span className="font-black text-sm text-blue-900 dark:text-zinc-300">{selectedServicio.hora}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-600/70 dark:text-zinc-300 block uppercase tracking-wider mb-1">Hora Fin</span>
                    <span className="font-black text-sm text-blue-900 dark:text-zinc-300">
                      {selectedServicio.raw.horaFin ? new Date(selectedServicio.raw.horaFin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--:--"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. Estado y Observaciones */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800/50 pb-2 flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" /> Estado y Observaciones
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Nivel Infestación</span>
                    <span className="font-black text-sm uppercase text-zinc-900 dark:text-zinc-100">{selectedServicio.raw.nivelInfestacion || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Cond. Higiene</span>
                    <span className="font-black text-sm uppercase text-zinc-900 dark:text-zinc-100">{selectedServicio.raw.condicionesHigiene || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Cond. Local</span>
                    <span className="font-black text-sm uppercase text-zinc-900 dark:text-zinc-100">{selectedServicio.raw.condicionesLocal || "N/A"}</span>
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-2">Observaciones Generales</span>
                    <p className="text-sm font-medium bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 min-h-[80px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {selectedServicio.raw.observacion || "Sin observaciones registradas."}
                    </p>
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-2">Observación Final</span>
                    <p className="text-sm font-black bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 min-h-[80px] leading-relaxed text-zinc-900 dark:text-zinc-100">
                      {selectedServicio.raw.observacionFinal || "Sin observación final registrada."}
                    </p>
                  </div>
                </div>
              </div>

              {/* 7. Información Financiera */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800/50 pb-2 flex items-center gap-2">
                  <CreditCard className="h-3 w-3" /> Información Financiera
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Valor Cotizado</span>
                    <span className="font-black text-lg text-zinc-900 dark:text-zinc-100">
                      {selectedServicio.raw.valorCotizado ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedServicio.raw.valorCotizado) : "$ 0"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Valor Pagado</span>
                    <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {selectedServicio.raw.valorPagado ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedServicio.raw.valorPagado) : "$ 0"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Banco / Entidad</span>
                    <span className="font-black text-sm uppercase text-azul-1">{selectedServicio.raw.entidadFinanciera?.nombre || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Medio de Pago</span>
                    <span className="font-black text-sm uppercase">{selectedServicio.raw.metodoPago?.nombre || selectedServicio.raw.estadoPago || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Referencia</span>
                    <span className="font-black text-sm uppercase">{selectedServicio.raw.referenciaPago || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Fecha Pago</span>
                    <span className="font-bold text-sm">
                      {selectedServicio.raw.fechaPago ? new Date(selectedServicio.raw.fechaPago).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Valor Repuestos</span>
                    <span className="font-black text-sm text-red-500">
                      {selectedServicio.raw.valorRepuestos ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedServicio.raw.valorRepuestos) : "$ 0"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 8. Factura / Evidencia */}
              {selectedServicio.raw.facturaPath && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800/50 pb-2">Factura del Servicio</h3>
                  <div className="rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900 flex justify-center p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedServicio.raw.facturaPath}
                      alt="Evidencia del servicio"
                      className="max-w-full h-auto max-h-[500px] object-contain rounded-xl shadow-lg"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 font-bold text-[10px] uppercase tracking-wider h-10 px-5 rounded-xl border-zinc-100 dark:border-zinc-800/50"
                      onClick={() => window.open(selectedServicio.raw.facturaPath!, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                      Ver Original
                    </Button>
                  </div>
                </div>
              )}

              {/* 9. Factura/Orden */}
              {selectedServicio.raw.facturaElectronica && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800/50 pb-2">Factura/Orden</h3>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-azul-1 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold text-[10px] uppercase tracking-wider h-10 px-5 rounded-xl"
                      onClick={() => window.open(selectedServicio.raw.facturaElectronica!, "_blank")}
                    >
                      <FileText className="h-4 w-4" />
                      Ver Factura/Orden
                    </Button>
                  </div>
                </div>
              )}

              {/* 10. Comprobante de Pago */}
              {selectedServicio.raw.comprobantePago && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-800/50 pb-2">Comprobante de Pago</h3>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-blue-600 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold text-[10px] uppercase tracking-wider h-10 px-5 rounded-xl"
                      onClick={() => window.open(selectedServicio.raw.comprobantePago!, "_blank")}
                    >
                      <Receipt className="h-4 w-4" />
                      Ver Comprobante de Pago
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isGeoModalOpen} onOpenChange={setIsGeoModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <MapPin className="h-6 w-6 text-blue-500" /> Registro de Visitas y Geolocalización
            </DialogTitle>
            <DialogDescription className="font-medium">
              Historial de marcación de llegada, salida y ubicación del técnico.
            </DialogDescription>
          </DialogHeader>

          {selectedServicio && (
            <div className="space-y-8 mt-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Orden de Servicio</p>
                    <p className="text-lg font-black text-zinc-900 dark:text-zinc-50">#{selectedServicio.id} - {selectedServicio.cliente}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Técnico Asignado</p>
                    <p className="text-lg font-black text-azul-1">{selectedServicio.tecnico}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  {(() => {
                    const latestGeo = selectedServicio.raw.geolocalizaciones?.[0];
                    const llegadaTime = latestGeo ? new Date(latestGeo.llegada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--:--";
                    const salidaTime = latestGeo?.salida ? new Date(latestGeo.salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--:--";
                    const totalVisitas = selectedServicio.raw.geolocalizaciones?.length || 0;
                    const ultimaFecha = latestGeo ? new Date(latestGeo.llegada).toLocaleDateString() : "--/--/--";
                    
                    return (
                      <>
                        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800/50 flex flex-col items-center min-w-[120px]">
                          <span className="text-[9px] font-black text-azul-1 uppercase tracking-widest">Nº Visitas</span>
                          <span className="text-lg font-black text-zinc-900 dark:text-zinc-50">{totalVisitas}</span>
                        </div>
                        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800/50 flex flex-col items-center min-w-[120px]">
                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Llegada</span>
                          <span className="text-lg font-black text-zinc-900 dark:text-zinc-50">{llegadaTime}</span>
                        </div>
                        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800/50 flex flex-col items-center min-w-[120px]">
                          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Salida</span>
                          <span className="text-lg font-black text-zinc-900 dark:text-zinc-50">{salidaTime}</span>
                        </div>
                        <div className="ml-auto px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800/50 flex flex-col items-center min-w-[140px]">
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Fecha Visita</span>
                          <span className="text-lg font-black text-zinc-900 dark:text-zinc-50">{ultimaFecha}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {selectedServicio.raw.geolocalizaciones && selectedServicio.raw.geolocalizaciones.length > 0 ? (
                  <>
                    {selectedServicio.raw.geolocalizaciones.map((geo, idx) => (
                      <div key={geo.id} className="relative pl-8 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800">
                        <div className="absolute left-[-4px] top-0 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-white dark:ring-zinc-950" />
                        
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h4 className="font-black text-sm uppercase tracking-tight text-zinc-900 dark:text-zinc-50">Visita #{selectedServicio.raw.geolocalizaciones!.length - idx}</h4>
                                <span className="text-[10px] font-black px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md">
                                  {new Date(geo.llegada).toLocaleDateString()}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-3.5 w-3.5 text-emerald-500" />
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Hora Llegada</span>
                                  </div>
                                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-50">
                                    {new Date(geo.llegada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </p>
                                </div>

                                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-3.5 w-3.5 text-red-500" />
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Hora Salida</span>
                                  </div>
                                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-50">
                                    {geo.salida ? new Date(geo.salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--:--"}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                    <Navigation className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Coordenadas</p>
                                    <p className="text-xs font-bold font-mono">{geo.latitud?.toFixed(6)}, {geo.longitud?.toFixed(6)}</p>
                                  </div>
                                </div>

                                {geo.linkMaps && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full justify-start gap-2 h-10 border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    onClick={() => window.open(geo.linkMaps!, '_blank')}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Ver ubicación en Maps
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                  <Camera className="h-3 w-3" /> Foto Llegada
                                </p>
                                {geo.fotoLlegada ? (
                                  <div 
                                                                      className="aspect-square rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800/50 bg-zinc-100 cursor-pointer group relative"
                                                                      onClick={() => window.open(geo.fotoLlegada!, '_blank')}
                                                                    >
                                                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                      <img src={geo.fotoLlegada} alt="Llegada" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">                                      <Eye className="h-6 w-6 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="aspect-square rounded-xl border-2 border-dashed border-zinc-100 dark:border-zinc-800/50 flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
                                    <ImageIcon className="h-8 w-8 mb-2" />
                                    <p className="text-[8px] font-black uppercase">Sin foto</p>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2">
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                  <Camera className="h-3 w-3" /> Foto Salida
                                </p>
                                {geo.fotoSalida ? (
                                  <div 
                                                                      className="aspect-square rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800/50 bg-zinc-100 cursor-pointer group relative"
                                                                      onClick={() => window.open(geo.fotoSalida!, '_blank')}
                                                                    >
                                                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                      <img src={geo.fotoSalida} alt="Salida" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">                                      <Eye className="h-6 w-6 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="aspect-square rounded-xl border-2 border-dashed border-zinc-100 dark:border-zinc-800/50 flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
                                    <ImageIcon className="h-8 w-8 mb-2" />
                                    <p className="text-[8px] font-black uppercase">Sin foto</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-center">
                      <div className="px-8 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 flex flex-col items-center min-w-[250px] shadow-sm">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                          <Navigation className="h-3 w-3" /> Coordenadas Última Visita
                        </span>
                        <span className="text-sm font-mono font-black text-zinc-900 dark:text-zinc-50">
                          {selectedServicio.raw.geolocalizaciones?.[0]?.latitud?.toFixed(6) || "0.00"}, {selectedServicio.raw.geolocalizaciones?.[0]?.longitud?.toFixed(6) || "0.00"}
                        </span>
                        {selectedServicio.raw.geolocalizaciones?.[0]?.linkMaps && (
                          <button 
                            onClick={() => window.open(selectedServicio.raw.geolocalizaciones![0].linkMaps!, '_blank')}
                            className="mt-3 px-6 py-2 bg-white dark:bg-zinc-900 rounded-lg border border-blue-200 dark:border-blue-800 text-[10px] font-black text-azul-1 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors uppercase tracking-widest"
                          >
                            Ver ubicación en Google Maps
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 px-6 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-100 dark:border-zinc-800/50">
                    {(selectedServicio.raw.evidenciaPath || (selectedServicio.raw.evidencias && selectedServicio.raw.evidencias.length > 0)) ? (
                      <div className="space-y-6">
                        <div className="flex flex-col items-center">
                          <div className="h-12 w-12 rounded-2xl bg-pink-50 dark:bg-pink-900/20 text-pink-500 flex items-center justify-center mb-4">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                          <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">Evidencia Fotográfica</h3>
                          <p className="text-zinc-500 text-sm font-medium mt-1">Se han cargado {selectedServicio.raw.evidencias?.length || 1} evidencias del servicio.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
                          {selectedServicio.raw.evidenciaPath && (
                            <div 
                              className="aspect-video rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800/50 bg-white shadow-xl cursor-pointer group relative"
                              onClick={() => window.open(selectedServicio.raw.evidenciaPath!, '_blank')}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={selectedServicio.raw.evidenciaPath} 
                                alt="Evidencia Principal" 
                                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" 
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="h-8 w-8 text-white" />
                              </div>
                            </div>
                          )}
                          
                          {selectedServicio.raw.evidencias?.map((ev, index) => (
                            <div 
                              key={ev.id}
                              className="aspect-video rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800/50 bg-white shadow-xl cursor-pointer group relative"
                              onClick={() => window.open(ev.path, '_blank')}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={ev.path} 
                                alt={`Evidencia ${index + 1}`} 
                                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" 
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="h-8 w-8 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <Navigation className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">Sin registros</h3>
                        <p className="text-zinc-500 font-medium max-w-xs mx-auto mt-2">No se han encontrado registros de visitas o geolocalización para esta orden.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isLiquidarModalOpen} onOpenChange={setIsLiquidarModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" /> Liquidar Servicio
            </DialogTitle>
            <DialogDescription className="font-medium">
              Desglose los métodos de pago para finalizar la orden.
            </DialogDescription>
          </DialogHeader>

          {selectedServicio && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Valor Cotizado</p>
                  <p className="text-base font-black text-zinc-900 dark:text-zinc-50">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedServicio.raw.valorCotizado || 0)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">(-) Bonos / Cortesía</p>
                  <p className="text-base font-black text-amber-600">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(
                      liquidarData.breakdown
                        .filter(l => l.metodo === "BONO" || l.metodo === "CORTESIA")
                        .reduce((sum, l) => sum + (parseFloat(l.monto.replace(/\./g, "")) || 0), 0)
                    )}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Neto a Recaudar</p>
                  <p className={cn(
                    "text-lg font-black",
                    // Total monetario (Efectivo + Trans + Credito) debe igualar al (Cotizado - Bonos)
                    liquidarData.breakdown
                      .filter(l => l.metodo !== "BONO" && l.metodo !== "CORTESIA")
                      .reduce((sum, l) => sum + (parseFloat(l.monto.replace(/\./g, "")) || 0), 0) === 
                    (Number(selectedServicio.raw.valorCotizado || 0) - 
                     liquidarData.breakdown
                      .filter(l => l.metodo === "BONO" || l.metodo === "CORTESIA")
                      .reduce((sum, l) => sum + (parseFloat(l.monto.replace(/\./g, "")) || 0), 0))
                      ? "text-emerald-500"
                      : "text-red-500"
                  )}>
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(
                      liquidarData.breakdown
                        .filter(l => l.metodo !== "BONO" && l.metodo !== "CORTESIA")
                        .reduce((sum, l) => sum + (parseFloat(l.monto.replace(/\./g, "")) || 0), 0)
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Desglose de Cobro</h4>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2"
                    onClick={() => setLiquidarData({
                      ...liquidarData,
                      breakdown: [...liquidarData.breakdown, { metodo: "EFECTIVO", monto: "" }]
                    })}
                  >
                    <Plus className="h-3 w-3" /> Añadir Método
                  </Button>
                </div>

                <div className="space-y-3">
                  {liquidarData.breakdown.map((line, index) => (
                    <div key={index} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 shadow-sm space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Método</Label>
                          <Select 
                            value={line.metodo} 
                            onChange={(e) => {
                              const newBreakdown = [...liquidarData.breakdown];
                              newBreakdown[index] = { ...line, metodo: e.target.value };
                              setLiquidarData({ ...liquidarData, breakdown: newBreakdown });
                            }}
                            className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800/50 text-[11px] font-bold"
                          >
                            <option value="EFECTIVO">EFECTIVO</option>
                            <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                            <option value="CREDITO">CRÉDITO (POR COBRAR)</option>
                            <option value="BONO">BONO / DESCUENTO</option>
                            <option value="CORTESIA">CORTESÍA (NO SE COBRA)</option>
                            <option value="PENDIENTE">PENDIENTE POR DEFINIR</option>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Monto</Label>
                            {liquidarData.breakdown.length > 1 && (
                              <button 
                                onClick={() => {
                                  const newBreakdown = liquidarData.breakdown.filter((_, i) => i !== index);
                                  setLiquidarData({ ...liquidarData, breakdown: newBreakdown });
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <Input 
                            type="text"
                            value={line.monto}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              const formatted = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                              const newBreakdown = [...liquidarData.breakdown];
                              newBreakdown[index] = { ...line, monto: formatted };
                              setLiquidarData({ ...liquidarData, breakdown: newBreakdown });
                            }}
                            placeholder="0"
                            className="h-10 rounded-xl border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800/50 font-bold text-sm"
                          />
                        </div>
                      </div>

                      {line.metodo === "TRANSFERENCIA" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Banco / Entidad</Label>
                            <Input 
                              value={line.banco}
                              onChange={(e) => {
                                const newBreakdown = [...liquidarData.breakdown];
                                newBreakdown[index] = { ...line, banco: e.target.value };
                                setLiquidarData({ ...liquidarData, breakdown: newBreakdown });
                              }}
                              placeholder="Ej: Bancolombia, Nequi..."
                              className="h-10 rounded-xl border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800/50 font-bold text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Referencia</Label>
                            <Input 
                              value={line.referencia}
                              onChange={(e) => {
                                const newBreakdown = [...liquidarData.breakdown];
                                newBreakdown[index] = { ...line, referencia: e.target.value };
                                setLiquidarData({ ...liquidarData, breakdown: newBreakdown });
                              }}
                              placeholder="Nº comprobante"
                              className="h-10 rounded-xl border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800/50 font-bold text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fecha de Cierre</Label>
                    <DatePicker 
                      date={liquidarData.fechaPago ? new Date(liquidarData.fechaPago + "T00:00:00") : undefined}
                      onChange={(d) => setLiquidarData({...liquidarData, fechaPago: d ? d.toISOString().split("T")[0] : ""})}
                      className="h-12 border-zinc-300 transition-all hover:scale-[1.02] focus-within:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Comprobante Global (Opcional)</Label>
                    <div 
                      onClick={() => document.getElementById('comprobante-liquidar-upload')?.click()}
                      className="h-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800/50 rounded-xl flex items-center justify-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <FileUp className="h-4 w-4 text-zinc-400 mr-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-4 truncate">
                        {comprobanteFile ? comprobanteFile.name : "Subir archivo"}
                      </span>
                      <input 
                        id="comprobante-liquidar-upload"
                        type="file" 
                        className="hidden" 
                        onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                        accept="image/*,application/pdf"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Observación Final</Label>
                  <textarea 
                    value={liquidarData.observacionFinal}
                    onChange={(e) => setLiquidarData({...liquidarData, observacionFinal: e.target.value})}
                    className="w-full min-h-[80px] p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800/50 text-sm font-medium focus:ring-2 focus:ring-azul-1 outline-none transition-all"
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                  onClick={() => setIsLiquidarModalOpen(false)}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 h-12 rounded-xl bg-azul-1 dark:bg-azul-1 hover:bg-blue-700 dark:hover:bg-blue-600 text-zinc-200 dark:text-zinc-200 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-azul-1/20 dark:shadow-none"
                  onClick={handleLiquidar}
                  disabled={
                    isUploading || 
                    liquidarData.breakdown.length === 0 ||
                    // Validar balance contable: Monetario + No Monetario === Cotizado
                    (liquidarData.breakdown.reduce((sum, l) => sum + (parseFloat(l.monto.replace(/\./g, "")) || 0), 0) !== Number(selectedServicio.raw.valorCotizado || 0))
                  }
                >
                  {isUploading ? "Procesando..." : "Confirmar Liquidación"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isLiquidationDetailsOpen} onOpenChange={setIsLiquidationDetailsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" /> Detalles de Liquidación
            </DialogTitle>
            <DialogDescription className="font-medium">
              Información del cierre financiero del servicio.
            </DialogDescription>
          </DialogHeader>

          {selectedServicio && (
            <div className="space-y-6 mt-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-emerald-600/70 dark:text-emerald-400 uppercase tracking-widest block mb-1">Liquidado Por</span>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-black text-sm text-emerald-900 dark:text-emerald-100 uppercase">
                        {selectedServicio.raw.liquidadoPor?.user 
                          ? `${selectedServicio.raw.liquidadoPor.user.nombre} ${selectedServicio.raw.liquidadoPor.user.apellido}`
                          : "Administrador"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-600/70 dark:text-emerald-400 uppercase tracking-widest block mb-1">Fecha de Liquidación</span>
                    <span className="font-black text-sm text-emerald-900 dark:text-emerald-100">
                      {selectedServicio.raw.liquidadoAt 
                        ? new Date(selectedServicio.raw.liquidadoAt).toLocaleString() 
                        : "No registrada"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Resumen de Cobro</span>
                <div className="space-y-3">
                  {selectedServicio.raw.desglosePago && Array.isArray(selectedServicio.raw.desglosePago) ? (
                    (selectedServicio.raw.desglosePago as any[]).map((line, idx) => (
                      <div key={idx} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">{line.metodo}</span>
                            {line.banco && <span className="text-[10px] font-bold text-azul-1 uppercase">({line.banco})</span>}
                          </div>
                          {line.referencia && <p className="text-[9px] font-medium text-zinc-500 mt-0.5">Ref: {line.referencia}</p>}
                        </div>
                        <span className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(line.monto || 0)}
                        </span>
                      </div>
                    ))
                  ) : (
                    /* Fallback para órdenes viejas */
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">PAGO ÚNICO</span>
                        {selectedServicio.raw.entidadFinanciera && (
                          <p className="text-[10px] font-bold text-azul-1 uppercase mt-0.5">{selectedServicio.raw.entidadFinanciera.nombre}</p>
                        )}
                      </div>
                      <span className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedServicio.raw.valorPagado || 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Total Liquidado</span>
                  <span className="font-black text-lg text-emerald-600">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedServicio.raw.valorPagado || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1">Fecha Transferencia</span>
                  <span className="font-bold text-sm uppercase">
                    {selectedServicio.raw.fechaPago ? new Date(selectedServicio.raw.fechaPago).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>

              {selectedServicio.raw.comprobantePago && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Comprobante Adjunto</span>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl border-zinc-100 dark:border-zinc-800/50 gap-3 font-bold text-xs uppercase"
                    onClick={() => window.open(selectedServicio.raw.comprobantePago!, "_blank")}
                  >
                    <Receipt className="h-4 w-4 text-blue-600" /> Ver Comprobante de Pago
                  </Button>
                </div>
              )}

              {selectedServicio.raw.observacionFinal && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Observaciones de Cierre</span>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 text-sm font-medium text-zinc-600 dark:text-zinc-400 italic">
                    "{selectedServicio.raw.observacionFinal}"
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                onClick={() => setIsLiquidationDetailsOpen(false)}
              >
                Cerrar Detalle
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden File Input for Invoice Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="application/pdf,image/*"
        disabled={isUploading}
      />
    </DashboardLayout>
  );
}
