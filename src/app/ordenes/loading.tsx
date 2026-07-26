// Se muestra automáticamente (App Router: loading.tsx por segmento) mientras
// page.tsx todavía está resolviendo getOrdenes() — ver
// src/app/usuarios/loading.tsx para el mismo patrón.
//
// Mismo contenedor (max-w-6xl, padding) y mismo título/descripción/acciones
// que page.tsx a propósito: que al terminar de cargar no haya salto de
// layout. "Nueva orden" no depende de datos, así que se muestra real (no
// hace falta un esqueleto para eso).

import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/table-skeleton";
import { NuevaOrdenButton } from "@/components/ordenes/nueva-orden-button";

export default function OrdenesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Orden de servicio recibida del cliente"
        description="Registra y consulta las OS de cada cliente"
        actions={<NuevaOrdenButton />}
      />

      <TableSkeleton
        columnas={[
          { header: "Cliente", width: "w-40" },
          { header: "Número de OS", width: "w-24" },
          { header: "Fecha recepción", width: "w-24" },
          { header: "Tipo servicio", width: "w-28" },
          { header: "Estado", width: "w-32" },
          { header: "Cronograma", width: "w-16" },
          { header: "Secuencia", width: "w-16" },
          { header: "Acciones", align: "right", width: "w-8" },
        ]}
      />
    </div>
  );
}
