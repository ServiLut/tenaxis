"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getSegmentosAction,
  getRiesgosAction,
  getTiposInteresAction,
  createSegmentoAction,
  updateSegmentoAction,
  createRiesgoAction,
  updateRiesgoAction,
  createTipoInteresAction,
  updateTipoInteresAction,
} from "../actions";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { 
  Settings, 
  Target, 
  ShieldAlert, 
  Zap, 
  Plus, 
  Pencil, 
  Save, 
  X,
  Hash,
  Clock,
  AlertTriangle,
  Info,
  Lightbulb,
  CheckCircle2,
  ListChecks,
  Building,
  User
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { ConfigEmpresas } from "@/components/dashboard/ConfigEmpresas";

type Segmento = {
  id: string;
  nombre: string;
  descripcion: string | null;
  frecuenciaSugerida: number;
  riesgoSugerido: string;
  activo: boolean;
};

type Riesgo = {
  id: string;
  nombre: string;
  color: string | null;
  valor: number;
  activo: boolean;
};

type TipoInteres = {
  id: string;
  nombre: string;
  descripcion: string | null;
  frecuenciaSugerida?: number;
  riesgoSugerido?: string;
  activo: boolean;
};

type User = {
  nombre?: string;
  apellido?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  telefono?: string;
  phone?: string;
  banco?: string;
  tipoCuenta?: string;
  numeroCuenta?: string;
  valorHora?: number;
  email?: string;
  role?: string;
};

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<"segmentos" | "riesgos" | "intereses" | "empresas" | "perfil">("segmentos");
  const [loading, setLoading] = useState(true);
  
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [riesgos, setRiesgos] = useState<Riesgo[]>([]);
  const [intereses, setIntereses] = useState<TipoInteres[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Segmento | Riesgo | TipoInteres | null>(null);

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData && userData !== "undefined") {
      try {
        setUser(JSON.parse(userData));
      } catch {
        // ignore
      }
    }

    // Sync activeTab with URL hash on mount and hash change
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ["segmentos", "riesgos", "intereses", "empresas", "perfil"];
      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash as "segmentos" | "riesgos" | "intereses" | "empresas" | "perfil");
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (activeTab !== 'empresas' && activeTab !== 'perfil') {
      loadData();
    }
  }, [activeTab]);

  const handleTabChange = (tab: "segmentos" | "riesgos" | "intereses" | "empresas" | "perfil") => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  async function loadData() {
    setLoading(true);
    try {
      const [segs, ries, ints] = await Promise.all([
        getSegmentosAction(),
        getRiesgosAction(),
        getTiposInteresAction()
      ]);
      setSegmentos(segs);
      setRiesgos(ries);
      setIntereses(ints);
    } catch (error) {
      console.error("Error loading config:", error);
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (item: Segmento | Riesgo | TipoInteres | null = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingItem(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const entries = Object.fromEntries(formData.entries());
    
    // Logic to convert and cast data based on active tab
    try {
      if (activeTab === "segmentos") {
        const data = {
          nombre: entries.nombre as string,
          descripcion: entries.descripcion as string || null,
          frecuenciaSugerida: parseInt(entries.frecuenciaSugerida as string) || 30,
          riesgoSugerido: entries.riesgoSugerido as string || "BAJO",
        };

        if (editingItem && 'frecuenciaSugerida' in editingItem) {
          await updateSegmentoAction(editingItem.id, data);
          toast.success("Segmento actualizado");
        } else {
          await createSegmentoAction(data);
          toast.success("Segmento creado");
        }
      } else if (activeTab === "riesgos") {
        const data = {
          nombre: entries.nombre as string,
          color: entries.color as string || null,
          valor: parseInt(entries.valor as string) || 0,
        };

        if (editingItem && 'valor' in editingItem) {
          await updateRiesgoAction(editingItem.id, data);
          toast.success("Nivel de riesgo actualizado");
        } else {
          await createRiesgoAction(data);
          toast.success("Nivel de riesgo creado");
        }
      } else if (activeTab === "intereses") {
        const data = {
          nombre: entries.nombre as string,
          descripcion: entries.descripcion as string || null,
          frecuenciaSugerida: parseInt(entries.frecuenciaSugerida as string) || 30,
          riesgoSugerido: entries.riesgoSugerido as string || "BAJO",
        };

        if (editingItem && 'id' in editingItem && !('valor' in editingItem) && !('frecuenciaSugerida' in editingItem)) {
          // This is a bit tricky since TipoInteres might not have frequency in its type definition but it does in DTO
          // Let's adjust TipoInteres type at the top
          await updateTipoInteresAction(editingItem.id, data);
          toast.success("Tipo de interés actualizado");
        } else if (editingItem && 'id' in editingItem && !('valor' in editingItem)) {
           // Fallback for interests if they have same structure as segments
           await updateTipoInteresAction(editingItem.id, data);
           toast.success("Tipo de interés actualizado");
        } else {
          await createTipoInteresAction(data);
          toast.success("Tipo de interés creado");
        }
      }
      loadData();
      handleCloseModal();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
    }
  };

  return (
    <DashboardLayout overflowHidden>
      <div className="flex flex-col h-full">
        {/* Sub-Header Estratégico */}
        <div className="shrink-0 py-10 px-6 lg:px-10 border-b border-zinc-200/60 dark:border-zinc-800/40 bg-gray-50/50 dark:bg-zinc-900/10">
          <div className="max-w-[1600px] mx-auto w-full space-y-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azul-1 text-white shadow-xl shadow-azul-1/20">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                  Configuración del <span className="text-azul-1">Negocio</span>
                </h1>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">Personaliza los parámetros operativos de tu empresa</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-zinc-200/50 dark:bg-zinc-800/20 rounded-2xl w-fit border border-zinc-200/50 dark:border-zinc-700/30">
              <button 
                onClick={() => handleTabChange("segmentos")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === "segmentos" ? "bg-white dark:bg-zinc-800 text-azul-1 shadow-md" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                )}
              >
                <Target className="h-3.5 w-3.5" /> Segmentos
              </button>
              <button 
                onClick={() => handleTabChange("riesgos")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === "riesgos" ? "bg-white dark:bg-zinc-800 text-azul-1 shadow-md" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                )}
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Riesgos
              </button>
              <button 
                onClick={() => handleTabChange("intereses")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === "intereses" ? "bg-white dark:bg-zinc-800 text-azul-1 shadow-md" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                )}
              >
                <Zap className="h-3.5 w-3.5" /> Intereses
              </button>
              <button 
                onClick={() => handleTabChange("empresas")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === "empresas" ? "bg-white dark:bg-zinc-800 text-azul-1 shadow-md" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                )}
              >
                <Building className="h-3.5 w-3.5" /> Empresas
              </button>
              <button 
                onClick={() => handleTabChange("perfil")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === "perfil" ? "bg-white dark:bg-zinc-800 text-azul-1 shadow-md" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                )}
              >
                <User className="h-3.5 w-3.5" /> Perfil
              </button>
            </div>
          </div>
        </div>

        {/* Contenedor Principal de Datos (Scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
          <div className="max-w-[1600px] mx-auto w-full">
            {activeTab === 'perfil' ? (
              <div className="space-y-8">
                <Card className="border-none shadow-2xl shadow-black/5 dark:shadow-none dark:bg-zinc-900/30 rounded-3xl overflow-hidden border-t border-white/50 dark:border-zinc-800/50">
                  <CardHeader className="p-8 sm:p-10 border-b border-zinc-100/80 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-azul-1/10 flex items-center justify-center text-azul-1">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black tracking-tight dark:text-zinc-100">Información Personal</CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase tracking-[0.2em] mt-1.5 text-zinc-400 dark:text-zinc-500">
                          Detalles básicos de tu cuenta de usuario
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 bg-white/20 dark:bg-transparent">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Campo</th>
                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Valor Actual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Nombre</td>
                            <td className="px-10 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.nombre || "No definido"}</td>
                          </tr>
                          <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Apellido</td>
                            <td className="px-10 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.apellido || "No definido"}</td>
                          </tr>
                          <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Tipo Documento</td>
                            <td className="px-10 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.tipoDocumento || "Cédula de Ciudadanía"}</td>
                          </tr>
                          <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Número Documento</td>
                            <td className="px-10 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.numeroDocumento || "No definido"}</td>
                          </tr>
                          <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Teléfono / Celular</td>
                            <td className="px-10 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.telefono || user?.phone || "No definido"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-2xl shadow-black/5 dark:shadow-none dark:bg-zinc-900/30 rounded-3xl overflow-hidden border-t border-white/50 dark:border-zinc-800/50">
                  <CardHeader className="p-8 sm:p-10 border-b border-zinc-100/80 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black tracking-tight dark:text-zinc-100">Información Bancaria</CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase tracking-[0.2em] mt-1.5 text-zinc-400 dark:text-zinc-500">
                          Datos para la dispersión de pagos y honorarios
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 bg-white/20 dark:bg-transparent">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Campo</th>
                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Valor Registrado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Banco</td>
                            <td className="px-10 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.banco || "Bancolombia"}</td>
                          </tr>
                          <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Tipo de Cuenta</td>
                            <td className="px-10 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.tipoCuenta || "Ahorros"}</td>
                          </tr>
                          <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Número de Cuenta</td>
                            <td className="px-10 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.numeroCuenta || "****4321"}</td>
                          </tr>
                          <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Valor Hora</td>
                            <td className="px-10 py-5 text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {user?.valorHora ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(user.valorHora) : "$ 15.000,00"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-2xl shadow-black/5 dark:shadow-none dark:bg-zinc-900/30 rounded-3xl overflow-hidden border-t border-white/50 dark:border-zinc-800/50">
                  <CardHeader className="p-8 sm:p-10 border-b border-zinc-100/80 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-azul-1/10 flex items-center justify-center text-azul-1">
                        <ShieldAlert className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black tracking-tight dark:text-zinc-100">Información de Cuenta</CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase tracking-[0.2em] mt-1.5 text-zinc-400 dark:text-zinc-500">
                          Credenciales de acceso y permisos del sistema
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 bg-white/20 dark:bg-transparent">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Campo</th>
                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Valor / Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Usuario</td>
                            <td className="px-10 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.email?.split('@')[0] || "usuario.demo"}</td>
                          </tr>
                          <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Correo Electrónico</td>
                            <td className="px-10 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.email || "No registrado"}</td>
                          </tr>
                          <tr className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Nueva Contraseña</td>
                            <td className="px-10 py-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              <button className="text-[10px] font-black uppercase tracking-widest text-azul-1 hover:text-blue-700 underline underline-offset-4">
                                Cambiar Contraseña
                              </button>
                            </td>
                          </tr>
                          <tr className="group bg-zinc-50/30 dark:bg-zinc-900/10">
                            <td className="px-10 py-5 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Rol del Sistema</td>
                            <td className="px-10 py-5">
                              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                {user?.role || "Usuario"} (No editable)
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : activeTab === 'empresas' ? (
              <ConfigEmpresas />
            ) : (
              <Card className="border-none shadow-2xl shadow-black/5 dark:shadow-none dark:bg-zinc-900/30 rounded-3xl overflow-hidden border-t border-white/50 dark:border-zinc-800/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-8 sm:p-10 border-b border-zinc-100/80 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/40">
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight dark:text-zinc-100">
                      {activeTab === "segmentos" ? "Segmentos de Negocio" : activeTab === "riesgos" ? "Niveles de Riesgo" : "Tipos de Interés"}
                    </CardTitle>
                    <CardDescription className="font-bold text-[10px] uppercase tracking-[0.2em] mt-1.5 text-zinc-400 dark:text-zinc-500">
                      {activeTab === "segmentos" ? "Define cómo clasificas a tus clientes por industria" : activeTab === "riesgos" ? "Gestiona los niveles de riesgo para priorizar servicios" : "Administra las opciones de servicio que interesan a tus clientes"}
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenModal()} className="bg-azul-1 hover:bg-azul-1/90 text-white font-black uppercase tracking-widest text-[10px] rounded-xl gap-2 h-11 px-6 shadow-lg shadow-azul-1/20 transition-all hover:scale-105 active:scale-95">
                    <Plus className="h-4 w-4" /> AGREGAR NUEVO
                  </Button>
                </CardHeader>
                <CardContent className="p-8 sm:p-10 bg-white/20 dark:bg-transparent">
                  {loading ? (
                    <div className="flex h-60 items-center justify-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-10 w-10 border-4 border-azul-1/20 border-t-azul-1 rounded-full animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 animate-pulse">Cargando parámetros...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {activeTab === "segmentos" && segmentos.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-azul-1/20 transition-all group">
                          <div className="flex gap-4 items-center">
                            <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shadow-sm group-hover:scale-110 transition-transform">
                              <Target className="h-6 w-6 text-azul-1" />
                            </div>
                            <div>
                              <h4 className="font-black text-zinc-900 dark:text-zinc-100">{item.nombre}</h4>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">{item.descripcion || "Sin descripción"}</p>
                              <div className="flex gap-3 mt-3">
                                <span className="text-[10px] font-black uppercase tracking-tighter bg-azul-1/10 text-azul-1 px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-azul-1/10 dark:bg-azul-500/10 dark:text-azul-400 dark:border-azul-500/20">
                                  <Clock className="h-3 w-3" /> Freq: {item.frecuenciaSugerida} días
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-tighter bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                                  <AlertTriangle className="h-3 w-3" /> Riesgo: {item.riesgoSugerido}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} className="h-11 w-11 rounded-xl hover:bg-white dark:hover:bg-zinc-800 hover:text-azul-1 shadow-sm border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      {activeTab === "riesgos" && riesgos.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-azul-1/20 transition-all group">
                          <div className="flex gap-4 items-center">
                            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform", 
                              item.color === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' :
                              item.color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400' :
                              item.color === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400' :
                              'bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
                            )}>
                              <ShieldAlert className="h-6 w-6" />
                            </div>
                            <div>
                              <h4 className="font-black text-zinc-900 dark:text-zinc-100">{item.nombre}</h4>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
                                <Hash className="h-3 w-3 text-zinc-300 dark:text-zinc-600" /> Valor de Scoring: {item.valor}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} className="h-11 w-11 rounded-xl hover:bg-white dark:hover:bg-zinc-800 hover:text-azul-1 shadow-sm border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      {activeTab === "intereses" && intereses.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-azul-1/20 transition-all group">
                          <div className="flex gap-4 items-center">
                            <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shadow-sm group-hover:scale-110 transition-transform">
                              <Zap className="h-6 w-6 text-azul-1" />
                            </div>
                            <div>
                              <h4 className="font-black text-zinc-900 dark:text-zinc-100">{item.nombre}</h4>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">{item.descripcion || "Sin descripción"}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} className="h-11 w-11 rounded-xl hover:bg-white dark:hover:bg-zinc-800 hover:text-azul-1 shadow-sm border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      {!loading && ((activeTab === "segmentos" && segmentos.length === 0) || (activeTab === "riesgos" && riesgos.length === 0) || (activeTab === "intereses" && intereses.length === 0)) && (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                          <div className="h-20 w-20 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-6">
                            <Settings className="h-10 w-10 opacity-10" />
                          </div>
                          <p className="font-black uppercase tracking-[0.3em] text-[10px]">No hay elementos configurados</p>
                          <Button variant="link" onClick={() => handleOpenModal()} className="text-azul-1 font-bold text-xs mt-2 uppercase tracking-widest">Crear el primero</Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg animate-in fade-in zoom-in duration-200 border-none shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-2xl font-black">
                  {editingItem ? 'Editar' : 'Agregar'} {activeTab === "segmentos" ? 'Segmento' : activeTab === "riesgos" ? 'Nivel de Riesgo' : 'Tipo de Interés'}
                </CardTitle>
                <CardDescription className="font-bold text-[10px] uppercase tracking-widest mt-1">Completa los campos para guardar los cambios</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseModal} className="h-10 w-10 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {/* Sección Informativa Dinámica */}
                <div className="bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-azul-1 dark:text-azul-400">
                    <Info className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em]">¿Qué significa este parámetro?</span>
                  </div>
                  
                  {activeTab === "riesgos" && (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                        El Nivel de Riesgo clasifica el impacto sanitario y operativo del cliente según su actividad. Determina la frecuencia recomendada, supervisión técnica y prioridad en el SLA.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Frecuencia dinámica
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Prioridad de atención
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "segmentos" && (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                        El Segmento define el tipo de actividad del cliente. Permite que el sistema sugiera protocolos técnicos, frecuencias ideales y niveles de riesgo predeterminados.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                          <ListChecks className="h-3 w-3 text-azul-1 dark:text-azul-400" /> Protocolos auto
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                          <ListChecks className="h-3 w-3 text-azul-1 dark:text-azul-400" /> Checklist específico
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "intereses" && (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                        Indica qué solución solicita el cliente. Permite priorizar la atención, activar plantillas comerciales y generar propuestas acordes a la necesidad detectada.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                          <Zap className="h-3 w-3 text-amber-500" /> Lead Scoring
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                          <Zap className="h-3 w-3 text-amber-500" /> Estrategia comercial
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Nombre del parámetro</Label>
                  <Input name="nombre" defaultValue={editingItem?.nombre} required placeholder="Ej: Restaurante, Crítico, Fumigación" className="h-12 rounded-xl dark:bg-zinc-900 dark:border-zinc-800" />
                </div>

                {activeTab === "segmentos" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Descripción corta</Label>
                      <Input name="descripcion" defaultValue={(editingItem && 'descripcion' in editingItem) ? (editingItem.descripcion ?? '') : ''} placeholder="Breve detalle del segmento" className="h-12 rounded-xl dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Frecuencia Ideal (Días)</Label>
                        <Input type="number" name="frecuenciaSugerida" defaultValue={(editingItem && 'frecuenciaSugerida' in editingItem) ? (editingItem.frecuenciaSugerida ?? 30) : 30} className="h-12 rounded-xl dark:bg-zinc-900 dark:border-zinc-800" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Riesgo por Defecto</Label>
                        <Select name="riesgoSugerido" defaultValue={(editingItem && 'riesgoSugerido' in editingItem) ? (editingItem.riesgoSugerido || 'BAJO') : 'BAJO'} className="h-12 rounded-xl">
                          <option value="BAJO">BAJO</option>
                          <option value="MEDIO">MEDIO</option>
                          <option value="ALTO">ALTO</option>
                          <option value="CRITICO">CRÍTICO</option>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "riesgos" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Valor Scoring</Label>
                      <Input type="number" name="valor" defaultValue={(editingItem && 'valor' in editingItem) ? (editingItem.valor || 0) : 0} className="h-12 rounded-xl dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Identificador Visual (Color)</Label>
                      <Select name="color" defaultValue={(editingItem && 'color' in editingItem) ? (editingItem.color || 'emerald') : 'emerald'} className="h-12 rounded-xl">
                        <option value="emerald">Esmeralda (Seguro)</option>
                        <option value="amber">Ámbar (Precaución)</option>
                        <option value="orange">Naranja (Alerta)</option>
                        <option value="red">Rojo (Peligro)</option>
                      </Select>
                    </div>
                  </div>
                )}

                {activeTab === "intereses" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Descripción</Label>
                      <Input name="descripcion" defaultValue={(editingItem && 'descripcion' in editingItem) ? (editingItem.descripcion ?? '') : ''} placeholder="Detalle del servicio de interés" className="h-12 rounded-xl dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Frecuencia Sugerida (Días)</Label>
                        <Input type="number" name="frecuenciaSugerida" defaultValue={(editingItem && 'frecuenciaSugerida' in editingItem) ? (editingItem.frecuenciaSugerida ?? 30) : 30} className="h-12 rounded-xl dark:bg-zinc-900 dark:border-zinc-800" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Riesgo Sugerido</Label>
                        <Select name="riesgoSugerido" defaultValue={(editingItem && 'riesgoSugerido' in editingItem) ? (editingItem.riesgoSugerido || 'BAJO') : 'BAJO'} className="h-12 rounded-xl">
                          <option value="BAJO">BAJO</option>
                          <option value="MEDIO">MEDIO</option>
                          <option value="ALTO">ALTO</option>
                          <option value="CRITICO">CRÍTICO</option>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 leading-tight">
                    Estos parámetros permiten que el sistema automatice recomendaciones, alertas y prioridades operativas.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                <Button type="button" variant="ghost" onClick={handleCloseModal} className="font-bold text-xs uppercase tracking-widest">Cancelar</Button>
                <Button type="submit" className="bg-azul-1 hover:bg-azul-1/90 text-white font-bold rounded-xl gap-2 h-12 px-10">
                  <Save className="h-4 w-4" /> GUARDAR CAMBIOS
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
