"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { RefreshCcw, Info, Users, MessageSquare } from "lucide-react";

export default function WhatsAppPage() {
  const [key, setKey] = useState(0);

  const reloadChat = () => setKey(prev => prev + 1);

  return (
    <DashboardLayout overflowHidden={true}>
      <div className="flex h-full w-full flex-col bg-white dark:bg-slate-950">
        
        {/* BARRA DE ESTADO SUTIL */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 dark:border-white/5 dark:bg-slate-950">
          <div className="flex items-center gap-6">
            {/* Indicador de Canal */}
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#021359] dark:text-white">
                WhatsApp Live
              </span>
            </div>

            {/* Tip de Colaboración (Suave y amigable) */}
            <div className="hidden md:flex items-center gap-2 text-slate-400">
              <Users className="h-3.5 w-3.5" />
              <p className="text-[10px] font-medium italic">
                Tip: Si ves el nombre de un compañero en el chat, él ya lo está atendiendo.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={reloadChat}
              className="group flex items-center gap-2 text-slate-400 transition-colors hover:text-[#01ADFB]"
              title="Refrescar conexión"
            >
              <span className="text-[9px] font-bold uppercase tracking-tight opacity-0 transition-opacity group-hover:opacity-100">
                Refrescar chat
              </span>
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ÁREA DE CHAT (Limpia) */}
        <div className="relative flex-1 bg-slate-50 dark:bg-slate-900">
          <iframe
            key={key}
            src="/chatwoot-proxy/app/accounts/1/dashboard"
            className="h-full w-full border-none relative z-10"
            title="WhatsApp Team"
            allow="camera; microphone; clipboard-read; clipboard-write; geolocation"
          />
          
          {/* Pantalla de carga integrada */}
          <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center bg-white dark:bg-slate-950">
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-slate-200" />
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
