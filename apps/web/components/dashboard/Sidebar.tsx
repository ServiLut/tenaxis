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
} from "lucide-react";
import { isTenantAdminAction } from "@/app/dashboard/actions";

const menuItems: { title: string; icon: LucideIcon; href: string; role?: string }[] = [
  {
    title: "Panel General",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Solicitudes",
    icon: ShieldCheck,
    href: "/dashboard/solicitudes",
    role: "SU_ADMIN",
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
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    isTenantAdminAction().then(setIsAdmin);
    
    const userData = localStorage.getItem("user");
    if (userData && userData !== "undefined") {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleLogout = () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    localStorage.removeItem("user");
    window.location.href = "/iniciar-sesion";
  };

  const visibleMenuItems = menuItems.filter(item => !item.role || item.role === userRole);
  const visibleSecondaryItems = secondaryItems.filter(item => !item.isAdmin || isAdmin);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-72 border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-full flex-col justify-between">
        <div className="space-y-10">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 px-2 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azul-1 text-white shadow-lg transition-transform group-hover:scale-105">
              <Sparkles className="h-7 w-7" />
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
                {visibleMenuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-200",
                        isActive
                          ? "bg-azul-1 text-white shadow-xl"
                          : "text-zinc-500 hover:bg-zinc-100 hover:text-azul-1"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-zinc-400 group-hover:text-azul-1")} />
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
                          ? "bg-azul-1 text-white shadow-xl"
                          : "text-zinc-500 hover:bg-zinc-100 hover:text-azul-1"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-zinc-400 group-hover:text-azul-1")} />
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
          <div className="rounded-2xl border-2 border-zinc-100 bg-zinc-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-azul-1 shadow-sm border border-zinc-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-xs font-black uppercase tracking-wider text-zinc-900">
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
