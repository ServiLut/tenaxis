import React from "react";
import { DashboardLayout } from "@/components/dashboard";
import { getClientesAction } from "../actions";
import { ClienteList } from "./cliente-list";

export default async function ClientesPage() {
  const clientes = await getClientesAction();

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
              Cartera de Clientes
            </h1>
            <p className="text-zinc-500 font-medium italic">
              Gestiona, segmenta y fideliza a tus clientes con inteligencia de datos.
            </p>
          </div>
        </div>

        <ClienteList initialClientes={clientes} />
      </div>
    </DashboardLayout>
  );
}
