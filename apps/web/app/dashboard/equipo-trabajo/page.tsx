"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/components/ui/utils";
import { useUserRole } from "@/hooks/use-user-role";
import { exportToExcel } from "@/lib/utils/export-helper";
import {
  Award,
  Download,
  Eye,
  Loader2,
  Plus,
  Save,
  Search,
  Users,
  ChevronRight,
  TrendingUp,
  Star,
  Mail,
  Phone,
  Calendar,
  Car,
  MapPin,
  X,
} from "lucide-react";
import { TeamAlertsPanel } from "./components/team-alerts-panel";
import { TeamKpiStrip } from "./components/team-kpi-strip";
import { TeamMember, useTeamPerformance } from "./hooks/use-team-performance";
import { formatBogotaDate, toBogotaYmd } from "@/utils/date-utils";

const RANKING_ROLES = ["ADMIN", "SU_ADMIN", "COORDINADOR", "ASESOR"];

function TeamPageContent() {
  const { tenantId } = useUserRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchSnapshot = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const {
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    loading,
    error,
    refresh,
    data,
    members,
    allRoles,
    municipalities,
    selectedMemberId,
    setSelectedMemberId,
    memberDetailById,
    fetchMemberDetail,
    loadingDetail,
    updateMemberProfile,
    savingProfile,
  } = useTeamPerformance(tenantId ?? null, searchSnapshot);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<TeamMember | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const selectedUser = useMemo(
    () => members.find((member) => member.id === selectedMemberId) || null,
    [members, selectedMemberId],
  );

  const rankingMembers = useMemo(
    () => members.filter((member) => RANKING_ROLES.includes(member.role)),
    [members],
  );

  const selectedDetail = selectedUser ? memberDetailById[selectedUser.id] : null;

  // Función para generar un color consistente basado en el rol
  const getUserColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-slate-900";
      case "SU_ADMIN": return "bg-indigo-600";
      case "COORDINADOR": return "bg-amber-500";
      case "ASESOR": return "bg-[#01ADFB]";
      default: return "bg-emerald-500";
    }
  };

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    params.set("from", filters.from);
    params.set("to", filters.to);
    params.set("scope", filters.scope);
    if (filters.search) params.set("q", filters.search);
    if (filters.role) params.set("role", filters.role);
    if (filters.municipioId) params.set("municipioId", filters.municipioId);
    if (filters.empresaId) params.set("empresaId", filters.empresaId);
    if (filters.zonaId) params.set("zonaId", filters.zonaId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeTab, filters, pathname, router]);

  useEffect(() => {
    if (selectedMemberId) {
      fetchMemberDetail(selectedMemberId);
    }
  }, [fetchMemberDetail, selectedMemberId]);

  const handleSave = async () => {
    if (!editForm) return;
    const parts = editForm.name.trim().split(" ");
    const nombre = parts[0] || "";
    const apellido = parts.slice(1).join(" ");

    const ok = await updateMemberProfile(editForm.id, {
      nombre,
      apellido,
      email: editForm.email,
      telefono: editForm.phone,
      placa: editForm.placa || undefined,
      moto: editForm.moto ?? undefined,
      direccion: editForm.direccion || undefined,
      municipioId: editForm.municipioId || undefined,
      role: editForm.role,
      empresaIds: editForm.empresaIds,
    });

    if (ok) {
      setIsEditing(false);
      setEditForm(null);
    }
  };

  const handleExport = () => {
    const headers = [
      "Nombre",
      "Email",
      "Teléfono",
      "Rol",
      "Municipio",
      "Total Servicios",
      "Liquidados",
      "Pendientes",
      "Efectividad (%)",
      "Total Recaudo",
    ];
    const rows = members.map((u) => [
      u.name,
      u.email,
      u.phone,
      u.role,
      u.municipioNombre || "",
      u.totalServicios,
      u.serviciosLiquidados,
      u.pendientes,
      u.efectividad,
      u.totalRecaudo,
    ]);

    const date = toBogotaYmd();
    exportToExcel({
      headers,
      data: rows,
      filename: `equipo_trabajo_${date}`,
      title: "Reporte de Equipo de Trabajo",
    });
  };

  if (loading && !data) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#01ADFB]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Header Section */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between border-b border-border pb-10">
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tight text-foreground lg:text-6xl">
              Equipo <span className="text-[#01ADFB] italic">Trabajo</span>
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-muted-foreground uppercase tracking-widest">
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border">
                <Users className="h-3.5 w-3.5 text-accent" />
                <span>{members.length} Integrantes</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border">
                <Award className="h-3.5 w-3.5 text-accent" />
                <span>Vista Gerencial</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleExport}
              className="group flex h-14 items-center gap-3 rounded-[1.25rem] bg-card px-8 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground shadow-sm border-2 border-border transition-all hover:bg-accent/5 hover:text-accent hover:border-accent/20 active:scale-95"
            >
              <Download className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
              Exportar
            </button>
            <button 
              onClick={refresh}
              className="group flex h-14 items-center gap-3 rounded-[1.25rem] bg-accent px-8 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-accent/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              disabled={loading}
            >
              <Loader2 className={cn("h-4 w-4 transition-transform", loading && "animate-spin")} />
              Refrescar
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-6 rounded-3xl bg-red-500/10 border-2 border-red-500/20 text-red-600 flex items-center justify-between">
            <p className="font-bold">{error}</p>
            <button className="px-4 py-2 bg-red-500 text-white rounded-xl font-black uppercase text-[10px]" onClick={refresh}>Reintentar</button>
          </div>
        ) : null}

        {data?.kpis ? <TeamKpiStrip kpis={data.kpis} /> : null}
        {data?.alerts ? <TeamAlertsPanel alerts={data.alerts} /> : null}

        {/* Filters and Tabs Section */}
        <div className="space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Custom Tabs */}
            <div className="flex items-center gap-1.5 rounded-2xl bg-muted p-1.5 w-fit border border-border">
              <button
                onClick={() => setActiveTab("ranking")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                  activeTab === "ranking"
                    ? "bg-background text-accent shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Award className="h-4 w-4" />
                Ranking
              </button>
              <button
                onClick={() => setActiveTab("usuarios")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                  activeTab === "usuarios"
                    ? "bg-background text-accent shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="h-4 w-4" />
                Listado
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group min-w-[240px]">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" />
                <Input
                  className="pl-12 h-12 rounded-2xl border-2 border-border bg-card/50 focus:bg-card focus:border-accent/40 transition-all text-sm font-medium"
                  placeholder="Buscar integrante..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                      page: 1,
                    }))
                  }
                />
              </div>
              <Link
                href="/dashboard/equipo-trabajo/nuevo"
                className="flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Nuevo Usuario
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
            <Input
              type="date"
              className="h-11 rounded-xl border-2 border-border bg-card/50"
              value={filters.from}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, from: e.target.value }))
              }
            />
            <Input
              type="date"
              className="h-11 rounded-xl border-2 border-border bg-card/50"
              value={filters.to}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, to: e.target.value }))
              }
            />
            <Combobox
              options={[
                { value: "", label: "Todos los roles" },
                ...allRoles.map((role) => ({ value: role, label: role })),
              ]}
              value={filters.role || ""}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  role: value || undefined,
                  page: 1,
                }))
              }
              placeholder="Filtrar rol"
              hideSearch
            />
            <Combobox
              options={[
                { value: "", label: "Todos los municipios" },
                ...municipalities.map((m) => ({
                  value: m.id,
                  label: m.name,
                })),
              ]}
              value={filters.municipioId || ""}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  municipioId: value || undefined,
                  page: 1,
                }))
              }
              placeholder="Filtrar municipio"
            />
            <Combobox
              options={[
                { value: "todos", label: "Todos los roles" },
                { value: "operativo", label: "Solo operativo" },
              ]}
              value={filters.scope}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  scope: (value as "operativo" | "todos") || "todos",
                }))
              }
              hideSearch
            />
          </div>
        </div>

        {/* Content Tables */}
        <div className="mt-8">
          {activeTab === "ranking" ? (
            <div className="overflow-hidden rounded-[2.5rem] border-2 border-border bg-card/30 backdrop-blur-sm shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Pos</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Usuario</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Rol</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Efectividad</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Recaudo</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rankingMembers.map((member, index) => (
                      <tr
                        key={member.id}
                        className={cn(
                          "group hover:bg-accent/[0.03] transition-colors",
                          index === 0 && "bg-amber-500/5",
                          index === 1 && "bg-slate-400/5",
                          index === 2 && "bg-orange-500/5",
                        )}
                      >
                        <td className="px-8 py-5">
                          <span className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg font-black text-sm",
                            index === 0 ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" :
                            index === 1 ? "bg-slate-400 text-white shadow-lg shadow-slate-400/20" :
                            index === 2 ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-8 py-5 font-black uppercase text-sm tracking-tight">{member.name}</td>
                        <td className="px-8 py-5">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-muted/50 px-2 py-1 rounded-md border border-border">
                            {member.role}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-lg text-accent">{member.efectividad}%</span>
                            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden mt-1">
                              <div className="h-full bg-accent" style={{ width: `${member.efectividad}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-emerald-600 tabular-nums">
                          ${member.totalRecaudo.toLocaleString("es-CO")}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-all hover:scale-110 hover:bg-accent hover:text-white"
                            onClick={() => {
                              setSelectedMemberId(member.id);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10 xl:grid-cols-3 items-start">
              <div className="xl:col-span-2 overflow-hidden rounded-[2.5rem] border-2 border-border bg-card/30 backdrop-blur-sm shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Usuario</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Rol</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Servicios</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Recaudo</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {members.map((member) => (
                        <tr key={member.id} className="group hover:bg-accent/[0.03] transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black">
                                {member.name[0]}
                              </div>
                              <span className="font-black uppercase text-sm tracking-tight">{member.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-[10px] font-black uppercase tracking-widest bg-muted/50 px-2 py-1 rounded-md border border-border">
                              {member.role}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center font-black tabular-nums">{member.totalServicios}</td>
                          <td className="px-8 py-5 text-right font-black text-emerald-600 tabular-nums">
                            ${member.totalRecaudo.toLocaleString("es-CO")}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button
                              className={cn(
                                "inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:scale-110",
                                selectedMemberId === member.id ? "bg-accent text-white" : "bg-accent/10 text-accent hover:bg-accent hover:text-white"
                              )}
                              onClick={() => {
                                setSelectedMemberId(member.id);
                                setIsEditing(false);
                              }}
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {members.length === 0 ? (
                    <div className="py-20 text-center">
                      <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">No se encontraron integrantes</p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Selection Detail Card */}
              <div className="sticky top-6">
                {!selectedUser ? (
                  <Card className="border-2 border-dashed border-border shadow-none bg-muted/30 h-[480px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 rounded-[2.5rem]">
                    <div className="h-16 w-16 rounded-full bg-card shadow-sm flex items-center justify-center mb-4">
                      <Users className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Panel de Gestión</h3>
                    <p className="mt-2 text-xs text-muted-foreground/60 font-medium max-w-[200px]">
                      Selecciona un usuario de la lista para ver o editar su perfil.
                    </p>
                  </Card>
                ) : (
                  <Card className="border-border shadow-2xl bg-card overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 rounded-[2.5rem]">
                    {/* Header con Color Dinámico */}
                    <div className={cn("relative h-32 w-full flex flex-col items-center justify-center text-white p-4 transition-colors duration-500", getUserColor(isEditing ? (editForm?.role || "") : selectedUser.role))}>
                      <h2 className="text-xl font-black text-center line-clamp-1 mb-1">
                        {isEditing ? (editForm?.name || "Editando...") : selectedUser.name}
                      </h2>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                        {isEditing ? (editForm?.role || "...") : selectedUser.role}
                      </span>
                      
                      {/* Decoración de fondo */}
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Users className="h-20 w-20 rotate-12" />
                      </div>
                    </div>

                    <CardContent className="relative pt-0 pb-8 px-0">
                      {/* Avatar Superpuesto */}
                      <div className="flex justify-center -mt-10 mb-6">
                        <div className="h-20 w-20 rounded-2xl border-4 border-card bg-card shadow-xl flex items-center justify-center text-2xl font-black text-foreground uppercase">
                          {selectedUser.name[0]}
                        </div>
                      </div>

                      {!isEditing ? (
                        <div className="space-y-6">
                          {/* Mini KPIs */}
                          <div className="grid grid-cols-2 gap-3 px-6">
                            <div className="rounded-2xl bg-muted/50 p-3 border border-border/50">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Servicios</p>
                              <p className="text-lg font-black text-foreground tabular-nums">{selectedUser.totalServicios}</p>
                            </div>
                            <div className="rounded-2xl bg-muted/50 p-3 border border-border/50">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Efectividad</p>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-accent" />
                                <p className="text-lg font-black text-foreground tabular-nums">{selectedUser.efectividad}%</p>
                              </div>
                            </div>
                          </div>

                          {/* Info Detallada */}
                          <div className="space-y-3.5 px-8 text-[11px] font-bold text-foreground">
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 text-muted-foreground/60" />
                              <p className="truncate">{selectedUser.email || "Sin correo"}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-muted-foreground/60" />
                              <p>{selectedUser.phone || "Sin teléfono"}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Car className="h-4 w-4 text-muted-foreground/60" />
                              <p className="uppercase">
                                {selectedUser.placa || "S/P"} - {selectedUser.moto ? "MOTO" : "CARRO"}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground/60" />
                              <p className="line-clamp-1">
                                {selectedUser.municipioNombre ? `${selectedUser.municipioNombre}, ` : ""}
                                {selectedUser.direccion || "Dirección no asignada"}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                              <Download className="h-4 w-4 text-emerald-500" />
                              <p className="font-black text-emerald-600 text-sm">
                                ${selectedUser.totalRecaudo.toLocaleString("es-CO")}
                              </p>
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="pt-4 flex gap-2 px-6">
                            <button 
                              onClick={() => {
                                setEditForm(selectedUser);
                                setIsEditing(true);
                              }} 
                              className="flex-1 h-12 rounded-2xl bg-accent text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-95"
                            >
                              Editar Perfil
                            </button>
                            <button 
                              onClick={() => setSelectedMemberId("")} 
                              className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-border text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="px-6 space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin scrollbar-thumb-border pr-2">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Nombre Completo</Label>
                            <Input 
                              value={editForm?.name || ""} 
                              onChange={(e) => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)} 
                              className="h-10 bg-background border-2 border-border rounded-xl font-medium" 
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Rol</Label>
                              <Combobox 
                                options={allRoles.map(role => ({ value: role, label: role }))} 
                                value={editForm?.role || ""} 
                                onChange={(role) => setEditForm(prev => prev ? { ...prev, role } : null)} 
                                hideSearch 
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Municipio</Label>
                              <Combobox 
                                options={municipalities.map(m => ({ value: m.id, label: m.name }))} 
                                value={editForm?.municipioId || ""} 
                                onChange={(mId) => { 
                                  const mName = municipalities.find(m => m.id === mId)?.name || ""; 
                                  setEditForm(prev => prev ? { ...prev, municipioId: mId, municipioNombre: mName } : null); 
                                }} 
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Placa</Label>
                              <Input 
                                value={editForm?.placa || ""} 
                                onChange={(e) => setEditForm(prev => prev ? { ...prev, placa: e.target.value.toUpperCase() } : null)} 
                                className="h-10 bg-background border-2 border-border rounded-xl font-medium" 
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Vehículo</Label>
                              <Combobox 
                                options={[{ value: "MOTO", label: "Moto" }, { value: "CARRO", label: "Carro" }]} 
                                value={editForm?.moto ? "MOTO" : "CARRO"} 
                                onChange={(val) => setEditForm(prev => prev ? { ...prev, moto: val === "MOTO" } : null)} 
                                hideSearch 
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Dirección</Label>
                            <Input 
                              value={editForm?.direccion || ""} 
                              onChange={(e) => setEditForm(prev => prev ? { ...prev, direccion: e.target.value } : null)} 
                              className="h-10 bg-background border-2 border-border rounded-xl font-medium" 
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
                            <button 
                              onClick={handleSave} 
                              disabled={savingProfile}
                              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                            >
                              <Save className="h-4 w-4" /> Guardar
                            </button>
                            <button 
                              onClick={() => setIsEditing(false)} 
                              className="h-12 rounded-2xl border-2 border-border text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:bg-muted transition-all active:scale-95"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-10 border-t border-border">
          <Award className="h-5 w-5 text-accent" />
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Período analizado: <span className="text-foreground">{filters.from}</span> a <span className="text-foreground">{filters.to}</span>
          </p>
        </div>
      </div>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto border-none p-0">
          {selectedUser ? (
            <div>
              <DialogTitle className="sr-only">
                Detalle de {selectedUser.name}
              </DialogTitle>
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background px-8 py-5">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">
                    Detalle de Usuario
                  </h2>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Métricas de creación y recaudo
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-600"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </button>
              </div>

              <div className="space-y-6 p-8">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  <Card className="border-border"><CardContent className="pt-4"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clientes creados</p><p className="text-2xl font-black">{selectedDetail?.metrics.clientesCreados ?? 0}</p></CardContent></Card>
                  <Card className="border-border"><CardContent className="pt-4"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Servicios creados</p><p className="text-2xl font-black">{selectedDetail?.metrics.totalServicios ?? 0}</p></CardContent></Card>
                  <Card className="border-border"><CardContent className="pt-4"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Liquidados</p><p className="text-2xl font-black">{selectedDetail?.metrics.serviciosLiquidados ?? 0}</p></CardContent></Card>
                  <Card className="border-border"><CardContent className="pt-4"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recaudo nuevos</p><p className="text-xl font-black text-emerald-600">${(selectedDetail?.metrics.recaudoNuevos ?? 0).toLocaleString("es-CO")}</p></CardContent></Card>
                  <Card className="border-border"><CardContent className="pt-4"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recaudo refuerzo</p><p className="text-xl font-black text-emerald-600">${(selectedDetail?.metrics.recaudoRefuerzo ?? 0).toLocaleString("es-CO")}</p></CardContent></Card>
                  <Card className="border-border bg-[#01ADFB]/10"><CardContent className="pt-4"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Efectividad</p><p className="text-2xl font-black text-[#01ADFB]">{selectedDetail?.metrics.efectividad ?? 0}%</p></CardContent></Card>
                </div>

                <Card className="border-border">
                  <CardContent className="pt-6">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Servicios registrados
                    </p>
                    {loadingDetail ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando servicios...
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">Orden</th>
                              <th className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">Fecha</th>
                              <th className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">Cliente</th>
                              <th className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground text-center">Estado</th>
                              <th className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground text-right">Valor pagado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {(selectedDetail?.orders || []).map((order) => (
                              <tr key={order.id}>
                                <td className="px-3 py-2 text-xs font-bold">{order.orderNumber}</td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">{order.date ? formatBogotaDate(order.date, "es-CO") : "N/A"}</td>
                                <td className="px-3 py-2 text-xs">{order.client}</td>
                                <td className="px-3 py-2 text-center"><span className={cn("rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest", order.status === "LIQUIDADO" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>{order.status}</span></td>
                                <td className="px-3 py-2 text-right text-xs font-black">${order.paidValue.toLocaleString("es-CO")}</td>
                              </tr>
                            ))}
                            {(selectedDetail?.orders || []).length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">No hay servicios en el período.</td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#01ADFB]" />
        </div>
      }
    >
      <TeamPageContent />
    </Suspense>
  );
}
