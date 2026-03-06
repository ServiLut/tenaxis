import React from "react";
import { DashboardLayout } from "@/components/dashboard";
import { 
  getClientesDashboardAction,
  getDepartmentsAction, 
  getMunicipalitiesAction,
  getSugerenciasAction,
  getSugerenciasStatsAction
} from "../actions";
import { ClienteList } from "./cliente-list";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const [
    dashboardData,
    sugerencias,
    sugerenciasStats,
    departments, 
    municipalities
  ] = await Promise.all([
    getClientesDashboardAction(),
    getSugerenciasAction(),
    getSugerenciasStatsAction(),
    getDepartmentsAction(),
    getMunicipalitiesAction()
  ]);

  return (
    <DashboardLayout overflowHidden>
      <ClienteList
        initialClientes={dashboardData.clientes}
        segmentedData={dashboardData.segmentacion}
        initialSugerencias={sugerencias}
        sugerenciasStats={sugerenciasStats}
        initialDepartments={departments}
        initialMunicipalities={municipalities}
      />
    </DashboardLayout>
  );
}
