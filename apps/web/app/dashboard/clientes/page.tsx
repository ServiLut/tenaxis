import React from "react";
import { DashboardLayout } from "@/components/dashboard";
import { getClientesAction, getDepartmentsAction, getMunicipalitiesAction } from "../actions";
import { ClienteList } from "./cliente-list";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const [clientes, departments, municipalities] = await Promise.all([
    getClientesAction(),
    getDepartmentsAction(),
    getMunicipalitiesAction()
  ]);

  return (
    <DashboardLayout overflowHidden>
      <ClienteList 
        initialClientes={clientes} 
        initialDepartments={departments}
        initialMunicipalities={municipalities}
      />
    </DashboardLayout>
  );
}
