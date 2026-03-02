"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@/components/ui";
import { LogIn, Mail, Lock, Sparkles, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error al iniciar sesión");
      }

      const data = result.data || result;

      if (!data.access_token) {
        throw new Error("No se recibió un token de acceso válido");
      }

      document.cookie = `access_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
      
      if (data.user?.tenantId) {
        document.cookie = `tenant-id=${data.user.tenantId}; path=/; max-age=86400; SameSite=Lax`;
      }
      
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      window.location.href = "/dashboard";
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

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#F5F1EB] dark:bg-zinc-950">
      {/* Left side: Brand/Marketing - Secondary Color (30%) */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-azul-1 dark:bg-gradient-to-br dark:from-azul-1 dark:via-[#1e3a8a] dark:to-[#0f172a] p-16 text-white lg:flex overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-claro-azul-4/10 blur-3xl" />
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 text-azul-1 dark:text-claro-azul-4 shadow-2xl transition-transform group-hover:scale-110 duration-500 border border-transparent dark:border-zinc-800">
              <Sparkles className="h-8 w-8" />
            </div>
            <span className="text-4xl font-black tracking-tighter text-white dark:text-zinc-50">
              Tenaxis
            </span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="text-7xl font-black leading-[1.1] tracking-tighter italic text-white dark:text-zinc-50">
            El futuro <br />
            <span className="text-claro-azul-4 not-italic bg-clip-text text-transparent bg-gradient-to-r from-claro-azul-4 to-white dark:from-claro-azul-4 dark:to-zinc-200">es ahora.</span>
          </h2>
          <p className="max-w-md text-2xl leading-relaxed text-white/90 dark:text-zinc-200 font-medium border-l-4 border-claro-azul-4/30 pl-6">
            Gestiona servicios, equipos y clientes con la plataforma más
            avanzada del mercado.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/70 dark:text-zinc-400">
          <span>© 2026 TENAXIS CORP.</span>
          <div className="flex gap-6">
            <Link
              href="/privacidad"
              className="hover:text-white dark:hover:text-zinc-100 transition-colors"
            >
              Privacidad
            </Link>
            <Link
              href="/terminos"
              className="hover:text-white dark:hover:text-zinc-100 transition-colors"
            >
              Términos
            </Link>
          </div>
        </div>
      </div>

      {/* Right side: Login Form - Dominant Color (60%) */}
      <div className="flex w-full flex-col justify-center p-8 lg:w-1/2 xl:p-24 bg-transparent relative">
        {/* Subtle Decorative elements for form side in dark mode */}
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-azul-1/5 rounded-full blur-[100px] pointer-events-none hidden dark:block" />
        
        <div className="mx-auto w-full max-w-md space-y-12 relative z-10">
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 lg:text-left text-center">
              Hola de nuevo
            </h1>
            <p className="text-xl text-zinc-500 dark:text-zinc-400 font-medium italic lg:text-left text-center">
              Entra y sigue construyendo tu imperio.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border-2 border-red-100 dark:border-red-900/30 bg-white dark:bg-red-950/10 p-6 text-sm text-red-700 dark:text-red-400 shadow-sm animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <span className="font-bold">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label
                  htmlFor="email"
                  className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
                >
                  Email corporativo
                </Label>
                <div className="relative group">
                  <Mail className="absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-zinc-300 group-focus-within:text-azul-1 transition-colors" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@correo.com"
                    className="pl-14 h-16 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 focus:border-azul-1 dark:focus:border-azul-1/50 focus:ring-4 focus:ring-azul-1/5 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white transition-all backdrop-blur-sm"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <Label
                    htmlFor="password"
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
                  >
                    Password
                  </Label>
                  <Link
                    href="/olvide-mi-contraseña"
                    title="Recuperar contraseña"
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-azul-1 transition-colors"
                  >
                    ¿Lo olvidaste?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-zinc-300 group-focus-within:text-azul-1 transition-colors" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-14 h-16 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 focus:border-azul-1 dark:focus:border-azul-1/50 focus:ring-4 focus:ring-azul-1/5 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white transition-all backdrop-blur-sm"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="w-full h-16 rounded-2xl bg-vivido-purpura-2 text-white hover:opacity-90 shadow-2xl shadow-vivido-purpura-2/30 border-none transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-xs font-black uppercase tracking-widest">Verificando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <LogIn className="h-5 w-5" />
                  <span className="text-sm font-black uppercase tracking-widest">Entrar ahora</span>
                </div>
              )}
            </Button>
          </form>

          <div className="pt-6 text-center border-t border-zinc-100 dark:border-zinc-800/50">
            <p className="text-zinc-400 font-bold text-lg">
              ¿No tienes cuenta?{" "}
              <Link href="/registro" className="text-azul-1 dark:text-claro-azul-4 font-black hover:underline underline-offset-8 decoration-2 transition-all ml-2">Regístrate aquí</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
