import React from "react";
import { DashboardLayout } from "@/components/dashboard";
import { getProductosStockAction, getProductosSolicitudesAction } from "../actions";
import { InsumosClient } from "./insumos-client";

export const dynamic = "force-dynamic";

export default async function InsumosPage() {
  const [stock, solicitudes] = await Promise.all([
    getProductosStockAction(),
    getProductosSolicitudesAction(),
  ]);

  return (
    <DashboardLayout>
      <InsumosClient 
        initialStock={Array.isArray(stock) ? stock : []} 
        initialSolicitudes={Array.isArray(solicitudes) ? solicitudes : []} 
      />
    </DashboardLayout>
  );
}
