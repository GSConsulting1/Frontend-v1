// Se muestra automáticamente (App Router: loading.tsx por segmento) mientras
// page.tsx todavía está resolviendo getOrdenes() — ver
// src/app/usuarios/loading.tsx para el mismo patrón.
//
// Mismo contenedor (max-w-6xl, padding) y mismo título/descripción/acciones
// que page.tsx a propósito: que al terminar de cargar no haya salto de
// layout. El menú "⋮" no depende de datos, así que se muestra real (no
// hace falta un esqueleto para eso); no se le pasa onExportar (acá no hay
// tabla ni estado de selección todavía, getOrdenes() sigue resolviendo, y
// de todas formas una función no se puede pasar desde este Server
// Component a un Client Component).
//
// El ToolbarSkeleton reserva la barra de OrdenesFiltros (el botón "Filtros"
// colapsado, size="sm" → h-7): antes no estaba y la barra aparecía de golpe
// al cargar, empujando la tabla hacia abajo. Los chips de filtros activos no
// se pueden reservar acá (loading.tsx no recibe searchParams) y de todas
// formas comparten fila con el botón.
//
// El segundo ToolbarSkeleton reserva el pie de paginación (ver
// ordenes-paginacion.tsx): "Mostrando X–Y de Z" a la izquierda y los cuatro
// botones size="icon-sm" → size-7 a la derecha. Se reserva siempre aunque el
// pie se oculte con una sola página, porque acá todavía no se sabe cuántas
// órdenes hay.

import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/table-skeleton";
import { ToolbarSkeleton } from "@/components/layout/toolbar-skeleton";
import { OrdenesAccionesMenu } from "@/components/ordenes/ordenes-acciones-menu";

export default function OrdenesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Orden de servicio recibida del cliente"
        description="Registra y consulta las OS de cada cliente"
        actions={<OrdenesAccionesMenu />}
      />

      <ToolbarSkeleton izquierda={["h-7 w-24"]} />

      <TableSkeleton
        columnas={[
          { header: "Cliente", width: "w-40" },
          { header: "Número de OS", width: "w-24" },
          { header: "Fecha recepción", width: "w-24" },
          { header: "Tipo servicio", width: "w-28" },
          { header: "Estado", width: "w-24", alto: "h-5" },
          { header: "Cronograma", width: "w-16" },
          { header: "Secuencia", width: "w-16" },
          { header: "Acciones", align: "right", width: "w-7", alto: "h-7" },
        ]}
      />

      <ToolbarSkeleton
        izquierda={["h-5 w-48"]}
        derecha={["size-7", "size-7", "h-5 w-28", "size-7", "size-7"]}
      />
    </div>
  );
}
