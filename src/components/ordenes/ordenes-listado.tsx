// Envoltorio de cliente del listado de órdenes. Existe porque las acciones
// en lote del header (Exportar Excel / Eliminar órdenes, disparadas desde
// el menú "⋮" — ver ordenes-acciones-menu.tsx) necesitan compartir el
// estado de selección de filas con la tabla — se sube acá (lifting state
// up). page.tsx sigue siendo Server Component (hace el fetch) y solo
// renderiza este componente.
//
// accionSeleccion (en vez de un simple selectionMode: boolean) porque hay
// DOS acciones en lote distintas que usan la misma columna de checkboxes
// de OrdenesTable: "exportar" muestra ExportarExcelButton, "eliminar"
// muestra EliminarOrdenesButton — mismo Set<number> de IDs seleccionados,
// pero el botón/acción del header cambia según cuál se inició. null =
// sin modo selección, el header muestra el menú "⋮".
//
// Nota: esto NO es el viejo "OrdenesManager" de guardado en lote (que se
// eliminó al pasar a solo lectura). El único estado compartido que
// gobierna es la selección para las acciones en lote. Ver structure.md.

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { OrdenesFiltros } from "@/components/ordenes/ordenes-filtros";
import { OrdenesTable } from "@/components/ordenes/ordenes-table";
import { OrdenesAccionesMenu } from "@/components/ordenes/ordenes-acciones-menu";
import { ExportarExcelButton } from "@/components/ordenes/exportar-excel-button";
import { EliminarOrdenesButton } from "@/components/ordenes/eliminar-ordenes-button";
import type { OrdenServicioConRelaciones } from "@/types";

type ClienteOption = { id: number; nombre_cliente: string };

type AccionSeleccion = "exportar" | "eliminar" | null;

type OrdenesListadoProps = {
  ordenes: OrdenServicioConRelaciones[];
  clientes: ClienteOption[];
  // Nombres del catálogo de responsables SEC, para las opciones de ese filtro
  // (ver ordenes-filtros.tsx).
  responsablesSec: string[];
};

export function OrdenesListado({
  ordenes,
  clientes,
  responsablesSec,
}: OrdenesListadoProps) {
  const [accionSeleccion, setAccionSeleccion] = useState<AccionSeleccion>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [accionError, setAccionError] = useState<string | null>(null);

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

  function iniciarSeleccion(accion: "exportar" | "eliminar") {
    setAccionError(null);
    setAccionSeleccion(accion);
  }

  function cancelarSeleccion() {
    setAccionSeleccion(null);
    setSelectedIds(new Set());
    setAccionError(null);
  }

  return (
    <>
      <PageHeader
        title="Orden de servicio recibida del cliente"
        description="Registra y consulta las OS de cada cliente"
        actions={
          accionSeleccion === "exportar" ? (
            <ExportarExcelButton
              selectedIds={[...selectedIds]}
              onCancelSelection={cancelarSeleccion}
              onError={setAccionError}
            />
          ) : accionSeleccion === "eliminar" ? (
            <EliminarOrdenesButton
              selectedIds={[...selectedIds]}
              onCancelSelection={cancelarSeleccion}
              onError={setAccionError}
            />
          ) : (
            <OrdenesAccionesMenu
              onExportar={() => iniciarSeleccion("exportar")}
              onEliminar={() => iniciarSeleccion("eliminar")}
            />
          )
        }
      />

      <OrdenesFiltros clientes={clientes} responsablesSec={responsablesSec} />

      <OrdenesTable
        ordenes={ordenes}
        selectionMode={accionSeleccion !== null}
        selectedIds={selectedIds}
        onToggle={toggle}
        onToggleAll={toggleAll}
        accionError={accionError}
      />
    </>
  );
}
