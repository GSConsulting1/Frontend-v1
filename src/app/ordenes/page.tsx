// Pantalla 1: listado de órdenes de servicio, de solo lectura.
// Server Component (async function) — hace el fetch inicial (con filtros vía
// searchParams) y renderiza la tabla directamente. "Nueva orden" y "Editar"
// son links a /ordenes/nueva y /ordenes/{id}/editar (ver OrdenForm) — ya no
// hay estado de "guardar cambios" que gobernar en un Client Component
// intermedio, así que no hace falta OrdenesManager.

import { OrdenesListado } from "@/components/ordenes/ordenes-listado";
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
    clienteIds: params.clienteId?.split(",").filter(Boolean).map(Number),
    desde: params.desde || undefined,
    hasta: params.hasta || undefined,
    numeroOs: params.numeroOs || undefined,
    tiposServicio: params.tipoServicio?.split(",").filter(Boolean),
    estados: params.estado?.split(",").filter(Boolean),
    secuencia: params.secuencia || undefined,
  };

  const [ordenes, clientes] = await Promise.all([
    getOrdenes(filtros),
    getClientesParaSelect(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <OrdenesListado ordenes={ordenes} clientes={clientes} />
    </div>
  );
}
