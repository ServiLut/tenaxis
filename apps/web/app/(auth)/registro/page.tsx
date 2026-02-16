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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error al registrar usuario");
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
      <div className="flex min-h-screen items-center justify-center bg-[#F5F1EB] p-6">
        <div className="w-full max-w-lg space-y-10 rounded-[3rem] bg-white p-12 text-center shadow-2xl border-none">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] bg-azul-1 text-white shadow-2xl">
            <CheckCircle2 className="h-16 w-16" />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-zinc-900 tracking-tighter">
              ¡Éxito total!
            </h1>
            <p className="text-2xl text-zinc-500 leading-relaxed font-medium italic">
              Ya eres parte de la élite Tenaxis. Tu viaje comienza ahora.
            </p>
          </div>
          <Button asChild size="lg" className="w-full h-16 rounded-2xl bg-vivido-purpura-2 text-white hover:opacity-90 shadow-xl shadow-vivido-purpura-2/20 border-none">
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
    <div className="flex h-screen overflow-hidden bg-[#F5F1EB]">
      {/* Left side: Content/Marketing - Secondary Color (30%) */}
      <div className="relative hidden h-full w-1/2 flex-col bg-azul-1 p-12 text-white lg:flex">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-azul-1 shadow-2xl">
              <Sparkles className="h-6 w-6" />
            </div>
            <span className="text-3xl font-black tracking-tighter">
              Tenaxis
            </span>
          </Link>
        </div>

        <div className="relative z-10 my-auto space-y-12">
          <div className="space-y-6">
            <h2 className="text-6xl font-black leading-[1] tracking-tighter italic">
              El poder de la <br />
              <span className="text-claro-azul-4 not-italic">simplicidad.</span>
            </h2>
            <p className="max-w-md text-xl leading-relaxed text-white/70 font-medium">
              La plataforma multitenant más intuitiva y potente del mercado.
            </p>
          </div>

          <div className="grid gap-8">
            <div className="flex items-center gap-5 group">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/20 shadow-xl transition-transform group-hover:scale-110">
                <ShieldCheck className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="font-black text-white uppercase tracking-widest text-[10px]">
                  Aislamiento Total
                </h3>
                <p className="text-white/60 text-base">
                  Seguridad grado bancario para cada tenant.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5 group">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/20 shadow-xl transition-transform group-hover:scale-110">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="font-black text-white uppercase tracking-widest text-[10px]">
                  Rendimiento Extremo
                </h3>
                <p className="text-white/60 text-base">
                  Arquitectura optimizada para la velocidad.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs font-black uppercase tracking-[0.3em] text-white/40">
          <span>TENAXIS © 2026</span>
          <div className="flex gap-10">
            <Link
              href="/privacidad"
              className="hover:text-white transition-colors"
            >
              Privacidad
            </Link>
            <Link
              href="/terminos"
              className="hover:text-white transition-colors"
            >
              Términos
            </Link>
          </div>
        </div>
      </div>

      {/* Right side: Register Form - Dominant Color (60%) */}
      <div className="flex h-full w-full flex-col p-8 lg:w-1/2 xl:p-12 bg-transparent overflow-y-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:display-none">
        <div className="mx-auto w-full max-w-xl space-y-8 my-auto">
          <div className="space-y-2 lg:text-left text-center">
            <h1 className="text-5xl font-black tracking-tighter text-zinc-900">
              Únete hoy
            </h1>
            <p className="text-xl text-zinc-400 font-medium italic">
              Empieza a escalar tu negocio en segundos.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.35em] text-azul-1">
                <span>Paso {step} de 2</span>
                <span>{step === 1 ? "Tus Datos" : "Seguridad"}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-200">
                <div
                  className={`h-1.5 rounded-full bg-azul-1 transition-all ${
                    step === 1 ? "w-1/2" : "w-full"
                  }`}
                />
              </div>
            </div>

            {/* Sección: Datos */}
            {step === 1 && (
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-azul-1 text-white text-base font-black shadow-lg">
                    1
                  </div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
                    Tus Datos
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="nombre"
                      className="ml-3 text-[9px] font-black uppercase tracking-widest text-zinc-700"
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
                      className="rounded-2xl border-2 border-zinc-200 focus:border-azul-1 bg-white h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="apellido"
                      className="ml-3 text-[9px] font-black uppercase tracking-widest text-zinc-700"
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
                      className="rounded-2xl border-2 border-zinc-200 focus:border-azul-1 bg-white h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="tipoDocumento"
                      className="ml-3 text-[9px] font-black uppercase tracking-widest text-zinc-700"
                    >
                      Documento
                    </Label>
                    <Select
                      id="tipoDocumento"
                      name="tipoDocumento"
                      value={formData.tipoDocumento}
                      onChange={handleChange}
                      showIcon={false}
                      className="rounded-2xl border-2 border-zinc-200 focus:border-azul-1 bg-white h-12 px-4"
                    >
                      <option value="">Seleccione...</option>
                      <option value="CC">C.C.</option>
                      <option value="CE">C.E.</option>
                      <option value="NIT">NIT</option>
                      <option value="PP">Pasaporte</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="numeroDocumento"
                      className="ml-3 text-[9px] font-black uppercase tracking-widest text-zinc-700"
                    >
                      Número
                    </Label>
                    <div className="relative group">
                      <CreditCard className="absolute top-1/2 left-5 h-4 w-4 -translate-y-1/2 text-zinc-300 group-focus-within:text-azul-1 transition-colors" />
                      <Input
                        id="numeroDocumento"
                        name="numeroDocumento"
                        placeholder="12345678"
                        value={formData.numeroDocumento}
                        onChange={handleChange}
                        className="pl-14 rounded-2xl border-2 border-zinc-200 focus:border-azul-1 bg-white h-12"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Sección: Acceso */}
            {step === 2 && (
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-azul-1 text-white text-base font-black shadow-lg">
                    2
                  </div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
                    Seguridad
                  </h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="ml-3 text-[9px] font-black uppercase tracking-widest text-zinc-700"
                    >
                      Email Corporativo
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute top-1/2 left-5 h-4 w-4 -translate-y-1/2 text-zinc-300 group-focus-within:text-azul-1 transition-colors" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="hola@empresa.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="pl-14 rounded-2xl border-2 border-zinc-200 focus:border-azul-1 bg-white h-12"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="telefono"
                        className="ml-3 text-[9px] font-black uppercase tracking-widest text-zinc-700"
                      >
                        Teléfono
                      </Label>
                      <div className="relative group">
                        <Phone className="absolute top-1/2 left-5 h-4 w-4 -translate-y-1/2 text-zinc-300 group-focus-within:text-azul-1 transition-colors" />
                        <Input
                          id="telefono"
                          name="telefono"
                          type="tel"
                          placeholder="+57..."
                          value={formData.telefono}
                          onChange={handleChange}
                          className="pl-14 rounded-2xl border-2 border-zinc-200 focus:border-azul-1 bg-white h-12"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="password"
                        className="ml-3 text-[9px] font-black uppercase tracking-widest text-zinc-700"
                      >
                        Password
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute top-1/2 left-5 h-4 w-4 -translate-y-1/2 text-zinc-300 group-focus-within:text-azul-1 transition-colors" />
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          className="pl-14 rounded-2xl border-2 border-zinc-200 focus:border-azul-1 bg-white h-12"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="flex items-center justify-end gap-4 pt-4">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  className="rounded-xl px-10 h-14 border-2 border-zinc-200 font-black uppercase tracking-widest text-xs"
                >
                  Volver
                </Button>
              )}

              {step === 1 ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  size="lg"
                  className="group rounded-xl bg-vivido-purpura-2 text-white hover:opacity-90 shadow-xl shadow-vivido-purpura-2/20 px-12 h-14 border-none"
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
                  className="group rounded-xl bg-vivido-purpura-2 text-white hover:opacity-90 shadow-xl shadow-vivido-purpura-2/20 px-12 h-14 border-none"
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

          <div className="border-t border-zinc-200 pt-8 text-center">
            <p className="text-zinc-400 font-bold text-lg">
              ¿Ya estás dentro?{" "}
              <Link href="/iniciar-sesion" className="text-azul-1 font-black hover:underline underline-offset-8 decoration-2 transition-all ml-2">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
