"use client";

import React, { useEffect, useState } from "react";
import { Search, Bell, User, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RoleSwitcher } from "./RoleSwitcher";
import { ModeToggle } from "./ModeToggle";

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

export function Header({ onMenuClick, isSidebarOpen }: { onMenuClick?: () => void; isSidebarOpen?: boolean }) {
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
    <header className="sticky top-0 z-30 flex h-20 lg:h-24 w-full items-center justify-between px-6 lg:px-10 border-b border-[#706F71]/10 bg-[#F8FAFC]/80 backdrop-blur-md dark:bg-background/80 dark:border-white/10 transition-all">
      <div className="flex items-center gap-4 lg:gap-6 flex-1 max-w-2xl">
        {/* menu toggle */}
        <button 
          onClick={onMenuClick}
          aria-label={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#021359] transition-all hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:scale-105 active:scale-95"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative w-full group hidden sm:block">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#706F71] group-focus-within:text-[#01ADFB] transition-colors" />
          <Input
            type="search"
            name="search"
            placeholder="Buscar en el sistema..."
            className="h-12 lg:h-13 w-full border-none bg-white dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder:text-zinc-500 pl-12 pr-4 rounded-2xl focus:ring-2 focus:ring-[#01ADFB]/20 focus:bg-white dark:focus:bg-zinc-900 transition-all text-sm font-bold shadow-sm"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-6 pl-4 lg:pl-6 ml-4">
        <div className="hidden md:block">
          <RoleSwitcher />
        </div>
        <div className="flex items-center gap-3">
          <ModeToggle />
          <button 
            aria-label="Ver notificaciones"
            className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#706F71] transition-all hover:bg-zinc-50 hover:text-[#01ADFB] border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:scale-105 shadow-sm"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[#01ADFB] ring-2 ring-white animate-pulse" />
          </button>
        </div>

        <div className="flex items-center gap-3 py-1.5 px-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-all cursor-pointer group/user">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#021359] to-[#01ADFB] text-white shadow-md transition-transform group-hover:rotate-12">
            <User className="h-5 w-5" />
          </div>
          <div className="hidden text-left lg:block pr-2">
            <p className="text-[13px] font-black text-zinc-900 dark:text-zinc-50 leading-tight">
              {userName || "Cargando..."}
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#01ADFB] mt-0.5">
              {userRole}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
