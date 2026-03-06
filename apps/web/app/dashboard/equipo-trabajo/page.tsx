"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/components/ui/utils";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/utils/export-helper";
import {
  updateMembershipAction,
  getMunicipalitiesAction,
} from '../actions';
import {
  Trophy,
  Users,
  Star,
  Award,
  Plus,
  Search,
  Mail,
  Phone,
  Calendar,
  X,
  Eye,
  Save,
  Loader2,
  Download,
  MapPin,
  Car,
} from "lucide-react";

type UserOrder = {
  id: string;
  orderNumber: string;
  date: string;
  client: string;
  status: string;
  paidValue: number;
};

type UserMember = {
  id: string;
  name: string;
  services: number;
  rating: number;
  avatar: string;
  color: string;
  email: string;
  phone: string;
  joinDate: string;
  role: string;
  placa?: string;
  moto?: boolean;
  direccion?: string;
  municipioId?: string;
  municipioNombre?: string;
  empresaIds: string[];
  empresaNombres: string[];
  totalRecaudo: number;
  totalServicios: number;
  serviciosLiquidados: number;
  recaudoNuevos: number;
  recaudoRefuerzo: number;
  efectividad: number;
  orders: UserOrder[];
};

interface Membership {
  id: string;
  user: {
    nombre: string;
    apellido: string;
    email: string;
    telefono?: string | null;
  };
  placa?: string | null;
  moto?: boolean | null;
  direccion?: string | null;
  municipioId?: string | null;
  municipio?: {
    id: string;
    name: string;
  } | null;
  empresaMemberships?: {
    empresaId: string;
    empresa: {
      nombre: string;
    };
  }[];
  serviciosCreados?: {
    id: string;
    numeroOrden: string;
    fechaVisita: string;
    valorPagado: number | string;
    estadoServicio: string;
    tipoVisita: string;
    cliente: {
      nombre: string;
      apellido: string;
      razonSocial: string;
    };
  }[];
  serviciosAsignados?: {
    id: string;
    numeroOrden: string;
    fechaVisita: string;
    valorPagado: number | string;
    estadoServicio: string;
    tipoVisita: string;
    cliente: {
      nombre: string;
      apellido: string;
      razonSocial: string;
    };
  }[];
  _count?: {
    serviciosAsignados: number;
  };
  createdAt: string | Date;
  role: string;
}

interface Municipio {
  id: string;
  name: string;
}

const COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-indigo-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
];

function EquipoTrabajoContent() {
  const { tenantId } = useUserRole();

  const managementPanelRef = React.useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"ranking" | "usuarios">("ranking");
  const [users, setUsers] = useState<UserMember[]>([]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "ranking" || hash === "usuarios") {
        setActiveTab(hash);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleTabChange = useCallback((newTab: "ranking" | "usuarios") => {
    setActiveTab(newTab);
    window.location.hash = newTab;
  }, []);

  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameQuery, setNameQuery] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [municipioQuery, setMunicipioQuery] = useState("");
  
  const [selectedUser, setSelectedUser] = useState<UserMember | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UserMember | null>(null);

  useEffect(() => {
    if (activeTab === "usuarios") {
      setSelectedUser(null);
      setIsEditing(false);
    }
  }, [activeTab]);

  const scrollToManagementPanel = () => {
    setTimeout(() => {
      if (managementPanelRef.current) {
        managementPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
  };

  const fetchTeam = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const token = getCookie("access_token");

      const [teamRes, munRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}/memberships`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        getMunicipalitiesAction(),
      ]);

      if (!teamRes.ok) throw new Error("Error al cargar el equipo");

      const teamData = await teamRes.json();
      const teamList = teamData.data || teamData;
      setMunicipios(Array.isArray(munRes) ? munRes : munRes?.data || []);

      const mappedUsers: UserMember[] = (
        Array.isArray(teamList) ? teamList : []
      ).map((m: Membership, index: number) => {
        const services = m.serviciosCreados || [];
        
        const totalServicios = services.length;
        const serviciosLiquidados = services.filter(s => s.estadoServicio === "LIQUIDADO").length;
        
        const totalRecaudo = services
          .filter(s => s.estadoServicio === "LIQUIDADO")
          .reduce((acc, curr) => acc + Number(curr.valorPagado || 0), 0);

        const recaudoNuevos = services
          .filter(s => s.estadoServicio === "LIQUIDADO" && (s.tipoVisita === "DIAGNOSTICO" || s.tipoVisita === "CORRECTIVO" || s.tipoVisita === "PREVENTIVO"))
          .reduce((acc, curr) => acc + Number(curr.valorPagado || 0), 0);

        const recaudoRefuerzo = services
          .filter(s => s.estadoServicio === "LIQUIDADO" && (s.tipoVisita === "SEGUIMIENTO" || s.tipoVisita === "REINCIDENCIA"))
          .reduce((acc, curr) => acc + Number(curr.valorPagado || 0), 0);

        const efectividad = totalServicios > 0 
          ? Math.round((serviciosLiquidados / totalServicios) * 100) 
          : 0;

        const orders = services.map(s => ({
          id: s.id,
          orderNumber: s.numeroOrden || "N/A",
          date: s.fechaVisita ? new Date(s.fechaVisita).toLocaleDateString() : "N/A",
          client: s.cliente ? (s.cliente.razonSocial || `${s.cliente.nombre} ${s.cliente.apellido}`) : "N/A",
          status: s.estadoServicio === "LIQUIDADO" ? "Liquidado" : s.estadoServicio,
          paidValue: Number(s.valorPagado || 0),
        }));

        return {
          id: m.id,
          name: `${m.user.nombre} ${m.user.apellido}`,
          services: totalServicios,
          rating: 4.5,
          avatar: `${m.user.nombre[0]}${m.user.apellido[0]}`,
          color: COLORS[index % COLORS.length] || 'bg-zinc-500',
          email: m.user.email,
          phone: m.user.telefono || 'Sin teléfono',
          joinDate: new Date(m.createdAt).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          role: m.role,
          placa: m.placa || '',
          moto: m.moto ?? true,
          direccion: m.direccion || '',
          municipioId: m.municipioId || '',
          municipioNombre: m.municipio?.name || '',
          empresaIds: m.empresaMemberships?.map((em) => em.empresaId) || [],
          empresaNombres:
            m.empresaMemberships?.map((em) => em.empresa.nombre) || [],
          totalRecaudo,
          totalServicios,
          serviciosLiquidados,
          recaudoNuevos,
          recaudoRefuerzo,
          efectividad,
          orders,
        };
      });

      setUsers(mappedUsers);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const allRoles = Array.from(new Set(users.map((u) => u.role)));

  const filteredUsers = [...users]
    .sort((a, b) => b.totalRecaudo - a.totalRecaudo)
    .filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(nameQuery.toLowerCase());
      const matchesRole = roleQuery === "" || user.role === roleQuery;
      const matchesMunicipio = municipioQuery === "" || user.municipioId === municipioQuery;

      if (activeTab === "ranking") {
        const rankingRoles = ["ADMIN", "SU_ADMIN", "COORDINADOR", "ASESOR"];
        return matchesSearch && matchesRole && matchesMunicipio && rankingRoles.includes(user.role);
      }

      return matchesSearch && matchesRole && matchesMunicipio;
    });

  const handleEditClick = (user: UserMember) => {
    setSelectedUser(user);
    setEditForm({ ...user });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editForm) return;
    let nombre = editForm.name;
    let apellido = "";
    if (nombre.includes(" ")) {
      const parts = nombre.trim().split(" ");
      nombre = parts[0] || "";
      apellido = parts.slice(1).join(" ");
    }

    toast.promise(
      updateMembershipAction(editForm.id, {
        nombre,
        apellido,
        email: editForm.email,
        telefono: editForm.phone,
        placa: editForm.placa || undefined,
        moto: editForm.moto,
        direccion: editForm.direccion || undefined,
        municipioId: (editForm.municipioId && editForm.municipioId !== "") ? editForm.municipioId : undefined,
        role: editForm.role,
        empresaIds: editForm.empresaIds,
      }).then((res) => {
        if (!res.success) throw new Error(res.error);
        setUsers((prev) => prev.map((u) => (u.id === editForm.id ? editForm : u)));
        setSelectedUser(editForm);
        setIsEditing(false);
        setEditForm(null);
        return res;
      }),
      {
        loading: "Actualizando datos del equipo...",
        success: "Datos actualizados correctamente",
        error: (err) => err.message,
      }
    );
  };

  const handleExportExcel = () => {
    const headers = ["Nombre", "Email", "Teléfono", "Rol", "Fecha Ingreso", "Servicios Completados", "Rating", "Total Recaudo"];
    const data = users.map((u) => [
      u.name,
      u.email,
      u.phone,
      u.role,
      u.joinDate,
      u.services,
      u.rating,
      u.totalRecaudo
    ]);
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
    const exportParams = {
      headers,
      data,
      filename: `equipo_trabajo_tenaxis_${formattedDate}`,
      title: `REPORTE DE EQUIPO DE TRABAJO (${formattedDate.replace(/-/g, '/')})`
    };
    toast.info("Generando archivo EXCEL...", { description: `Se exportarán ${users.length} usuarios.` });
    try {
      exportToExcel(exportParams);
      toast.success("EXCEL generado exitosamente");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error al generar el archivo EXCEL");
    }
  };

  if (loading && users.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#01ADFB]" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
          <p className="text-destructive font-bold">{error}</p>
          <button onClick={() => fetchTeam()} className="px-4 py-2 bg-[#01ADFB] text-white rounded-xl font-bold">Reintentar</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter text-foreground">Equipo de Trabajo</h1>
              <p className="text-muted-foreground font-medium">Gestiona y visualiza el rendimiento de tu equipo.</p>
            </div>
          </div>

          {/* Custom Tabs */}
          <div className="flex gap-2 border-b border-border pb-px">
            <button
              onClick={() => handleTabChange("ranking")}
              className={cn(
                "px-6 py-4 text-sm font-black uppercase tracking-widest transition-all relative",
                activeTab === "ranking"
                  ? "text-[#01ADFB] after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-[#01ADFB]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Ranking de Usuarios
            </button>
            <button
              onClick={() => handleTabChange("usuarios")}
              className={cn(
                "px-6 py-4 text-sm font-black uppercase tracking-widest transition-all relative",
                activeTab === "usuarios"
                  ? "text-[#01ADFB] after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-[#01ADFB]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Listado de Usuarios
            </button>
          </div>

          {/* Content */}
          <div className="mt-8">
            {activeTab === "ranking" ? (
              <div className="grid gap-6">
                {/* Search & Export Bar */}
                <div className="flex flex-col gap-4 mb-2">
                  <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80 group">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-[#01ADFB] z-10" />
                      <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={nameQuery}
                        onChange={(e) => setNameQuery(e.target.value)}
                        className="h-[60px] w-full rounded-xl border-none bg-card pl-11 pr-4 text-xs font-bold shadow-sm ring-1 ring-border focus:ring-2 focus:ring-[#01ADFB]/20 transition-all outline-none text-foreground"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-card/40 backdrop-blur-md border border-border rounded-xl w-full xl:w-fit shadow-sm">
                      <button onClick={handleExportExcel} className="flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-[#01ADFB] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#01ADFB]/20 transition-all active:scale-95">
                        <Download className="h-4 w-4" /> Exportar Excel
                      </button>
                    </div>
                  </div>
                </div>

                {/* Podium / Top 3 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                  {filteredUsers.slice(0, 3).map((user, index) => (
                    <Card key={user.id} className={cn(
                      "relative overflow-hidden border border-border bg-card/60 backdrop-blur-md transition-all hover:scale-[1.02] shadow-sm",
                      index === 0 ? "scale-105 z-10 ring-2 ring-[#01ADFB]" : ""
                    )}>
                      <CardContent className="pt-8 text-center">
                        <div className={cn("relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-black shadow-lg text-white", index === 0 ? "bg-primary" : "bg-muted-foreground")}>
                          {index === 0 && (
                            <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-[#01ADFB] flex items-center justify-center shadow-lg">
                              <Trophy className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <span>{user.avatar}</span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-foreground">{user.name}</h3>
                        <div className="mt-4 flex items-center justify-center gap-6">
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Servicios</p>
                            <p className="text-xl font-black text-foreground tabular-nums">{user.services}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Recaudo</p>
                            <p className="text-sm font-black text-[#01ADFB] tabular-nums">${(user.totalRecaudo/1000).toFixed(1)}k</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Rest of the list */}
                <Card className="border-border shadow-sm bg-card">
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Posición</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Usuario</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Rol</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Servicios</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Total Recaudo</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredUsers.map((user, index) => (
                            <tr key={user.id} className="group transition-all hover:bg-muted/50">
                              <td className="px-6 py-4">
                                <span className="w-6 text-sm font-black text-muted-foreground tabular-nums">#{index + 1}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-black text-white", user.color)}>
                                    {user.avatar}
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="truncate font-bold text-foreground">{user.name}</p>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      <span className="text-[10px] font-black tabular-nums text-muted-foreground">{user.rating}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 hidden sm:table-cell">
                                <span className="inline-block rounded-lg bg-muted px-2 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-black text-foreground tabular-nums">{user.services}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-black text-emerald-600 tabular-nums">${user.totalRecaudo.toLocaleString("es-CO")}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => { setSelectedUser(user); setShowDetailsModal(true); setIsEditing(false); }} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#01ADFB]/10 text-[#01ADFB] transition-all hover:bg-[#01ADFB] hover:text-white ml-auto">
                                  <Eye className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <div className="space-y-6">
                  <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                      <div className="relative w-full sm:w-72 group">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10 group-focus-within:text-[#01ADFB]" />
                        <input type="text" placeholder="Buscar por nombre..." value={nameQuery} onChange={(e) => setNameQuery(e.target.value)} className="h-12 w-full rounded-2xl border-2 border-border bg-card pl-12 pr-4 text-sm font-medium outline-none transition-all focus:border-[#01ADFB] text-foreground" />
                      </div>
                      <div className="w-full sm:w-72"><Combobox options={[{ value: "", label: "Todos los roles" }, ...allRoles.map(role => ({ value: role, label: role }))]} value={roleQuery} onChange={setRoleQuery} placeholder="Filtrar por rol..." className="h-12" hideSearch /></div>
                      <div className="w-full sm:w-72"><Combobox options={[{ value: "", label: "Todos los municipios" }, ...municipios.map(m => ({ value: m.id, label: m.name }))]} value={municipioQuery} onChange={setMunicipioQuery} placeholder="Filtrar por municipio..." className="h-12" /></div>
                    </div>
                    <Link href="/dashboard/equipo-trabajo/nuevo" className="flex h-12 w-full xl:w-auto items-center justify-center gap-2 rounded-2xl bg-[#01ADFB] px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#01ADFB]/20 transition-all hover:bg-blue-700">
                      <Plus className="h-5 w-5" /> Nuevo Usuario
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <Card className="lg:col-span-2 border-border shadow-sm bg-card overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Usuario</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Rol</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden md:table-cell text-center">Servicios</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Total Recaudo</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {filteredUsers.map((user) => (
                              <tr key={user.id} className={cn("group transition-all hover:bg-muted/50", selectedUser?.id === user.id && "bg-[#01ADFB]/5")}>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-black text-white", user.color)}>{user.avatar}</div>
                                    <div className="overflow-hidden"><p className="truncate font-bold text-foreground">{user.name}</p><p className="truncate text-[10px] text-muted-foreground font-medium sm:hidden">{user.role}</p></div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 hidden sm:table-cell"><span className="inline-block rounded-lg bg-muted px-2 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{user.role}</span></td>
                                <td className="px-6 py-4 hidden md:table-cell text-center"><span className="font-black text-foreground tabular-nums">{user.services}</span></td>
                                <td className="px-6 py-4 text-center"><span className="font-black text-emerald-600 tabular-nums">${user.totalRecaudo.toLocaleString("es-CO")}</span></td>
                                <td className="px-6 py-4 text-right">
                                  <button onClick={() => { setSelectedUser(user); setIsEditing(false); scrollToManagementPanel(); }} title="Ver detalles" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#01ADFB]/10 text-[#01ADFB] transition-all hover:bg-[#01ADFB] hover:text-white ml-auto"><Eye className="h-4 w-4" /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                          <div className="py-20 text-center"><Users className="mx-auto h-12 w-12 text-muted/30 mb-4" /><p className="text-muted-foreground font-medium px-6">No se encontraron usuarios registrados.</p></div>
                        )}
                      </div>
                    </Card>

                    <div ref={managementPanelRef} className={cn("space-y-6", !selectedUser && "hidden lg:block")}>
                      {selectedUser ? (
                        <Card className="sticky top-8 border-border shadow-sm bg-card overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className={cn("relative h-32 w-full flex flex-col items-center justify-center text-white", selectedUser.color)}>
                            <h2 className="text-xl font-black text-center line-clamp-1 mb-1">{isEditing ? (editForm?.name || "Editando...") : selectedUser.name}</h2>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{isEditing ? (editForm?.role || "...") : selectedUser.role}</span>
                          </div>
                          <CardContent className="relative pt-0 pb-8">
                            <div className="flex justify-center -mt-10 mb-6"><div className="h-20 w-20 rounded-2xl border-4 border-card bg-card shadow-xl flex items-center justify-center text-2xl font-black text-foreground">{selectedUser.avatar}</div></div>
                            {!isEditing ? (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3 px-4">
                                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Servicios</p><p className="text-lg font-black text-foreground tabular-nums">{selectedUser.services}</p></div>
                                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rating</p><div className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /><p className="text-lg font-black text-foreground tabular-nums">{selectedUser.rating}</p></div></div>
                                </div>
                                <div className="space-y-3 px-4 text-xs font-medium text-foreground">
                                  <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><p className="truncate">{selectedUser.email}</p></div>
                                  <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><p>{selectedUser.phone}</p></div>
                                  <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground" /><p>{selectedUser.joinDate}</p></div>
                                  <div className="flex items-center gap-3"><Car className="h-4 w-4 text-muted-foreground" /><p>{selectedUser.placa || "N/A"} - {selectedUser.moto ? "MOTO" : "CARRO"}</p></div>
                                  <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><p>{selectedUser.municipioNombre ? `${selectedUser.municipioNombre}, ` : ""}{selectedUser.direccion || "No asignada"}</p></div>
                                  <div className="flex items-center gap-3"><Download className="h-4 w-4 text-emerald-500" /><p className="font-black text-emerald-600">${selectedUser.totalRecaudo.toLocaleString("es-CO")}</p></div>
                                </div>
                                <div className="pt-4 flex gap-2 px-4">
                                  <button onClick={() => handleEditClick(selectedUser)} className="flex-1 h-11 rounded-xl bg-[#01ADFB] text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700">Editar Perfil</button>
                                  <button onClick={() => setSelectedUser(null)} className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-border text-muted-foreground transition-all hover:bg-muted"><X className="h-4 w-4" /></button>
                                </div>
                              </div>
                            ) : (
                              <div className="px-4 space-y-4">
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground">Nombre</Label><Input value={editForm?.name || ""} onChange={(e) => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)} className="h-10 bg-background border-border" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground">Rol</Label><Combobox options={allRoles.map(role => ({ value: role, label: role }))} value={editForm?.role || ""} onChange={(role) => setEditForm(prev => prev ? { ...prev, role } : null)} className="h-10" hideSearch /></div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground">Placa</Label><Input value={editForm?.placa || ""} onChange={(e) => setEditForm(prev => prev ? { ...prev, placa: e.target.value.toUpperCase() } : null)} className="h-10 bg-background border-border" /></div>
                                  <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground">Tipo</Label><Combobox options={[{ value: "MOTO", label: "Moto" }, { value: "CARRO", label: "Carro" }]} value={editForm?.moto ? "MOTO" : "CARRO"} onChange={(val) => setEditForm(prev => prev ? { ...prev, moto: val === "MOTO" } : null)} className="h-10" hideSearch /></div>
                                </div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground">Municipio</Label><Combobox options={municipios.map(m => ({ value: m.id, label: m.name }))} value={editForm?.municipioId || ""} onChange={(mId) => { const mName = municipios.find(m => m.id === mId)?.name || ""; setEditForm(prev => prev ? { ...prev, municipioId: mId, municipioNombre: mName } : null); }} /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground">Dirección</Label><Input value={editForm?.direccion || ""} onChange={(e) => setEditForm(prev => prev ? { ...prev, direccion: e.target.value } : null)} className="h-10 bg-background border-border" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground">Email</Label><Input type="email" value={editForm?.email || ""} onChange={(e) => setEditForm(prev => prev ? { ...prev, email: e.target.value } : null)} className="h-10 bg-background border-border" /></div>
                                  <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground">Teléfono</Label><Input value={editForm?.phone || ""} onChange={(e) => setEditForm(prev => prev ? { ...prev, phone: e.target.value } : null)} className="h-10 bg-background border-border" /></div>
                                </div>
                                <div className="pt-4 flex gap-3">
                                  <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-[#01ADFB] text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700"><Save className="h-4 w-4" /> Guardar</button>
                                  <button onClick={() => setIsEditing(false)} className="h-11 px-4 rounded-xl border-2 border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">X</button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="border-2 border-dashed border-border shadow-none bg-muted/30 h-[480px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 rounded-3xl">
                          <div className="h-16 w-16 rounded-full bg-card shadow-sm flex items-center justify-center mb-4"><Users className="h-6 w-6 text-muted/30" /></div>
                          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Panel de Gestión</h3>
                          <p className="mt-2 text-xs text-muted-foreground/60 font-medium max-w-[200px]">Selecciona un usuario de la lista para ver o editar su perfil.</p>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>

      {/* Modal de Detalles del Usuario */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-5xl border-none p-0 bg-background rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          {selectedUser && (
            <div className="relative">
              <DialogTitle className="sr-only">Detalles de {selectedUser.name}</DialogTitle>
              <div className="p-8 pb-4 flex items-center justify-between border-b border-border sticky top-0 bg-background z-30">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-foreground">Detalles del Usuario</h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Gestión de rendimiento individual</p>
                </div>
                <div className="flex items-center gap-4 mr-8">
                  <button onClick={() => handleExportExcel()} className="h-10 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-emerald-500/20 flex items-center gap-2">
                    <Download className="h-4 w-4" /> <span className="hidden sm:inline">Descargar Informe</span>
                  </button>
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg", selectedUser.color)}>{selectedUser.avatar}</div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground leading-tight">{selectedUser.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-[9px] font-black uppercase tracking-widest text-muted-foreground">{selectedUser.role}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ID: #{selectedUser.id.slice(-6)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border-border shadow-sm bg-card rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all"><CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4"><div className="h-12 w-12 rounded-2xl bg-[#01ADFB]/10 flex items-center justify-center text-[#01ADFB]"><Plus className="h-6 w-6" /></div><div><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Servicios</p><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">Creados</p></div></div>
                    <p className="text-4xl font-black text-foreground tabular-nums leading-none">{selectedUser.totalServicios}</p>
                  </CardContent></Card>
                  <Card className="border-border shadow-sm bg-card rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all"><CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4"><div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600"><Save className="h-6 w-6" /></div><div><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Servicios</p><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">Liquidados</p></div></div>
                    <p className="text-4xl font-black text-foreground tabular-nums leading-none">{selectedUser.serviciosLiquidados}</p>
                  </CardContent></Card>
                  <Card className="border-none shadow-sm bg-primary rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all text-white"><CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4"><div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white"><Award className="h-6 w-6" /></div><div><p className="text-[10px] font-black uppercase tracking-widest opacity-60">Efectividad</p><p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none">Global</p></div></div>
                    <div className="flex items-baseline gap-1"><p className="text-4xl font-black tabular-nums leading-none">{selectedUser.efectividad}</p><span className="text-xl font-black opacity-40">%</span></div>
                  </CardContent></Card>
                </div>

                <div className="mt-8 rounded-[2rem] border border-border bg-card overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Orden</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Fecha</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cliente</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Estado</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right">Valor Pagado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedUser.orders?.map((order) => (
                          <tr key={order.id} className="group transition-all hover:bg-muted/50">
                            <td className="px-6 py-4"><span className="text-xs font-bold text-foreground">{order.orderNumber}</span></td>
                            <td className="px-6 py-4"><span className="text-xs font-medium text-muted-foreground">{order.date}</span></td>
                            <td className="px-6 py-4"><span className="text-xs font-bold text-foreground">{order.client}</span></td>
                            <td className="px-6 py-4 text-center"><span className={cn("inline-block rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest", order.status === "Liquidado" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>{order.status}</span></td>
                            <td className="px-6 py-4 text-right"><span className="text-xs font-black text-foreground tabular-nums">${order.paidValue.toLocaleString("es-CO")}</span></td>
                          </tr>
                        ))}
                        {(!selectedUser.orders || selectedUser.orders.length === 0) && (
                          <tr><td colSpan={5} className="px-6 py-10 text-center text-xs font-medium text-muted-foreground">No hay servicios registrados recientemente.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function EquipoTrabajoPage() {
  return (
    <Suspense fallback={<div className="flex h-[70vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#01ADFB]" /></div>}>
      <EquipoTrabajoContent />
    </Suspense>
  );
}
