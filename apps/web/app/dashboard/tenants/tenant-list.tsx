"use client";

import React, { useState } from "react";
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, Select } from "@/components/ui";
import { Building2, Plus, Users, Mail, Loader2, X, ShieldCheck, CreditCard, UserPlus, Eye, Pencil } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { createTenantAction, getTenantDetailAction } from "../actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface TenantDetail extends Tenant {
  memberships: Array<{
    user: {
      nombre: string;
      apellido: string;
      email: string;
    };
    role: string;
  }>;
  empresas: Array<{
    id: string;
    nombre: string;
  }>;
  subscription?: {
    plan: {
      nombre: string;
    };
    endDate: string;
  } | null;
}

interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  correo?: string;
  nit?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    memberships: number;
    empresas: number;
  };
}

interface Plan {
  id: string;
  nombre: string;
  price: number;
}

interface TenantListProps {
  initialTenants: Tenant[];
  availablePlans: Plan[];
}

export function TenantList({ initialTenants, availablePlans }: TenantListProps) {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTenantDetail, setSelectedTenantDetail] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const router = useRouter();

  const handleViewTenant = async (tenantId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await getTenantDetailAction(tenantId);
      setSelectedTenantDetail(detail);
      setIsViewModalOpen(true);
    } catch (error) {
      toast.error("No se pudo cargar la información del sistema");
    } finally {
      setLoadingDetail(false);
    }
  };

  const [formData, setFormData] = useState({
    nombre: "",
    slug: "",
    ownerEmail: "",
    ownerPassword: "",
    ownerNombre: "",
    ownerApellido: "",
    nit: "",
    correo: "",
    planId: availablePlans[0]?.id || "",
    durationDays: 30,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newTenant = await createTenantAction(formData);
      setTenants([newTenant, ...tenants]);
      setIsModalOpen(false);
      setSlugTouched(false);
      setFormData({
        nombre: "",
        slug: "",
        ownerEmail: "",
        ownerPassword: "",
        ownerNombre: "",
        ownerApellido: "",
        nit: "",
        correo: "",
        planId: availablePlans[0]?.id || "",
        durationDays: 30
      });
      toast.success("Tenant creado exitosamente");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear tenant");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "slug") {
      setSlugTouched(true);
    }

    setFormData((prev) => {
      const newFormData = { ...prev, [name]: name === "durationDays" ? parseInt(value) : value };

      if (name === "nombre" && !slugTouched) {
        newFormData.slug = value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
      }

      return newFormData;
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSlugTouched(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 h-12 px-6 rounded-2xl bg-vivido-purpura-2 text-white hover:bg-vivido-purpura-2/90 transition-all border-none shadow-none">
          <Plus className="h-5 w-5" />
          <span className="font-black uppercase tracking-widest text-xs">Nuevo Tenant</span>
        </Button>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-[3rem] border-4 border-zinc-200 p-20 text-center bg-white shadow-xl">
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-azul-1 text-white shadow-2xl">
              <Building2 className="h-10 w-10" />
            </div>
            <h2 className="mt-8 text-2xl font-black tracking-tighter text-zinc-900">
              No hay tenants registrados
            </h2>
            <p className="mt-2 max-w-xs text-sm text-zinc-500 font-medium italic">
              Comienza creando tu primer tenant para administrar organizaciones.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className="group overflow-hidden border-none shadow-xl bg-white transition-all hover:scale-[1.02] rounded-[3rem] relative">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-10 px-10 relative z-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-azul-1 text-white shadow-lg">
                  <Building2 className="h-8 w-8" />
                </div>
                <span className={cn(
                  "rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm",
                  tenant.isActive
                    ? "bg-oscuro-verde-azulado-3 text-white"
                    : "bg-zinc-100 text-zinc-400"
                )}>
                  {tenant.isActive ? "Activo" : "Inactivo"}
                </span>
              </CardHeader>

              <CardContent className="pt-6 px-10 pb-10 relative z-10">
                <CardTitle className="text-3xl font-black tracking-tighter mb-1 leading-none">{tenant.nombre}</CardTitle>
                <div className="inline-flex items-center gap-2 mt-2 mb-8">
                  <div className="h-1.5 w-1.5 rounded-full bg-azul-1" />
                  <p className="text-[10px] font-black text-azul-1 uppercase tracking-[0.3em]">ID: {tenant.slug}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 p-5 rounded-2xl bg-zinc-50 border border-zinc-100">
                    <Users className="h-5 w-5 text-azul-1" />
                    <span className="text-2xl font-black text-zinc-900 tabular-nums leading-none mt-2">{tenant._count?.memberships || 0}</span>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Miembros</span>
                  </div>
                  <div className="flex flex-col gap-1 p-5 rounded-2xl bg-zinc-50 border border-zinc-100">
                    <Building2 className="h-5 w-5 text-azul-1" />
                    <span className="text-2xl font-black text-zinc-900 tabular-nums leading-none mt-2">{tenant._count?.empresas || 0}</span>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sedes</span>
                  </div>
                </div>

                {tenant.correo && (
                  <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <span className="text-xs font-bold text-zinc-500 truncate">{tenant.correo}</span>
                  </div>
                )}

                <div className="mt-10 flex items-center gap-4 pt-6 border-t border-zinc-100">
                  <button
                    onClick={() => handleViewTenant(tenant.id)}
                    disabled={loadingDetail}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-azul-1 transition-colors disabled:opacity-50"
                  >
                    {loadingDetail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    Ver
                  </button>
                  <div className="h-4 w-[1px] bg-zinc-200" />
                  <Button className="flex-1 h-11 rounded-xl bg-zinc-900 text-white hover:bg-azul-1 transition-all shadow-md">
                    <Pencil className="h-4 w-4 mr-2" />
                    <span className="text-xs font-black uppercase tracking-widest">Gestionar</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Visualizar Tenant */}
      {isViewModalOpen && selectedTenantDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-4xl overflow-hidden rounded-[3rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300 border-none">
            <div className="relative max-h-[90vh] overflow-y-auto">
              {/* Header Modal */}
              <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 p-8 pb-4 backdrop-blur-md border-b border-zinc-50">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azul-1 text-white shadow-lg">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter text-zinc-900">{selectedTenantDetail.nombre}</h2>
                    <p className="text-xs font-bold text-azul-1 uppercase tracking-widest">ID: {selectedTenantDetail.slug}</p>
                  </div>
                </div>
                <button onClick={() => setIsViewModalOpen(false)} className="rounded-full p-3 text-zinc-400 hover:bg-zinc-100 transition-all hover:rotate-90">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-10 space-y-12">
                {/* Información General */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-1 p-6 rounded-3xl bg-[#F5F1EB] border border-zinc-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">NIT / Identificación</p>
                    <p className="text-lg font-black text-zinc-900">{selectedTenantDetail.nit || "No registrado"}</p>
                  </div>
                  <div className="space-y-1 p-6 rounded-3xl bg-[#F5F1EB] border border-zinc-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Email Corporativo</p>
                    <p className="text-lg font-black text-zinc-900 truncate">{selectedTenantDetail.correo || "No registrado"}</p>
                  </div>
                  <div className="space-y-1 p-6 rounded-3xl bg-[#F5F1EB] border border-zinc-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Suscripción Activa</p>
                    <p className="text-lg font-black text-azul-1">
                      {selectedTenantDetail.subscription?.plan.nombre || "Sin plan"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Miembros */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                      <Users className="h-5 w-5 text-azul-1" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900">Miembros de la Organización</h3>
                      <span className="ml-auto text-xs font-black bg-zinc-100 px-2 py-1 rounded-lg text-zinc-500">
                        {selectedTenantDetail.memberships.length}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {selectedTenantDetail.memberships.map((membership, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-black text-xs">
                              {membership.user.nombre[0]}{membership.user.apellido[0]}
                            </div>
                            <div>
                              <p className="text-sm font-black text-zinc-900">{membership.user.nombre} {membership.user.apellido}</p>
                              <p className="text-[10px] font-bold text-zinc-400">{membership.user.email}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest bg-azul-1/10 text-azul-1 px-3 py-1 rounded-full">
                            {membership.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sedes */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                      <Building2 className="h-5 w-5 text-azul-1" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900">Sedes / Empresas</h3>
                      <span className="ml-auto text-xs font-black bg-zinc-100 px-2 py-1 rounded-lg text-zinc-500">
                        {selectedTenantDetail.empresas.length}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {selectedTenantDetail.empresas.map((empresa, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-azul-1/10 flex items-center justify-center text-azul-1">
                              <Building2 className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-black text-zinc-900">{empresa.nombre}</p>
                          </div>
                          <button className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-azul-1 transition-colors">
                            Ver Sede
                          </button>
                        </div>
                      ))}
                      {selectedTenantDetail.empresas.length === 0 && (
                        <p className="text-xs text-zinc-400 italic text-center py-8">No hay sedes registradas</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-zinc-100 flex justify-end">
                  <Button onClick={() => setIsViewModalOpen(false)} className="h-12 px-8 rounded-xl bg-zinc-900 text-white hover:bg-azul-1 transition-all">
                    Cerrar Vista
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Optimizado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-2xl overflow-hidden rounded-[3rem] bg-white shadow-[0_0_100px_-12px_rgba(0,0,0,0.3)] dark:bg-zinc-950 animate-in zoom-in-95 duration-300 border border-zinc-100 dark:border-zinc-800">
            <div className="relative max-h-[90vh] overflow-y-auto">
              {/* Header Modal */}
              <div className="sticky top-0 z-10 flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 p-8 pb-4 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black shadow-xl">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">Configurar Tenant</h2>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Paso único de creación</p>
                  </div>
                </div>
                <button onClick={handleCloseModal} className="rounded-full p-3 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all hover:rotate-90">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-10">
                {/* Sección 1: Organización */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-zinc-50 pb-2 dark:border-zinc-800">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-50">Organización</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombre" className="ml-1 text-[11px] font-black uppercase text-zinc-700 dark:text-zinc-300">Nombre Comercial</Label>
                      <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Ej: Tenaxis Corp" className="rounded-2xl h-12 border-zinc-200 focus:border-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug" className="ml-1 text-[11px] font-black uppercase text-zinc-700 dark:text-zinc-300">Slug / URL</Label>
                      <Input id="slug" name="slug" value={formData.slug} onChange={handleChange} required placeholder="tenaxis-corp" className="rounded-2xl h-12 border-zinc-200 font-mono text-xs bg-zinc-50/50 dark:bg-zinc-900/50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nit" className="ml-1 text-[11px] font-black uppercase text-zinc-700 dark:text-zinc-300">NIT / Tax ID</Label>
                      <Input id="nit" name="nit" value={formData.nit} onChange={handleChange} placeholder="900.123.456-1" className="rounded-2xl h-12 border-zinc-200 focus:border-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="correo" className="ml-1 text-[11px] font-black uppercase text-zinc-700 dark:text-zinc-300">Email Corporativo</Label>
                      <Input id="correo" name="correo" type="email" value={formData.correo} onChange={handleChange} placeholder="hola@empresa.com" className="rounded-2xl h-12 border-zinc-200 focus:border-zinc-900 dark:border-zinc-800" />
                    </div>
                  </div>
                </div>

                {/* Sección 2: El Dueño (Owner) */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-zinc-50 pb-2 dark:border-zinc-800">
                    <UserPlus className="h-4 w-4 text-indigo-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-50">Administrador Principal</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="ownerNombre" className="ml-1 text-[11px] font-black uppercase text-zinc-700 dark:text-zinc-300">Nombre</Label>
                        <Input id="ownerNombre" name="ownerNombre" value={formData.ownerNombre} onChange={handleChange} required placeholder="Juan" className="rounded-2xl h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ownerApellido" className="ml-1 text-[11px] font-black uppercase text-zinc-700 dark:text-zinc-300">Apellido</Label>
                        <Input id="ownerApellido" name="ownerApellido" value={formData.ownerApellido} onChange={handleChange} required placeholder="Pérez" className="rounded-2xl h-12" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="ownerEmail" className="ml-1 text-[11px] font-black uppercase text-zinc-700 dark:text-zinc-300">Email de Acceso</Label>
                        <Input id="ownerEmail" name="ownerEmail" type="email" value={formData.ownerEmail} onChange={handleChange} required placeholder="admin@empresa.com" className="rounded-2xl h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ownerPassword" id="ownerPassword-label" className="ml-1 text-[11px] font-black uppercase text-zinc-700 dark:text-zinc-300">Contraseña Temporal</Label>
                        <Input id="ownerPassword" name="ownerPassword" type="password" value={formData.ownerPassword} onChange={handleChange} placeholder="••••••••" className="rounded-2xl h-12" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección 3: Suscripción */}
                <div className="space-y-6 p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3 border-b border-zinc-200/50 pb-2 dark:border-zinc-700">
                    <CreditCard className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-50">Plan de Servicio</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="planId" className="ml-1 text-[11px] font-black uppercase text-zinc-700 dark:text-zinc-300">Seleccionar Plan</Label>
                      <Select id="planId" name="planId" value={formData.planId} onChange={handleChange} required className="bg-white dark:bg-zinc-950">
                        {availablePlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.nombre} — ${plan.price}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="durationDays" className="ml-1 text-[11px] font-black uppercase text-zinc-700 dark:text-zinc-300">Periodo Inicial</Label>
                      <Select id="durationDays" name="durationDays" value={formData.durationDays} onChange={handleChange} required className="bg-white dark:bg-zinc-950">
                        <option value="15">Prueba Gratuita (15 días)</option>
                        <option value="30">Mensual (30 días)</option>
                        <option value="90">Trimestral (90 días)</option>
                        <option value="365">Anual (365 días)</option>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white dark:bg-zinc-950 py-4 border-t border-zinc-50 dark:border-zinc-800">
                  <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1 h-14 rounded-2xl border-2 font-bold uppercase tracking-widest text-xs">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-14 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white shadow-2xl transition-all">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="font-black uppercase tracking-widest">Crear Tenant</span>}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
