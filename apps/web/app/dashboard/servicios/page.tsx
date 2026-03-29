"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
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
  Wallet,
  MoreHorizontal,
  Eye,
  EyeOff,
  Pencil,
  Copy,
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
  ChevronDown,
  ChevronRight,
  UserX,
  PlayCircle,
  Truck,
  AlertTriangle,
  Zap
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
import { useUserRole } from "@/hooks/use-user-role";
import { cn, getStorageUrl } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import {
  completeFollowUp,
  confirmOrdenUpload,
  createSignedUploadUrl,
  deleteOrdenServicio,
  getEstadoServicios,
  getMetodosPago,
  getMunicipalities,
  getOperators,
  getOrdenesServicio,
  getServiciosKpis,
  notifyLiquidationWebhook,
  notifyServiceOperatorWebhook,
  triggerReinforcementsJob,
  type ClienteDTO,
  type ServiciosKpis,
  updateOrdenServicio,
  uploadToSupabaseSignedUrl,
  type OrdenServicioRaw,
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
import {
  addDaysToYmd,
  bogotaDateTimeToUtcIso,
  formatBogotaDate,
  formatBogotaDateTime,
  formatBogotaTime,
  startOfBogotaWeekYmd,
  utcIsoToBogotaYmd,
  pickerDateToYmd,
  toBogotaYmd,
  ymdToPickerDate,
} from "@/utils/date-utils";
import { getBrowserScopedEnterpriseId } from "@/lib/browser-access-scope";

// Remove local interface OrdenServicioRaw as it is now imported

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
  followUps: Servicio[];
  isFollowUp?: boolean;
}

interface FollowUpRow extends Servicio {
  parentId: string;
  parentNumero: string;
  parentCliente: string;
  parentServicio: string;
}

interface SoportePago {
  tipo?: string;
  path: string;
  monto?: number;
  fecha?: string;
  fechaPago?: string;
  referenciaPago?: string;
  banco?: string;
  observacion?: string;
  metodo?: string;
}

function resolveSoportePagoUrl(bucket: string, path?: string | null) {
  if (!path) return "";
  if (/^(https?:)?\/\//i.test(path)) return path;
  return getStorageUrl(bucket, path.replace(/^\/+/, ""));
}


interface LiquidarTransferenciaForm {
  id: string;
  monto: string;
  fechaPago: string;
  referenciaPago: string;
  banco: string;
  observacion: string;
  comprobanteFile: File | null;
  existingPath?: string;
  persisted?: boolean;
}

const parseCurrencyInput = (value?: string) =>
  Number.parseFloat((value || "").replace(/\./g, "")) || 0;

const formatCurrencyInput = (value?: number | string | null) => {
  const normalized =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return "";
  }

  return normalized.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const toPaymentInputDate = (value?: string | null) => {
  if (!value) return toBogotaYmd();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  try {
    return utcIsoToBogotaYmd(value);
  } catch {
    return value.slice(0, 10);
  }
};

const createTransferenciaForm = (
  partial?: Partial<LiquidarTransferenciaForm>,
): LiquidarTransferenciaForm => ({
  id:
    partial?.id ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  monto: partial?.monto || "",
  fechaPago: partial?.fechaPago || toBogotaYmd(),
  referenciaPago: partial?.referenciaPago || "",
  banco: partial?.banco || "",
  observacion: partial?.observacion || "",
  comprobanteFile: partial?.comprobanteFile || null,
  existingPath: partial?.existingPath,
  persisted: partial?.persisted ?? false,
});

const getStoredTransferencias = (
  orden?: Partial<OrdenServicioRaw> | null,
): LiquidarTransferenciaForm[] => {
  if (!orden) return [];

  const soportes = Array.isArray(orden.comprobantePago)
    ? orden.comprobantePago
    : [];

  const transferencias = soportes
    .filter((soporte) => soporte?.path)
    .map((soporte, idx) =>
      createTransferenciaForm({
        id: `stored-${idx}-${soporte.path}`,
        monto: formatCurrencyInput(soporte.monto),
        fechaPago: toPaymentInputDate(soporte.fechaPago || soporte.fecha),
        referenciaPago: soporte.referenciaPago || "",
        banco: soporte.banco || "",
        observacion: soporte.observacion || "",
        existingPath: soporte.path,
        persisted: true,
      }),
    );

  if (transferencias.length > 0) {
    return transferencias;
  }

  if (orden.referenciaPago || orden.fechaPago || orden.comprobantePago) {
    const legacyPath =
      typeof orden.comprobantePago === "string"
        ? orden.comprobantePago
        : undefined;

    return [
      createTransferenciaForm({
        id: `legacy-${orden.id || "orden"}`,
        monto: formatCurrencyInput(orden.valorPagado),
        fechaPago: toPaymentInputDate(orden.fechaPago),
        referenciaPago: orden.referenciaPago || "",
        existingPath: legacyPath,
        persisted: true,
      }),
    ];
  }

  return [];
};

const CLOSED_FINANCIAL_STATES = new Set([
  "EFECTIVO_DECLARADO",
  "PAGADO",
  "CONCILIADO",
  "CORTESIA",
]);

const getFinancialLockMeta = (orden?: Partial<OrdenServicioRaw> | null) => {
  if (!orden) {
    return { locked: false, reason: "" };
  }

  if (orden.financialLock) {
    return {
      locked: true,
      reason:
        "Freeze financiero activo desde backend. Esta orden ya no admite recaudo ni liquidación manual desde el listado.",
    };
  }

  if (orden.liquidadoAt || orden.estadoServicio === "LIQUIDADO") {
    return {
      locked: true,
      reason:
        "La orden ya fue liquidada. Cualquier ajuste financiero debe pasar por contabilidad.",
    };
  }

  if (orden.estadoPago && CLOSED_FINANCIAL_STATES.has(orden.estadoPago)) {
    return {
      locked: true,
      reason:
        orden.estadoPago === "EFECTIVO_DECLARADO"
          ? "La orden ya tiene recaudo declarado pendiente de conciliación. No se puede volver a registrar desde acá."
          : "La orden ya tiene cierre o conciliación de pago. Los datos financieros quedaron congelados.",
    };
  }

  return { locked: false, reason: "" };
};

const getSettlementFlowMeta = (orden?: Partial<OrdenServicioRaw> | null) => {
  const financialLock = getFinancialLockMeta(orden);
  const breakdown = orden?.desglosePago || [];
  const hasCash = breakdown.length > 0
    ? breakdown.some((b) => b.metodo.toUpperCase().includes("EFECTIVO") && Number(b.monto) > 0)
    : orden?.metodoPago?.nombre?.toUpperCase().includes("EFECTIVO");
  const hasTransfer = breakdown.length > 0
    ? breakdown.some((b) => b.metodo.toUpperCase().includes("TRANSFERENCIA") && Number(b.monto) > 0)
    : orden?.metodoPago?.nombre?.toUpperCase().includes("TRANSFERENCIA");

  const now = new Date();
  const visitDate = orden?.fechaVisita ? new Date(orden.fechaVisita) : null;
  const visitTime = orden?.horaInicio ? new Date(orden.horaInicio) : null;
  let isFuture = false;

  if (visitDate) {
    const scheduledDateTime = new Date(visitDate);
    if (visitTime) {
      scheduledDateTime.setHours(visitTime.getHours(), visitTime.getMinutes(), 0, 0);
    }
    isFuture = scheduledDateTime > now;
  }

  if (isFuture) {
    return {
      financialLock,
      isFuture,
      hasCash,
      hasTransfer,
      title: "Registrar anticipo",
      description: "Registrá un pago anticipado sin cerrar la orden. El servicio sigue programado.",
      submitLabel: "Registrar anticipo",
      summaryLabel: "Monto anticipado",
      accent: "sky" as const,
    };
  }

  if (hasCash) {
    return {
      financialLock,
      isFuture,
      hasCash,
      hasTransfer,
      title: "Registrar recaudo",
      description: "Registrá el efectivo declarado. Contabilidad recalcula y concilia después.",
      submitLabel: "Registrar recaudo",
      summaryLabel: "Monto declarado",
      accent: "blue" as const,
    };
  }

  return {
    financialLock,
    isFuture,
    hasCash,
    hasTransfer,
    title: "Liquidar servicio",
    description: "Cerrá la orden por medios no efectivos. El backend valida el cierre antes de confirmarlo.",
    submitLabel: "Liquidar servicio",
    summaryLabel: "Monto a liquidar",
    accent: "emerald" as const,
  };
};

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

const ESTADO_PAGO_STYLING: Record<string, string> = {
  "PENDIENTE": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "EFECTIVO_DECLARADO": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "CONSIGNADO": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "CONCILIADO": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "ANTICIPO": "bg-sky-500/10 text-sky-600 border-sky-500/20",
  "PAGADO": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "CREDITO": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "PARCIAL": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "CORTESIA": "bg-slate-500/10 text-slate-600 border-slate-500/20",
  "DEFAULT": "bg-muted text-muted-foreground border-border",
};

const PRESET_OPTIONS = [
  { key: "all", label: "TODOS" },
  { key: "HOY", label: "HOY" },
  { key: "MANANA", label: "MAÑANA" },
  { key: "SEMANA", label: "SEMANA" },
  { key: "RECHAZADOS", label: "RECHAZADOS" },
  { key: "VENCIDOS", label: "VENCIDOS" },
  { key: "SIN_TECNICO", label: "SIN TÉCNICO" },
  { key: "PENDIENTES_LIQUIDAR", label: "PEND. LIQUIDAR" },
] as const;

const VISIT_TYPE_NORMALIZATION: Record<string, string> = {
  DIAGNOSTICO: "DIAGNOSTICO_INICIAL",
  DIAGNOSTICO_INICIAL: "DIAGNOSTICO_INICIAL",
  PREVENTIVO: "SERVICIO_REFUERZO",
  CORRECTIVO: "SERVICIO_REFUERZO",
  SERVICIO_REFUERZO: "SERVICIO_REFUERZO",
  SEGUIMIENTO: "CITA_VERIFICACION",
  CITA_VERIFICACION: "CITA_VERIFICACION",
  REINCIDENCIA: "GARANTIA",
  GARANTIA: "GARANTIA",
  NO_CONCRETADO: "NO_CONCRETADO",
  NUEVO: "NUEVO",
  REPROGRAMADO: "REPROGRAMADO",
};

const VISIT_TYPE_LABELS: Record<string, string> = {
  DIAGNOSTICO_INICIAL: "Diagnóstico Inicial",
  SERVICIO_REFUERZO: "Servicio Refuerzo",
  CITA_VERIFICACION: "Cita de Verificación",
  GARANTIA: "Garantía",
  NO_CONCRETADO: "No Concretado",
  NUEVO: "Nuevo",
  REPROGRAMADO: "Reprogramado",
};

const normalizeVisitType = (value?: string | null) => {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  return VISIT_TYPE_NORMALIZATION[normalized] || normalized;
};

const formatVisitTypeLabel = (value?: string | null) => {
  const normalized = normalizeVisitType(value);
  if (!normalized) return "N/A";
  return VISIT_TYPE_LABELS[normalized] || normalized;
};

const VIEW_MODE_OPTIONS = [
  { key: "servicios", label: "Servicios" },
  { key: "seguimientos", label: "Seguimientos" },
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
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">ID Orden</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Cliente / Servicio</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Dirección</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Programación</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Técnico</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Estado Ops</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Estado Pago</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground text-right">Acciones</th>
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
              <td className="px-8 py-6"><Skeleton className="h-8 w-28 rounded-full" /></td>
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
  const { checkPermission, isLoading: isLoadingRole } = useUserRole();
  const canViewServices = checkPermission("SERVICE_VIEW");
  const canCreateServices = checkPermission("SERVICE_CREATE");
  const canEditServices = checkPermission("SERVICE_EDIT");
  const canManageServices = checkPermission("SERVICE_MANAGE");

  useEffect(() => {
    if (!isLoadingRole && !canViewServices) {
      router.replace("/dashboard");
    }
  }, [canViewServices, isLoadingRole, router]);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisitaModalOpen, setIsVisitaModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isLiquidarModalOpen, setIsLiquidarModalOpen] = useState(false);
  const [isViewLiquidationModalOpen, setIsViewLiquidationModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showKPIs, setShowKPIs] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState(searchParams.get("tab") || "servicios");
  const [activePreset, setActivePreset] = useState(searchParams.get("preset") || "all");
  const [showOperationalQueue, setShowOperationalQueue] = useState(false);
  const [expandedOperationalSections, setExpandedOperationalSections] = useState<Record<string, boolean>>({
    SIN_ASIGNAR_HOY: true,
    POR_INICIAR: true,
    EN_EJECUCION: true,
    PENDIENTES_CIERRE: true,
    CON_INCIDENCIA: true,
    ATRASADOS: true,
  });
  const [activeOperationalFilter, setActiveOperationalFilter] = useState<string | null>(null);
  const [kpis, setKpis] = useState<ServiciosKpis | null>(null);
  const [kpisLoading, setKpisLoading] = useState(false);
  const [isProcessingJob, setIsProcessingJob] = useState(false);

  const handleTriggerJob = async () => {
    setIsProcessingJob(true);
    const toastId = toast.loading("Ejecutando job de refuerzos...");
    try {
      const res = await triggerReinforcementsJob();
      toast.success(`Job finalizado. Se agendaron ${res.procesadas} refuerzos pendientes.`, { id: toastId });
      await fetchServicios();
    } catch (error) {
      console.error("Error triggering job:", error);
      toast.error("Error al ejecutar el job de refuerzos", { id: toastId });
    } finally {
      setIsProcessingJob(false);
    }
  };

  const operationalCounts = useMemo(() => {
    const today = toBogotaYmd();
    return {
      sinAsignarHoy: servicios.filter(s => s.raw.fechaVisita && utcIsoToBogotaYmd(s.raw.fechaVisita) === today && !s.tecnicoId).length,
      porIniciar: servicios.filter(s => s.raw.fechaVisita && utcIsoToBogotaYmd(s.raw.fechaVisita) === today && s.estadoServicio === "PROGRAMADO").length,
      enEjecucion: servicios.filter(s => ["PROCESO", "EN PROCESO"].includes(s.estadoServicio)).length,
      pendientesCierre: servicios.filter(s => ["TECNICO_FINALIZO", "TECNICO FINALIZO", "TECNICO FINALIZADO"].includes(s.estadoServicio)).length,
      conIncidencia: servicios.filter(s => ["SIN_CONCRETAR", "SIN CONCRETAR"].includes(s.estadoServicio)).length,
      atrasados: servicios.filter(s => {
        const visitYmd = s.raw.fechaVisita ? utcIsoToBogotaYmd(s.raw.fechaVisita) : null;
        return visitYmd && visitYmd < today && !["LIQUIDADO", "CANCELADO", "SIN_CONCRETAR", "SIN CONCRETAR"].includes(s.estadoServicio);
      }).length,
    };
  }, [servicios]);

  const toggleOperationalSection = (key: string) => {
    setExpandedOperationalSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const applyOperationalFilter = (filter: string | null) => {
    setActiveOperationalFilter(filter);
    setViewMode("servicios");
    if (filter) {
      setActivePreset("all");
    }
    setCurrentPage(1);
  };
  const [customPresets, setCustomPresets] = useState<DashboardPreset[]>([]);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpRow | null>(null);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [presetForm, setPresetForm] = useState<{
    name: string;
    colorToken: DashboardPresetColorToken;
    isShared: boolean;
  }>({
    name: "",
    colorToken: "sky",
    isShared: false,
  });
  const [followUpForm, setFollowUpForm] = useState({
    contactedAt: "",
    channel: "LLAMADA",
    outcome: "CONTACTADO",
    resolution: "ACEPTADO" as "ACEPTADO" | "RECHAZADO",
    notes: "",
    nextActionAt: "",
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
    transferencias: LiquidarTransferenciaForm[];
  }>({
    breakdown: [{ metodo: "PENDIENTE", monto: "" }],
    observacionFinal: "",
    transferencias: [createTransferenciaForm()],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingServicio, setIsDeletingServicio] = useState(false);
  const [uploadConfig, setUploadConfig] = useState<{ id: string; field: "facturaElectronica" | "comprobantePago" | "evidenciaPath" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Servicio | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

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
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const getScopedEnterpriseId = useCallback(() => {
    if (typeof window === "undefined") return undefined;
    return getBrowserScopedEnterpriseId();
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const empresaId = getScopedEnterpriseId() || "";
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
        estados: Array.isArray(estados) && estados.length > 0 ? (estados as Array<{id: string, nombre: string}>) : coreEstados,
        tecnicos: (Array.isArray(tecnicos) ? (tecnicos as Array<{ id: string, user?: { nombre?: string, apellido?: string } }>) : []).map(t => ({
          id: t.id,
          nombre: `${t.user?.nombre || ""} ${t.user?.apellido || ""}`.trim() || "Sin nombre"
        })),
        metodosPago: (Array.isArray(metodos) ? (metodos as Array<{ id: string, nombre: string }>) : []).map(m => ({
          id: m.id,
          nombre: m.nombre
        })),
        municipios: Array.from(new Set([
          ...prev.municipios,
          ...(Array.isArray(munis) ? (munis as Array<{ name: string }>) : []).map(m => m.name.toUpperCase())
        ])).sort(),
      }));
    } catch (error) {
      console.error("Error fetching filter options", error);
    }
  }, [getScopedEnterpriseId]);

  const fetchServicios = useCallback(async (resetPage = false) => {
    setLoading(true);
    const pageToFetch = resetPage ? 1 : currentPage;
    if (resetPage) setCurrentPage(1);

    try {
      const empresaId = getScopedEnterpriseId();
      const response = await getOrdenesServicio({
        empresaId,
        search,
        page: pageToFetch,
        limit: itemsPerPage,
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
        ...(viewMode === "seguimientos" ? { preset: "SEGUIMIENTOS" } : {}),
      });

      const { data: ordenesData, meta } = response;
      setTotalPages(meta.totalPages);

      const mapOrdenToServicio = (os: OrdenServicioRaw, isFollowUp = false): Servicio => {
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
          fecha: os.fechaVisita ? formatBogotaDate(os.fechaVisita) : "Sin fecha",
          hora: os.horaInicio ? formatBogotaTime(os.horaInicio) : "Sin hora",
          tecnico: os.tecnico?.user ? `${os.tecnico.user.nombre} ${os.tecnico.user.apellido}` : "Sin asignar",
          tecnicoId: os.tecnicoId,
          estadoServicio: displayStatus,
          urgencia: os.urgencia || "BAJA",
          empresaId: os.empresaId,
          raw: os,
          followUps: (os.ordenesHijas || []).map((child) => mapOrdenToServicio(child, true)),
          isFollowUp,
        };
      };

      const mapped: Servicio[] = ordenesData.map((os: OrdenServicioRaw) => mapOrdenToServicio(os));
      setServicios(mapped);
      return mapped;
    } catch (error) {
      console.error("Error loading services", error);
      toast.error("Error al cargar las órdenes de servicio");
      return [];
    } finally {
      setLoading(false);
    }
  }, [getScopedEnterpriseId, search, currentPage, filters, activePreset, viewMode]);

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
      
      const updatedList = await fetchServicios();
      if (updatedList.length > 0 && selectedServicio) {
        const refreshed = updatedList.find(s => s.raw.id === selectedServicio.raw.id);
        if (refreshed) setSelectedServicio(refreshed);
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

    let toastId: string | number | undefined;
    try {
      const processedBreakdown = liquidarData.breakdown.map(line => ({
        ...line,
        monto: parseCurrencyInput(line.monto),
      }));

      // Determinar si hay efectivo en el desglose
      const hasCash = processedBreakdown.some(b => b.metodo === "EFECTIVO" && b.monto > 0);
      const hasTransfer = processedBreakdown.some(
        (b) => b.metodo === "TRANSFERENCIA" && b.monto > 0,
      );
      const storedTransferencias = liquidarData.transferencias.filter((transferencia) => transferencia.persisted);
      const draftTransferencias = liquidarData.transferencias.filter(
        (transferencia) => !transferencia.persisted,
      );
      const activeDraftTransferencias = draftTransferencias.filter((transferencia) => {
        const monto = parseCurrencyInput(transferencia.monto);

        return (
          monto > 0 ||
          transferencia.referenciaPago.trim().length > 0 ||
          transferencia.banco.trim().length > 0 ||
          transferencia.observacion.trim().length > 0 ||
          Boolean(transferencia.comprobanteFile)
        );
      });
      const hasExistingTransferProof =
        storedTransferencias.length > 0 ||
        (Array.isArray(selectedServicio.raw.comprobantePago)
          ? selectedServicio.raw.comprobantePago.length > 0
          : Boolean(selectedServicio.raw.comprobantePago));
      const needsTransferProof = hasTransfer && !hasCash;

      if (needsTransferProof && !liquidarData.observacionFinal.trim()) {
        toast.error("La observación de cierre es obligatoria para registrar transferencias.");
        return;
      }

      if (needsTransferProof && activeDraftTransferencias.length === 0 && !hasExistingTransferProof) {
        toast.error("Debés registrar al menos una transferencia con comprobante para liquidar.");
        return;
      }

      const invalidTransferencia = activeDraftTransferencias.find((transferencia) => {
        const monto = parseCurrencyInput(transferencia.monto);

        return (
          monto <= 0 ||
          !transferencia.fechaPago ||
          !transferencia.referenciaPago.trim() ||
          !transferencia.comprobanteFile
        );
      });

      if (invalidTransferencia) {
        toast.error("Cada transferencia nueva debe tener monto, fecha, referencia y comprobante.");
        return;
      }

      if (hasTransfer && hasCash && activeDraftTransferencias.length === 0 && !hasExistingTransferProof) {
        toast(
          "El efectivo se registrará ahora y la transferencia quedará pendiente de soporte.",
          { icon: "ℹ️" },
        );
      }

      setIsUploading(true);
      toastId = toast.loading("Liquidando servicio...");

      const uploadedTransferencias: Array<{
        monto: number;
        comprobantePath: string;
        referenciaPago: string;
        fechaPago: string;
        banco?: string;
        observacion?: string;
      }> = [];

      for (const transferencia of activeDraftTransferencias) {
        const signed = await createSignedUploadUrl(
          selectedServicio.raw.id,
          "comprobantePago",
          transferencia.comprobanteFile!.name,
        );
        await uploadToSupabaseSignedUrl(
          signed.path,
          signed.token,
          transferencia.comprobanteFile!,
        );
        await confirmOrdenUpload(selectedServicio.raw.id, "comprobantePago", [signed.path]);

        uploadedTransferencias.push({
          monto: parseCurrencyInput(transferencia.monto),
          comprobantePath: signed.path,
          referenciaPago: transferencia.referenciaPago.trim(),
          fechaPago: transferencia.fechaPago,
          banco: transferencia.banco.trim() || undefined,
          observacion: transferencia.observacion.trim() || undefined,
        });
      }

      const primaryTransferencia =
        uploadedTransferencias[0] ||
        (storedTransferencias[0]
          ? {
              monto: parseCurrencyInput(storedTransferencias[0].monto),
              comprobantePath: storedTransferencias[0].existingPath || "",
              referenciaPago: storedTransferencias[0].referenciaPago.trim(),
              fechaPago: storedTransferencias[0].fechaPago,
              banco: storedTransferencias[0].banco.trim() || undefined,
              observacion: storedTransferencias[0].observacion.trim() || undefined,
            }
          : null);

      // Validación Temporal para Anticipos
      const now = new Date();
      const visitDate = selectedServicio.raw.fechaVisita ? new Date(selectedServicio.raw.fechaVisita) : null;
      const visitTime = selectedServicio.raw.horaInicio ? new Date(selectedServicio.raw.horaInicio) : null;
      let isFuture = false;

      if (visitDate) {
        const scheduledDateTime = new Date(visitDate);
        if (visitTime) scheduledDateTime.setHours(visitTime.getHours(), visitTime.getMinutes(), 0, 0);
        isFuture = scheduledDateTime > now;
      }

      // Lógica de Estado:
      // 1. Si es futuro -> Mantenemos el estado actual (es un ANTICIPO, el servicio no ha ocurrido)
      // 2. Si ya pasó y tiene efectivo -> TECNICO_FINALIZO (esperando conciliación)
      // 3. Si ya pasó y es 100% transferencia -> LIQUIDADO (cierre total)
      let nuevoEstado = selectedServicio.raw.estadoServicio || "PROGRAMADO";
      if (!isFuture) {
        nuevoEstado = hasCash ? "TECNICO_FINALIZO" : "LIQUIDADO";
      }

      await updateOrdenServicio(selectedServicio.raw.id, {
        desglosePago: processedBreakdown.map((line) => ({
          ...line,
          referencia:
            line.metodo === "TRANSFERENCIA"
              ? primaryTransferencia?.referenciaPago || line.referencia
              : line.referencia,
        })),
        observacionFinal: liquidarData.observacionFinal,
        fechaPago: primaryTransferencia?.fechaPago || undefined,
        comprobantePago: primaryTransferencia?.comprobantePath || undefined,
        referenciaPago: primaryTransferencia?.referenciaPago || undefined,
        transferencias:
          uploadedTransferencias.length > 0 ? uploadedTransferencias : undefined,
        estadoServicio: nuevoEstado,
      });

      let successMsg = "Pago registrado correctamente.";
      if (isFuture) successMsg = "Anticipo registrado. El servicio sigue programado.";
      else if (hasTransfer && hasCash && uploadedTransferencias.length === 0 && !hasExistingTransferProof) {
        successMsg = "Efectivo registrado. La transferencia quedó pendiente de soporte.";
      }
      else if (nuevoEstado === "LIQUIDADO" && hasTransfer) successMsg = "Transferencia confirmada con soporte. Servicio liquidado exitosamente.";
      else if (nuevoEstado === "LIQUIDADO") successMsg = "Servicio liquidado exitosamente.";
      else if (hasTransfer) successMsg = "Transferencia confirmada. El recaudo en efectivo sigue pendiente.";
      else successMsg = "Recaudo registrado. Pendiente conciliación de efectivo.";

      toast.success(successMsg, { id: toastId });

      if (nuevoEstado === "LIQUIDADO") {
        notifyLiquidationWebhook({
          telefono: selectedServicio.clienteFull.telefono || "",
          cliente: selectedServicio.cliente,
          fecha: selectedServicio.fecha,
          servicio: selectedServicio.servicioEspecifico,
          idServicio: selectedServicio.raw.id,
        }).catch(err => console.error("Error notifying webhook:", err));
      }

      setIsLiquidarModalOpen(false);
      setLiquidarData({
        breakdown: [{ metodo: "PENDIENTE", monto: "" }],
        observacionFinal: "",
        transferencias: [createTransferenciaForm()],
      });
      
      const updatedList = await fetchServicios();
      if (updatedList.length > 0 && selectedServicio) {
        const refreshed = updatedList.find(s => s.raw.id === selectedServicio.raw.id);
        if (refreshed) setSelectedServicio(refreshed);
      }
    } catch (error) {
      console.error("Liquidation error:", error);
      const errorMessage =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Error al procesar la liquidación";
      toast.error(errorMessage, toastId ? { id: toastId } : undefined);
    } finally {
      setIsUploading(false);
    }
  };

  const fetchKpis = useCallback(async () => {
    setKpisLoading(true);
    try {
      const empresaId = getScopedEnterpriseId();
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
  }, [activePreset, filters, getScopedEnterpriseId, search]);

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
    viewMode,
  });

  const applyCustomPreset = (preset: DashboardPreset) => {
    const payload = (preset.filters || {}) as {
      search?: string;
      filters?: typeof filters;
      activePreset?: string;
      viewMode?: string;
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
    setViewMode(payload.viewMode || "servicios");
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setShowOperationalQueue((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (search) nextParams.set("search", search);
    if (viewMode !== "servicios") nextParams.set("tab", viewMode);
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
  }, [activePreset, filters, pathname, router, search, viewMode]);

  useEffect(() => {
    if (activeOperationalFilter) {
      // Logic handled in filteredServicios
    }
  }, [activeOperationalFilter]);

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

    const today = toBogotaYmd();
    const tomorrow = addDaysToYmd(today, 1);
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
      const start = startOfBogotaWeekYmd(today);
      const end = addDaysToYmd(start, 6);
      setFilters({
        ...baseFilters,
        fechaInicio: start,
        fechaFin: end,
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
    setActiveOperationalFilter(null);
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
    activeOperationalFilter !== null ||
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

  const followUpRows: FollowUpRow[] = viewMode === "seguimientos" ? servicios.map((os) => ({
    ...os,
    parentId: os.raw.ordenPadreId || "",
    parentNumero: os.raw.ordenPadreId?.substring(0, 8).toUpperCase() || "",
    parentCliente: os.cliente,
    parentServicio: os.servicioEspecifico,
  })) : [];

  const visibleServicios: Servicio[] = servicios;
  const activeRows = viewMode === "seguimientos" ? followUpRows : visibleServicios;

  // Since we use server-side pagination, we don't need to filter or slice locally for the main list
  // The API already returned the correct page based on search and filters
  const totalCount = kpis?.total || 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServicios = visibleServicios;
  const paginatedFollowUps = followUpRows;


  const toUtcIsoFromDateTimeLocal = (value: string) => {
    const [datePart, timePart] = value.split("T");
    if (!datePart || !timePart) return "";
    return bogotaDateTimeToUtcIso(datePart, timePart);
  };

  const openFollowUpModal = (followUp: FollowUpRow) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const latestRecord = followUp.raw.seguimientos?.[0];
    const contactedAtLocal = latestRecord?.contactedAt
      ? (() => {
          const date = new Date(latestRecord.contactedAt);
          const localYyyy = date.getFullYear();
          const localMm = String(date.getMonth() + 1).padStart(2, "0");
          const localDd = String(date.getDate()).padStart(2, "0");
          const localHh = String(date.getHours()).padStart(2, "0");
          const localMin = String(date.getMinutes()).padStart(2, "0");
          return `${localYyyy}-${localMm}-${localDd}T${localHh}:${localMin}`;
        })()
      : `${yyyy}-${mm}-${dd}T${hh}:${min}`;

    setSelectedFollowUp(followUp);
    setFollowUpForm({
      contactedAt: contactedAtLocal,
      channel: latestRecord?.channel || "LLAMADA",
      outcome: latestRecord?.outcome || "CONTACTADO",
      resolution: latestRecord?.status === "RECHAZADO" ? "RECHAZADO" : "ACEPTADO",
      notes: latestRecord?.notes || "",
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
      await completeFollowUp(selectedFollowUp.raw.id, {
        contactedAt: toUtcIsoFromDateTimeLocal(followUpForm.contactedAt),
        channel: followUpForm.channel,
        outcome: followUpForm.outcome,
        resolution: followUpForm.resolution,
        notes: followUpForm.notes.trim(),
        nextActionAt: followUpForm.nextActionAt
          ? toUtcIsoFromDateTimeLocal(followUpForm.nextActionAt)
          : undefined,
      });

      await fetchServicios();
      toast.success("Seguimiento registrado correctamente");
      setIsFollowUpModalOpen(false);
      setSelectedFollowUp(null);
    } catch (error) {
      console.error("Error completing follow-up", error);
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el seguimiento");
    } finally {
      setSavingFollowUp(false);
    }
  };

  const toggleFollowUpsRow = (servicioId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [servicioId]: !prev[servicioId],
    }));
  };

  const handleCopy = (servicio: Servicio) => {
    const formattedValor = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(servicio.raw.valorCotizado || 0);
    const detalles = [servicio.raw.bloque && `Bloque: ${servicio.raw.bloque}`, servicio.raw.piso && `Piso: ${servicio.raw.piso}`, servicio.raw.unidad && `Unidad: ${servicio.raw.unidad}`].filter(Boolean).join(" - ") || "Sin detalles adicionales";
    const text = `ORDEN DE SERVICIO: #${servicio.id}\n*Cliente:* ${servicio.cliente}\n*Servicio:* ${servicio.servicioEspecifico}\n*Programación:* ${servicio.fecha} a las ${servicio.hora}\n*Técnico:* ${servicio.tecnico}\n*Estado:* ${servicio.estadoServicio}\n*Urgencia:* ${servicio.urgencia}\n*Dirección:* ${servicio.raw.direccionTexto || "No especificada"}\n*Link Maps:* ${servicio.raw.linkMaps || "N/A"}\n*Municipio:* ${servicio.raw.municipio || "N/A"}\n*Barrio:* ${servicio.raw.barrio || "N/A"}\n*Detalles:* ${detalles}\n*Valor Cotizado:* ${formattedValor}\n*Observaciones:* ${servicio.raw.observacion || "Sin observaciones"}`;
    navigator.clipboard.writeText(text).then(() => toast.success("Información copiada")).catch(() => toast.error("Error al copiar"));
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
        programacion: `${formatBogotaDate(dateObj)} a las ${formatBogotaTime(dateObj, "es-CO", { hour: "numeric", minute: "2-digit" })}`,
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

  const openDeleteModal = (servicio: Servicio) => {
    setDeleteTarget(servicio);
    setDeleteReason("");
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = (force = false) => {
    if (isDeletingServicio && !force) return;
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
    setDeleteReason("");
  };

  const handleDeleteServicio = async () => {
    if (!deleteTarget) return;

    const reason = deleteReason.trim();
    if (!reason) {
      toast.error("La observación de borrado es obligatoria");
      return;
    }

    setIsDeletingServicio(true);
    const toastId = toast.loading("Eliminando servicio...");

    try {
      await deleteOrdenServicio(deleteTarget.raw.id, reason);
      toast.success("Servicio eliminado correctamente", { id: toastId });

      if (selectedServicio?.raw.id === deleteTarget.raw.id) {
        setSelectedServicio(null);
        setIsModalOpen(false);
      }

      closeDeleteModal(true);
      await Promise.all([fetchServicios(), fetchKpis()]);
    } catch (error) {
      console.error("Error deleting service", error);
      toast.error(
        error instanceof Error ? error.message : "No fue posible eliminar el servicio",
        { id: toastId },
      );
    } finally {
      setIsDeletingServicio(false);
    }
  };

  const isSixSeven = search === "67";

  if (isLoadingRole) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm font-bold uppercase tracking-widest text-muted-foreground">
        Validando permisos...
      </div>
    );
  }

  if (!canViewServices) {
    return null;
  }

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
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground uppercase">Órdenes de <span className="text-[#01ADFB]">Servicio</span></h1>
              <p className="text-muted-foreground font-medium mt-1 text-[10px] uppercase tracking-widest">Control operativo y trazabilidad de servicios técnicos.</p>
            </div>
            <div className="md:ml-auto flex items-center gap-3">
              <Button
                onClick={handleTriggerJob}
                disabled={isProcessingJob}
                className="h-10 px-6 rounded-xl bg-[#01ADFB]/10 text-[#01ADFB] text-[10px] font-semibold uppercase tracking-widest gap-2 border border-[#01ADFB]/20 hover:bg-[#01ADFB]/20 transition-all"
              >
                <RotateCcw className={cn("h-4 w-4", isProcessingJob && "animate-spin")} />
                Procesar Refuerzos
              </Button>
              <Button
                onClick={() => setShowOperationalQueue(true)}
                className="h-10 px-6 rounded-xl bg-amber-500 text-white text-[10px] font-semibold uppercase tracking-widest gap-2 shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
              >
                <Zap className="h-4 w-4 fill-current" />
                Cola Operativa
                {operationalCounts.atrasados + operationalCounts.sinAsignarHoy + operationalCounts.conIncidencia > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-white text-amber-600 text-[9px] font-semibold animate-pulse">
                    {operationalCounts.atrasados + operationalCounts.sinAsignarHoy + operationalCounts.conIncidencia}
                  </span>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowKPIs(!showKPIs)} className="h-10 px-4 rounded-xl border-border bg-card text-[10px] font-semibold uppercase tracking-widest gap-2">
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
                        <div><p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">{item.label}</p><p className="text-xl font-bold text-foreground">{item.val}</p></div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex-1 min-h-0 flex flex-col bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                  <div className="px-8 py-6 border-b border-border flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-card shrink-0">
                    <div className="flex flex-1 flex-col gap-4 max-w-3xl">
                      <div className="flex flex-wrap gap-2">
                        {VIEW_MODE_OPTIONS.map((option) => (
                          <button
                            key={option.key}
                            onClick={() => {
                              setViewMode(option.key);
                              setCurrentPage(1);
                            }}
                            className={cn(
                              "h-10 rounded-xl border px-4 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
                              viewMode === option.key
                                ? "border-[#01ADFB] bg-[#01ADFB] text-white"
                                : "border-border bg-background text-muted-foreground hover:bg-muted",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-1 items-center gap-3 max-w-2xl">
                        <div className="relative flex-1 group">
                          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-[#01ADFB] transition-colors" />
                          <Input placeholder={viewMode === "seguimientos" ? "Buscar seguimientos..." : "Buscar servicios..."} className="h-12 pl-12 rounded-xl border-none bg-muted focus:ring-2 focus:ring-[#01ADFB]/20 transition-all font-bold text-sm text-foreground" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <button onClick={() => setShowFilters(!showFilters)} className={cn("h-12 px-5 rounded-xl bg-card border border-border text-muted-foreground font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all", showFilters && "bg-primary text-primary-foreground")}>
                          <Filter className="h-4 w-4" /> Filtros
                        </button>
                        {hasActiveFilters && (
                          <button
                            onClick={resetAllFilters}
                            className="h-12 px-5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-destructive hover:text-white"
                          >
                            <RotateCcw className="h-4 w-4" /> Borrar Filtros
                          </button>
                        )}
                      </div>
                    </div>
                    {canCreateServices ? (
                      <Link href="/dashboard/servicios/nuevo"><div className="flex items-center h-12 px-8 rounded-xl bg-[#01ADFB] text-white gap-3 shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95 cursor-pointer"><Plus className="h-5 w-5" /><span className="font-bold uppercase tracking-widest text-[10px]">Nueva Orden</span></div></Link>
                    ) : null}
                  </div>
                  <div className="px-8 py-4 border-b border-border bg-card">
                    <div className="flex flex-wrap gap-2 items-center">
                      {PRESET_OPTIONS.map((preset) => (
                        <button
                          key={preset.key}
                          onClick={() => applyPreset(preset.key)}
                          className={cn(
                            "h-8 px-3 rounded-lg border text-[10px] font-semibold uppercase tracking-wider transition-colors",
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
                              "h-8 px-3 rounded-lg border text-[10px] font-semibold uppercase tracking-wider transition-colors",
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
                        className="h-8 rounded-lg text-[10px] font-semibold uppercase tracking-wider"
                      >
                        + Nuevo preset
                      </Button>
                    </div>
                  </div>

                  {showFilters && (
                    <div className="px-8 py-8 border-b border-border bg-muted/50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                          <div><h3 className="text-sm font-bold uppercase text-foreground flex items-center gap-3"><Filter className="h-5 w-5 text-[#01ADFB]" /> Panel de Filtros</h3><p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">Refine los resultados de búsqueda</p></div>
                          <button onClick={() => { setActivePreset("all"); setFilters({ estado: "all", tecnico: "all", urgencia: "all", creador: "all", municipio: "all", metodoPago: "all", empresa: "all", tipo: "all", fechaInicio: "", fechaFin: "" }); }} className="text-[10px] font-semibold uppercase text-muted-foreground hover:text-[#01ADFB] flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-card border border-border"><RotateCcw className="h-3.5 w-3.5" /> Reiniciar</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                          <div className="space-y-2"><Label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-widest">Creador</Label><Combobox value={filters.creador} onChange={(v) => setFilters(f => ({ ...f, creador: v }))} options={[{ value: "all", label: "TODOS LOS CREADORES" }, ...filterOptions.creadores.map(c => ({ value: c.id, label: c.nombre.toUpperCase() }))]} /></div>
                          <div className="space-y-2"><Label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-widest">Técnico</Label><Combobox value={filters.tecnico} onChange={(v) => setFilters(f => ({ ...f, tecnico: v }))} options={[{ value: "all", label: "TODOS LOS TECNICOS" }, ...filterOptions.tecnicos.map(t => ({ value: t.id, label: t.nombre.toUpperCase() }))]} /></div>
                          <div className="space-y-2"><Label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-widest">Municipio</Label><Combobox value={filters.municipio} onChange={(v) => setFilters(f => ({ ...f, municipio: v }))} options={[{ value: "all", label: "TODOS LOS MUNICIPIOS" }, ...filterOptions.municipios.map(m => ({ value: m, label: m.toUpperCase() }))]} /></div>
                          <div className="space-y-2"><Label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-widest">Estado</Label><Combobox value={filters.estado} onChange={(v) => setFilters(f => ({ ...f, estado: v }))} options={[{ value: "all", label: "TODOS LOS ESTADOS" }, ...filterOptions.estados.map(e => ({ value: e.id, label: e.nombre.toUpperCase() }))]} /></div>
                          <div className="lg:col-span-2 space-y-2"><Label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-widest">Rango de Fechas</Label><div className="flex gap-3"><DatePicker date={filters.fechaInicio ? ymdToPickerDate(filters.fechaInicio) : undefined} onChange={(d) => setFilters(f => ({ ...f, fechaInicio: pickerDateToYmd(d) }))} className="flex-1 h-10 bg-background border-border" placeholder="INICIO" /><DatePicker date={filters.fechaFin ? ymdToPickerDate(filters.fechaFin) : undefined} onChange={(d) => setFilters(f => ({ ...f, fechaFin: pickerDateToYmd(d) }))} className="flex-1 h-10 bg-background border-border" placeholder="FIN" /></div></div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-border flex justify-end"><Button onClick={() => setShowFilters(false)} className="h-10 px-8 rounded-xl text-[10px] font-semibold uppercase tracking-widest bg-foreground text-background shadow-lg hover:opacity-90">Finalizar y Cerrar</Button></div>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto">
                      {viewMode === "seguimientos" ? (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-muted/50 sticky top-0 z-10">
                              <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Seguimiento</th>
                              <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Servicio Madre</th>
                              <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Programación</th>
                              <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Técnico</th>
                              <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Estado</th>
                              <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {paginatedFollowUps.map((s) => (
                              <tr 
                                key={s.raw.id} 
                                className="group hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => { setSelectedServicio(s); setIsModalOpen(true); }}
                              >
                                <td className="px-8 py-6">
                                  <div className="space-y-1">
                                    <p className="font-bold text-foreground tracking-tight uppercase">{s.cliente}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{s.servicioEspecifico}</span>
                                      <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-semibold uppercase", URGENCIA_STYLING[s.urgencia])}>{s.urgencia}</span>
                                    </div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">#{s.id}</p>
                                    {s.raw.seguimientos?.[0]?.completedAt ? (
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                                        Llamada registrada {formatBogotaDateTime(s.raw.seguimientos[0].completedAt)}
                                      </p>
                                    ) : (
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                                        Pendiente desde {formatBogotaDate(s.raw.seguimientos?.[0]?.dueAt || s.raw.fechaVisita || s.raw.createdAt)}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold uppercase text-foreground">{s.parentCliente}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.parentServicio}</p>
                                    <Link 
                                      href={`/dashboard/servicios/${s.parentId}/editar?returnTo=/dashboard/servicios?tab=seguimientos`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#01ADFB]">Ver madre #{s.parentNumero}</span>
                                    </Link>
                                  </div>
                                </td>
                                <td className="px-8 py-6"><div className="space-y-1.5"><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> {s.fecha}</div><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {s.hora}</div></div></td>
                                <td className="px-8 py-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><User className="h-4 w-4 text-muted-foreground" /></div><span className="text-sm font-bold text-foreground uppercase">{s.tecnico}</span></div></td>
                                <td className="px-8 py-6"><span className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase border shadow-sm", ESTADO_STYLING[s.estadoServicio] || ESTADO_STYLING["DEFAULT"])}>{s.estadoServicio}</span></td>
                                <td className="px-8 py-6 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openFollowUpModal(s); }}
                                      className="h-10 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all text-[10px] font-semibold uppercase tracking-widest"
                                    >
                                      {s.raw.seguimientos?.[0]?.completedAt ? "Actualizar llamada" : "Registrar llamada"}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedServicio(s); setIsModalOpen(true); }}
                                      className="h-10 px-3 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground transition-all text-[10px] font-semibold uppercase tracking-widest"
                                    >
                                      Ver
                                    </button>
                                    <Link 
                                      href={`/dashboard/servicios/${s.raw.id}/editar?returnTo=/dashboard/servicios?tab=seguimientos`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="h-10 px-3 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground transition-all text-[10px] font-semibold uppercase tracking-widest flex items-center">
                                        Editar
                                      </div>
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : null}
                      {viewMode !== "seguimientos" ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
          <tr className="border-b border-border bg-muted/50 sticky top-0 z-10">
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">ID Orden</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Cliente / Servicio</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Programación</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Técnico</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground text-center">Tipo Visita</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground text-center">Estado Ops</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground text-center">Estado Pago</th>
            <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {paginatedServicios.map((s) => (
            <React.Fragment key={s.raw.id}>
              <tr 
                className="group hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => { setSelectedServicio(s); setIsModalOpen(true); }}
              >
                <td className="px-8 py-6"><span className="font-mono text-xs font-semibold text-[#01ADFB] bg-[#01ADFB]/10 px-3 py-1.5 rounded-lg border border-[#01ADFB]/20">{s.id}</span></td>
                <td className="px-8 py-6">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground tracking-tight uppercase">{s.cliente}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{s.servicioEspecifico}</span>
                      {s.isFollowUp ? <span className="px-2 py-0.5 rounded-md text-[8px] font-semibold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">seguimiento aceptado</span> : null}
                      <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-semibold uppercase", URGENCIA_STYLING[s.urgencia])}>{s.urgencia}</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6"><div className="space-y-1.5"><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> {s.fecha}</div><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {s.hora}</div></div></td>
                <td className="px-8 py-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><User className="h-4 w-4 text-muted-foreground" /></div><span className="text-sm font-bold text-foreground uppercase">{s.tecnico}</span></div></td>

                {/* 1. TIPO DE VISITA */}
                <td className="px-8 py-6 text-center">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase bg-muted/50 px-3 py-1 rounded-md border border-border">
                    {formatVisitTypeLabel(s.raw.tipoVisita)}
                  </span>
                </td>

                {/* 2. ESTADO OPERATIVO */}
                <td className="px-8 py-6 text-center">
                  <span className={cn(
                    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase border shadow-sm",
                    ESTADO_STYLING[s.estadoServicio] || ESTADO_STYLING["DEFAULT"]
                  )}>
                    {s.estadoServicio}
                  </span>
                </td>

                {/* 3. ESTADO DE PAGO */}
                <td className="px-8 py-6 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    {(() => {
                      const financialLock = getFinancialLockMeta(s.raw);

                      return financialLock.locked ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> Congelada
                        </span>
                      ) : null;
                    })()}
                    <span className={cn(
                      "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase border shadow-sm",
                      ESTADO_PAGO_STYLING[s.raw.estadoPago || "PENDIENTE"] || ESTADO_PAGO_STYLING["DEFAULT"]
                    )}>
                      {s.raw.estadoPago || "PENDIENTE"}
                    </span>

                    {/* Visualización del método de pago con Popover si es mixto */}
                    {s.raw.desglosePago && s.raw.desglosePago.length > 0 ? (
                      s.raw.desglosePago.length > 1 ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-[9px] font-semibold text-[#01ADFB] uppercase cursor-pointer flex items-center gap-1 hover:underline decoration-2 underline-offset-2 transition-all">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#01ADFB] animate-pulse" />
                                Múltiples métodos
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="center" className="w-64 p-4 border-border shadow-2xl rounded-2xl">
                              <div className="space-y-3">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Detalle de Pago Mixto</p>
                                <div className="space-y-2">
                                  {s.raw.desglosePago.map((d, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border border-border">
                                      <span className="text-[9px] font-semibold uppercase text-foreground">{d.metodo}</span>
                                      <span className="text-xs font-semibold text-foreground">$ {Number(d.monto).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="pt-2 border-t border-border flex justify-between items-center">
                                  <span className="text-[9px] font-semibold uppercase text-muted-foreground">Total</span>
                                  <span className="text-sm font-bold text-emerald-600">$ {(s.raw.valorPagado || s.raw.desglosePago.reduce((acc, curr) => acc + Number(curr.monto), 0)).toLocaleString()}</span>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">
                          {s.raw.desglosePago[0].metodo}
                        </span>
                      )
                    ) : (
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">
                        {s.raw.metodoPago?.nombre || "No definido"}
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    {s.followUps.filter((child) => child.raw.seguimientos?.[0]?.status !== "ACEPTADO").length > 0 ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFollowUpsRow(s.raw.id); }}
                        className="h-10 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all flex items-center gap-2"
                        title={expandedRows[s.raw.id] ? "Ocultar seguimientos" : "Ver seguimientos"}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-widest">Seg.</span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", expandedRows[s.raw.id] && "rotate-180")} />
                      </button>
                    ) : null}
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-10 w-10 rounded-xl bg-muted hover:bg-foreground hover:text-background text-muted-foreground transition-all flex items-center justify-center">
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl bg-card border-border shadow-2xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-2 border-b border-border mb-2">Acciones de Servicio</p>
                          <DropdownMenuItem 
                            onClick={() => { setSelectedServicio(s); setIsModalOpen(true); }}
                            className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground"
                          >
                            <Eye className="h-4 w-4 text-[#01ADFB]" /> VER DETALLES
                          </DropdownMenuItem>

                          {canEditServices ? (
                            <Link href={`/dashboard/servicios/${s.raw.id}/editar?returnTo=/dashboard/servicios`} onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground">
                                <Pencil className="h-4 w-4 text-amber-600" /> EDITAR ORDEN
                              </DropdownMenuItem>
                            </Link>
                          ) : null}

                          <DropdownMenuItem 
                            onClick={() => handleCopy(s)}
                            className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground"
                          >
                            <Copy className="h-4 w-4 text-purple-600" /> COPIAR INFO
                          </DropdownMenuItem>

                          {canManageServices ? (
                            <>
                              <DropdownMenuItem onClick={() => handleNotifyOperator(s)} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted">
                                <Send className="h-4 w-4 text-[#01ADFB]" /> ENVIAR A TECNICO
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedServicio(s); setIsVisitaModalOpen(true); }} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted">
                                <MapPin className="h-4 w-4 text-emerald-500" /> EVIDENCIA DE VISITA
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => triggerUpload(s.raw.id, "facturaElectronica")} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted">
                                <Upload className="h-4 w-4 text-blue-500" /> SUBIR FACTURA
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={getFinancialLockMeta(s.raw).locked}
                                onClick={() => triggerUpload(s.raw.id, "comprobantePago")}
                                className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                              >
                                <Receipt className="h-4 w-4 text-orange-500" /> SUBIR COMPROBANTE
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => triggerUpload(s.raw.id, "evidenciaPath")} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-foreground hover:bg-muted">
                                <ImageIcon className="h-4 w-4 text-indigo-500" /> SUBIR EVIDENCIAS
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openDeleteModal(s)} className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" /> ELIMINAR SERVICIO
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          ) : null}

                          {(() => {
                            const settlementMeta = getSettlementFlowMeta(s.raw);
                            const financialLock = settlementMeta.financialLock;

                            return (
                              <>
                                {s.raw.liquidadoAt || s.raw.estadoServicio === "LIQUIDADO" ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedServicio(s);
                                      setIsViewLiquidationModalOpen(true);
                                    }}
                                    className="flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer text-emerald-600 hover:bg-emerald-500/10"
                                  >
                                    <Receipt className="h-4 w-4" /> VER LIQUIDACIÓN
                                  </DropdownMenuItem>
                                ) : financialLock.locked ? (
                                  <DropdownMenuItem disabled className="flex items-start gap-3 py-2.5 text-[11px] font-bold text-amber-700 opacity-100">
                                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                                    <span className="leading-relaxed">
                                      <span className="block uppercase tracking-wider">Orden congelada</span>
                                      <span className="text-[10px] font-medium normal-case">{financialLock.reason}</span>
                                    </span>
                                  </DropdownMenuItem>
                                ) : !s.raw.fechaVisita ? null : (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedServicio(s);
                                      const currentBreakdown = s.raw.desglosePago && s.raw.desglosePago.length > 0
                                        ? s.raw.desglosePago.map(d => ({
                                            metodo: d.metodo,
                                            monto: d.monto.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
                                            banco: d.banco,
                                            referencia: d.referencia,
                                            observacion: d.observacion
                                          }))
                                        : [{
                                            metodo: s.raw.metodoPago?.nombre || (settlementMeta.hasCash ? "EFECTIVO" : "TRANSFERENCIA"),
                                            monto: (s.raw.valorCotizado || "").toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                                          }];
                                      setLiquidarData({
                                        breakdown: currentBreakdown,
                                        observacionFinal: s.raw.observacionFinal || "",
                                        transferencias: settlementMeta.hasTransfer
                                          ? [
                                              ...getStoredTransferencias(s.raw),
                                              createTransferenciaForm(),
                                            ]
                                          : [],
                                      });
                                      setIsLiquidarModalOpen(true);
                                    }}
                                    className={cn(
                                      "flex items-center gap-3 py-2.5 text-[11px] font-bold cursor-pointer",
                                      settlementMeta.accent === "sky" && "text-sky-600 hover:bg-sky-500/10",
                                      settlementMeta.accent === "blue" && "text-blue-600 hover:bg-blue-500/10",
                                      settlementMeta.accent === "emerald" && "text-emerald-600 hover:bg-emerald-500/10",
                                    )}
                                  >
                                    {settlementMeta.isFuture ? <CreditCard className="h-4 w-4" /> : settlementMeta.hasCash ? <Wallet className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                    {settlementMeta.title.toUpperCase()}
                                  </DropdownMenuItem>
                                )}
                              </>
                            );
                          })()}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </td>
              </tr>
                              {expandedRows[s.raw.id] && s.followUps.filter((child) => child.raw.seguimientos?.[0]?.status !== "ACEPTADO").length > 0 ? (
                                <tr className="bg-amber-50/60">
                                  <td colSpan={8} className="px-8 py-5">
                                    <div className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
                                      <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between">
                                        <div>
                                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">Servicios automáticos</p>
                                          <p className="text-xs font-medium text-muted-foreground mt-1">Estas visitas se generaron automáticamente y cuelgan del servicio madre.</p>
                                        </div>
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">{s.followUps.filter((child) => child.raw.seguimientos?.[0]?.status !== "ACEPTADO").length} seguimiento(s)</span>
                                      </div>
                                      <div className="divide-y divide-amber-100">
                                        {s.followUps.filter((child) => child.raw.seguimientos?.[0]?.status !== "ACEPTADO").map((child) => (
                                          <div key={child.raw.id} className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr_auto] gap-4 px-5 py-4">
                                            <div>
                                              <p className="font-bold text-foreground uppercase">{child.servicioEspecifico}</p>
                                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                                                {formatVisitTypeLabel(child.raw.tipoVisita)} • #{child.id}
                                              </p>
                                              <p className="text-xs text-muted-foreground mt-2">{child.raw.observacion || "Servicio automático"}</p>
                                            </div>
                                            <div>
                                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Programación</p>
                                              <p className="text-sm font-bold text-foreground mt-1">{child.fecha}</p>
                                              <p className="text-xs text-muted-foreground">{child.hora}</p>
                                            </div>
                                            <div>
                                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Estado</p>
                                              <span className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase border shadow-sm mt-1", ESTADO_STYLING[child.estadoServicio] || ESTADO_STYLING["DEFAULT"])}>
                                                {child.estadoServicio}
                                              </span>
                                            </div>
                                            <div className="flex items-start justify-end gap-2">
                                              <button
                                                onClick={() => { setSelectedServicio(child); setIsModalOpen(true); }}
                                                className="h-10 px-3 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground transition-all text-[10px] font-semibold uppercase tracking-widest"
                                              >
                                                Ver
                                              </button>
                                              {canEditServices ? (
                                                <Link href={`/dashboard/servicios/${child.raw.id}/editar?returnTo=/dashboard/servicios`}>
                                                  <div className="h-10 px-3 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground transition-all text-[10px] font-semibold uppercase tracking-widest flex items-center">
                                                    Editar
                                                  </div>
                                                </Link>
                                              ) : null}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                      ) : null}
                    </div>
                    {!loading && activeRows.length === 0 && <div className="py-32 text-center flex-1 flex flex-col justify-center items-center"><AlertCircle className="h-12 w-12 text-muted/30 mb-4" /><h2 className="text-xl font-bold text-foreground uppercase">Sin resultados</h2><p className="text-muted-foreground font-medium">{viewMode === "seguimientos" ? "No se encontraron seguimientos para su búsqueda." : "No se encontraron órdenes para su búsqueda."}</p></div>}
                    <div className="px-8 py-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">Mostrando <span className="text-foreground">{Math.min(startIndex + 1, totalCount)}-{Math.min(startIndex + activeRows.length, totalCount)}</span> de <span className="text-foreground">{totalCount}</span></span>
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
            <DialogTitle className="text-lg font-bold uppercase text-foreground">
              {editingPresetId ? "Editar Preset" : "Nuevo Preset"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Guarda los filtros actuales con nombre, color y visibilidad.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Nombre</Label>
              <Input
                value={presetForm.name}
                onChange={(e) => setPresetForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Vencidos Zona Norte"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Color</Label>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPresetForm((prev) => ({ ...prev, colorToken: color }))}
                    className={cn(
                      "h-8 px-2 rounded-md border text-[9px] font-semibold uppercase",
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
              <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Visibilidad</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPresetForm((prev) => ({ ...prev, isShared: false }))}
                  className={cn(
                    "h-9 rounded-lg border text-[10px] font-semibold uppercase",
                    !presetForm.isShared ? "bg-[#01ADFB] text-white border-[#01ADFB]" : "bg-background border-border text-muted-foreground",
                  )}
                >
                  Privado
                </button>
                <button
                  type="button"
                  onClick={() => setPresetForm((prev) => ({ ...prev, isShared: true }))}
                  className={cn(
                    "h-9 rounded-lg border text-[10px] font-semibold uppercase",
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}><DialogContent className="max-w-6xl h-[92vh] p-0 flex flex-col overflow-hidden bg-background border-border shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b shrink-0 bg-muted/30 relative">
          <div className="absolute right-12 top-8 flex items-center gap-3">
             <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm", ESTADO_STYLING[selectedServicio?.estadoServicio || ""] || ESTADO_STYLING["DEFAULT"])}>
                {selectedServicio?.estadoServicio}
             </div>
             <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm", URGENCIA_STYLING[selectedServicio?.urgencia || ""])}>
                Prioridad {selectedServicio?.urgencia}
             </div>
          </div>
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="h-12 w-12 rounded-2xl bg-[#01ADFB]/10 flex items-center justify-center text-[#01ADFB]">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black leading-none tracking-tight text-foreground uppercase">Expediente de Orden <span className="text-[#01ADFB]">#{selectedServicio?.id}</span></DialogTitle>
                <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] mt-1.5">Trazabilidad total del servicio operativo y financiero</DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar bg-background">
          {selectedServicio && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* COLUMNA IZQUIERDA: CLIENTE Y UBICACIÓN */}
              <div className="lg:col-span-7 space-y-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-3">
                    <User className="h-5 w-5 text-[#01ADFB]" />
                    <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Identificación del Cliente</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Nombre / Razón Social</span>
                      <span className="font-bold text-lg text-foreground uppercase leading-tight">{selectedServicio.cliente}</span>
                      <span className="text-[10px] font-black text-[#01ADFB] uppercase tracking-tighter block mt-1">{selectedServicio.clienteFull.tipoCliente}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Documento / NIT</span>
                      <span className="font-bold text-foreground uppercase">{selectedServicio.clienteFull.tipoDocumento || "DOC"} {selectedServicio.clienteFull.numeroDocumento || selectedServicio.clienteFull.nit || "N/A"}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Contacto Directo</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground">{selectedServicio.clienteFull.telefono || "N/A"}</span>
                        {selectedServicio.clienteFull.telefono && (
                          <a 
                            href={`https://wa.me/57${selectedServicio.clienteFull.telefono.replace(/\s+/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                          >
                            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.539 2.016 2.126-.54c1.029.59 1.967.934 3.162.934 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.767-5.768-5.767zm3.349 8.232c-.185.439-.915.803-1.254.853-.254.038-.572.058-1.579-.355-1.21-.496-1.991-1.726-2.051-1.807-.06-.08-.482-.642-.482-1.226 0-.584.307-.87.417-.989.11-.119.239-.149.318-.149.079 0 .159 0 .229.005.071.005.166-.021.259.214.095.238.324.79.353.85.029.06.048.129.01.189-.039.06-.058.099-.117.169-.06.07-.127.156-.181.21-.059.059-.121.124-.052.229.069.106.307.508.658.822.452.402.833.528.95.587.117.059.185.048.254-.029.069-.079.301-.351.381-.469.079-.118.159-.099.269-.059.109.04.693.327.812.387.119.059.198.09.228.139.03.049.03.288-.155.727z"/></svg>
                          </a>
                        )}
                      </div>
                      {selectedServicio.clienteFull.telefono2 && <span className="text-xs text-muted-foreground block">{selectedServicio.clienteFull.telefono2}</span>}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Correo Electrónico</span>
                      <span className="font-bold text-foreground text-sm lowercase">{selectedServicio.clienteFull.correo || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* INFORMACIÓN DEL VEHÍCULO (SI APLICA) */}
                {selectedServicio.raw.vehiculo && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                      <Truck className="h-5 w-5 text-[#01ADFB]" />
                      <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Vehículo Asociado</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-[#01ADFB]/5 rounded-[2rem] border border-[#01ADFB]/10">
                      <div>
                        <span className="text-[9px] font-black text-[#01ADFB] uppercase block">Placa</span>
                        <span className="text-xl font-black text-foreground uppercase">{selectedServicio.raw.vehiculo.placa}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-muted-foreground uppercase block">Marca / Modelo</span>
                        <span className="text-sm font-bold text-foreground uppercase leading-tight">{selectedServicio.raw.vehiculo.marca || "N/A"} {selectedServicio.raw.vehiculo.modelo}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-muted-foreground uppercase block">Color</span>
                        <span className="text-sm font-bold text-foreground uppercase">{selectedServicio.raw.vehiculo.color || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-muted-foreground uppercase block">Tipo</span>
                        <span className="text-sm font-bold text-foreground uppercase">{selectedServicio.raw.vehiculo.tipo || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-3">
                    <MapPin className="h-5 w-5 text-[#01ADFB]" />
                    <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Punto de Servicio</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2 p-4 bg-muted/30 rounded-2xl border border-border">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Dirección de Ejecución</span>
                      <span className="font-bold text-base text-foreground uppercase leading-snug">{selectedServicio.raw.direccionTexto || "N/A"}</span>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedServicio.raw.municipio && <span className="px-2 py-1 rounded-md bg-background border border-border text-[9px] font-black uppercase text-muted-foreground">{selectedServicio.raw.municipio}</span>}
                        {selectedServicio.raw.barrio && <span className="px-2 py-1 rounded-md bg-background border border-border text-[9px] font-black uppercase text-muted-foreground">Barrio: {selectedServicio.raw.barrio}</span>}
                        {selectedServicio.raw.zona?.nombre && <span className="px-2 py-1 rounded-md bg-[#01ADFB]/10 border border-[#01ADFB]/20 text-[9px] font-black uppercase text-[#01ADFB]">Zona: {selectedServicio.raw.zona.nombre}</span>}
                      </div>
                    </div>
                    {selectedServicio.raw.linkMaps && (
                      <div className="md:col-span-2">
                        <Button variant="outline" size="sm" asChild className="h-10 w-full rounded-xl border-[#01ADFB]/20 bg-[#01ADFB]/5 text-[#01ADFB] font-black text-[10px] uppercase tracking-widest gap-2">
                          <a href={selectedServicio.raw.linkMaps} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" /> Abrir en Google Maps
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-3">
                    <Activity className="h-5 w-5 text-[#01ADFB]" />
                    <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Observaciones Técnicas y Hallazgos</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 bg-muted/20 rounded-2xl border border-border italic text-sm text-foreground">
                      <span className="not-italic text-[9px] font-black uppercase text-muted-foreground tracking-widest block mb-2">Instrucciones de Apertura</span>
                      {selectedServicio.raw.observacion || "Sin instrucciones registradas."}
                    </div>
                    <div className="p-5 bg-[#01ADFB]/5 rounded-2xl border border-[#01ADFB]/10 italic text-sm text-foreground">
                      <span className="not-italic text-[9px] font-black uppercase text-[#01ADFB] tracking-widest block mb-2">Reporte de Cierre Técnico</span>
                      {selectedServicio.raw.observacionFinal || "Pendiente de reporte final por el técnico."}
                    </div>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center px-2">
                         <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cond. Higiene</span>
                         <span className="text-xs font-bold uppercase">{selectedServicio.raw.condicionesHigiene || "N/A"}</span>
                       </div>
                       <div className="flex justify-between items-center px-2">
                         <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cond. Local</span>
                         <span className="text-xs font-bold uppercase">{selectedServicio.raw.condicionesLocal || "N/A"}</span>
                       </div>
                    </div>
                    <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                       <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest block mb-1">Hallazgos Estructurales</span>
                       <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">{selectedServicio.raw.hallazgosEstructurales || "No se registraron hallazgos físicos relevantes."}</p>
                    </div>
                  </div>
                </div>

                {/* GALERÍA DE EVIDENCIAS FOTOGRÁFICAS */}
                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-5 w-5 text-pink-500" />
                      <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Evidencias del Trabajo</h3>
                    </div>
                    {canManageServices && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => triggerUpload(selectedServicio.raw.id, "evidenciaPath")}
                        className="h-8 text-[9px] font-black uppercase tracking-widest text-[#01ADFB] hover:bg-[#01ADFB]/10 rounded-lg"
                      >
                        + Añadir Fotos
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {selectedServicio.raw.evidenciaPath && (
                      <div className="group relative aspect-square rounded-2xl overflow-hidden border border-border bg-muted/30">
                        <Image src={selectedServicio.raw.evidenciaPath} alt="Evidencia principal" fill className="object-cover transition-transform group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Button variant="outline" size="sm" asChild className="h-8 text-[9px] font-black uppercase bg-white text-black border-white"><a href={selectedServicio.raw.evidenciaPath} target="_blank" rel="noopener noreferrer">Ver</a></Button>
                        </div>
                      </div>
                    )}
                    {(selectedServicio.raw.evidencias || []).map((ev, idx) => (
                      <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden border border-border bg-muted/30">
                        <Image src={ev.path} alt={`Evidencia ${idx + 1}`} fill className="object-cover transition-transform group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Button variant="outline" size="sm" asChild className="h-8 text-[9px] font-black uppercase bg-white text-black border-white"><a href={ev.path} target="_blank" rel="noopener noreferrer">Ver</a></Button>
                        </div>
                      </div>
                    ))}
                    {!selectedServicio.raw.evidenciaPath && (!selectedServicio.raw.evidencias || selectedServicio.raw.evidencias.length === 0) && (
                      <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl bg-muted/10">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sin evidencias fotográficas</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA: FINANZAS Y TIEMPOS */}
              <div className="lg:col-span-5 space-y-10">
                <div className="p-8 bg-card border border-border shadow-2xl rounded-[2.5rem] space-y-8">
                  {/* RESUMEN FINANCIERO */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                      <Wallet className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Resumen Financiero</h3>
                    </div>
                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Valor Cotizado</span>
                        <span className="text-2xl font-black text-foreground">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(selectedServicio.raw.valorCotizado || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-end border-t border-dashed border-border pt-4">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Valor Recaudado</span>
                        <span className="text-3xl font-black text-emerald-600">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(selectedServicio.raw.valorPagado || 0)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/30 rounded-xl border border-border">
                          <span className="text-[9px] font-black text-muted-foreground uppercase block">Método</span>
                          <span className="text-xs font-bold text-foreground uppercase">{selectedServicio.raw.metodoPago?.nombre || "PENDIENTE"}</span>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border border-border">
                          <span className="text-[9px] font-black text-muted-foreground uppercase block">Estado Pago</span>
                          <span className="text-xs font-bold text-[#01ADFB] uppercase">{selectedServicio.raw.estadoPago || "PENDIENTE"}</span>
                        </div>
                      </div>

                      {/* DOCUMENTOS ADJUNTOS */}
                      <div className="pt-4 grid grid-cols-1 gap-3">
                        {selectedServicio.raw.facturaElectronica && (
                          <Button variant="outline" asChild className="h-11 rounded-xl border-orange-200 bg-orange-50 text-orange-700 font-black text-[10px] uppercase tracking-widest gap-2">
                            <a href={selectedServicio.raw.facturaElectronica} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" /> Ver Factura Electrónica</a>
                          </Button>
                        )}
                        {Array.isArray(selectedServicio.raw.comprobantePago) ? (
                          selectedServicio.raw.comprobantePago.map((soporte, i) => (
                            <Button key={i} variant="outline" asChild className="h-11 rounded-xl border-blue-200 bg-blue-50 text-blue-700 font-black text-[10px] uppercase tracking-widest gap-2">
                              <a href={resolveSoportePagoUrl("tenaxis-docs", soporte.path)} target="_blank" rel="noopener noreferrer"><Receipt className="h-4 w-4" /> Comprobante #{i+1}</a>
                            </Button>
                          ))
                        ) : typeof selectedServicio.raw.comprobantePago === "string" ? (
                          <Button variant="outline" asChild className="h-11 rounded-xl border-blue-200 bg-blue-50 text-blue-700 font-black text-[10px] uppercase tracking-widest gap-2">
                            <a href={selectedServicio.raw.comprobantePago} target="_blank" rel="noopener noreferrer"><Receipt className="h-4 w-4" /> Ver Comprobante</a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                      <Calendar className="h-5 w-5 text-[#01ADFB]" />
                      <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Cronograma</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Programación</span>
                        <span className="font-bold text-sm text-foreground">{selectedServicio.fecha}</span>
                        <span className="text-xs text-muted-foreground block">{selectedServicio.hora}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Técnico Asignado</span>
                        <span className="font-bold text-sm text-foreground uppercase leading-tight">{selectedServicio.tecnico}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-4">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                      <Zap className="h-5 w-5 text-amber-500" />
                      <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Detalle Técnico</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase block">Servicio</span>
                        <span className="text-xs font-bold text-foreground uppercase">{selectedServicio.servicioEspecifico}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase block">Tipo Visita</span>
                        <span className="text-xs font-bold text-foreground uppercase">{formatVisitTypeLabel(selectedServicio.raw.tipoVisita)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase block">Nivel Infestación</span>
                        <span className="text-xs font-bold text-foreground uppercase">{selectedServicio.raw.nivelInfestacion || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase block">Facturación</span>
                        <span className="text-xs font-bold text-foreground uppercase">{selectedServicio.raw.tipoFacturacion || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedServicio && (
          <div className="p-8 border-t shrink-0 bg-muted/30 flex flex-wrap items-center gap-4 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest border-border bg-card shadow-sm hover:bg-muted transition-all">
              Cerrar
            </Button>

            <div className="flex-1 flex gap-3">
              {/* ACCIÓN PRINCIPAL SEGÚN ESTADO */}
              {(() => {
                const settlementMeta = getSettlementFlowMeta(selectedServicio.raw);
                const financialLock = settlementMeta.financialLock;

                if (selectedServicio.raw.liquidadoAt || selectedServicio.raw.estadoServicio === "LIQUIDADO") {
                  return (
                    <Button 
                      onClick={() => setIsViewLiquidationModalOpen(true)}
                      className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-600/20 gap-3"
                    >
                      <Receipt className="h-5 w-5" /> Ver Liquidación
                    </Button>
                  );
                }

                if (!selectedServicio.raw.fechaVisita) return null;

                return (
                  <Button
                    disabled={financialLock.locked}
                    onClick={() => {
                      const s = selectedServicio;
                      const currentBreakdown = s.raw.desglosePago && s.raw.desglosePago.length > 0
                        ? s.raw.desglosePago.map(d => ({
                            metodo: d.metodo,
                            monto: d.monto.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
                            banco: d.banco,
                            referencia: d.referencia,
                            observacion: d.observacion
                          }))
                        : [{
                            metodo: s.raw.metodoPago?.nombre || (settlementMeta.hasCash ? "EFECTIVO" : "TRANSFERENCIA"),
                            monto: (s.raw.valorCotizado || "").toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                          }];
                      setLiquidarData({
                        breakdown: currentBreakdown,
                        observacionFinal: s.raw.observacionFinal || "",
                        transferencias: settlementMeta.hasTransfer
                          ? [
                              ...getStoredTransferencias(s.raw),
                              createTransferenciaForm(),
                            ]
                          : [],
                      });
                      setIsLiquidarModalOpen(true);
                    }}
                    className={cn(
                      "flex-1 h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl gap-3",
                      settlementMeta.accent === "sky" && "bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20",
                      settlementMeta.accent === "blue" && "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
                      settlementMeta.accent === "emerald" && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
                    )}
                  >
                    {settlementMeta.isFuture ? <CreditCard className="h-5 w-5" /> : settlementMeta.hasCash ? <Wallet className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                    {settlementMeta.title}
                  </Button>
                );
              })()}

              {/* ACCIÓN DE SEGUIMIENTO SI ES FOLLOW-UP */}
              {selectedServicio.isFollowUp && (
                <Button 
                  onClick={() => openFollowUpModal(selectedServicio as unknown as FollowUpRow)}
                  className="flex-1 h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-amber-500/20 gap-3"
                >
                  <CheckCircle2 className="h-5 w-5" /> Registrar Llamada
                </Button>
              )}
            </div>

            {canEditServices || canManageServices ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-14 w-14 rounded-2xl border-border bg-card shadow-sm hover:bg-muted p-0 flex items-center justify-center">
                    <MoreHorizontal className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 p-3 rounded-2xl bg-card border-border shadow-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-2 border-b border-border mb-2">Opciones Avanzadas</p>
                  {canEditServices ? (
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/servicios/${selectedServicio.raw.id}/editar`)} className="flex items-center gap-3 py-3 text-xs font-bold cursor-pointer text-foreground rounded-xl hover:bg-muted">
                      <Pencil className="h-4 w-4 text-amber-600" /> EDITAR ORDEN TÉCNICA
                    </DropdownMenuItem>
                  ) : null}
                  {canManageServices ? (
                    <>
                      <DropdownMenuItem onClick={() => { setSelectedServicio(selectedServicio); setIsVisitaModalOpen(true); }} className="flex items-center gap-3 py-3 text-xs font-bold cursor-pointer text-foreground rounded-xl hover:bg-muted">
                        <MapPin className="h-4 w-4 text-emerald-600" /> VER RUTA GEOGRÁFICA
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuItem onClick={() => openDeleteModal(selectedServicio)} className="flex items-center gap-3 py-3 text-xs font-bold cursor-pointer text-destructive rounded-xl hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" /> ANULAR REGISTRO
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        )}
      </DialogContent></Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => { if (!open) closeDeleteModal(); }}>
        <DialogContent className="max-w-xl bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Eliminar Servicio
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Esta acción oculta la orden del flujo operativo normal, pero conserva su historial para auditoría.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive">Servicio a eliminar</p>
                <p className="text-sm font-bold text-foreground">#{deleteTarget.id} · {deleteTarget.cliente}</p>
                <p className="text-xs font-medium text-muted-foreground">{deleteTarget.servicioEspecifico} · {deleteTarget.fecha} · {deleteTarget.hora}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Observación obligatoria
                </Label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Ej: Orden duplicada, creada por error, reprogramada en una nueva orden..."
                  className="min-h-[140px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-destructive"
                  disabled={isDeletingServicio}
                />
                <p className="text-xs text-muted-foreground">
                  Se bloqueará el borrado si la orden ya tiene impacto financiero, nómina o servicios hijos activos.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => closeDeleteModal()}
                  className="flex-1 h-12 rounded-xl border-border bg-card text-[10px] font-semibold uppercase"
                  disabled={isDeletingServicio}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeleteServicio}
                  className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold uppercase text-[10px]"
                  disabled={isDeletingServicio}
                >
                  {isDeletingServicio ? "Eliminando..." : "Confirmar Eliminación"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={canManageServices && isLiquidarModalOpen} onOpenChange={setIsLiquidarModalOpen}>
        <DialogContent className="flex max-h-[92vh] w-[min(96vw,72rem)] max-w-5xl flex-col overflow-hidden border-border bg-background p-0">
          <div className="shrink-0 border-b border-border px-4 pb-4 pt-6 md:px-6">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold uppercase text-foreground md:text-2xl">
                {selectedServicio ? getSettlementFlowMeta(selectedServicio.raw).title : "Registrar movimiento"}
              </DialogTitle>
              <DialogDescription className="max-w-3xl text-sm text-muted-foreground md:text-base">
                {selectedServicio
                  ? getSettlementFlowMeta(selectedServicio.raw).description
                  : "Registro operativo del movimiento financiero de la orden."}
              </DialogDescription>
            </DialogHeader>
          </div>

          {selectedServicio
            ? (() => {
                const settlementMeta = getSettlementFlowMeta(selectedServicio.raw);
                const hasStoredTransferEvidence = Array.isArray(selectedServicio.raw.comprobantePago)
                  ? selectedServicio.raw.comprobantePago.length > 0
                  : Boolean(selectedServicio.raw.comprobantePago);

                return (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-4 py-4 md:px-6 md:py-5">
                      <div className="space-y-5">
                        {settlementMeta.financialLock.locked ? (
                          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
                            <p className="text-[10px] font-semibold uppercase tracking-widest">Orden congelada</p>
                            <p className="mt-1 font-medium">{settlementMeta.financialLock.reason}</p>
                          </div>
                        ) : null}

                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
                          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:p-5">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{settlementMeta.summaryLabel}</p>
                            <div className="mt-2 flex items-end justify-between gap-4">
                              <p className="text-3xl font-bold leading-none text-emerald-600 md:text-[2.5rem]">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(selectedServicio.raw.valorCotizado || 0)}
                              </p>
                              <CheckCircle2 className="h-9 w-9 shrink-0 text-emerald-500/30 md:h-10 md:w-10" />
                            </div>
                          </div>

                          <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3 text-xs font-medium leading-relaxed text-muted-foreground">
                            {settlementMeta.isFuture
                              ? "Este registro deja la orden programada. No representa cierre ni conciliación final."
                              : settlementMeta.hasTransfer
                                ? settlementMeta.hasCash
                                  ? hasStoredTransferEvidence
                                    ? "La parte de transferencia ya tiene soporte cargado. El efectivo sigue su ruta de recaudo."
                                    : "La parte de transferencia requiere comprobante, referencia y observación. El efectivo sigue su ruta de recaudo."
                                  : hasStoredTransferEvidence
                                    ? "La transferencia ya tiene soporte cargado. Podés cerrar la orden con esa evidencia."
                                    : "La transferencia requiere comprobante, referencia y observación antes de cerrar la orden."
                                : "Este registro declara recaudo. Contabilidad recalcula y valida antes de conciliar."}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Desglose de Pago</Label>
                          <div className="space-y-3">
                            {liquidarData.breakdown.map((item, idx) => (
                              <div key={idx} className="rounded-2xl border border-border bg-muted/30 p-3 md:p-4">
                                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                                  <div className="space-y-2 min-w-0">
                                    <Label className="text-[9px] font-semibold uppercase text-muted-foreground">Método</Label>
                                    <select
                                      value={item.metodo}
                                      onChange={(e) => {
                                        const newBreakdown = [...liquidarData.breakdown];
                                        newBreakdown[idx].metodo = e.target.value;
                                        setLiquidarData({ ...liquidarData, breakdown: newBreakdown });
                                      }}
                                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    >
                                      {filterOptions.metodosPago.map((m) => (
                                        <option key={m.id} value={m.nombre}>
                                          {m.nombre.toUpperCase()}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-2 min-w-0">
                                    <Label className="text-[9px] font-semibold uppercase text-muted-foreground">Monto ($)</Label>
                                    <Input
                                      placeholder="0"
                                      value={item.monto}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                        const newBreakdown = [...liquidarData.breakdown];
                                        newBreakdown[idx].monto = val;
                                        setLiquidarData({ ...liquidarData, breakdown: newBreakdown });
                                      }}
                                      className="h-10 bg-background font-bold text-sm"
                                    />
                                  </div>

                                  {liquidarData.breakdown.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        const newBreakdown = liquidarData.breakdown.filter((_, i) => i !== idx);
                                        setLiquidarData({ ...liquidarData, breakdown: newBreakdown });
                                      }}
                                      className="h-10 w-full rounded-xl border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all md:w-10 shrink-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLiquidarData(prev => ({
                                ...prev,
                                breakdown: [...prev.breakdown, { metodo: filterOptions.metodosPago[0]?.nombre || "EFECTIVO", monto: "" }]
                              }));
                            }}
                            className="h-10 w-full rounded-xl border-2 border-dashed text-[10px] font-semibold uppercase tracking-widest gap-2 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <Plus className="h-4 w-4" /> Agregar Método de Pago
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {liquidarData.breakdown.some((item) => item.metodo === "TRANSFERENCIA") ? (
                            <div className="space-y-4">
                              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/10 p-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    Transferencias
                                  </Label>
                                  <p className="mt-1 max-w-2xl text-[10px] font-medium leading-relaxed text-muted-foreground">
                                    Podés ver las ya registradas y cargar una segunda o tercera transferencia con su banco y comprobante.
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setLiquidarData((prev) => ({
                                      ...prev,
                                      transferencias: [...prev.transferencias, createTransferenciaForm()],
                                    }))
                                  }
                                  className="h-9 rounded-xl border-dashed px-3 text-[10px] font-semibold uppercase tracking-widest lg:shrink-0"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Agregar transferencia
                                </Button>
                              </div>

                              <div className="space-y-3">
                                {liquidarData.transferencias.map((transferencia, idx) => (
                                  <div key={transferencia.id} className="rounded-2xl border border-border bg-muted/20 p-3 md:p-4">
                                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground">
                                          Transferencia #{idx + 1}
                                        </p>
                                        <p className="text-[10px] font-medium text-muted-foreground">
                                          {transferencia.persisted ? "Ya registrada" : "Nueva transferencia a registrar"}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {transferencia.persisted ? (
                                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-widest text-emerald-700">
                                            Guardada
                                          </span>
                                        ) : liquidarData.transferencias.filter((item) => !item.persisted).length > 1 ? (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() =>
                                              setLiquidarData((prev) => ({
                                                ...prev,
                                                transferencias: prev.transferencias.filter((item) => item.id !== transferencia.id),
                                              }))
                                            }
                                            className="h-9 w-9 rounded-xl border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                      <div className="space-y-2 min-w-0">
                                        <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Monto</Label>
                                        <Input
                                          value={transferencia.monto}
                                          disabled={transferencia.persisted}
                                          onChange={(e) =>
                                            setLiquidarData((prev) => ({
                                              ...prev,
                                              transferencias: prev.transferencias.map((item) =>
                                                item.id === transferencia.id
                                                  ? {
                                                      ...item,
                                                      monto: e.target.value
                                                        .replace(/\D/g, "")
                                                        .replace(/\B(?=(\d{3})+(?!\d))/g, "."),
                                                    }
                                                  : item,
                                              ),
                                            }))
                                          }
                                          placeholder="Ej. 50.000"
                                          className="h-10 bg-background font-bold text-sm"
                                        />
                                      </div>

                                      <div className="space-y-2 min-w-0">
                                        <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Fecha de pago</Label>
                                        <Input
                                          type="date"
                                          value={transferencia.fechaPago}
                                          disabled={transferencia.persisted}
                                          onChange={(e) =>
                                            setLiquidarData((prev) => ({
                                              ...prev,
                                              transferencias: prev.transferencias.map((item) =>
                                                item.id === transferencia.id ? { ...item, fechaPago: e.target.value } : item,
                                              ),
                                            }))
                                          }
                                          className="h-10 bg-background text-sm font-medium"
                                        />
                                      </div>

                                      <div className="space-y-2 min-w-0">
                                        <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Referencia</Label>
                                        <Input
                                          value={transferencia.referenciaPago}
                                          disabled={transferencia.persisted}
                                          onChange={(e) =>
                                            setLiquidarData((prev) => ({
                                              ...prev,
                                              transferencias: prev.transferencias.map((item) =>
                                                item.id === transferencia.id ? { ...item, referenciaPago: e.target.value } : item,
                                              ),
                                            }))
                                          }
                                          placeholder="Ej. 94839274"
                                          className="h-10 bg-background font-bold text-sm"
                                        />
                                      </div>

                                      <div className="space-y-2 min-w-0">
                                        <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Banco</Label>
                                        <Input
                                          value={transferencia.banco}
                                          disabled={transferencia.persisted}
                                          onChange={(e) =>
                                            setLiquidarData((prev) => ({
                                              ...prev,
                                              transferencias: prev.transferencias.map((item) =>
                                                item.id === transferencia.id ? { ...item, banco: e.target.value } : item,
                                              ),
                                            }))
                                          }
                                          placeholder="Ej. Bancolombia"
                                          className="h-10 bg-background text-sm font-medium"
                                        />
                                      </div>

                                      <div className="space-y-2 sm:col-span-2 xl:col-span-2 min-w-0">
                                        <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Comprobante</Label>
                                        {transferencia.persisted && transferencia.existingPath ? (
                                          <a
                                            href={resolveSoportePagoUrl("tenaxis-docs", transferencia.existingPath)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex h-10 items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 text-[10px] font-semibold uppercase tracking-widest text-emerald-700"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Ver comprobante cargado
                                          </a>
                                        ) : (
                                          <Input
                                            type="file"
                                            accept="application/pdf,image/*"
                                            onChange={(e) =>
                                              setLiquidarData((prev) => ({
                                                ...prev,
                                                transferencias: prev.transferencias.map((item) =>
                                                  item.id === transferencia.id
                                                    ? { ...item, comprobanteFile: e.target.files?.[0] || null }
                                                    : item,
                                                ),
                                              }))
                                            }
                                            className="h-10 bg-background font-medium text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                                          />
                                        )}
                                      </div>
                                    </div>

                                    <div className="mt-3 space-y-2">
                                      <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Observación de transferencia</Label>
                                      <textarea
                                        value={transferencia.observacion}
                                        disabled={transferencia.persisted}
                                        onChange={(e) =>
                                          setLiquidarData((prev) => ({
                                            ...prev,
                                            transferencias: prev.transferencias.map((item) =>
                                              item.id === transferencia.id ? { ...item, observacion: e.target.value } : item,
                                            ),
                                          }))
                                        }
                                        className="min-h-[72px] w-full rounded-2xl border border-border bg-background p-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                                        placeholder="Notas de esta transferencia..."
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="space-y-2">
                            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Observación de Cierre</Label>
                            <textarea
                              value={liquidarData.observacionFinal}
                              onChange={(e) => setLiquidarData({ ...liquidarData, observacionFinal: e.target.value })}
                              className="w-full min-h-[96px] rounded-2xl border border-border bg-muted p-4 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20"
                              placeholder="Notas adicionales..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 border-t border-border bg-background px-4 py-4 md:px-6">
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setIsLiquidarModalOpen(false)} className="flex-1 h-12 rounded-xl border-border bg-card text-[10px] font-semibold uppercase">Cancelar</Button>
                        <Button
                          onClick={handleLiquidar}
                          disabled={isUploading || settlementMeta.financialLock.locked}
                          className={cn(
                            "flex-1 h-12 rounded-xl font-bold uppercase text-[10px] shadow-lg",
                            settlementMeta.accent === "emerald" && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
                            settlementMeta.accent === "blue" && "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
                            settlementMeta.accent === "sky" && "bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20",
                          )}
                        >
                          {isUploading ? "Procesando..." : settlementMeta.submitLabel}
                        </Button>
                      </div>
                    </div>
                  </>
                );
              })()
            : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isFollowUpModalOpen} onOpenChange={(open) => { if (!savingFollowUp) setIsFollowUpModalOpen(open); }}>
        <DialogContent className="max-w-2xl bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase text-foreground">Registrar Llamada De Seguimiento</DialogTitle>
            <DialogDescription className="text-muted-foreground">Guarda el resultado del seguimiento y libera el bloqueo si no quedan pendientes vencidos.</DialogDescription>
          </DialogHeader>
          {selectedFollowUp ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Seguimiento seleccionado</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-bold uppercase text-foreground">{selectedFollowUp.cliente}</p>
                  <p className="text-sm text-muted-foreground">{selectedFollowUp.servicioEspecifico}</p>
                  <p className="text-xs font-medium text-muted-foreground">Programado para {selectedFollowUp.fecha} a las {selectedFollowUp.hora}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fecha y hora de contacto</Label>
                  <Input type="datetime-local" value={followUpForm.contactedAt} onChange={(e) => setFollowUpForm((current) => ({ ...current, contactedAt: e.target.value }))} className="h-11 rounded-xl border-border font-medium" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Canal</Label>
                  <Combobox
                    value={followUpForm.channel}
                    onChange={(value) => setFollowUpForm((current) => ({ ...current, channel: value }))}
                    options={[
                      { value: "LLAMADA", label: "LLAMADA" },
                      { value: "WHATSAPP", label: "WHATSAPP" },
                      { value: "CORREO", label: "CORREO" },
                      { value: "VISITA", label: "VISITA" },
                    ]}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resultado</Label>
                  <Combobox
                    value={followUpForm.outcome}
                    onChange={(value) => setFollowUpForm((current) => ({ ...current, outcome: value }))}
                    options={[
                      { value: "CONTACTADO", label: "CONTACTADO" },
                      { value: "NO_CONTESTA", label: "NO CONTESTA" },
                      { value: "REPROGRAMAR", label: "REPROGRAMAR" },
                      { value: "CIERRE_EXITOSO", label: "CIERRE EXITOSO" },
                      { value: "REQUIERE_ESCALACION", label: "REQUIERE ESCALACION" },
                    ]}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Decisión del cliente</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={followUpForm.resolution === "ACEPTADO" ? "default" : "outline"}
                      onClick={() => setFollowUpForm((current) => ({ ...current, resolution: "ACEPTADO" }))}
                      className="h-11 rounded-xl text-[10px] font-semibold uppercase tracking-[0.16em]"
                    >
                      Aceptado
                    </Button>
                    <Button
                      type="button"
                      variant={followUpForm.resolution === "RECHAZADO" ? "destructive" : "outline"}
                      onClick={() => setFollowUpForm((current) => ({ ...current, resolution: "RECHAZADO" }))}
                      className="h-11 rounded-xl text-[10px] font-semibold uppercase tracking-[0.16em]"
                    >
                      Rechazado
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notas</Label>
                  <textarea
                    value={followUpForm.notes}
                    onChange={(e) => setFollowUpForm((current) => ({ ...current, notes: e.target.value }))}
                    placeholder="Ej: Se llamó al cliente, confirmó satisfacción y no requiere nueva visita."
                    className="min-h-[120px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-[#01ADFB]"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Próxima acción opcional</Label>
                  <Input type="datetime-local" value={followUpForm.nextActionAt} onChange={(e) => setFollowUpForm((current) => ({ ...current, nextActionAt: e.target.value }))} className="h-11 rounded-xl border-border font-medium" />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFollowUpModalOpen(false)} disabled={savingFollowUp} className="h-11 rounded-xl text-[10px] font-semibold uppercase tracking-[0.16em]">Cancelar</Button>
                <Button type="button" onClick={handleCompleteFollowUp} disabled={savingFollowUp} className="h-11 rounded-xl bg-emerald-600 text-[10px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-emerald-700">
                  {savingFollowUp ? "Guardando..." : "Guardar llamada"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isVisitaModalOpen} onOpenChange={setIsVisitaModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase text-foreground">Evidencia de Visita</DialogTitle>
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
                            <p className="text-xs font-semibold text-foreground uppercase">Visita #{idx + 1}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{geo.membership.user.nombre} {geo.membership.user.apellido}</p>
                          </div>
                        </div>
                        {geo.linkMaps && (
                          <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl border-border bg-card text-[10px] font-semibold uppercase gap-2">
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
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Llegada</p>
                            </div>
                            <p className="text-xs font-bold text-foreground">{formatBogotaDateTime(geo.llegada)}</p>
                          </div>
                          <div className="aspect-video relative rounded-2xl border border-border bg-muted overflow-hidden flex items-center justify-center">
                            {geo.fotoLlegada ? (
                              <Image
                                src={getStorageUrl("EvidenciaOrdenServicio", geo.fotoLlegada)}
                                alt="Foto Llegada"
                                fill
                                className="object-cover"
                              />
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
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Salida</p>
                            </div>
                            <p className="text-xs font-bold text-foreground">{geo.salida ? formatBogotaDateTime(geo.salida) : "Pendiente"}</p>
                          </div>
                          <div className="aspect-video relative rounded-2xl border border-border bg-muted overflow-hidden flex items-center justify-center">
                            {geo.fotoSalida ? (
                              <Image
                                src={getStorageUrl("EvidenciaOrdenServicio", geo.fotoSalida)}
                                alt="Foto Salida"
                                fill
                                className="object-cover"
                              />
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
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase">Coordenadas</p>
                          <p className="font-mono text-xs font-bold text-foreground">{geo.latitud?.toFixed(6) || "N/A"}, {geo.longitud?.toFixed(6) || "N/A"}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase">Duración</p>
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
                  <h3 className="text-sm font-bold text-foreground uppercase">Sin registros de geolocalización</h3>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase mt-1">El técnico no ha marcado su llegada a este servicio.</p>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setIsVisitaModalOpen(false)} className="h-12 px-8 rounded-xl font-bold uppercase text-[10px] border-border bg-card">Cerrar Evidencias</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf,image/*" disabled={isUploading} />

      {/* PANEL LATERAL: COLA OPERATIVA */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-[450px] bg-background border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
        showOperationalQueue ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="p-6 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-600 fill-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground uppercase tracking-tight">Cola Operativa Pendiente</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowOperationalQueue(false)} className="rounded-full hover:bg-muted">
              <XCircle className="h-6 w-6 text-muted-foreground" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest leading-relaxed">
            Priorización de despacho y ejecución diaria de servicios técnicos.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* SECCIONES DE LA COLA */}
          {[
            {
              title: "Sin asignar hoy",
              items: servicios.filter(s => s.raw.fechaVisita && utcIsoToBogotaYmd(s.raw.fechaVisita) === toBogotaYmd() && !s.tecnicoId),
              color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", icon: UserX, filterKey: "SIN_ASIGNAR_HOY"
            },
            {
              title: "Por iniciar",
              items: servicios.filter(s => s.raw.fechaVisita && utcIsoToBogotaYmd(s.raw.fechaVisita) === toBogotaYmd() && s.estadoServicio === "PROGRAMADO"),
              color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", icon: PlayCircle, filterKey: "POR_INICIAR"
            },
            {
              title: "En ejecución",
              items: servicios.filter(s => ["PROCESO", "EN PROCESO"].includes(s.estadoServicio)),
              color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", icon: Truck, filterKey: "EN_EJECUCION"
            },
            {
              title: "Pendientes de cierre",
              items: servicios.filter(s => ["TECNICO_FINALIZO", "TECNICO FINALIZO", "TECNICO FINALIZADO"].includes(s.estadoServicio)),
              color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", icon: CheckCircle2, filterKey: "PENDIENTES_CIERRE"
            },
            {
              title: "Con incidencia",
              items: servicios.filter(s => ["SIN_CONCRETAR", "SIN CONCRETAR"].includes(s.estadoServicio)),
              color: "text-red-600", bg: "bg-red-50", border: "border-red-100", icon: AlertTriangle, filterKey: "CON_INCIDENCIA"
            },
            {
              title: "Atrasados",
              items: servicios.filter(s => {
                const visitYmd = s.raw.fechaVisita ? utcIsoToBogotaYmd(s.raw.fechaVisita) : null;
                return visitYmd && visitYmd < toBogotaYmd() && !["LIQUIDADO", "CANCELADO", "SIN_CONCRETAR", "SIN CONCRETAR"].includes(s.estadoServicio);
              }),
              color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", icon: Clock, filterKey: "ATRASADOS"
            },
          ].map((section) => (
            <div key={section.title} className="space-y-4">
              <button
                onClick={() => toggleOperationalSection(section.filterKey)}
                className="w-full flex items-center justify-between border-b border-border pb-2 group/header"
              >
                <div className="flex items-center gap-2">
                  <section.icon className={cn("h-4 w-4", section.color)} />
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground group-hover/header:text-amber-600 transition-colors">{section.title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-semibold", section.bg, section.color)}>
                    {section.items.length}
                  </span>
                  <ChevronDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                    expandedOperationalSections[section.filterKey] ? "rotate-0" : "-rotate-90"
                  )} />
                </div>
              </button>

              {expandedOperationalSections[section.filterKey] && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {section.items.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic px-2">No hay pendientes en esta categoría.</p>
                  ) : (
                    section.items.slice(0, 5).map((s) => (
                      <div
                        key={s.raw.id}
                        className="group p-4 rounded-2xl bg-card border border-border hover:border-amber-500/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                        onClick={() => {
                          setSelectedServicio(s);
                          setIsModalOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-[9px] font-semibold uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                            #{s.id}
                          </span>
                          <span className={cn("text-[8px] font-semibold uppercase px-2 py-0.5 rounded shadow-sm", URGENCIA_STYLING[s.urgencia])}>
                            {s.urgencia}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-foreground uppercase truncate mb-1">{s.cliente}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3">{s.servicioEspecifico}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span className="text-[9px] font-bold">{s.fecha}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                        </div>
                      </div>
                    ))
                  )}
                  {section.items.length > 5 && (
                    <Button
                      variant="link"
                      className="w-full text-[9px] font-semibold uppercase text-[#01ADFB] h-auto p-0"
                      onClick={() => {
                        applyOperationalFilter(section.filterKey);
                        setShowOperationalQueue(false);
                      }}
                    >
                      Ver los {section.items.length} pendientes
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-border bg-muted/30 shrink-0">
          <Button
            className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-amber-500/20"
            onClick={() => {
              resetAllFilters();
              setViewMode("servicios");
              setShowOperationalQueue(false);
            }}
          >
            Ver todos los servicios
          </Button>
        </div>
      </div>

      <Dialog open={isViewLiquidationModalOpen} onOpenChange={setIsViewLiquidationModalOpen}>
        <DialogContent className="max-w-2xl bg-background border-border max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase text-foreground flex items-center gap-3">
              <Receipt className="h-6 w-6 text-emerald-500" /> Detalle de Liquidación
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Resumen financiero y auditoría del cierre de la orden.
            </DialogDescription>
          </DialogHeader>

          {selectedServicio && (
            <div className="space-y-6 mt-4">
              {/* Encabezado rápido */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Orden</p>
                  <p className="font-bold text-foreground">#{selectedServicio.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Cliente</p>
                  <p className="font-bold text-foreground uppercase truncate max-w-[200px]">{selectedServicio.cliente}</p>
                </div>
              </div>

              {/* Montos destacados */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase mb-1">Total Pagado</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(selectedServicio.raw.valorPagado || 0)}
                  </p>
                </div>
                <div className="p-6 bg-muted/30 border border-border rounded-2xl">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Valor Cotizado</p>
                  <p className="text-2xl font-bold text-foreground opacity-60">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(selectedServicio.raw.valorCotizado || 0)}
                  </p>
                </div>
              </div>

              {/* Desglose de Pago */}
              <div className="space-y-3">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Desglose de Métodos de Pago</Label>
                <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
                  {selectedServicio.raw.desglosePago && selectedServicio.raw.desglosePago.length > 0 ? (
                    selectedServicio.raw.desglosePago.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-card">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                            {p.metodo.includes("EFECTIVO") ? <Wallet className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground uppercase">{p.metodo}</p>
                            {p.referencia && <p className="text-[9px] font-bold text-muted-foreground uppercase">REF: {p.referencia}</p>}
                          </div>
                        </div>
                        <p className="text-sm font-bold text-foreground">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.monto)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs font-bold text-muted-foreground italic">
                      No hay información de desglose detallada.
                    </div>
                  )}
                </div>
              </div>

              {/* Auditoría y Soporte */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Liquidado Por</Label>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border">
                    <p className="text-sm font-bold text-foreground uppercase">
                      {selectedServicio.raw.liquidadoPor?.user ? `${selectedServicio.raw.liquidadoPor.user.nombre} ${selectedServicio.raw.liquidadoPor.user.apellido}` : "SISTEMA"}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground mt-1">
                      {selectedServicio.raw.liquidadoAt ? formatBogotaDateTime(selectedServicio.raw.liquidadoAt) : "Fecha no registrada"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Soportes de Pago</Label>
                  <div className="flex flex-col gap-2">
                    {(() => {
                      const soportes = selectedServicio.raw.comprobantePago;

                      // Caso 1: No hay soportes
                      if (!soportes || (Array.isArray(soportes) && soportes.length === 0)) {
                        return (
                          <div className="h-[52px] flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 text-[9px] font-semibold text-muted-foreground uppercase">
                            Sin comprobantes adjuntos
                          </div>
                        );
                      }

                      // Caso 2: Es un array (Nuevo formato)
                      if (Array.isArray(soportes)) {
                        return soportes.map((sop, idx) => {
                          const tipoSoporte =
                            typeof sop?.tipo === "string" && sop.tipo.trim().length > 0
                              ? sop.tipo.replace(/_/g, " ")
                              : `COMPROBANTE ${idx + 1}`;

                          return (
                          <Button
                            key={`soporte-${idx}`}
                            variant="outline"
                            className="w-full h-11 rounded-xl border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 font-bold text-[9px] uppercase tracking-widest gap-2 justify-start px-4"
                            asChild
                          >
                            <a href={resolveSoportePagoUrl("tenaxis-docs", sop.path)} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" /> {tipoSoporte}
                            </a>
                          </Button>
                          );
                        });
                      }

                      // Caso 3: Es un string (Legado)
                      return (
                        <Button
                          variant="outline"
                          className="w-full h-11 rounded-xl border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 font-bold text-[9px] uppercase tracking-widest gap-2 justify-start px-4"
                          asChild
                        >
            <a href={resolveSoportePagoUrl("EvidenciaOrdenServicio", soportes as unknown as string)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> SOPORTE PRINCIPAL (LEGACY)
                          </a>
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Observación Final */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Observaciones de Cierre</Label>
                <div className="p-4 rounded-2xl bg-muted/30 border border-border min-h-[80px]">
                  <p className="text-sm font-medium text-foreground italic">
                    {selectedServicio.raw.observacionFinal || "Sin observaciones adicionales."}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 h-12 rounded-xl bg-foreground text-background font-bold uppercase text-[10px] tracking-widest"
                  onClick={() => setIsViewLiquidationModalOpen(false)}
                >
                  Cerrar Visualización
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* OVERLAY PARA CERRAR PANEL */}
      {showOperationalQueue && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[45]"
          onClick={() => setShowOperationalQueue(false)}
        />
      )}
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
