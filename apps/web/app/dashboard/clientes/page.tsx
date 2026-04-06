import React from "react";
import { DashboardLayout } from "@/components/dashboard";
import { getClientesDashboardAction } from "../actions";
import { ClienteList, type Cliente, type Sugerencia } from "./cliente-list";

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

  const dashboardData = await getClientesDashboardAction<Cliente>(dashboardQuery);

  return (
    <DashboardLayout overflowHidden>
      <ClienteList
        initialClientes={dashboardData.clientes}
        initialPagination={dashboardData.pagination}
        initialSugerencias={[] as Sugerencia[]}
        sugerenciasStats={null}
        initialDepartments={[]}
        initialMunicipalities={[]}
      />
    </DashboardLayout>
  );
}
