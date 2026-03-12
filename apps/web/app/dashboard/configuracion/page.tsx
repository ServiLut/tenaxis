"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getTiposInteresAction,
  createTipoInteresAction,
  updateTipoInteresAction,
  getServiciosAction,
  createServicioAction,
  updateServicioAction,
  updateMembershipAction,
  getEnterprisesAction,
  getMyProfileAction,
} from "../actions";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Settings, 
  Zap, 
  Plus, 
  Pencil, 
  Save, 
  X,
  Building,
  User,
  CreditCard,
  Briefcase,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { ConfigEmpresas } from "@/components/dashboard/ConfigEmpresas";

type TabType = "intereses" | "servicios" | "empresas" | "perfil";

type TipoInteres = {
  id: string;
  nombre: string;
  descripcion: string | null;
  frecuenciaSugerida?: number;
  riesgoSugerido?: string;
  activo: boolean;
};

type UserProfile = {
  id?: string;
  membershipId?: string;
  empresaId?: string;
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

type ServicioConfig = {
  id: string;
  nombre: string;
  empresaId: string;
  activo?: boolean;
  requiereSeguimiento?: boolean;
  primerSeguimientoDias?: number | null;
  requiereSeguimientoTresMeses?: boolean;
};

type Empresa = {
  id: string;
  nombre: string;
};

const TIPOS_CUENTA = ['Ahorros', 'Corriente', 'Monedero (Nequi/Daviplata)', 'Otro'];
const BANCOS_COLOMBIA = [
  "Bancolombia", "Banco de Bogotá", "Davivienda", "BBVA Colombia", "Banco de Occidente",
  "Banco Popular", "Scotiabank Colpatria", "Itaú", "Banco GNB Sudameris", "Banco Caja Social",
  "Banco AV Villas", "Banco Agrario", "Nequi", "Daviplata", "NuBank", "Lulo Bank"
];

const TIPOS_DOCUMENTO = [
  "Cédula de Ciudadanía", "Cédula de Extranjería", "NIT", "Pasaporte", "Tarjeta de Identidad"
];

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<TabType>("intereses");
  const [loading, setLoading] = useState(true);
  const [intereses, setIntereses] = useState<TipoInteres[]>([]);
  const [servicios, setServicios] = useState<ServicioConfig[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServicioModalOpen, setIsServicioModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TipoInteres | null>(null);
  const [editingServicio, setEditingServicio] = useState<ServicioConfig | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const userData = localStorage.getItem("user");
      let localUser: UserProfile | null = null;

      if (userData && userData !== "undefined") {
        try {
          localUser = JSON.parse(userData) as UserProfile;
        } catch {
          localUser = null;
        }
      }

      if (localUser) {
        setUser(localUser);
      }

      try {
        const profile = await getMyProfileAction();
        if (profile) {
          setUser((prev) => ({
            ...prev,
            ...profile,
          }));
          localStorage.setItem("user", JSON.stringify({
            ...localUser,
            ...profile,
          }));
        }
      } catch {
        // fallback silencioso al cache local
      }
    };

    loadProfile().catch(() => {
      // noop
    });

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs: TabType[] = ["intereses", "servicios", "empresas", "perfil"];
      if (hash && validTabs.includes(hash as TabType)) {
        setActiveTab(hash as TabType);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (activeTab === 'intereses') {
      loadData().catch(() => {
        toast.error("Error al cargar la configuración");
      });
    }
    if (activeTab === 'servicios') {
      loadServiciosData().catch(() => {
        toast.error("Error al cargar los servicios");
      });
    }
  }, [activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  async function loadData() {
    setLoading(true);
    try {
      const ints = await getTiposInteresAction();
      setIntereses(ints as unknown as TipoInteres[]);
    } catch (_error) {
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  }

  async function loadServiciosData() {
    setLoading(true);
    try {
      const empresasResult = await getEnterprisesAction();
      const loadedEmpresas = (
        Array.isArray(empresasResult)
          ? empresasResult
          : (empresasResult as { items?: Empresa[] })?.items || []
      ) as Empresa[];

      setEmpresas(loadedEmpresas);

      const currentEmpresaId =
        selectedEmpresaId ||
        localStorage.getItem("current-enterprise-id") ||
        loadedEmpresas[0]?.id ||
        "";

      setSelectedEmpresaId(currentEmpresaId);

      const serviciosResult = await getServiciosAction(currentEmpresaId || undefined);
      setServicios(Array.isArray(serviciosResult) ? (serviciosResult as ServicioConfig[]) : []);
    } catch (_error) {
      toast.error("Error al cargar servicios");
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (item: TipoInteres | null = null) => {
    setEditingItem(item);
    setEditingServicio(null);
    setIsModalOpen(true);
  };

  const handleOpenServicioModal = (item: ServicioConfig | null = null) => {
    setEditingServicio(item);
    setEditingItem(null);
    setIsServicioModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingItem(null);
    setEditingServicio(null);
    setIsModalOpen(false);
    setIsServicioModalOpen(false);
  };

  const handleSaveProfile = async () => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      
      if (user.membershipId) {
        try {
          const currentEnterpriseId = localStorage.getItem("current-enterprise-id") || user.empresaId;
          const res = await updateMembershipAction(user.membershipId, {
            nombre: user.nombre,
            apellido: user.apellido,
            telefono: user.telefono,
            tipoDocumento: user.tipoDocumento,
            numeroDocumento: user.numeroDocumento,
            banco: user.banco,
            tipoCuenta: user.tipoCuenta,
            numeroCuenta: user.numeroCuenta,
            valorHora: user.valorHora,
            cuentaPagoEmpresaId: currentEnterpriseId,
          });

          if (res.success) {
            const profile = await getMyProfileAction();
            if (profile) {
              const merged = { ...user, ...profile };
              setUser(merged);
              localStorage.setItem("user", JSON.stringify(merged));
            }
            toast.success("Perfil sincronizado con el servidor");
          } else {
            console.warn("Server sync failed", res.error);
            toast.error(res.error || "No se pudieron guardar los cambios");
          }
        } catch (error) {
          console.error("Connection error during sync", error);
          toast.error("No se pudo sincronizar el perfil con el servidor");
        }
      } else {
        toast.success("Perfil actualizado localmente");
      }
    }
  };

  const updateProfileField = (field: keyof UserProfile, value: string | number | undefined) => {
    if (user) setUser(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const entries = Object.fromEntries(formData.entries());
    try {
      if (activeTab === "intereses") {
        const data = {
          nombre: entries.nombre as string,
          descripcion: entries.descripcion as string || null,
          frecuenciaSugerida: parseInt(entries.frecuenciaSugerida as string) || 30,
          riesgoSugerido: entries.riesgoSugerido as string || "BAJO",
        };
        if (editingItem) await updateTipoInteresAction(editingItem.id, data);
        else await createTipoInteresAction(data);
      } else if (activeTab === "servicios") {
        if (!selectedEmpresaId) {
          throw new Error("Selecciona una empresa antes de guardar el servicio");
        }

        const requiereSeguimiento = entries.requiereSeguimiento === "on";
        const requiereSeguimientoTresMeses =
          entries.requiereSeguimientoTresMeses === "on";
        const primerSeguimientoDiasRaw = entries.primerSeguimientoDias as string;

        const commonData = {
          nombre: entries.nombre as string,
          activo: entries.activo === "on",
          requiereSeguimiento,
          primerSeguimientoDias:
            requiereSeguimiento && primerSeguimientoDiasRaw
              ? parseInt(primerSeguimientoDiasRaw, 10)
              : undefined,
          requiereSeguimientoTresMeses,
        };

        if (editingServicio) {
          await updateServicioAction(editingServicio.id, commonData);
        } else {
          await createServicioAction({
            ...commonData,
            empresaId: selectedEmpresaId,
          });
        }
      }
      toast.success("Guardado exitosamente");
      if (activeTab === "intereses") {
        loadData().catch(() => {
          toast.error("Error al recargar datos");
        });
      } else if (activeTab === "servicios") {
        loadServiciosData().catch(() => {
          toast.error("Error al recargar servicios");
        });
      }
      handleCloseModal();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
    }
  };

  return (
    <DashboardLayout overflowHidden>
      <div className="flex flex-col h-full bg-background">
        {/* Sub-Header Estratégico */}
        <div className="shrink-0 py-10 px-6 lg:px-10 border-b border-border bg-muted/30">
          <div className="max-w-[1600px] mx-auto w-full space-y-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
                <Settings className="h-5 w-5 text-[#01ADFB]" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground leading-tight">
                  Configuración del <span className="text-[#01ADFB]">Negocio</span>
                </h1>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Personaliza los parámetros operativos de tu empresa</p>
              </div>
            </div>

            {/* Tabs */}
              <div className="flex gap-2 p-1 bg-muted rounded-2xl w-fit border border-border">
              {(["intereses", "servicios", "empresas", "perfil"] as const).map((tab) => (
                <button 
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    activeTab === tab ? "bg-background text-[#01ADFB] shadow-md" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "intereses" && <Zap className="h-3.5 w-3.5" />}
                  {tab === "servicios" && <Briefcase className="h-3.5 w-3.5" />}
                  {tab === "empresas" && <Building className="h-3.5 w-3.5" />}
                  {tab === "perfil" && <User className="h-3.5 w-3.5" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contenedor Principal de Datos (Scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
          <div className="max-w-4xl mx-auto w-full pb-24">
            {activeTab === 'perfil' ? (
              <div className="space-y-8">
                <Card className="border-border shadow-2xl shadow-black/5 dark:shadow-none bg-card rounded-[2rem] overflow-hidden">
                  <CardHeader className="p-8 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-[#01ADFB]/10 flex items-center justify-center text-[#01ADFB]"><User className="h-6 w-6" /></div>
                      <div><CardTitle className="text-xl font-black text-foreground">Información Personal</CardTitle><CardDescription className="font-bold text-[10px] uppercase tracking-[0.2em] mt-1.5 text-muted-foreground">Detalles básicos de tu cuenta</CardDescription></div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Nombre</Label><Input value={user?.nombre || ""} onChange={(e) => updateProfileField("nombre", e.target.value)} className="h-12 rounded-xl border-border bg-background text-foreground font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Apellido</Label><Input value={user?.apellido || ""} onChange={(e) => updateProfileField("apellido", e.target.value)} className="h-12 rounded-xl border-border bg-background text-foreground font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Celular</Label><Input value={user?.telefono || ""} onChange={(e) => updateProfileField("telefono", e.target.value)} className="h-12 rounded-xl border-border bg-background text-foreground font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Tipo Documento</Label><Select value={user?.tipoDocumento || ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateProfileField("tipoDocumento", e.target.value)} className="h-12 rounded-xl border-border bg-background text-foreground font-bold"><option value="" disabled>Seleccione...</option>{TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}</Select></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Documento</Label><Input value={user?.numeroDocumento || ""} onChange={(e) => updateProfileField("numeroDocumento", e.target.value)} className="h-12 rounded-xl border-border bg-background text-foreground font-bold" /></div>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-2xl shadow-black/5 dark:shadow-none bg-card rounded-[2rem] overflow-hidden">
                  <CardHeader className="p-8 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600"><CreditCard className="h-6 w-6" /></div>
                      <div>
                        <CardTitle className="text-xl font-black text-foreground">Información Bancaria</CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase tracking-[0.2em] mt-1.5 text-muted-foreground">
                          Datos para la dispersión de pagos y honorarios
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Banco / Entidad</Label>
                      <Select 
                        value={user?.banco || ""} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateProfileField("banco", e.target.value)} 
                        className="h-12 rounded-xl border-border bg-background text-foreground font-bold"
                      >
                        <option value="" disabled>Seleccione un banco...</option>
                        {BANCOS_COLOMBIA.map(b => <option key={b} value={b}>{b}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Tipo de Cuenta</Label>
                      <Select 
                        value={user?.tipoCuenta || ""} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateProfileField("tipoCuenta", e.target.value)} 
                        className="h-12 rounded-xl border-border bg-background text-foreground font-bold"
                      >
                        <option value="" disabled>Seleccione el tipo...</option>
                        {TIPOS_CUENTA.map(t => <option key={t} value={t}>{t}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Número de Cuenta</Label>
                      <Input 
                        placeholder="Ej: 123456789"
                        value={user?.numeroCuenta || ""} 
                        onChange={(e) => updateProfileField("numeroCuenta", e.target.value)} 
                        className="h-12 rounded-xl border-border bg-background text-foreground font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Valor Hora de Servicio</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          value={user?.valorHora || 0} 
                          onChange={(e) => updateProfileField("valorHora", parseFloat(e.target.value) || 0)} 
                          className="h-12 pl-8 rounded-xl border-border bg-background text-emerald-600 font-bold" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end"><Button onClick={handleSaveProfile} className="bg-[#01ADFB] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl h-12 px-10 shadow-xl shadow-[#01ADFB]/20 transition-all active:scale-95 flex items-center gap-2"><Save className="h-4 w-4" /> GUARDAR CAMBIOS</Button></div>
              </div>
            ) : activeTab === 'empresas' ? (
              <ConfigEmpresas />
            ) : activeTab === 'servicios' ? (
              <Card className="border-border shadow-2xl shadow-black/5 dark:shadow-none bg-card rounded-[2rem] overflow-hidden">
                <CardHeader className="flex flex-col gap-4 p-8 border-b border-border bg-muted/30">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl font-black text-foreground">Servicios</CardTitle>
                      <CardDescription className="font-bold text-[10px] uppercase text-muted-foreground mt-1.5">
                        Configura cuáles servicios obligan seguimiento y en qué plazos
                      </CardDescription>
                    </div>
                    <Button onClick={() => handleOpenServicioModal()} className="bg-[#01ADFB] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl gap-2 h-11 px-6 shadow-lg shadow-[#01ADFB]/20">
                      <Plus className="h-4 w-4" /> AGREGAR SERVICIO
                    </Button>
                  </div>

                  <div className="max-w-sm space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Empresa</Label>
                    <Select
                      value={selectedEmpresaId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const empresaId = e.target.value;
                        setSelectedEmpresaId(empresaId);
                        setLoading(true);
                        getServiciosAction(empresaId)
                          .then((result) => {
                            setServicios(Array.isArray(result) ? (result as ServicioConfig[]) : []);
                          })
                          .catch(() => {
                            toast.error("Error al cargar los servicios de la empresa");
                          })
                          .finally(() => setLoading(false));
                      }}
                      className="h-12 rounded-xl border-border bg-background text-foreground font-bold"
                    >
                      <option value="">Selecciona una empresa</option>
                      {empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  {loading ? (
                    <div className="flex h-60 items-center justify-center flex-col gap-4">
                      <div className="h-10 w-10 border-4 border-[#01ADFB]/20 border-t-[#01ADFB] rounded-full animate-spin" />
                      <span className="text-[10px] font-black uppercase text-muted-foreground">Cargando servicios...</span>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {servicios.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 p-6 bg-muted/30 rounded-2xl border border-border hover:border-[#01ADFB]/30 transition-all group">
                          <div className="flex gap-4 items-start">
                            <div className="h-12 w-12 rounded-xl bg-background border border-border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <Briefcase className="h-6 w-6 text-[#01ADFB]" />
                            </div>
                            <div className="space-y-2">
                              <div>
                                <h4 className="font-black text-foreground">{item.nombre}</h4>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                  {item.requiereSeguimiento
                                    ? `Seguimiento inicial a ${item.primerSeguimientoDias ?? "-"} días`
                                    : "Sin seguimiento obligatorio"}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                                  item.requiereSeguimiento
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-zinc-200 text-zinc-600",
                                )}>
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  {item.requiereSeguimiento ? "Con seguimiento" : "Sin seguimiento"}
                                </span>
                                {item.requiereSeguimientoTresMeses ? (
                                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">
                                    <CalendarClock className="h-3.5 w-3.5" />
                                    Seguimiento 3 meses
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenServicioModal(item)} className="h-11 w-11 rounded-xl hover:bg-background border border-transparent hover:border-border transition-all">
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      {!servicios.length ? (
                        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                          <p className="text-sm font-black text-foreground">No hay servicios configurados para esta empresa</p>
                          <p className="text-xs font-medium text-muted-foreground mt-2">
                            Crea uno y define si debe obligar seguimiento telefónico.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border shadow-2xl shadow-black/5 dark:shadow-none bg-card rounded-[2rem] overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-border bg-muted/30">
                  <div>
                    <CardTitle className="text-xl font-black text-foreground">Intereses</CardTitle>
                    <CardDescription className="font-bold text-[10px] uppercase text-muted-foreground mt-1.5">Gestiona los parámetros del sistema</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenModal()} className="bg-[#01ADFB] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl gap-2 h-11 px-6 shadow-lg shadow-[#01ADFB]/20"><Plus className="h-4 w-4" /> AGREGAR NUEVO</Button>
                </CardHeader>
                <CardContent className="p-8">
                  {loading ? (
                    <div className="flex h-60 items-center justify-center flex-col gap-4">
                      <div className="h-10 w-10 border-4 border-[#01ADFB]/20 border-t-[#01ADFB] rounded-full animate-spin" />
                      <span className="text-[10px] font-black uppercase text-muted-foreground">Cargando...</span>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {intereses.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl border border-border hover:border-[#01ADFB]/30 transition-all group">
                          <div className="flex gap-4 items-center">
                            <div className="h-12 w-12 rounded-xl bg-background border border-border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><Zap className="h-6 w-6 text-[#01ADFB]" /></div>
                            <div><h4 className="font-black text-foreground">{item.nombre}</h4><p className="text-xs text-muted-foreground font-medium mt-0.5">{item.descripcion || "Sin descripción"}</p></div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} className="h-11 w-11 rounded-xl hover:bg-background border border-transparent hover:border-border transition-all"><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-card border-border shadow-2xl animate-in zoom-in duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
              <div><CardTitle className="text-xl font-black text-foreground uppercase">{editingServicio ? "Editar Servicio" : editingItem ? 'Editar' : 'Agregar'} Parámetro</CardTitle></div>
              <Button variant="ghost" size="icon" onClick={handleCloseModal} className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Nombre</Label><Input name="nombre" defaultValue={editingServicio?.nombre || editingItem?.nombre} required className="h-12 rounded-xl border-border bg-background text-foreground font-bold" /></div>
                {activeTab === "intereses" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Frecuencia (Días)</Label><Input type="number" name="frecuenciaSugerida" defaultValue={editingItem?.frecuenciaSugerida} className="h-12 rounded-xl border-border bg-background text-foreground font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Riesgo</Label><Select name="riesgoSugerido" defaultValue={editingItem?.riesgoSugerido || 'BAJO'} className="h-12 rounded-xl border-border bg-background text-foreground font-bold"><option value="BAJO">BAJO</option><option value="MEDIO">MEDIO</option><option value="ALTO">ALTO</option><option value="CRITICO">CRÍTICO</option></Select></div>
                  </div>
                )}
                {activeTab === "servicios" && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <input
                          id="requiereSeguimiento"
                          name="requiereSeguimiento"
                          type="checkbox"
                          defaultChecked={editingServicio?.requiereSeguimiento ?? false}
                          className="mt-1 h-4 w-4 rounded border-border"
                        />
                        <div className="space-y-1">
                          <Label htmlFor="requiereSeguimiento" className="text-[11px] font-black uppercase text-foreground">
                            Requiere seguimiento obligatorio
                          </Label>
                          <p className="text-xs text-muted-foreground font-medium">
                            Si se activa, este servicio puede bloquear la creación de nuevas órdenes cuando el asesor no haga la llamada pendiente.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Primer seguimiento (8 a 15 días)</Label>
                        <Input
                          type="number"
                          min={8}
                          max={15}
                          name="primerSeguimientoDias"
                          defaultValue={editingServicio?.primerSeguimientoDias ?? 8}
                          className="h-12 rounded-xl border-border bg-background text-foreground font-bold"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-muted/30 p-5">
                      <div className="flex items-start gap-3">
                        <input
                          id="requiereSeguimientoTresMeses"
                          name="requiereSeguimientoTresMeses"
                          type="checkbox"
                          defaultChecked={editingServicio?.requiereSeguimientoTresMeses ?? true}
                          className="mt-1 h-4 w-4 rounded border-border"
                        />
                        <div className="space-y-1">
                          <Label htmlFor="requiereSeguimientoTresMeses" className="text-[11px] font-black uppercase text-foreground">
                            Agregar seguimiento de 3 meses
                          </Label>
                          <p className="text-xs text-muted-foreground font-medium">
                            Úsalo para servicios sin contrato que también deben tener revisión posterior a largo plazo.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-muted/30 p-5">
                      <div className="flex items-start gap-3">
                        <input
                          id="activo"
                          name="activo"
                          type="checkbox"
                          defaultChecked={editingServicio?.activo ?? true}
                          className="mt-1 h-4 w-4 rounded border-border"
                        />
                        <div className="space-y-1">
                          <Label htmlFor="activo" className="text-[11px] font-black uppercase text-foreground">
                            Servicio activo
                          </Label>
                          <p className="text-xs text-muted-foreground font-medium">
                            Si se desactiva, el servicio deja de aparecer como opción activa para nuevas configuraciones.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-8 pt-0 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={handleCloseModal} className="font-bold text-xs uppercase text-muted-foreground">Cancelar</Button><Button type="submit" className="bg-[#01ADFB] hover:bg-blue-700 text-white font-black uppercase text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-[#01ADFB]/20">Guardar Cambios</Button></CardFooter>
            </form>
          </Card>
        </div>
      )}

      <Dialog open={isServicioModalOpen} onOpenChange={(open) => {
        setIsServicioModalOpen(open);
        if (!open) {
          setEditingServicio(null);
        }
      }}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground uppercase">
              {editingServicio ? "Editar Servicio" : "Agregar Servicio"}
            </DialogTitle>
            <DialogDescription className="font-bold text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Configura si este servicio requiere seguimiento y en qué plazos.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Nombre</Label>
              <Input
                name="nombre"
                defaultValue={editingServicio?.nombre || ""}
                required
                className="h-12 rounded-xl border-border bg-background text-foreground font-bold"
              />
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    id="servicio-requiereSeguimiento"
                    name="requiereSeguimiento"
                    type="checkbox"
                    defaultChecked={editingServicio?.requiereSeguimiento ?? false}
                    className="mt-1 h-4 w-4 rounded border-border"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="servicio-requiereSeguimiento" className="text-[11px] font-black uppercase text-foreground">
                      Requiere seguimiento obligatorio
                    </Label>
                    <p className="text-xs text-muted-foreground font-medium">
                      Si se activa, este servicio obliga llamada posterior y puede bloquear nuevas asignaciones.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Primer seguimiento (8 a 15 días)</Label>
                  <Input
                    type="number"
                    min={8}
                    max={15}
                    name="primerSeguimientoDias"
                    defaultValue={editingServicio?.primerSeguimientoDias ?? 8}
                    className="h-12 rounded-xl border-border bg-background text-foreground font-bold"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-5">
                <div className="flex items-start gap-3">
                  <input
                    id="servicio-requiereSeguimientoTresMeses"
                    name="requiereSeguimientoTresMeses"
                    type="checkbox"
                    defaultChecked={editingServicio?.requiereSeguimientoTresMeses ?? true}
                    className="mt-1 h-4 w-4 rounded border-border"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="servicio-requiereSeguimientoTresMeses" className="text-[11px] font-black uppercase text-foreground">
                      Agregar seguimiento de 3 meses
                    </Label>
                    <p className="text-xs text-muted-foreground font-medium">
                      Úsalo para servicios sin contrato que también requieren revisión posterior.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-5">
                <div className="flex items-start gap-3">
                  <input
                    id="servicio-activo"
                    name="activo"
                    type="checkbox"
                    defaultChecked={editingServicio?.activo ?? true}
                    className="mt-1 h-4 w-4 rounded border-border"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="servicio-activo" className="text-[11px] font-black uppercase text-foreground">
                      Servicio activo
                    </Label>
                    <p className="text-xs text-muted-foreground font-medium">
                      Si se desactiva, deja de aparecer para nuevas órdenes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={handleCloseModal} className="font-bold text-xs uppercase text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#01ADFB] hover:bg-blue-700 text-white font-black uppercase text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-[#01ADFB]/20">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
