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

type PageSearchParams = Record<string, string | string[] | undefined>;

function getFirstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const dashboardQuery = Object.fromEntries(
    Object.entries(resolvedSearchParams).map(([key, value]) => [
      key,
      getFirstParam(value),
    ]),
  );

  const [
    dashboardData,
    sugerencias,
    sugerenciasStats,
    departments, 
    municipalities
  ] = await Promise.all([
    getClientesDashboardAction<Cliente>(dashboardQuery),
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
        initialOverview={dashboardData.overview}
        initialPagination={dashboardData.pagination}
        initialSugerencias={sugerencias as unknown as Sugerencia[]}
        sugerenciasStats={sugerenciasStats as unknown as SugerenciaStats}
        initialDepartments={departments}
        initialMunicipalities={municipalities}
      />
    </DashboardLayout>
  );
}
