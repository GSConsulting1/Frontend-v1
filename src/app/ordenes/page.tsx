// Pantalla 1: listado de órdenes de servicio, de solo lectura.
// Server Component (async function) — hace el fetch inicial (con filtros vía
// searchParams) y renderiza la tabla directamente. "Nueva orden" y "Editar"
// son links a /ordenes/nueva y /ordenes/{id}/editar (ver OrdenForm) — ya no
// hay estado de "guardar cambios" que gobernar en un Client Component
// intermedio, así que no hace falta OrdenesManager.

import { PageHeader } from "@/components/layout/page-header";
import { OrdenesTable } from "@/components/ordenes/ordenes-table";
import { NuevaOrdenButton } from "@/components/ordenes/nueva-orden-button";
import { getOrdenes, getEstadosParaSelect } from "@/lib/data/ordenes";

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string; desde?: string; hasta?: string }>;
}) {
  const params = await searchParams;
  const filtros = {
    clienteId: params.clienteId ? Number(params.clienteId) : undefined,
    desde: params.desde || undefined,
    hasta: params.hasta || undefined,
  };

  const [ordenes, estados] = await Promise.all([
    getOrdenes(filtros),
    getEstadosParaSelect(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Orden de servicio recibida del cliente"
        description="Registra y consulta las OS de cada cliente"
        actions={<NuevaOrdenButton />}
      />

      <OrdenesTable
        ordenes={ordenes}
        estados={estados.map((e) => ({ id: e.id, label: e.nombre }))}
      />
    </div>
  );
}
