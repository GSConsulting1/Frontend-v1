// Pantalla 1: listado de órdenes de servicio.
// Server Component (async function) — hace el fetch inicial (con filtros vía
// searchParams) y le pasa los datos ya resueltos a OrdenesManager, que es
// quien gobierna la interacción (edición inline, guardado en lote, borrado).

import {
  getClientesParaSelect,
  getEstadosParaSelect,
  getOrdenes,
  getProfesionalesParaSelect,
} from "@/lib/data/ordenes";
import { OrdenesManager } from "@/components/ordenes/ordenes-manager";

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

  const [ordenes, clientes, estados, profesionales] = await Promise.all([
    getOrdenes(filtros),
    getClientesParaSelect(),
    getEstadosParaSelect(),
    getProfesionalesParaSelect(),
  ]);

  const hayFiltros = Boolean(params.clienteId || params.desde || params.hasta);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <OrdenesManager
        ordenes={ordenes}
        clientes={clientes}
        estados={estados.map((e) => ({ id: e.id, label: e.nombre }))}
        profesionales={profesionales.map((p) => ({ id: p.id, label: p.nombre_completo }))}
        filtros={params}
        hayFiltros={hayFiltros}
        description="Registra y consulta las OS de cada cliente"
      />
    </div>
  );
}
