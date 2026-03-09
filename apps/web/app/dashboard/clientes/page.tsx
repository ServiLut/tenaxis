import React from "react";
import { DashboardLayout } from "@/components/dashboard";
import {
  getClientesDashboardAction,
  getDepartmentsAction, 
  getMunicipalitiesAction,
  getSugerenciasAction,
  getSugerenciasStatsAction
} from "../actions";
import { ClienteList, type Cliente, type Sugerencia, type SugerenciaStats } from "./cliente-list";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const [
    dashboardData,
    sugerencias,
    sugerenciasStats,
    departments, 
    municipalities
  ] = await Promise.all([
    getClientesDashboardAction<Cliente>(),
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
        initialSugerencias={sugerencias as unknown as Sugerencia[]}
        sugerenciasStats={sugerenciasStats as unknown as SugerenciaStats}
        initialDepartments={departments}
        initialMunicipalities={municipalities}
      />
    </DashboardLayout>
  );
}
