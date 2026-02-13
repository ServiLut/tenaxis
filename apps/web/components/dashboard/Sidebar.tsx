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
} from "lucide-react";
import { isTenantAdminAction } from "@/app/dashboard/actions";

const menuItems = [
  {
    title: "Panel General",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Clientes",
    icon: Users,
    href: "/dashboard/clientes",
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
    title: "Pagos",
    icon: CreditCard,
    href: "/dashboard/pagos",
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

export function Sidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    isTenantAdminAction().then(setIsAdmin);
  }, []);

  const handleLogout = () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    localStorage.removeItem("user");
    window.location.href = "/iniciar-sesion";
  };

  const visibleSecondaryItems = secondaryItems.filter(item => !item.isAdmin || isAdmin);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-72 border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-full flex-col justify-between">
        <div className="space-y-10">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-lg dark:bg-white dark:text-black">
              <Sparkles className="h-6 w-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-white">
              Tenaxis
            </span>
          </Link>

          {/* Navigation */}
          <nav className="space-y-8">
            <div className="space-y-2">
              <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Principal
              </p>
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-200",
                        isActive
                          ? "bg-zinc-900 text-white shadow-xl shadow-zinc-200 dark:bg-white dark:text-black dark:shadow-none"
                          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("h-5 w-5", isActive ? "text-white dark:text-black" : "text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100")} />
                        <span className="text-sm font-bold tracking-tight">{item.title}</span>
                      </div>
                      {isActive && <ChevronRight className="h-4 w-4" />}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Sistema
              </p>
              <div className="space-y-1">
                {visibleSecondaryItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-200",
                        isActive
                          ? "bg-zinc-900 text-white shadow-xl dark:bg-white dark:text-black"
                          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("h-5 w-5", isActive ? "text-white dark:text-black" : "text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100")} />
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
        <div className="space-y-4">
          <div className="rounded-3xl border-2 border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-800">
                <ShieldCheck className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Plan Enterprise
                </p>
                <p className="text-[10px] font-bold text-zinc-500">
                  Renueva en 15 días
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="group flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-zinc-500 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <LogOut className="h-5 w-5 text-zinc-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
            <span className="text-sm font-bold tracking-tight">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
