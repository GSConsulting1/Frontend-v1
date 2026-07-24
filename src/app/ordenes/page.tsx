// Pantalla 1: listado de órdenes de servicio, de solo lectura.
// Server Component (async function) — hace el fetch inicial (con filtros vía
// searchParams) y delega el render a OrdenesListado (Client Component), que
// gobierna la selección de filas compartida entre el botón "Exportar Excel"
// del encabezado y los checkbox de la tabla. "Nueva orden" y "Editar" siguen
// siendo links a /ordenes/nueva y /ordenes/{id}/editar (ver OrdenForm).

import { OrdenesListado } from "@/components/ordenes/ordenes-listado";
import { getOrdenes } from "@/lib/data/ordenes";

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

  const ordenes = await getOrdenes(filtros);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <OrdenesListado ordenes={ordenes} />
    </div>
  );
}
