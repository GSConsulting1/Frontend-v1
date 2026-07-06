// Pantalla 1: listado de órdenes de servicio.
// Server Component (async function) — se renderiza en el servidor, sin JS de
// cliente para el fetch inicial.
//
// searchParams (Promise, ver nota de Next.js 15+/16) permite filtros básicos:
// el filtro es un <form method="GET"> nativo que cambia la URL, y este
// Server Component vuelve a hacer el fetch con los filtros ya aplicados —
// sin useState ni Client Component.

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { OrdenesTable } from "@/components/ordenes/ordenes-table";
import { getClientesParaSelect, getOrdenes } from "@/lib/data/ordenes";
import { cn } from "@/lib/utils";

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

  const [ordenes, clientes] = await Promise.all([
    getOrdenes(filtros),
    getClientesParaSelect(),
  ]);

  const hayFiltros = Boolean(params.clienteId || params.desde || params.hasta);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Órdenes de servicio"
        description="Registra y consulta las OS de cada cliente"
        actions={
          <Link href="/ordenes/nueva" className={buttonVariants()}>
            Nueva orden
          </Link>
        }
      />

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clienteId" className="text-sm font-medium">
            Cliente
          </label>
          <select
            id="clienteId"
            name="clienteId"
            defaultValue={params.clienteId ?? ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_cliente}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="desde" className="text-sm font-medium">
            Desde
          </label>
          <input
            id="desde"
            name="desde"
            type="date"
            defaultValue={params.desde ?? ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="hasta" className="text-sm font-medium">
            Hasta
          </label>
          <input
            id="hasta"
            name="hasta"
            type="date"
            defaultValue={params.hasta ?? ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          />
        </div>

        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
        {hayFiltros && (
          <Link
            href="/ordenes"
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            Limpiar
          </Link>
        )}
      </form>

      <OrdenesTable ordenes={ordenes} />
    </div>
  );
}
