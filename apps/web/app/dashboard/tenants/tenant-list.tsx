"use client";

import React, { useState } from "react";
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Building2, Plus, Users, Globe, Mail, Hash, Loader2, X } from "lucide-react";
import { createTenantAction } from "../actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  correo?: string;
  nit?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    users: number;
    empresas: number;
  };
}

interface TenantListProps {
  initialTenants: Tenant[];
}

export function TenantList({ initialTenants }: TenantListProps) {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    nombre: "",
    slug: "",
    ownerEmail: "",
    ownerPassword: "",
    ownerNombre: "",
    ownerApellido: "",
    nit: "",
    correo: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newTenant = await createTenantAction(formData);
      setTenants([newTenant, ...tenants]);
      setIsModalOpen(false);
      setFormData({ 
        nombre: "", 
        slug: "", 
        ownerEmail: "", 
        ownerPassword: "", 
        ownerNombre: "", 
        ownerApellido: "", 
        nit: "", 
        correo: "" 
      });
      toast.success("Tenant creado exitosamente");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear tenant");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "nombre" && !formData.slug ? { slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") } : {}),
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-5 w-5" />
          Nuevo Tenant
        </Button>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-zinc-200 p-20 dark:border-zinc-800 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900">
              <Building2 className="h-8 w-8 text-zinc-400" />
            </div>
            <h2 className="mt-6 text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              No hay tenants registrados
            </h2>
            <p className="mt-2 max-w-xs text-sm text-zinc-500">
              Comienza creando tu primer tenant para empezar a administrar organizaciones.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className="group overflow-hidden border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 transition-all hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={(
                    "rounded-full px-2 py-0.5 text-[10px] font-black uppercase",
                    tenant.isActive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  )}>
                    {tenant.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <CardTitle className="text-xl font-black tracking-tight mb-1">{tenant.nombre}</CardTitle>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">/{tenant.slug}</p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-zinc-500">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{tenant._count?.users || 0} Usuarios</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-500">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{tenant._count?.empresas || 0} Sedes</span>
                  </div>
                  {tenant.correo && (
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium truncate">{tenant.correo}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Simple */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-zinc-950 animate-in zoom-in-95 duration-200">
            <div className="relative p-8 sm:p-12">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-8 top-8 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="mb-10 space-y-2">
                <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">Nuevo Tenant</h2>
                <p className="text-zinc-500 font-medium italic">Registra una nueva organización en el sistema.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="ml-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Nombre</Label>
                    <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required className="rounded-2xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug" className="ml-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Slug (URL)</Label>
                    <Input id="slug" name="slug" value={formData.slug} onChange={handleChange} required className="rounded-2xl h-12" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ownerEmail" className="ml-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Email del Dueño</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input id="ownerEmail" name="ownerEmail" type="email" value={formData.ownerEmail} onChange={handleChange} required className="pl-12 rounded-2xl h-12" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ownerPassword" id="ownerPassword-label" className="ml-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Contraseña del Dueño (si no existe)</Label>
                  <Input id="ownerPassword" name="ownerPassword" type="password" value={formData.ownerPassword} onChange={handleChange} className="rounded-2xl h-12" />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ownerNombre" className="ml-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Nombre del Dueño</Label>
                    <Input id="ownerNombre" name="ownerNombre" value={formData.ownerNombre} onChange={handleChange} className="rounded-2xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerApellido" className="ml-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Apellido del Dueño</Label>
                    <Input id="ownerApellido" name="ownerApellido" value={formData.ownerApellido} onChange={handleChange} className="rounded-2xl h-12" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nit" className="ml-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">NIT / Identificación</Label>
                    <Input id="nit" name="nit" value={formData.nit} onChange={handleChange} className="rounded-2xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="correo" className="ml-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Correo Corporativo</Label>
                    <Input id="correo" name="correo" type="email" value={formData.correo} onChange={handleChange} className="rounded-2xl h-12" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Crear Ahora"}
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
