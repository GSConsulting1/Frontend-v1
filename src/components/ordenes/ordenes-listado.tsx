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
//
// También es el dueño de la paginación, que en esta versión es de CLIENTE:
// page.tsx sigue trayendo todas las órdenes que pasan los filtros y acá se
// corta el array en páginas de ORDENES_POR_PAGINA. OrdenesTable recibe solo
// la página visible, así que "seleccionar todas" (toggleAll) y las acciones
// en lote (exportar / eliminar) operan únicamente sobre esa página.

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { OrdenesFiltros } from "@/components/ordenes/ordenes-filtros";
import { OrdenesTable } from "@/components/ordenes/ordenes-table";
import { OrdenesAccionesMenu } from "@/components/ordenes/ordenes-acciones-menu";
import { ExportarExcelButton } from "@/components/ordenes/exportar-excel-button";
import { EliminarOrdenesButton } from "@/components/ordenes/eliminar-ordenes-button";
import {
  OrdenesPaginacion,
  ORDENES_POR_PAGINA,
} from "@/components/ordenes/ordenes-paginacion";
import type { OrdenServicioConRelaciones } from "@/types";

type ClienteOption = { id: number; nombre_cliente: string };

type AccionSeleccion = "exportar" | "eliminar" | null;

type OrdenesListadoProps = {
  ordenes: OrdenServicioConRelaciones[];
  clientes: ClienteOption[];
};

export function OrdenesListado({ ordenes, clientes }: OrdenesListadoProps) {
  const [accionSeleccion, setAccionSeleccion] = useState<AccionSeleccion>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [accionError, setAccionError] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

  // Los filtros viven en la URL (ver ordenes-filtros.tsx) y este componente NO
  // se desmonta al aplicarlos, así que sin esto quedarías parado en la página 7
  // de un resultado de 2 páginas. Se compara contra la query string en vez de
  // contra la identidad del prop `ordenes` a propósito: las mutaciones llaman a
  // revalidatePath("/ordenes"), que reejecuta el Server Component y devuelve un
  // array nuevo — y ahí NO hay que reiniciar nada (editar una celda no debe
  // devolverte a la página 1). Patrón de React para ajustar estado en render.
  const claveFiltros = useSearchParams().toString();
  const [claveVista, setClaveVista] = useState(claveFiltros);
  if (claveVista !== claveFiltros) {
    setClaveVista(claveFiltros);
    setPagina(1);
    setSelectedIds(new Set());
  }

  // Clamp derivado en vez de un efecto: cubre el caso de eliminar las últimas
  // filas de la última página (el array se achica y `pagina` queda fuera de
  // rango) sin un render intermedio con la tabla vacía.
  const totalPaginas = Math.max(
    1,
    Math.ceil(ordenes.length / ORDENES_POR_PAGINA),
  );
  const paginaSegura = Math.min(pagina, totalPaginas);
  const desde = (paginaSegura - 1) * ORDENES_POR_PAGINA;
  const ordenesPagina = ordenes.slice(desde, desde + ORDENES_POR_PAGINA);

  // La selección se limpia al cambiar de página para que exportar y eliminar
  // nunca alcancen filas que ya no están a la vista.
  function cambiarPagina(siguiente: number) {
    setPagina(siguiente);
    setSelectedIds(new Set());
  }

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Sobre `ordenesPagina`, no sobre `ordenes`: el checkbox de cabecera de la
  // tabla marca la página visible, no todo el resultado de los filtros.
  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === ordenesPagina.length
        ? new Set()
        : new Set(ordenesPagina.map((o) => o.id)),
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

      <OrdenesFiltros clientes={clientes} />

      <OrdenesTable
        ordenes={ordenesPagina}
        selectionMode={accionSeleccion !== null}
        selectedIds={selectedIds}
        onToggle={toggle}
        onToggleAll={toggleAll}
        accionError={accionError}
      />

      <OrdenesPaginacion
        pagina={paginaSegura}
        totalPaginas={totalPaginas}
        totalFilas={ordenes.length}
        onPaginaChange={cambiarPagina}
      />
    </>
  );
}
