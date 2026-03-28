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
  MessageSquare,
} from "lucide-react";
import { canAccessTenantsView, getScopedRole, type ScopedRole } from "@/lib/access-scope";
import { deleteBrowserCookie } from "@/lib/api/browser-client";
import { authClient } from "@/lib/api/auth-client";
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
    title: "WhatsApp",
    icon: MessageSquare,
    href: "/dashboard/whatsapp",
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
    title: "Cuenta de Cobro",
    icon: CreditCard,
    href: "/dashboard/cuenta-cobro",
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
  const [canViewTenants, setCanViewTenants] = useState(false);
  const [userRole, setUserRole] = useState<ScopedRole | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadScope() {
      try {
        const profile = await authClient.getProfile();
        if (!isMounted || !profile) return;

        setCanViewTenants(canAccessTenantsView(profile));
        setUserRole(getScopedRole(profile.role));
        return;
      } catch {
        // Fallback to localStorage if the profile request fails.
      }

      const userData = localStorage.getItem("user");
      if (!isMounted || !userData || userData === "undefined") {
        return;
      }

      try {
        const user = JSON.parse(userData);
        setCanViewTenants(canAccessTenantsView(user));
        setUserRole(getScopedRole(user.role));
      } catch {
        // ignore malformed cached user data
      }
    }

    loadScope();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authClient.logout();
    } catch (error) {
      console.error("Error calling logout API:", error);
    }

    deleteBrowserCookie("access_token");
    deleteBrowserCookie("tenant-id");
    deleteBrowserCookie("x-enterprise-id");
    deleteBrowserCookie("x-test-role");
    
    // En lugar de borrar todo el objeto user, solo limpiamos los tokens/sesiones
    // para preservar campos como banco, valorHora, etc. en el mismo navegador.
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      delete user.sesionId;
      localStorage.setItem("user", JSON.stringify(user));
    }
    
    localStorage.removeItem("current-enterprise-id");
    window.location.href = "/iniciar-sesion";
  };

  const visibleMenuItems = menuItems.filter(item => !item.role || item.role === userRole);
  const visibleSecondaryItems = secondaryItems.filter(
    (item) => !item.isAdmin || canViewTenants,
  );

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
        "fixed left-0 top-0 z-50 h-screen w-72 border-r border-white/10 bg-[#021359] p-6 transition-transform duration-300 dark:bg-sidebar",
        isOpen ? "translate-x-0 shadow-2xl lg:shadow-none" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Top Section: Logo & Empresa */}
          <div className="flex-shrink-0 space-y-10">
            {/* Logo */}
            <div className="flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-3 px-4 group" onClick={onClose}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#01ADFB] text-white shadow-lg transition-transform group-hover:scale-105">
                  <Sparkles className="h-7 w-7" />
                </div>
                <span className="text-2xl font-bold tracking-tighter text-[#F8FAFC]">
                  Tenaxis
                </span>
              </Link>
              {/* Close button for mobile */}
              <button 
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[#F8FAFC]/50 hover:bg-white/10 transition-colors shadow-sm border border-white/10 lg:hidden"
                aria-label="Cerrar menú"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
            </div>

            {/* Empresa Selector */}
            <div className="sidebar-empresa-selector-container">
               <EmpresaSelector />
            </div>
          </div>

          {/* Navigation - Flexible area with scroll */}
          <nav className="mt-10 flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2 -mr-2">
            <div className="space-y-2">
              <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F8FAFC]/40">
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
                        "group flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-300",
                        isActive
                          ? "bg-[#01ADFB] text-[#FFFFFF] shadow-xl shadow-[#01ADFB]/20"
                          : "text-[#CBD5E1] hover:bg-white/5 hover:text-[#01ADFB]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-[#FFFFFF]" : "text-[#F8FAFC]/40 group-hover:text-[#01ADFB]")} />
                        <span className={cn("text-sm font-bold tracking-tight", isActive ? "text-[#FFFFFF]" : "text-[#CBD5E1] group-hover:text-[#F8FAFC]")}>{item.title}</span>
                      </div>
                      {isActive && <ChevronRight className="h-4 w-4 text-[#FFFFFF] animate-in fade-in slide-in-from-left-2" />}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F8FAFC]/40">
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
                        "group flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-300",
                        isActive
                          ? "bg-[#01ADFB] text-[#FFFFFF] shadow-xl shadow-[#01ADFB]/20"
                          : "text-[#CBD5E1] hover:bg-white/5 hover:text-[#01ADFB]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-[#FFFFFF]" : "text-[#F8FAFC]/40 group-hover:text-[#01ADFB]")} />
                        <span className={cn("text-sm font-bold tracking-tight", isActive ? "text-[#FFFFFF]" : "text-[#CBD5E1] group-hover:text-[#F8FAFC]")}>{item.title}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Bottom Section: Profile/Logout - Always visible at the bottom */}
          <div className="flex-shrink-0 space-y-4 pt-6 mt-4 border-t border-white/5">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#01ADFB] text-white shadow-sm">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-xs font-semibold uppercase tracking-wider text-[#F8FAFC]">
                    Plan Enterprise
                  </p>
                  <p className="text-[10px] font-bold text-[#F8FAFC]/40">
                    Renueva en 15 días
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="group flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-[#CBD5E1] transition-all hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-5 w-5 text-[#F8FAFC]/40 group-hover:text-red-400" />
              <span className="text-sm font-bold tracking-tight">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
