"use client";

import React, { useEffect, useState } from "react";
import { Search, Bell, User, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";

type UserProfile = {
  nombre: string;
  apellido: string;
};

export function Header() {
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData || userData === "undefined") return;

    try {
      const user = JSON.parse(userData) as UserProfile;
      const fullName = `${user.nombre} ${user.apellido}`;
      
      // Schedule update to avoid synchronous cascading renders
      const frameId = requestAnimationFrame(() => {
        setUserName(fullName);
      });

      return () => cancelAnimationFrame(frameId);
    } catch (e) {
      console.error("Error parsing user data", e);
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-24 w-full items-center justify-between border-b border-zinc-200 bg-white/80 px-8 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center gap-8">
        {/* Mobile menu toggle */}
        <button 
          aria-label="Abrir menú"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-900 transition-colors hover:bg-zinc-100 lg:hidden dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="relative hidden w-96 lg:block">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="search"
            name="search"
            placeholder="Buscar cualquier cosa…"
            className="h-12 border-none bg-zinc-50/50 pl-12 dark:bg-zinc-900/50"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button 
          aria-label="Ver notificaciones"
          className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-900 transition-colors hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-950" />
        </button>

        <div className="flex items-center gap-4">
          <div className="hidden text-right lg:block">
            <p className="text-sm font-black text-zinc-900 dark:text-zinc-50">
              {userName || "Cargando..."}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Administrador
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-lg dark:bg-white dark:text-black">
            <User className="h-6 w-6" />
          </div>
        </div>
      </div>
    </header>
  );
}
