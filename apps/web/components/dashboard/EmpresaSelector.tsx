"use client";

import React, { useEffect, useState } from "react";
import { Building2, ChevronsUpDown, Loader2, Check } from "lucide-react";
import { getEnterprisesAction } from "@/app/dashboard/actions";
import { cn } from "@/components/ui/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Empresa {
  id: string;
  nombre: string;
}

export function EmpresaSelector() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [currentEmpresaId, setCurrentEmpresaId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEmpresas() {
      try {
        const result = await getEnterprisesAction();
        const items = result.items || [];
        setEmpresas(items);

        const cookieId = document.cookie
          .split("; ")
          .find((row) => row.startsWith("x-enterprise-id="))
          ?.split("=")[1];

        if (cookieId && items.find((e: Empresa) => e.id === cookieId)) {
          setCurrentEmpresaId(cookieId);
        } else if (items.length > 0) {
          const firstId = items[0].id;
          setCurrentEmpresaId(firstId);
          updateEnterpriseCookie(firstId);
        }
      } catch (error) {
        console.error("Error loading empresas:", error);
      } finally {
        setLoading(false);
      }
    }

    loadEmpresas();
  }, []);

  const updateEnterpriseCookie = (id: string) => {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `x-enterprise-id=${id}; path=/; expires=${expires}; SameSite=Lax`;
    localStorage.setItem("current-enterprise-id", id);
  };

  const handleSelect = (id: string) => {
    if (id === currentEmpresaId) return;
    setCurrentEmpresaId(id);
    updateEnterpriseCookie(id);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="px-2">
        <div className="h-14 w-full animate-pulse rounded-2xl bg-zinc-50 dark:bg-zinc-900/50" />
      </div>
    );
  }

  if (empresas.length === 0) return null;

  const currentEmpresa = empresas.find(e => e.id === currentEmpresaId) || empresas[0];

  return (
    <div className="px-2">
      <div className="group relative pt-2">
        <div className="absolute -top-1 left-4 z-20 bg-white px-2 dark:bg-zinc-950">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-azul-1">
            Empresa Actual
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "relative h-14 w-full rounded-2xl border-2 border-zinc-100 bg-white pl-11 pr-10 text-left text-sm font-bold text-zinc-900 outline-none transition-all",
                "hover:border-azul-1 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:hover:border-azul-1",
                "shadow-sm group-hover:shadow-md flex items-center"
              )}
            >
              <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-azul-1 transition-transform group-hover:scale-110" />
              <span className="truncate">{currentEmpresa?.nombre}</span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
                <ChevronsUpDown className="h-4 w-4" />
              </div>
            </button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent 
            className="w-64 rounded-2xl border-2 border-zinc-100 bg-white p-2 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            align="start"
            sideOffset={8}
          >
            {empresas.map((empresa) => (
              <DropdownMenuItem
                key={empresa.id}
                onClick={() => handleSelect(empresa.id)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-colors cursor-pointer",
                  empresa.id === currentEmpresaId
                    ? "bg-azul-1 text-white"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <Building2 className={cn("h-4 w-4", empresa.id === currentEmpresaId ? "text-white" : "text-zinc-400")} />
                  {empresa.nombre}
                </div>
                {empresa.id === currentEmpresaId && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
