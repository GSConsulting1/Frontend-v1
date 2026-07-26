// Pantalla 1: listado de órdenes de servicio, de solo lectura.
// Server Component (async function) — hace el fetch inicial (con filtros vía
// searchParams) y renderiza la tabla directamente. "Nueva orden" y "Editar"
// son links a /ordenes/nueva y /ordenes/{id}/editar (ver OrdenForm) — ya no
// hay estado de "guardar cambios" que gobernar en un Client Component
// intermedio, así que no hace falta OrdenesManager.

import { PageHeader } from "@/components/layout/page-header";
import { OrdenesTable } from "@/components/ordenes/ordenes-table";
import { OrdenesFiltros } from "@/components/ordenes/ordenes-filtros";
import { NuevaOrdenButton } from "@/components/ordenes/nueva-orden-button";
import { getOrdenes, getClientesParaSelect } from "@/lib/data/ordenes";

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{
    clienteId?: string;
    desde?: string;
    hasta?: string;
    numeroOs?: string;
    tipoServicio?: string;
    estado?: string;
    secuencia?: string;
  }>;
}) {
  const params = await searchParams;
  const filtros = {
    clienteId: params.clienteId ? Number(params.clienteId) : undefined,
    desde: params.desde || undefined,
    hasta: params.hasta || undefined,
    numeroOs: params.numeroOs || undefined,
    tipoServicio: params.tipoServicio || undefined,
    estado: params.estado || undefined,
    secuencia: params.secuencia || undefined,
  };

  const [ordenes, clientes] = await Promise.all([
    getOrdenes(filtros),
    getClientesParaSelect(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Orden de servicio recibida del cliente"
        description="Registra y consulta las OS de cada cliente"
        actions={<NuevaOrdenButton />}
      />

      <OrdenesFiltros clientes={clientes} />

      <OrdenesTable ordenes={ordenes} />
    </div>
  );
}
