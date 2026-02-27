"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useUserRole } from "@/hooks/use-user-role";
import { ArrowLeft, Save, Loader2, UserPlus } from "lucide-react";

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const { tenantId } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    nombre: "",
    apellido: "",
    telefono: "",
    role: "ASESOR", // Default role
  });

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      setError("No se ha identificado el Tenant actual.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = getCookie("access_token");

      const response = await fetch(`/api/tenants/${tenantId}/memberships`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error al crear el usuario");
      }

      // Volver a la lista de usuarios
      router.push("/dashboard/equipo-trabajo");
      router.refresh(); // Forzar actualización de la página
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Ocurrió un error inesperado";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-zinc-400 hover:text-azul-1 transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al equipo
            </button>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-azul-1" />
              Nuevo Usuario
            </h1>
            <p className="text-zinc-500 font-medium">
              Agrega un nuevo miembro a tu equipo de trabajo.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <Card className="border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-xl font-black tracking-tight">Datos del Usuario</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
                    Nombre
                  </Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Juan"
                    className="h-12"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellido" className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
                    Apellido
                  </Label>
                  <Input
                    id="apellido"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    placeholder="Ej. Pérez"
                    className="h-12"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="juan.perez@ejemplo.com"
                    className="h-12"
                    disabled={loading}
                    required
                  />
                  <p className="text-[10px] text-zinc-500 px-1">
                    Se enviará una invitación a este correo.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono" className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
                    Teléfono (Opcional)
                  </Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="+57 300 123 4567"
                    className="h-12"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
                  Rol en la Empresa
                </Label>
                <Select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="h-12"
                  disabled={loading}
                  required
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="COORDINADOR">Coordinador</option>
                  <option value="ASESOR">Asesor</option>
                  <option value="OPERADOR">Operador</option>
                </Select>
                <p className="text-[10px] text-zinc-500 px-1">
                  El rol determina los permisos del usuario dentro de la plataforma.
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full md:w-auto items-center justify-center gap-2 rounded-2xl bg-azul-1 dark:bg-azul-1 px-8 text-sm font-black uppercase tracking-widest text-white dark:text-zinc-300 shadow-lg shadow-azul-1/20 transition-all hover:bg-blue-700 dark:hover:bg-blue-700/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Crear Usuario
                    </>
                  )}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
