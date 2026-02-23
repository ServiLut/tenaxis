"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import { Users, Check, X, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

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
      <div className="space-y-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
            Solicitudes de Unión
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            Gestiona quién puede entrar a tu conglomerado.
          </p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 overflow-hidden rounded-[2.5rem] p-20 text-center ring-1 ring-zinc-200/50 dark:ring-zinc-800">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-zinc-50 dark:bg-zinc-800">
              <Users className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            </div>
            <h2 className="mt-8 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Sin solicitudes pendientes</h2>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">No hay usuarios esperando aprobación en este momento.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {requests.map((request) => (
              <Card key={request.id} className="group overflow-hidden border-none shadow-2xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 transition-all hover:scale-[1.02] rounded-[2rem] ring-1 ring-zinc-200/50 dark:ring-zinc-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-300">
                      <Clock className="h-3 w-3" />
                      {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <CardTitle className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">{request.user.nombre} {request.user.apellido}</CardTitle>
                  <p className="text-sm text-zinc-500 dark:text-zinc-300 font-medium truncate mb-8">{request.user.email}</p>

                  <div className="flex gap-3">
                    <Button 
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-zinc-50 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-zinc-50 rounded-xl h-12 gap-2 shadow-lg shadow-emerald-200/50 dark:shadow-none"
                    >
                      {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Aprobar
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                      className="flex-1 border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/30 rounded-xl h-12 gap-2"
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
