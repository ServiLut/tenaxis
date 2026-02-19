import React from "react";
import { DashboardLayout } from "@/components/dashboard";
import { getClientesAction } from "../actions";
import { ClienteList } from "./cliente-list";
import { Contact } from "lucide-react";

export default async function ClientesPage() {
  const clientes = await getClientesAction();

  return (
    <DashboardLayout overflowHidden>
      <div className="flex flex-col h-full">
        {/* Sub-Header Estratégico */}
        <div className="shrink-0 py-10 px-6 lg:px-10 border-b border-zinc-200/60 dark:border-zinc-800/50 mb-8 bg-gray-50">
          <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azul-1 text-white shadow-xl shadow-azul-1/20">
              <Contact className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                Cartera de <span className="text-azul-1">Clientes</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Contenedor Principal de Datos */}
        <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-10 pb-4 sm:pb-6 lg:pb-10">
          <div className="max-w-[1600px] mx-auto w-full h-full">
            <ClienteList initialClientes={clientes} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
