"use client";

import React, { useEffect, useState } from "react";
import { Shield, Building2, MapPin, UserCircle } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { getEnterprisesAction, getTenantDetailAction } from "@/app/dashboard/actions";

interface UserData {
  tenantId: string;
  role: string;
}

interface Tenant {
  id: string;
  nombre: string;
}

interface Enterprise {
  id: string;
  nombre: string;
}

export function ScopeInfo() {
  const [user, setUser] = useState<UserData | null>(null);
  const [enterpriseName, setEnterpriseName] = useState<string>("...");
  const [tenantName, setTenantName] = useState<string>("...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const userData = localStorage.getItem("user");
      if (!userData) {
        setLoading(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(userData) as UserData;
        setUser(parsedUser);

        const [tenantRes, enterprisesRes] = await Promise.all([
          parsedUser.tenantId ? getTenantDetailAction(parsedUser.tenantId) : null,
          getEnterprisesAction()
        ]);

        const tenant = (tenantRes as { data?: Tenant })?.data || (tenantRes as Tenant);
        const enterprises = (enterprisesRes as { data?: Enterprise[] }).data || (enterprisesRes as Enterprise[]);

        // Set tenant name
        if (tenant) {
          setTenantName(tenant.nombre || "Tenaxis");
        }

        // Find enterprise name
        const enterpriseId = localStorage.getItem("current-enterprise-id");
        if (enterpriseId) {
          const currentEnterprise = Array.isArray(enterprises)
            ? enterprises.find((e: Enterprise) => e.id === enterpriseId)
            : null;
          setEnterpriseName(currentEnterprise?.nombre || "Todas");
        } else {
          setEnterpriseName("Todas");
        }
      } catch (e) {
        console.error("Error loading scope info", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (!user && !loading) return null;

  const cards = [
    {
      label: "Tenant Activo",
      value: tenantName,
      icon: Building2,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      label: "Empresas Incluidas",
      value: enterpriseName,
      icon: Shield,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    {
      label: "Zonas Incluidas",
      value: "Global / Todas", 
      icon: MapPin,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    },
    {
      label: "Rol Actual",
      value: user?.role || "OPERADOR",
      icon: UserCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
      {cards.map((card, i) => (
        <div 
          key={i} 
          className={cn(
            "group relative overflow-hidden flex items-center gap-4 p-5 rounded-[2rem] bg-white dark:bg-zinc-950 border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
            card.border
          )}
        >
          {/* Subtle Background Pattern */}
          <div className={cn("absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40", card.bg)} />
          
          <div className={cn(
            "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner transition-transform group-hover:scale-110 duration-500",
            card.bg,
            card.color
          )}>
            <card.icon className="h-6 w-6" />
          </div>
          
          <div className="relative flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 mb-0.5">
              {card.label}
            </p>
            {loading ? (
              <div className="h-5 w-24 animate-pulse bg-muted rounded-md mt-1" />
            ) : (
              <p className="text-sm font-black uppercase tracking-tight text-foreground truncate">
                {card.value}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
