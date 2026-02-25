import React from "react";
import { DashboardLayout } from "@/components/dashboard";
import { getClientesAction } from "../actions";
import { ClienteList } from "./cliente-list";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const clientes = await getClientesAction();

  return (
    <DashboardLayout overflowHidden>
      <ClienteList initialClientes={clientes} />
    </DashboardLayout>
  );
}
