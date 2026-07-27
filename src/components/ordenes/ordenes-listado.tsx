// Envoltorio de cliente del listado de órdenes. Existe porque el botón
// "Exportar Excel" vive en el encabezado (al lado de "Nueva orden") pero la
// selección de filas vive en la tabla: ambos necesitan compartir el mismo
// estado de selección, así que se sube acá (lifting state up). page.tsx sigue
// siendo Server Component (hace el fetch) y solo renderiza este componente.
//
// Nota: esto NO es el viejo "OrdenesManager" de guardado en lote (que se
// eliminó al pasar a solo lectura). El único estado compartido que gobierna
// es la selección para exportar. Ver structure.md.

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { OrdenesFiltros } from "@/components/ordenes/ordenes-filtros";
import { OrdenesTable } from "@/components/ordenes/ordenes-table";
import { NuevaOrdenButton } from "@/components/ordenes/nueva-orden-button";
import { ExportarExcelButton } from "@/components/ordenes/exportar-excel-button";
import type { OrdenServicioConRelaciones } from "@/types";

type ClienteOption = { id: number; nombre_cliente: string };

type OrdenesListadoProps = {
  ordenes: OrdenServicioConRelaciones[];
  clientes: ClienteOption[];
};

export function OrdenesListado({ ordenes, clientes }: OrdenesListadoProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exportError, setExportError] = useState<string | null>(null);

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === ordenes.length
        ? new Set()
        : new Set(ordenes.map((o) => o.id)),
    );
  }

  function iniciarSeleccion() {
    setExportError(null);
    setSelectionMode(true);
  }

  function cancelarSeleccion() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setExportError(null);
  }

  return (
    <>
      <PageHeader
        title="Orden de servicio recibida del cliente"
        description="Registra y consulta las OS de cada cliente"
        actions={
          <>
            <ExportarExcelButton
              selectedIds={[...selectedIds]}
              selectionMode={selectionMode}
              onStartSelection={iniciarSeleccion}
              onCancelSelection={cancelarSeleccion}
              onError={setExportError}
            />
            <NuevaOrdenButton />
          </>
        }
      />

      <OrdenesFiltros clientes={clientes} />

      <OrdenesTable
        ordenes={ordenes}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggle={toggle}
        onToggleAll={toggleAll}
        exportError={exportError}
      />
    </>
  );
}
