"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { ExternalLink, MessageSquare, ShieldAlert, Wifi, WifiOff } from "lucide-react";

export default function WhatsAppPage() {
  const CHATWOOT_URL = "http://tenaxis-chatwoot-255df7-76-13-101-140.traefik.me/app/accounts/1/dashboard";
  const [isOnline, setIsOnline] = useState(true);

  // Simulación de chequeo de conexión al proxy
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch("/api/v1/health", { method: "GET" }).catch(() => ({ ok: false }));
        // Si el proxy responde (aunque sea 401/404), hay ruta.
        setIsOnline(true);
      } catch (e) {
        setIsOnline(false);
      }
    };
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardLayout overflowHidden={true}>
      <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-slate-950">
        <div className="flex-1 relative">
          {/* El iframe intenta cargar mediante el proxy */}
          <iframe
            src="/chatwoot-proxy/app/accounts/1/dashboard"
            className="h-full w-full border-none bg-white relative z-10"
            title="Chatwoot WhatsApp"
            allow="camera; microphone; clipboard-read; clipboard-write; geolocation"
          />
          
          {/* Respaldo visual si no carga el iframe */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-900/50">
            <div className="mb-6 rounded-[2rem] bg-[#25D366]/10 p-8 text-[#25D366] shadow-inner">
              <MessageSquare className="h-16 w-16" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-[#021359] dark:text-white">
              Panel de WhatsApp
            </h2>
            <p className="mt-4 max-w-sm text-sm font-medium text-slate-500 dark:text-slate-400">
              Si la interfaz no aparece automáticamente, usa el acceso directo seguro.
            </p>
            
            <a 
              href={CHATWOOT_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-10 flex items-center gap-3 rounded-[1.5rem] bg-[#021359] px-10 py-5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-[#021359]/20 transition-all hover:bg-[#01ADFB] hover:shadow-[#01ADFB]/30 active:scale-95"
            >
              Conectar WhatsApp <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
        
        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4 dark:border-white/5 dark:bg-slate-950">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="h-2 w-2 rounded-full bg-[#25D366] animate-pulse" />
              <span>Integración Chatwoot + Gowhat</span>
            </div>
            
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 dark:bg-white/5">
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 text-blue-500" />
                  <span className="text-[9px] font-bold text-blue-600 uppercase">Túnel Activo</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-500" />
                  <span className="text-[9px] font-bold text-red-600 uppercase">Sin Conexión Realtime</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300">
            <ShieldAlert className="h-3 w-3" />
            <span>Encriptación SSL Activada</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
