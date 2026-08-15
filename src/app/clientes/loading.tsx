// Se muestra automáticamente (App Router: loading.tsx por segmento) mientras
// page.tsx todavía está resolviendo getClientes() — mismo patrón que
// app/ordenes/loading.tsx y app/profesionales/loading.tsx.
//
// Mismo contenedor (max-w-6xl, padding) y mismo título/descripción/acciones
// que page.tsx a propósito, para que no haya salto de layout al terminar de
// cargar. El menú "⋮" no depende de datos, así que se muestra real (no hace
// falta un esqueleto para eso); no se le pasan handlers porque acá todavía no
// hay tabla ni estado de selección, y de todas formas una función no se puede
// pasar desde este Server Component a un Client Component.
//
// El ToolbarSkeleton reserva el buscador (Input con size default → h-8), y las
// 5 columnas son las mismas de ClientesTable: si falta una, aparece de golpe
// al cargar y empuja el resto.

import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/table-skeleton";
import { ToolbarSkeleton } from "@/components/layout/toolbar-skeleton";
import { ClientesAccionesMenu } from "@/components/clientes/clientes-acciones-menu";

export default function ClientesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Clientes"
        description="Empresas que contratan las órdenes de servicio"
        actions={<ClientesAccionesMenu />}
      />

      <ToolbarSkeleton izquierda={["h-8 w-full max-w-xs"]} />

      <TableSkeleton
        columnas={[
          { header: "Nombre", width: "w-48" },
          { header: "NIT", width: "w-28" },
          { header: "Creado", width: "w-24" },
          { header: "Estado", align: "right", width: "w-16", alto: "h-5" },
          { header: "Acciones", align: "right", width: "w-7", alto: "h-7" },
        ]}
      />
    </div>
  );
}
