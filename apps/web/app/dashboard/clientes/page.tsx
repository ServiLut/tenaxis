import React from "react";
import { DashboardLayout } from "@/components/dashboard";
import { 
  getClientesAction, 
  getDepartmentsAction, 
  getMunicipalitiesAction,
  getSegmentedClientesAction,
  getSugerenciasAction,
  getSugerenciasStatsAction
} from "../actions";
import { ClienteList } from "./cliente-list";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const [
    clientes, 
    segmentedData, 
    sugerencias,
    sugerenciasStats,
    departments, 
    municipalities
  ] = await Promise.all([
    getClientesAction(),
    getSegmentedClientesAction(),
    getSugerenciasAction(),
    getSugerenciasStatsAction(),
    getDepartmentsAction(),
    getMunicipalitiesAction()
  ]);

  return (
    <DashboardLayout overflowHidden>
      <ClienteList
        initialClientes={clientes}
        segmentedData={segmentedData}
        initialSugerencias={sugerencias}
        sugerenciasStats={sugerenciasStats}
        initialDepartments={departments}
        initialMunicipalities={municipalities}
      />
    </DashboardLayout>
  );
}
