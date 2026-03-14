"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Mail, Lock, Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { DashboardLayout } from "@/components/dashboard";
import { loginChatwootAction } from "./actions";

export default function WhatsAppPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatwootUser, setChatwootUser] = useState<any>(null);

  useEffect(() => {
    const savedChatwoot = localStorage.getItem("chatwoot-session");
    if (savedChatwoot) {
      try {
        setChatwootUser(JSON.parse(savedChatwoot));
      } catch (e) {
        localStorage.removeItem("chatwoot-session");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await loginChatwootAction(email, password);
      
      if (result.success) {
        setChatwootUser(result.data);
        localStorage.setItem("chatwoot-session", JSON.stringify(result.data));
      } else {
        setError(result.error || "Error al conectar con Chatwoot");
      }
    } catch (err) {
      setError("Ocurrió un error inesperado al intentar conectar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("chatwoot-session");
    setChatwootUser(null);
    setEmail("");
    setPassword("");
  };

  if (chatwootUser) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl py-10">
          <div className="flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-green-500/10 text-green-500 shadow-xl shadow-green-500/20">
                <MessageSquare className="h-12 w-12" />
              </div>
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white p-1 dark:bg-slate-900">
                <CheckCircle2 className="h-full w-full text-green-500" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-black tracking-tight text-[#021359] dark:text-white">
                ¡WhatsApp Conectado!
              </h2>
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  Bienvenido, <span className="text-[#01ADFB]">{chatwootUser.user.name}</span>
                </p>
                <p className="text-xs font-medium text-slate-400">
                  {chatwootUser.user.email}
                </p>
              </div>
            </div>

            <div className="grid w-full max-w-2xl grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm dark:border-white/10 dark:bg-slate-900/50">
                <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-[#021359]/40 dark:text-white/40">
                  Estado de la Sesión
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Servidor:</span>
                    <span className="text-sm font-black text-[#021359] dark:text-[#01ADFB]">Chatwoot Cloud</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Conexión:</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-black text-green-500 uppercase">Activa</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm dark:border-white/10 dark:bg-slate-900/50">
                <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-[#021359]/40 dark:text-white/40">
                  Acciones Rápidas
                </h3>
                <div className="space-y-2">
                  <button className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-[#021359] transition-colors hover:bg-slate-100 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                    Sincronizar Mensajes
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-[#021359] transition-colors hover:bg-slate-100 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                    Configurar Webhooks
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="mt-8 rounded-2xl bg-slate-100 px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-red-50 hover:text-red-500 active:scale-95 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-red-500/10"
            >
              Desconectar Cuenta de WhatsApp
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-8 py-10">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2.5rem] bg-[#25D366]/10 text-[#25D366] shadow-inner">
            <MessageSquare className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-[#021359] dark:text-white lg:text-5xl">
              Conectar WhatsApp
            </h1>
            <p className="mx-auto max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
              Usa tus credenciales de <span className="font-bold text-[#021359] dark:text-[#01ADFB]">Chatwoot Cloud</span> para vincular tu canal de WhatsApp.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 dark:border-white/10 dark:bg-slate-900/50 dark:shadow-none">
          <div className="p-8 lg:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-600 animate-in fade-in slide-in-from-top-2 dark:bg-red-500/10 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-bold leading-tight">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[#021359]/60 dark:text-white/60">
                    Correo de Chatwoot
                  </label>
                  <div className="group relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400 transition-colors group-focus-within:text-[#01ADFB]">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-5 pl-14 pr-5 text-sm font-bold transition-all focus:border-[#01ADFB] focus:bg-white focus:ring-4 focus:ring-[#01ADFB]/10 dark:border-white/10 dark:bg-white/5 dark:text-white outline-none"
                      placeholder="tu-correo@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[#021359]/60 dark:text-white/60">
                    Contraseña
                  </label>
                  <div className="group relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400 transition-colors group-focus-within:text-[#01ADFB]">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-5 pl-14 pr-5 text-sm font-bold transition-all focus:border-[#01ADFB] focus:bg-white focus:ring-4 focus:ring-[#01ADFB]/10 dark:border-white/10 dark:bg-white/5 dark:text-white outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#021359] py-5 text-sm font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-[#021359]/90 active:scale-[0.98] disabled:opacity-50",
                  isLoading && "cursor-not-allowed"
                )}
              >
                <div className="absolute inset-0 flex items-center justify-center bg-[#01ADFB] transition-transform duration-500 translate-y-full group-hover:translate-y-0" />
                <span className="relative flex items-center gap-2">
                  {isLoading ? "Validando Credenciales..." : "Iniciar Sesión"}
                  {!isLoading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </span>
              </button>
            </form>
          </div>

          {/* Footer info */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-6 dark:border-white/5 dark:bg-white/5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-[10px] font-black leading-relaxed text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                Acceso exclusivo para administradores de Chatwoot en <span className="text-[#021359] dark:text-[#01ADFB]">servilutioncrm.cloud</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
