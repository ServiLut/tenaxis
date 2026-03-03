"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout, JoinOrganization } from "@/components/dashboard";
import { cn } from "@/components/ui/utils";
import {
  Users,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Info,
  Clock,
  CreditCard,
  MapPin,
  User,
  ExternalLink,
  Briefcase as BriefcaseIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  getDashboardStatsAction, 
  getOrdenesServicioAction, 
  deleteOrdenServicioAction,
  type DashboardStats 
} from "./actions";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// --- Components ---

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "relative overflow-hidden rounded-3xl border border-border bg-card/40 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md",
    className
  )}>
    {children}
  </div>
);

const CircularProgress = ({ progress, color, size = 60 }: { progress: number; color: string; size?: number }) => {
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-black text-foreground">{progress}%</span>
    </div>
  );
};

const MiniBarChart = () => {
  const data = [40, 70, 45, 90, 65, 80, 50];
  return (
    <div className="flex h-12 items-end gap-1.5">
      {data.map((height, i) => (
        <div
          key={i}
          className={cn(
            "w-2 rounded-full transition-all duration-500",
            i % 2 === 0 ? "bg-[#01ADFB]" : "bg-primary dark:bg-muted"
          )}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [hasTenant, setHasTenant] = useState<boolean | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentServices, setRecentServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedServicio, setSelectedServicio] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDashboardData = async (enterpriseId?: string) => {
    setLoading(true);
    try {
      const [statsData, ordersData] = await Promise.all([
        getDashboardStatsAction(enterpriseId),
        getOrdenesServicioAction(enterpriseId)
      ]);
      setStats(statsData as DashboardStats);
      setRecentServices(Array.isArray(ordersData) ? ordersData.slice(0, 4) : []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Error al actualizar los datos del dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedServicio) return;
    
    setIsDeleting(true);
    const toastId = toast.loading("Eliminando orden de servicio...");
    
    try {
      const result = await deleteOrdenServicioAction(selectedServicio.id);
      
      if (result.success) {
        toast.success("Orden eliminada correctamente", { id: toastId });
        setIsDeleteModalOpen(false);
        const cookieEntries = document.cookie.split('; ');
        const enterpriseId = cookieEntries.find(row => row.startsWith('x-enterprise-id='))?.split('=')[1];
        fetchDashboardData(enterpriseId);
      } else {
        toast.error(result.error || "Error al eliminar la orden", { id: toastId });
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Ocurrió un error inesperado al eliminar", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    let tenantExists = false;
    let enterpriseId: string | undefined;

    if (userData && userData !== "undefined") {
      try {
        const user = JSON.parse(userData);
        tenantExists = !!user.tenantId;

        if (user.tenantId) {
          const cookieEntries = document.cookie.split('; ');
          const hasTenantCookie = cookieEntries.some(row => row.startsWith('tenant-id='));
          if (!hasTenantCookie) {
            document.cookie = `tenant-id=${user.tenantId}; path=/; max-age=86400; SameSite=Lax`;
          }
          enterpriseId = cookieEntries.find(row => row.startsWith('x-enterprise-id='))?.split('=')[1];
        }
      } catch {
        tenantExists = false;
      }
    }

    setHasTenant(tenantExists);

    if (tenantExists) {
      fetchDashboardData(enterpriseId);
    }
  }, []);

  if (hasTenant === null) return null;

  if (!hasTenant) {
    return (
      <DashboardLayout>
        <JoinOrganization />
      </DashboardLayout>
    );
  }

  const kpis = [
    {
      title: "Clientes Totales",
      value: stats?.totalClientes.toLocaleString() || "0",
      change: "+0%",
      trend: "up",
      icon: Users,
      color: "#01ADFB",
      progress: 100,
    },
    {
      title: "Servicios Hoy",
      value: stats?.serviciosHoy.toString() || "0",
      change: "+0%",
      trend: "up",
      icon: Briefcase,
      color: "#01ADFB",
      progress: 100,
    },
    {
      title: "Ingresos Mes",
      value: `$${stats?.ingresosMes.toLocaleString() || "0"}`,
      change: "+0%",
      trend: "up",
      icon: TrendingUp,
      color: "#01ADFB",
      progress: 100,
    },
    {
      title: "Alertas Activas",
      value: stats?.alertasActivas.toString() || "0",
      change: "0",
      trend: "down",
      icon: AlertTriangle,
      color: stats?.alertasActivas && stats.alertasActivas > 0 ? "#EF4444" : "#706F71",
      progress: stats?.alertasActivas && stats.alertasActivas > 0 ? 100 : 0,
    },
  ];

  const maxWeeklyRevenue = stats?.ingresosSemanales ? Math.max(...stats.ingresosSemanales, 1) : 1;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-10">

        {/* Header & Actions */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-foreground lg:text-5xl">
              Dashboard <span className="text-[#01ADFB]">Analytics</span>
            </h1>
            <p className="text-lg font-medium text-muted-foreground">
              Bienvenido de nuevo. Aquí tienes un resumen del rendimiento actual.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex h-12 items-center gap-2 rounded-2xl bg-card px-6 text-sm font-black uppercase tracking-widest text-foreground shadow-sm border border-border transition-all hover:bg-muted">
              <Download className="h-4 w-4" />
              Reporte
            </button>
            <button className="flex h-12 items-center gap-2 rounded-2xl bg-[#01ADFB] px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95">
              <Plus className="h-5 w-5" />
              Nueva Orden
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((stat) => (
            <GlassCard key={stat.title} className="group">
              <div className="flex items-start justify-between">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110",
                  stat.title === "Clientes Totales" && "bg-[#01ADFB]",
                  stat.title === "Servicios Hoy" && "bg-primary dark:bg-[#01ADFB]",
                  stat.title === "Ingresos Mes" && "bg-[#01ADFB]",
                  stat.title === "Alertas Activas" && "bg-muted-foreground"
                )}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <CircularProgress progress={stat.progress} color={stat.color} />
              </div>

              <div className="mt-6 space-y-1">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {stat.title}
                </p>
                <h3 className="text-3xl font-black tracking-tighter text-foreground">
                  {loading ? "..." : stat.value}
                </h3>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black",
                  stat.trend === "up" ? "bg-[#01ADFB]/10 text-[#01ADFB]" : "bg-muted text-muted-foreground"
                )}>
                  {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.change}
                </div>
                <MiniBarChart />
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Revenue Chart Widget */}
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">Ingresos Semanales</h2>
                <p className="text-sm font-medium text-muted-foreground">Tendencia de ingresos de la semana actual (Lun - Dom)</p>
              </div>
              <button className="flex items-center gap-2 rounded-xl bg-card px-4 py-2 text-xs font-black uppercase tracking-wider text-muted-foreground shadow-sm border border-border hover:bg-muted hover:text-foreground">
                <Download className="h-4 w-4" />
                Exportar
              </button>
            </div>

            <div className="flex h-64 items-end justify-between gap-4 px-2">
              {(stats?.ingresosSemanales || [0, 0, 0, 0, 0, 0, 0]).map((amount, i) => (
                <div key={i} className="group relative flex flex-1 flex-col items-center gap-2">
                  <div className="absolute -top-10 opacity-0 transition-all group-hover:top-[-45px] group-hover:opacity-100">
                    <div className="rounded-lg bg-foreground text-background px-2 py-1 text-[10px] font-bold shadow-xl whitespace-nowrap">
                      ${amount.toLocaleString()}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "w-full rounded-2xl transition-all duration-700 ease-out group-hover:brightness-110",
                      amount === maxWeeklyRevenue && amount > 0 ? "bg-[#01ADFB] shadow-[0_0_20px_rgba(1,173,251,0.3)]" : "bg-muted"
                    )}
                    style={{ height: `${(amount / maxWeeklyRevenue) * 100}%`, minHeight: amount > 0 ? '4px' : '2px' }}
                  />
                  <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                    {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"][i]}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Quick Actions & Tasks */}
          <div className="space-y-6">
            <GlassCard className="bg-gradient-to-br from-[#021359] to-[#01ADFB] dark:from-[#021359] dark:to-[#01ADFB]/40 border-none text-white overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-xl font-black tracking-tight text-white/90">Nueva Orden de Servicio</h3>
                <p className="mt-2 text-sm font-medium text-white/80">Genera una nueva solicitud de mantenimiento rápidamente.</p>
                <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black uppercase tracking-widest text-[#021359] shadow-xl transition-transform hover:scale-[1.02] active:scale-95">
                  Comenzar Ahora
                  <ArrowUpRight className="h-5 w-5" />
                </button>
              </div>
              <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-[#01ADFB]/30 blur-3xl" />
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-black tracking-tight text-foreground">Acciones Recomendadas</h3>
              <div className="mt-6 space-y-3">
                {[
                  { label: "Validar Facturas Pendientes", color: "bg-[#01ADFB]" },
                  { label: "Actualizar Inventario", color: "bg-primary dark:bg-[#01ADFB]" },
                  { label: "Revisar Alertas Críticas", color: "bg-muted-foreground" },
                ].map((action, i) => (
                  <button key={i} className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 transition-colors hover:bg-muted border border-border">
                    <div className={cn("h-2 w-2 rounded-full", action.color)} />
                    <span className="text-xs font-bold text-foreground">{action.label}</span>
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Recent Activity Table */}
          <GlassCard className="lg:col-span-3">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">Actividad Reciente</h2>
                <p className="text-sm font-medium text-muted-foreground">Últimas operaciones realizadas en el sistema</p>
              </div>
              <button
                onClick={() => router.push('/dashboard/servicios')}
                className="text-xs font-black uppercase tracking-widest text-[#01ADFB] hover:underline transition-all"
              >
                Ver Todo el Historial
              </button>
            </div>

            <div className="mt-6 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    <th className="pb-4 pl-2">Servicio</th>
                    <th className="pb-4">Cliente</th>
                    <th className="pb-4">Técnico</th>
                    <th className="pb-4">Monto</th>
                    <th className="pb-4">Estado</th>
                    <th className="pb-4 text-right pr-2">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm font-bold text-muted-foreground">Cargando actividad...</td>
                    </tr>
                  ) : recentServices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm font-bold text-muted-foreground">No hay actividad reciente</td>
                    </tr>
                  ) : recentServices.map((service) => (
                    <tr
                      key={service.id}
                      className="group transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedServicio(service);
                        setIsModalOpen(true);
                      }}
                    >
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#01ADFB]/10 text-[#01ADFB]">
                            <BriefcaseIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground truncate max-w-[150px]">
                              {service.servicioEspecifico || service.servicio?.nombre || "Servicio General"}
                            </p>
                            <p className="text-[10px] font-medium text-muted-foreground">
                              {service.fechaVisita ? new Date(service.fechaVisita).toLocaleDateString() : 'Pendiente'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-sm font-medium text-muted-foreground">
                        {service.cliente?.razonSocial || service.cliente?.nombre || "N/A"}
                      </td>
                      <td className="py-4 text-sm font-medium text-muted-foreground">
                        {service.tecnico?.user?.nombre
                          ? `${service.tecnico.user.nombre} ${service.tecnico.user.apellido || ''}`.trim()
                          : service.tecnico?.nombre || "Sin asignar"}
                      </td>
                      <td className="py-4 text-sm font-black text-foreground">
                        ${(service.valorCotizado || 0).toLocaleString()}
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                          (service.estadoServicio === "LIQUIDADO" || service.estadoServicio === "TECNICO_FINALIZO")
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600"
                        )}>
                          {(service.estadoServicio === "LIQUIDADO" || service.estadoServicio === "TECNICO_FINALIZO") ? "Completado" : "Pendiente"}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2 relative">
                        <button
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === service.id ? null : service.id);
                          }}
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {activeDropdown === service.id && (
                          <div
                            className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-border bg-card p-2 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setSelectedServicio(service);
                                setIsModalOpen(true);
                                setActiveDropdown(null);
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" />
                              Ver Detalles
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/servicios/${service.id}/editar?returnTo=/dashboard`)}
                              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Edit2 className="h-4 w-4" />
                              Editar
                            </button>
                            <div className="my-1 h-px bg-border" />
                            <button
                              onClick={() => {
                                setSelectedServicio(service);
                                setIsDeleteModalOpen(true);
                                setActiveDropdown(null);
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Modals */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-foreground uppercase">Detalles del Servicio</DialogTitle>
            <DialogDescription className="text-muted-foreground">Información detallada de la orden de servicio seleccionada.</DialogDescription>
          </DialogHeader>
          
          {selectedServicio && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Servicio</Label>
                  <p className="mt-1 text-sm font-bold text-foreground">{selectedServicio.servicioEspecifico || selectedServicio.servicio?.nombre || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</Label>
                  <p className="mt-1 text-sm font-bold text-foreground">{selectedServicio.cliente?.razonSocial || selectedServicio.cliente?.nombre || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ubicación</Label>
                  <div className="mt-1 flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-[#01ADFB]" />
                    <p className="text-sm font-bold text-foreground">{selectedServicio.direccionTexto || "Sin dirección registrada"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Técnico Asignado</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                      {selectedServicio.tecnico?.user?.nombre?.charAt(0) || 'T'}
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {selectedServicio.tecnico?.user?.nombre 
                        ? `${selectedServicio.tecnico.user.nombre} ${selectedServicio.tecnico.user.apellido || ''}`.trim()
                        : "Sin asignar"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-bold text-foreground">{selectedServicio.fechaVisita ? new Date(selectedServicio.fechaVisita).toLocaleDateString() : 'Pendiente'}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monto</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                      <p className="text-sm font-black text-foreground">${(selectedServicio.valorCotizado || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado</Label>
                  <div className="mt-2">
                    <span className={cn(
                      "inline-flex rounded-xl border border-border bg-muted px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                      (selectedServicio.estadoServicio === "LIQUIDADO" || selectedServicio.estadoServicio === "TECNICO_FINALIZO") 
                        ? "text-emerald-600" 
                        : "text-amber-600"
                    )}>
                      {selectedServicio.estadoServicio}
                    </span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 mt-4 flex items-center justify-between gap-4 border-t border-border pt-6">
                <Button variant="outline" className="flex-1 rounded-2xl border-border bg-card font-black uppercase tracking-widest text-muted-foreground hover:bg-muted" onClick={() => setIsModalOpen(false)}>Cerrar</Button>
                <Button className="flex-1 rounded-2xl bg-[#01ADFB] font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 transition-transform hover:scale-105 active:scale-95" onClick={() => {
                  router.push(`/dashboard/servicios/${selectedServicio.id}/editar?returnTo=/dashboard`);
                }}>Gestionar Orden</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground uppercase">Confirmar Eliminación</DialogTitle>
            <DialogDescription className="text-muted-foreground">¿Estás seguro de que deseas eliminar esta orden de servicio? Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button 
              variant="outline" 
              className="rounded-xl border-border bg-card font-bold text-muted-foreground hover:bg-muted" 
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              className="rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-destructive/20 transition-transform active:scale-95"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar Orden"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
