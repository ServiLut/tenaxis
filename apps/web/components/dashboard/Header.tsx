"use client";

import React, { useEffect, useState } from "react";
import { Search, Bell, User, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";

type UserProfile = {
  nombre: string;
  apellido: string;
  role?: string;
};

const ROLE_LABELS: Record<string, string> = {
  SU_ADMIN: "Super Usuario",
  ADMIN: "Administrador",
  COORDINADOR: "Coordinador",
  ASESOR: "Asesor",
  OPERADOR: "Operador",
};

export function Header() {
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("Invitado");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData || userData === "undefined") return;

    try {
      const user = JSON.parse(userData) as UserProfile;
      const fullName = `${user.nombre} ${user.apellido}`;
      const roleLabel = user.role ? ROLE_LABELS[user.role] || user.role : "Invitado";
      
      // Schedule update to avoid synchronous cascading renders
      const frameId = requestAnimationFrame(() => {
        setUserName(fullName);
        setUserRole(roleLabel);
      });

      return () => cancelAnimationFrame(frameId);
    } catch (e) {
      console.error("Error parsing user data", e);
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-24 w-full items-center justify-between px-10 border-b border-zinc-200/60 bg-white shadow-sm">
      <div className="flex items-center gap-6 flex-1 max-w-2xl">
        {/* Mobile menu toggle */}
        <button 
          aria-label="Abrir menú"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-900 transition-colors hover:bg-zinc-100 lg:hidden dark:bg-zinc-900 shadow-inner border border-zinc-200"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 group-focus-within:text-azul-1 transition-colors" />
          <Input
            type="search"
            name="search"
            placeholder="Escribe para buscar en Tenaxis…"
            className="h-14 w-full border-2 border-zinc-100 bg-zinc-50 pl-12 pr-4 rounded-2xl focus:border-azul-1 focus:bg-white focus:ring-4 focus:ring-azul-1/5 transition-all text-sm font-medium"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex items-center gap-8 pl-8 border-l border-zinc-100 ml-8">
        <div className="flex items-center gap-3">
          <button 
            aria-label="Ver notificaciones"
            className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-400 transition-all hover:bg-azul-1 hover:text-white hover:shadow-lg hover:shadow-azul-1/20 border border-zinc-100"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-vivido-purpura-2 ring-2 ring-white" />
          </button>
        </div>

        <div className="flex items-center gap-4 py-2 px-3 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-zinc-100/50 transition-colors cursor-pointer">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-azul-1 text-white shadow-md">
            <User className="h-5 w-5" />
          </div>
          <div className="hidden text-left lg:block pr-2">
            <p className="text-[13px] font-black text-zinc-900 leading-tight">
              {userName || "Cargando..."}
            </p>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-azul-1/70 mt-0.5">
              {userRole}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
