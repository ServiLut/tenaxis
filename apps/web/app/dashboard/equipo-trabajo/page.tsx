"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/components/ui/utils";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/utils/export-helper";
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
  _count?: {
    serviciosAsignados: number;
  };
  createdAt: string | Date;
  role: string;
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

export default function EquipoTrabajoPage() {
  const { tenantId } = useUserRole();
  const [activeTab, setActiveTab] = useState<"ranking" | "usuarios">("ranking");
  const [users, setUsers] = useState<UserMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [nameQuery, setNameQuery] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserMember | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UserMember | null>(null);

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
      const response = await fetch(`/api/tenants/${tenantId}/memberships`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Error al cargar el equipo");

      const result = await response.json();
      const data = result.data || result;
      
      const mappedUsers: UserMember[] = (Array.isArray(data) ? data : []).map((m: Membership, index: number) => ({
        id: m.id,
        name: `${m.user.nombre} ${m.user.apellido}`,
        services: m._count?.serviciosAsignados || 0,
        rating: 4.5, // Placeholder por ahora
        avatar: `${m.user.nombre[0]}${m.user.apellido[0]}`,
        color: COLORS[index % COLORS.length] || "bg-zinc-500",
        email: m.user.email,
        phone: m.user.telefono || "Sin teléfono",
        joinDate: new Date(m.createdAt).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        role: m.role,
        totalRecaudo: 0, // Placeholder
        totalServicios: m._count?.serviciosAsignados || 0,
        serviciosLiquidados: 0, // Placeholder
        recaudoNuevos: 0, // Placeholder
        recaudoRefuerzo: 0, // Placeholder
        efectividad: 0, // Placeholder
        orders: [
          { id: "1", orderNumber: "ORD-001", date: "2024-02-20", client: "Inversiones del Norte", status: "Liquidado", paidValue: 150000 },
          { id: "2", orderNumber: "ORD-002", date: "2024-02-21", client: "Tecnología Global S.A.S", status: "Pendiente", paidValue: 0 },
          { id: "3", orderNumber: "ORD-003", date: "2024-02-22", client: "Construcciones Bolívar", status: "Liquidado", paidValue: 280000 },
          { id: "4", orderNumber: "ORD-004", date: "2024-02-23", client: "Transportes RM", status: "Liquidado", paidValue: 125000 },
          { id: "5", orderNumber: "ORD-005", date: "2024-02-23", client: "Alimentos del Valle", status: "Pendiente", paidValue: 0 },
          { id: "6", orderNumber: "ORD-006", date: "2024-02-24", client: "Suministros Industriales", status: "Liquidado", paidValue: 450000 },
          { id: "7", orderNumber: "ORD-007", date: "2024-02-25", client: "Comercializadora ABC", status: "Liquidado", paidValue: 95000 },
        ],
      }));

      setUsers(mappedUsers);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const allRoles = Array.from(new Set(users.map((u) => u.role)));

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(nameQuery.toLowerCase()) &&
    (roleQuery === "" || user.role === roleQuery)
  );

  const handleEditClick = (user: UserMember) => {
    setSelectedUser(user);
    setEditForm({ ...user });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editForm) {
      setUsers((prev) =>
        prev.map((u) => (u.id === editForm.id ? editForm : u))
      );
      setSelectedUser(editForm);
      setIsEditing(false);
      setEditForm(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar a este usuario?")) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (selectedUser?.id === id) {
        setSelectedUser(null);
        setIsEditing(false);
      }
    }
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

    toast.info("Generando archivo EXCEL...", {
      description: `Se exportarán ${users.length} usuarios.`,
    });
    
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
          <Loader2 className="h-10 w-10 animate-spin text-azul-1" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
          <p className="text-red-500 font-bold">{error}</p>
          <button 
            onClick={() => fetchTeam()}
            className="px-4 py-2 bg-azul-1 text-white rounded-xl font-bold"
          >
            Reintentar
          </button>
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
              <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
                Equipo de Trabajo
              </h1>
              <p className="text-zinc-500 font-medium">
                Gestiona y visualiza el rendimiento de tu equipo.
              </p>
            </div>
          </div>

          {/* Custom Tabs */}
          <div className="flex gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-px">
            <button
              onClick={() => setActiveTab("ranking")}
              className={cn(
                "px-6 py-4 text-sm font-black uppercase tracking-widest transition-all relative",
                activeTab === "ranking"
                  ? "text-azul-1 after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-azul-1"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              )}
            >
              Ranking de Usuarios
            </button>
            <button
              onClick={() => {
                setActiveTab("usuarios");
                setSelectedUser(null);
                setIsEditing(false);
              }}
              className={cn(
                "px-6 py-4 text-sm font-black uppercase tracking-widest transition-all relative",
                activeTab === "usuarios"
                  ? "text-azul-1 after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-azul-1"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              )}
            >
              Listado de Usuarios
            </button>
          </div>

          {/* Content */}
          <div className="mt-8">
            {activeTab === "ranking" ? (
              <div className="grid gap-6">
                {/* Search, Date Filter & Export Bar */}
                <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-2">
                  {/* Search Bar */}
                  <div className="relative w-full xl:w-80 shrink-0">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 z-10" />
                    <input
                      type="text"
                      placeholder="Buscar usuario..."
                      value={nameQuery}
                      onChange={(e) => setNameQuery(e.target.value)}
                      className="h-[60px] w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-xs font-medium outline-none transition-all focus:border-azul-1 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:bg-zinc-950 shadow-sm"
                    />
                  </div>

                  {/* Date Filter & Export */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl w-full xl:w-fit">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto overflow-x-auto">
                    {/* Hoy / Ayer Toggle */}
                    <div className="flex items-center p-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shrink-0">
                      <button className="px-4 py-1.5 text-xs font-bold rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-100 dark:border-zinc-700">
                        Hoy
                      </button>
                      <button className="px-4 py-1.5 text-xs font-bold rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">
                        Ayer
                      </button>
                    </div>

                    {/* Date Range Picker */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center h-9 px-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg group focus-within:border-azul-1 focus-within:ring-1 focus-within:ring-azul-1/20 transition-all">
                        <Calendar className="h-4 w-4 text-zinc-300 dark:text-zinc-600 mr-2" />
                        <input type="text" placeholder="dd/mm/aaaa" className="bg-transparent border-none outline-none text-xs font-medium w-24 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400" />
                        <Calendar className="h-4 w-4 text-zinc-700 dark:text-zinc-400 ml-2" />
                      </div>
                      <span className="text-zinc-300 dark:text-zinc-700">-</span>
                      <div className="flex items-center h-9 px-3 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-lg group focus-within:border-azul-1 focus-within:ring-1 focus-within:ring-azul-1/20 transition-all">
                        <input type="text" placeholder="dd/mm/aaaa" className="bg-transparent border-none outline-none text-xs font-medium w-24 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400" />
                        <Calendar className="h-4 w-4 text-zinc-700 dark:text-zinc-400 ml-2" />
                      </div>
                    </div>
                  </div>

                  {/* Export Button */}
                  <button 
                    onClick={handleExportExcel}
                    className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold transition-all hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shrink-0 w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4" />
                    Descargar Excel
                  </button>
                </div>
              </div>

                {/* Podium / Top 3 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                  {filteredUsers.slice(0, 3).map((user, index) => (
                    <Card key={user.id} className={cn(
                      "relative overflow-hidden border-none transition-all hover:scale-[1.02]",
                      index === 0 ? "bg-azul-1 dark:bg-zinc-800 text-white dark:text-zinc-50 scale-105 z-10 shadow-xl dark:border-2 dark:border-azul-1/50" : "bg-white dark:bg-zinc-900 shadow-xl dark:shadow-none"
                    )}>
                      <CardContent className="pt-8 text-center">
                        <div className={cn("relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-black shadow-inner text-white", user.color)}>
                          {index === 0 && (
                            <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
                              <Trophy className="h-4 w-4 text-yellow-900" />
                            </div>
                          )}
                          <span className="text-zinc-900 dark:text-zinc-200">
                            {user.avatar}
                          </span>
                        </div>
                        <h3 className={cn("text-xl font-black tracking-tight", index === 0 ? "text-white dark:text-zinc-50" : "text-zinc-900 dark:text-zinc-50")}>
                          {user.name}
                        </h3>
                        <div className="mt-4 flex items-center justify-center gap-6">
                          <div className="text-center">
                            <p className={cn("text-[10px] font-black uppercase tracking-widest opacity-60", index === 0 ? "text-white dark:text-zinc-400" : "text-zinc-400")}>Servicios</p>
                            <p className="text-xl font-black tabular-nums">{user.services}</p>
                          </div>
                          <div className="text-center">
                            <p className={cn("text-[10px] font-black uppercase tracking-widest opacity-60", index === 0 ? "text-white dark:text-zinc-400" : "text-zinc-400")}>Rating</p>
                            <div className="flex items-center justify-center gap-1 font-black tabular-nums">
                              <Star className={cn("h-3 w-3 fill-current", index === 0 ? "text-yellow-300 dark:text-yellow-400" : "text-yellow-400")} />
                              {user.rating}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Rest of the list */}
                <Card className="border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900">
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Posición</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Usuario</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden sm:table-cell">Rol</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Servicios</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Total Recaudo</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                          {filteredUsers.map((user, index) => (
                            <tr 
                              key={user.id} 
                              className="group transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                            >
                              <td className="px-6 py-4">
                                <span className="w-6 text-sm font-black text-zinc-400 tabular-nums">
                                  #{index + 1}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-black text-white", user.color)}>
                                    {user.avatar}
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="truncate font-bold text-zinc-900 dark:text-zinc-50">{user.name}</p>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      <span className="text-[10px] font-black tabular-nums text-zinc-400">{user.rating}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 hidden sm:table-cell">
                                <span className="inline-block rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-black text-zinc-900 dark:text-zinc-50 tabular-nums">{user.services}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  ${user.totalRecaudo.toLocaleString("es-CO")}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowDetailsModal(true);
                                      setIsEditing(false);
                                    }}
                                    title="Ver detalles"
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-all hover:bg-blue-600 hover:text-white dark:bg-blue-500/10 dark:text-blue-400"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                </div>
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
                {/* Toolbar and List/Table */}
                <div className="space-y-6">
                  <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 z-10" />
                        <input
                          type="text"
                          placeholder="Buscar por nombre..."
                          value={nameQuery}
                          onChange={(e) => setNameQuery(e.target.value)}
                          className="h-12 w-full rounded-2xl border-2 border-zinc-100 bg-white pl-12 pr-4 text-sm font-medium outline-none transition-all focus:border-azul-1 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                        />
                      </div>
                      <div className="w-full sm:w-72">
                        <Select
                          value={roleQuery}
                          onChange={(e) => setRoleQuery(e.target.value)}
                          className="h-12 border-2 border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                        >
                          <option value="">Todos los roles</option>
                          {allRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <Link 
                      href="/dashboard/equipo-trabajo/nuevo"
                      className="flex h-12 w-full xl:w-auto items-center justify-center gap-2 rounded-2xl bg-azul-1 px-6 text-sm font-black uppercase tracking-widest text-white dark:text-zinc-200 shadow-lg shadow-azul-1/20 transition-all hover:bg-blue-700 sm:h-12"
                    >
                      <Plus className="h-5 w-5" />
                      Nuevo Usuario
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <Card className="lg:col-span-2 border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Usuario</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden sm:table-cell">Rol</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell text-center">Servicios</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Total Recaudo</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                            {filteredUsers.map((user) => (
                              <tr 
                                key={user.id} 
                                className={cn(
                                  "group transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30",
                                  selectedUser?.id === user.id && "bg-azul-1/5 dark:bg-azul-1/10"
                                )}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-black text-white", user.color)}>
                                      {user.avatar}
                                    </div>
                                    <div className="overflow-hidden">
                                      <p className="truncate font-bold text-zinc-900 dark:text-zinc-50">{user.name}</p>
                                      <p className="truncate text-[10px] text-zinc-400 font-medium sm:hidden">{user.role}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 hidden sm:table-cell">
                                  <span className="inline-block rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4 hidden md:table-cell text-center">
                                  <span className="font-black text-zinc-900 dark:text-zinc-50 tabular-nums">{user.services}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    ${user.totalRecaudo.toLocaleString("es-CO")}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setIsEditing(false);
                                      }}
                                      title="Ver detalles"
                                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-all hover:bg-blue-600 hover:text-white dark:bg-blue-500/10 dark:text-blue-400"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                          <div className="py-20 text-center">
                            <Users className="mx-auto h-12 w-12 text-zinc-200 mb-4" />
                            <p className="text-zinc-500 font-medium px-6">No se encontraron usuarios registrados.</p>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Panel Lateral: Detalles o Edición */}
                    <div className={cn("space-y-6", !selectedUser && "hidden lg:block")}>
                      {selectedUser ? (
                        <Card className="sticky top-8 border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                          {/* Header Color con Nombre y Rol */}
                          <div className={cn("relative h-36 w-full p-2 flex flex-col items-center justify-center text-white", selectedUser.color)}>
                            <h2 className="text-xl font-black text-center line-clamp-1 mb-1 dark:text-zinc-200">
                              {isEditing ? (editForm?.name || "Editando...") : selectedUser.name}
                            </h2>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 dark:text-zinc-200">
                              {isEditing ? (editForm?.role || "...") : selectedUser.role}
                            </span>
                          </div>

                          <CardContent className="relative pt-0 pb-8">
                            {/* Avatar Overlap */}
                              <div className="flex justify-center -mt-10 mb-6">
                                <div className="h-20 w-20 rounded-2xl border-4 border-white bg-white dark:border-zinc-900 shadow-xl flex items-center justify-center text-2xl font-black text-zinc-900 dark:text-zinc-200">
                                  {selectedUser.avatar}
                                </div>
                              </div>
                            {!isEditing ? (
                              // Vista de Detalles Compacta
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3 px-4">
                                  <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Servicios</p>
                                    <p className="text-lg font-black text-zinc-900 dark:text-zinc-50 tabular-nums">{selectedUser.services}</p>
                                  </div>
                                  <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Rating</p>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      <p className="text-lg font-black text-zinc-900 dark:text-zinc-50 tabular-nums">{selectedUser.rating}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 shrink-0 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-400 dark:bg-zinc-800">
                                      <Mail className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Email</p>
                                      <p className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-50">{selectedUser.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 shrink-0 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-400 dark:bg-zinc-800">
                                      <Phone className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Teléfono</p>
                                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{selectedUser.phone}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 shrink-0 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-400 dark:bg-zinc-800">
                                      <Calendar className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Ingreso</p>
                                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{selectedUser.joinDate}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 dark:bg-emerald-500/10">
                                      <Download className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Total Recaudo</p>
                                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                        ${selectedUser.totalRecaudo.toLocaleString("es-CO")}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-4 flex gap-2 px-4">
                                  <button 
                                    onClick={() => handleEditClick(selectedUser)}
                                    className="flex-1 h-11 rounded-xl bg-azul-1 text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-200 transition-all hover:bg-blue-700"
                                  >
                                    Editar Perfil
                                  </button>
                                  <button 
                                    onClick={() => setSelectedUser(null)}
                                    className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-zinc-100 text-zinc-400 transition-all hover:bg-zinc-50 dark:border-zinc-800"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Formulario de Edición Reorganizado
                              <div className="px-4 space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">Nombre Completo</Label>
                                  <Input 
                                    value={editForm?.name || ""}
                                    onChange={(e) => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    placeholder="Nombre del usuario"
                                    className="h-11"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">Rol del Usuario</Label>
                                  <Select 
                                    value={editForm?.role || ""}
                                    onChange={(e) => setEditForm(prev => prev ? { ...prev, role: e.target.value } : null)}
                                    className="h-11"
                                  >
                                    {allRoles.map(role => (
                                      <option key={role} value={role}>{role}</option>
                                    ))}
                                  </Select>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">Email</Label>
                                    <Input 
                                      type="email"
                                      value={editForm?.email || ""}
                                      onChange={(e) => setEditForm(prev => prev ? { ...prev, email: e.target.value } : null)}
                                      className="h-11"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">Teléfono</Label>
                                    <Input 
                                      value={editForm?.phone || ""}
                                      onChange={(e) => setEditForm(prev => prev ? { ...prev, phone: e.target.value } : null)}
                                      className="h-11"
                                    />
                                  </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                  <button 
                                    onClick={handleSave}
                                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-azul-1 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700"
                                  >
                                    <Save className="h-4 w-4" />
                                    Guardar
                                  </button>
                                  <button 
                                    onClick={() => setIsEditing(false)}
                                    className="h-11 px-4 rounded-xl border-2 border-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-400"
                                  >
                                    X
                                  </button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="border-none shadow-sm bg-zinc-50/50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 h-[480px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                          <div className="h-16 w-16 rounded-full bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center mb-4">
                            <Users className="h-6 w-6 text-zinc-200" />
                          </div>
                          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Panel de Gestión</h3>
                          <p className="mt-2 text-xs text-zinc-400 font-medium max-w-[200px]">
                            Selecciona ver o editar en la tabla para interactuar con un usuario.
                          </p>
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
        <DialogContent className="max-w-5xl border-none p-0 bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          {selectedUser && (
            <div className="relative">
              {/* Header */}
              <div className="p-8 pb-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-950 z-30">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">Detalles del Usuario</h2>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
                    Gestión de rendimiento individual
                  </p>
                </div>

                <div className="flex items-center gap-4 mr-8">
                  <button 
                    onClick={() => handleExportExcel()}
                    className="h-10 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-emerald-100 dark:hover:bg-emerald-500/20 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Descargar Informe</span>
                  </button>
                </div>
              </div>

              <div className="p-8">
                {/* Identificación del Usuario */}
                <div className="flex items-center gap-4 mb-8">
                  <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg", selectedUser.color)}>
                    {selectedUser.avatar}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight">{selectedUser.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                        {selectedUser.role}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        ID: #{selectedUser.id.slice(-6)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* Total Servicios Creados */}
                  <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <Plus className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Servicios</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none">Creados</p>
                        </div>
                      </div>
                      <p className="text-4xl font-black text-zinc-900 dark:text-zinc-50 tabular-nums leading-none">
                        {selectedUser.totalServicios}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Servicios Liquidados */}
                  <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <Save className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Servicios</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none">Liquidados</p>
                        </div>
                      </div>
                      <p className="text-4xl font-black text-zinc-900 dark:text-zinc-50 tabular-nums leading-none">
                        {selectedUser.serviciosLiquidados}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Porcentaje Efectividad */}
                  <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-zinc-900 dark:bg-zinc-800 rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                          <Award className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Efectividad</p>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none">Global</p>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <p className="text-4xl font-black tabular-nums leading-none">
                          {selectedUser.efectividad}
                        </p>
                        <span className="text-xl font-black opacity-40">%</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recaudo Servicios Nuevos */}
                  <Card className="md:col-span-1 lg:col-span-1 border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Star className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Recaudo</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none">Nuevos</p>
                        </div>
                      </div>
                      <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tabular-nums leading-none">
                        ${selectedUser.recaudoNuevos.toLocaleString("es-CO")}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Recaudo Servicios Refuerzo */}
                  <Card className="md:col-span-1 lg:col-span-1 border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                          <Loader2 className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Recaudo</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none">Refuerzo</p>
                        </div>
                      </div>
                      <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tabular-nums leading-none">
                        ${selectedUser.recaudoRefuerzo.toLocaleString("es-CO")}
                      </p>
                    </CardContent>
                  </Card>

                </div>

                {/* Tabla de Órdenes */}
                <div className="mt-8">
                  <div className="rounded-[2rem] border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xl shadow-zinc-200/50 dark:shadow-none">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-50 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Orden</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Fecha</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400">Cliente</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center">Estado</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 text-right">Valor Pagado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                          {selectedUser.orders?.map((order) => (
                            <tr key={order.id} className="group transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                              <td className="px-6 py-4">
                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{order.orderNumber}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{order.date}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{order.client}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={cn(
                                  "inline-block rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest",
                                  order.status === "Liquidado" 
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                    : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                                )}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-xs font-black text-zinc-900 dark:text-zinc-50 tabular-nums">
                                  ${order.paidValue.toLocaleString("es-CO")}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(!selectedUser.orders || selectedUser.orders.length === 0) && (
                            <tr>
                              <td colSpan={5} className="px-6 py-10 text-center text-xs font-medium text-zinc-400">
                                No hay servicios registrados recientemente.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
