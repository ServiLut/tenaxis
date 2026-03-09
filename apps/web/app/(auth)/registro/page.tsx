"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select } from "@/components/ui";
import {
  UserPlus,
  Mail,
  Lock,
  Phone,
  CreditCard,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { ModeToggle } from "@/components/dashboard/ModeToggle";

import { registerAction } from "../actions";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nombre: "",
    apellido: "",
    telefono: "",
    tipoDocumento: "",
    numeroDocumento: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setStepError(null);
  };

  const isStepValid = (currentStep: number) => {
    if (currentStep === 1) {
      return Boolean(
        formData.nombre.trim() &&
        formData.apellido.trim() &&
        formData.tipoDocumento.trim() &&
        formData.numeroDocumento.trim(),
      );
    }
    return Boolean(formData.email.trim() && formData.password.trim());
  };

  const handleNextStep = () => {
    if (!isStepValid(1)) {
      setStepError("Completa todos los campos obligatorios para continuar.");
      return;
    }
    setStep(2);
  };

  const handlePrevStep = () => {
    setStepError(null);
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid(2)) {
      setStepError("Completa email y password para crear tu cuenta.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await registerAction(formData);

      if (!res.success) {
        throw new Error(res.error);
      }

      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F1EB] dark:bg-zinc-950 p-6 relative overflow-hidden">
        {/* Background blobs for success screen */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-azul-1/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-vivido-purpura-2/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-lg space-y-10 rounded-[3rem] bg-white dark:bg-zinc-900/80 p-12 text-center shadow-2xl border border-zinc-200 dark:border-zinc-800 backdrop-blur-xl relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-azul-1 to-vivido-purpura-2 text-white shadow-2xl shadow-azul-1/40 animate-bounce-subtle">
            <CheckCircle2 className="h-16 w-16" />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">
              ¡Bienvenido a la élite!
            </h1>
            <p className="text-2xl text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium italic">
              Tu cuenta ha sido creada. Prepárate para transformar tu negocio con Tenaxis.
            </p>
          </div>
          <Button asChild size="lg" className="w-full h-16 rounded-2xl bg-vivido-purpura-2 text-white hover:opacity-90 shadow-2xl shadow-vivido-purpura-2/30 border-none transition-all active:scale-[0.98]">
            <Link
              href="/iniciar-sesion"
              className="flex items-center justify-center w-full h-full"
            >
              <span className="text-sm font-black uppercase tracking-widest">Entrar a mi panel</span>
              <ArrowRight className="ml-3 h-6 w-6" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (

    <div className="flex min-h-screen overflow-hidden bg-[#F5F1EB] dark:bg-zinc-950">
      {/* Floating Theme Toggle */}
      <div className="fixed top-8 right-8 z-50">
        <ModeToggle />
      </div>

      {/* Left side: Content/Marketing - Secondary Color (30%) */}
      <div className="relative hidden min-h-screen w-1/2 flex-col bg-azul-1 dark:bg-gradient-to-br dark:from-azul-1 dark:via-[#1e3a8a] dark:to-[#0f172a] p-12 text-white lg:flex overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-claro-azul-4/20 blur-3xl" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-azul-1 shadow-2xl transition-transform group-hover:scale-110 duration-500">
              <Sparkles className="h-6 w-6" />
            </div>
            <span className="text-3xl font-black tracking-tighter text-white dark:text-zinc-50">
              Tenaxis
            </span>
          </Link>
        </div>

        <div className="relative z-10 my-auto space-y-12">
          <div className="space-y-6">
            <h2 className="text-6xl font-black leading-[1.1] tracking-tighter italic text-white dark:text-zinc-50">
              El poder de la <br />
              <span className="text-claro-azul-4 not-italic bg-clip-text text-transparent bg-gradient-to-r from-claro-azul-4 to-white">simplicidad.</span>
            </h2>
            <p className="max-w-md text-xl leading-relaxed text-white dark:text-zinc-50 font-medium border-l-4 border-claro-azul-4 pl-6">
              La plataforma multitenant más intuitiva y potente del mercado.
            </p>
          </div>

          <div className="grid gap-8">
            <div className="flex items-center gap-5 group">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 border border-white/40 shadow-xl transition-all group-hover:scale-110 group-hover:bg-white/30 backdrop-blur-sm">
                <ShieldCheck className="h-8 w-8 text-white dark:text-zinc-50" />
              </div>
              <div>
                <h3 className="font-black text-white dark:text-zinc-50 uppercase tracking-[0.2em] text-[11px] mb-1">
                  Aislamiento Total
                </h3>
                <p className="text-white dark:text-zinc-50 text-lg font-medium">
                  Seguridad grado bancario para cada tenant.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5 group">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 border border-white/40 shadow-xl transition-all group-hover:scale-110 group-hover:bg-white/30 backdrop-blur-sm">
                <Zap className="h-8 w-8 text-white dark:text-zinc-50" />
              </div>
              <div>
                <h3 className="font-black text-white dark:text-zinc-50 uppercase tracking-[0.2em] text-[11px] mb-1">
                  Rendimiento Extremo
                </h3>
                <p className="text-white dark:text-zinc-50 text-lg font-medium">
                  Arquitectura optimizada para la velocidad.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-white dark:text-zinc-50">
          <span>TENAXIS © 2026</span>
          <div className="flex gap-10">
            <Link
              href="/privacidad"
              className="text-white dark:text-zinc-50 hover:text-claro-azul-4 transition-colors"
            >
              Privacidad
            </Link>
            <Link
              href="/terminos"
              className="text-white dark:text-zinc-50 hover:text-claro-azul-4 transition-colors"
            >
              Términos
            </Link>
          </div>
        </div>
      </div>

      {/* Right side: Register Form - Dominant Color (60%) */}
      <div className="flex h-full w-full flex-col p-8 lg:w-1/2 xl:p-12 bg-transparent overflow-y-auto custom-scrollbar relative">
        {/* Subtle Decorative elements for form side in dark mode */}
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-vivido-purpura-2/5 rounded-full blur-[100px] pointer-events-none hidden dark:block" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-azul-1/5 rounded-full blur-[100px] pointer-events-none hidden dark:block" />

        <div className="mx-auto w-full max-w-xl space-y-8 my-auto relative z-10">
          <div className="space-y-2 lg:text-left text-center">
            <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
              Únete hoy
            </h1>
            <p className="text-xl text-zinc-400 font-medium italic">
              Empieza a escalar tu negocio en segundos.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {(error || stepError) && (
              <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/10 border-2 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/20 font-bold text-base">
                  !
                </div>
                <span>{error || stepError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.4em] text-azul-1 dark:text-claro-azul-4">
                <span>Paso {step} de 2</span>
                <span className="text-zinc-400 dark:text-zinc-600">{step === 1 ? "Tus Datos" : "Seguridad"}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-azul-1 to-vivido-purpura-2 transition-all duration-700 ease-in-out ${
                    step === 1 ? "w-1/2" : "w-full"
                  }`}
                />
              </div>
            </div>

            {/* Sección: Datos */}
            {step === 1 && (
              <section className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azul-1/10 text-azul-1 text-lg font-black shadow-inner border border-azul-1/20">
                    1
                  </div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">
                    Información Personal
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Label
                      htmlFor="nombre"
                      className="ml-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
                    >
                      Nombre
                    </Label>
                    <Input
                      id="nombre"
                      name="nombre"
                      placeholder="Juan"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                      className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 focus:border-azul-1 dark:focus:border-azul-1/50 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-50 h-14 transition-all px-6 backdrop-blur-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="apellido"
                      className="ml-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
                    >
                      Apellido
                    </Label>
                    <Input
                      id="apellido"
                      name="apellido"
                      placeholder="Pérez"
                      value={formData.apellido}
                      onChange={handleChange}
                      required
                      className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 focus:border-azul-1 dark:focus:border-azul-1/50 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-50 h-14 transition-all px-6 backdrop-blur-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Label
                      htmlFor="tipoDocumento"
                      className="ml-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
                    >
                      Documento
                    </Label>
                    <Select
                      id="tipoDocumento"
                      name="tipoDocumento"
                      value={formData.tipoDocumento}
                      onChange={handleChange}
                      showIcon={false}
                      className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 focus:border-azul-1 dark:focus:border-azul-1/50 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-50 h-14 px-6 transition-all backdrop-blur-sm"
                    >
                      <option value="">Seleccione...</option>
                      <option value="CC">C.C. (Cédula)</option>
                      <option value="CE">C.E. (Extranjería)</option>
                      <option value="NIT">NIT (Empresas)</option>
                      <option value="PP">Pasaporte</option>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="numeroDocumento"
                      className="ml-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
                    >
                      Número de Identidad
                    </Label>
                    <div className="relative group">
                      <CreditCard className="absolute top-1/2 left-6 h-5 w-5 -translate-y-1/2 text-zinc-300 group-focus-within:text-azul-1 transition-colors" />
                      <Input
                        id="numeroDocumento"
                        name="numeroDocumento"
                        placeholder="123456789"
                        value={formData.numeroDocumento}
                        onChange={handleChange}
                        className="pl-16 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 focus:border-azul-1 dark:focus:border-azul-1/50 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-50 h-14 transition-all backdrop-blur-sm"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Sección: Acceso */}
            {step === 2 && (
              <section className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azul-1/10 text-azul-1 text-lg font-black shadow-inner border border-azul-1/20">
                    2
                  </div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">
                    Credenciales de Acceso
                  </h2>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label
                      htmlFor="email"
                      className="ml-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
                    >
                      Email Corporativo
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute top-1/2 left-6 h-5 w-5 -translate-y-1/2 text-zinc-300 group-focus-within:text-azul-1 transition-colors" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="hola@tuempresa.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="pl-16 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 focus:border-azul-1 dark:focus:border-azul-1/50 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-50 h-14 transition-all backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    <div className="space-y-3">
                      <Label
                        htmlFor="telefono"
                        className="ml-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
                      >
                        Teléfono Móvil
                      </Label>
                      <div className="relative group">
                        <Phone className="absolute top-1/2 left-6 h-5 w-5 -translate-y-1/2 text-zinc-300 group-focus-within:text-azul-1 transition-colors" />
                        <Input
                          id="telefono"
                          name="telefono"
                          type="tel"
                          placeholder="+57 300..."
                          value={formData.telefono}
                          onChange={handleChange}
                          className="pl-16 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 focus:border-azul-1 dark:focus:border-azul-1/50 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-50 h-14 transition-all backdrop-blur-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label
                        htmlFor="password"
                        className="ml-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
                      >
                        Password Seguro
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute top-1/2 left-6 h-5 w-5 -translate-y-1/2 text-zinc-300 group-focus-within:text-azul-1 transition-colors" />
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          className="pl-16 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 focus:border-azul-1 dark:focus:border-azul-1/50 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-50 h-14 transition-all backdrop-blur-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="flex items-center justify-end gap-6 pt-6">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  className="rounded-2xl px-12 h-16 border-2 border-zinc-200 dark:border-zinc-800 dark:text-zinc-300 font-black uppercase tracking-widest text-xs transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  Volver
                </Button>
              )}

              {step === 1 ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  size="lg"
                  className="group rounded-2xl bg-vivido-purpura-2 text-white hover:opacity-90 shadow-2xl shadow-vivido-purpura-2/30 px-16 h-16 border-none transition-all active:scale-[0.98]"
                >
                  <span className="flex items-center gap-3 text-xs font-black uppercase tracking-widest">
                    Continuar
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="group rounded-2xl bg-vivido-purpura-2 text-white hover:opacity-90 shadow-2xl shadow-vivido-purpura-2/30 px-16 h-16 border-none transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-xs font-black uppercase tracking-widest">Creando...</span>
                    </div>
                  ) : (
                    <span className="flex items-center gap-3 text-xs font-black uppercase tracking-widest">
                      Empezar ahora
                      <UserPlus className="h-5 w-5" />
                    </span>
                  )}
                </Button>
              )}
            </div>
          </form>

          <div className="border-t border-zinc-100 dark:border-zinc-800/50 pt-10 text-center">
            <p className="text-zinc-400 font-bold text-lg">
              ¿Ya estás dentro?{" "}
              <Link href="/iniciar-sesion" className="text-azul-1 dark:text-claro-azul-4 font-black hover:underline underline-offset-8 decoration-2 transition-all ml-2">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
