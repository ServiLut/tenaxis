"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/components/ui/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLES = ["SU_ADMIN", "ADMIN", "COORDINADOR", "ASESOR", "OPERADOR"];

export function RoleSwitcher() {
  const [currentRole, setCurrentRole] = useState<string>("");
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    setIsDev(process.env.NODE_ENV !== 'production' || window.location.hostname === 'localhost');
    
    const cookieRole = document.cookie
      .split("; ")
      .find((row) => row.startsWith("x-test-role="))
      ?.split("=")[1];

    if (cookieRole) {
      setCurrentRole(cookieRole);
    } else {
      const userData = localStorage.getItem("user");
      if (userData && userData !== "undefined") {
        try {
          const user = JSON.parse(userData);
          setCurrentRole(user.role);
        } catch (e) { /* ignore */ }
      }
    }
  }, []);

  const handleRoleChange = (role: string) => {
    setCurrentRole(role);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `x-test-role=${role}; path=/; expires=${expires}; SameSite=Lax`;
    
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      user.role = role;
      localStorage.setItem("user", JSON.stringify(user));
    }

    window.location.reload();
  };

  if (!isDev) return null;

  return (
    <div className="flex items-center gap-3 border-l border-zinc-200 dark:border-zinc-800 pl-4 ml-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="group flex items-center gap-3 rounded-xl py-1.5 px-3 transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20 outline-none">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 shadow-sm transition-transform group-hover:scale-110 dark:bg-amber-900/30 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-tight">
                Modo Dev
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  {currentRole || "Sin Rol"}
                </span>
                <ChevronsUpDown className="h-3 w-3 text-zinc-400" />
              </div>
            </div>
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className="w-48 rounded-2xl border-2 border-zinc-100 bg-white p-2 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
          align="start"
          sideOffset={8}
        >
          {ROLES.map((role) => (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleChange(role)}
              className={cn(
                "flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer",
                role === currentRole
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
              )}
            >
              {role}
              {role === currentRole && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
