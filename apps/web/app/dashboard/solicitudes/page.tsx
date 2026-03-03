"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import { Users, Check, X, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/components/ui/utils";

interface PendingMembership {
  id: string;
  user: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  createdAt: string;
}

export default function SolicitudesPage() {
  const [requests, setRequests] = useState<PendingMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return;
      const user = JSON.parse(userData);
      
      const response = await fetch(`/api/tenants/${user.tenantId}/pending-memberships`);
      const result = await response.json();
      
      if (response.ok) {
        setRequests(result.data || result);
      }
    } catch (_error) {
      toast.error("Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/tenants/memberships/${id}/approve`, {
        method: "POST",
      });
      if (response.ok) {
        toast.success("Usuario aprobado correctamente");
        setRequests(requests.filter(r => r.id !== id));
      } else {
        throw new Error("Error al aprobar");
      }
    } catch (_error) {
      toast.error("Error al procesar aprobación");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/tenants/memberships/${id}/reject`, {
        method: "POST",
      });
      if (response.ok) {
        toast.success("Solicitud rechazada");
        setRequests(requests.filter(r => r.id !== id));
      } else {
        throw new Error("Error al rechazar");
      }
    } catch (_error) {
      toast.error("Error al procesar rechazo");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-black dark:text-white lg:text-5xl">
            Solicitudes de <span className="text-[#01ADFB]">Unión</span>
          </h1>
          <p className="text-lg font-medium text-[#706F71]">
            Gestiona quién puede entrar a tu organización.
          </p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-[#01ADFB]" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-[2.5rem] bg-white/40 backdrop-blur-md border border-white p-20 text-center shadow-sm dark:bg-zinc-900/60 dark:border-white/10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#706F71]/5">
              <Users className="h-10 w-10 text-[#706F71]/40" />
            </div>
            <h2 className="mt-8 text-2xl font-black tracking-tight text-black dark:text-white">Sin solicitudes pendientes</h2>
            <p className="mt-2 text-[#706F71] font-medium">No hay usuarios esperando aprobación en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {requests.map((request) => (
              <Card key={request.id} className="group overflow-hidden border border-white bg-white/60 backdrop-blur-md shadow-sm transition-all hover:scale-[1.02] rounded-[2rem] dark:bg-zinc-900/60 dark:border-white/10">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#01ADFB]/10 text-[#01ADFB]">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#706F71]">
                      <Clock className="h-3 w-3" />
                      {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <CardTitle className="text-xl font-black tracking-tight text-black dark:text-white">{request.user.nombre} {request.user.apellido}</CardTitle>
                  <p className="text-sm text-[#706F71] font-medium truncate mb-8">{request.user.email}</p>

                  <div className="flex gap-3">
                    <Button 
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="flex-1 bg-[#01ADFB] hover:bg-[#01ADFB]/90 text-white rounded-xl h-12 gap-2 shadow-lg shadow-[#01ADFB]/20 transition-all active:scale-95"
                    >
                      {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Aprobar
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                      className="flex-1 border border-[#706F71]/20 text-[#706F71] hover:bg-white dark:hover:bg-zinc-800 rounded-xl h-12 gap-2 transition-all active:scale-95"
                    >
                      <X className="h-4 w-4" />
                      Rechazar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
