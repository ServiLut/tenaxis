"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  Settings,
  LogOut,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Bell,
  Building2,
  LucideIcon,
  Contact,
  Package,
  Activity,
} from "lucide-react";
import { isTenantAdminAction } from "@/app/dashboard/actions";
import { EmpresaSelector } from "./EmpresaSelector";

const menuItems: { title: string; icon: LucideIcon; href: string; role?: string }[] = [
  {
    title: "Panel General",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Monitoreo",
    icon: Activity,
    href: "/dashboard/monitoreo",
  },
  {
    title: "Solicitudes",
    icon: ShieldCheck,
    href: "/dashboard/solicitudes",
    role: "SU_ADMIN",
  },
  {
    title: "Clientes",
    icon: Contact,
    href: "/dashboard/clientes",
  },
  {
    title: "Equipo de Trabajo",
    icon: Users,
    href: "/dashboard/equipo-trabajo",
  },
  {
    title: "Servicios",
    icon: Briefcase,
    href: "/dashboard/servicios",
  },
  {
    title: "Agenda",
    icon: Calendar,
    href: "/dashboard/agenda",
  },
  {
    title: "Insumos",
    icon: Package,
    href: "/dashboard/insumos",
  },
  {
    title: "Contabilidad",
    icon: CreditCard,
    href: "/dashboard/contabilidad",
  },
];

const secondaryItems = [
  {
    title: "Configuración",
    icon: Settings,
    href: "/dashboard/configuracion",
  },
  {
    title: "Notificaciones",
    icon: Bell,
    href: "/dashboard/notificaciones",
  },
  {
    title: "Tenants",
    icon: Building2,
    href: "/dashboard/tenants",
    isAdmin: true,
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    isTenantAdminAction().then(setIsAdmin);
    
    const userData = localStorage.getItem("user");
    if (userData && userData !== "undefined") {
      try {
        const user = JSON.parse(userData);
        setTimeout(() => {
          setUserRole(user.role);
        }, 0);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleLogout = () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie = "tenant-id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie = "x-enterprise-id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    localStorage.removeItem("user");
    localStorage.removeItem("current-enterprise-id");
    window.location.href = "/iniciar-sesion";
  };

  const visibleMenuItems = menuItems.filter(item => !item.role || item.role === userRole);
  const visibleSecondaryItems = secondaryItems.filter(item => !item.isAdmin || isAdmin);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-72 border-r border-zinc-200 bg-white p-6 transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950",
        isOpen ? "translate-x-0 shadow-2xl lg:shadow-none" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-10">
            {/* Logo */}
            <div className="flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-3 px-2 group" onClick={onClose}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azul-1 text-white shadow-lg transition-transform group-hover:scale-105">
                  <Sparkles className="h-7 w-7" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
                  Tenaxis
                </span>
              </Link>
              {/* Close button for mobile */}
              <button 
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm border border-zinc-200 dark:border-zinc-800"
                aria-label="Cerrar menú"
              >
                <ChevronRight className="h-5 w-5 lg:rotate-180 max-lg:rotate-180" />
              </button>
            </div>

            {/* Empresa Selector */}
            <EmpresaSelector />

            {/* Navigation */}
            <nav className="space-y-8 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
              <div className="space-y-2">
                <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-200">
                  Principal
                </p>
                <div className="space-y-1">
                  {visibleMenuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-200",
                          isActive
                            ? "bg-azul-1 text-white shadow-xl shadow-azul-1/20 dark:bg-azul-1 dark:text-zinc-50"
                            : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-azul-1 dark:hover:text-claro-azul-4"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={cn("h-5 w-5", isActive ? "text-white dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-400 group-hover:text-azul-1 dark:group-hover:text-claro-azul-4")} />
                          <span className="text-sm font-bold tracking-tight">{item.title}</span>
                        </div>
                        {isActive && <ChevronRight className="h-4 w-4 text-white dark:text-zinc-50" />}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-200">
                  Sistema
                </p>
                <div className="space-y-1">
                  {visibleSecondaryItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-200",
                          isActive
                            ? "bg-azul-1 text-white shadow-xl shadow-azul-1/20 dark:bg-azul-1 dark:text-zinc-50"
                            : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-azul-1 dark:hover:text-claro-azul-4"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={cn("h-5 w-5", isActive ? "text-white dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-400 group-hover:text-azul-1 dark:group-hover:text-claro-azul-4")} />
                          <span className="text-sm font-bold tracking-tight">{item.title}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </nav>
          </div>

          {/* Bottom Section: Profile/Logout */}
          <div className="space-y-4 pt-6">
            <div className="rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 text-azul-1 shadow-sm border border-zinc-200 dark:border-zinc-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50">
                    Plan Enterprise
                  </p>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-300">
                    Renueva en 15 días
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="group flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-zinc-500 dark:text-zinc-300 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            >
              <LogOut className="h-5 w-5 text-zinc-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
              <span className="text-sm font-bold tracking-tight">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
