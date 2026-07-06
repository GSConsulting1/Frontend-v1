// Dueño del estado de la pantalla de listado: título/acciones del header y
// tabla. Vive en un solo Client Component porque el botón "Guardar cambios"
// del header necesita saber si hay ediciones o filas nuevas válidas
// pendientes en la tabla — ambos comparten el mismo árbol de estado.
//
// "Nueva orden" ya no navega a una página aparte: agrega una fila en blanco
// desplegada arriba de la tabla (ver OrdenesTable.addDraftRow) y se guarda
// junto con el resto de los cambios pendientes, con el mismo botón.

"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SaveButton } from "@/components/forms/save-button";
import {
  OrdenesTable,
  type OrdenesTableHandle,
} from "@/components/ordenes/ordenes-table";
import { crearOrdenesNuevas, guardarCambiosOrdenes } from "@/app/ordenes/actions";
import type { OrdenServicioConRelaciones } from "@/types";

type SelectOption = { id: number; label: string };

type OrdenesManagerProps = {
  ordenes: OrdenServicioConRelaciones[];
  clientes: { id: number; nombre_cliente: string }[];
  estados: SelectOption[];
  profesionales: SelectOption[];
  filtros: { clienteId?: string; desde?: string; hasta?: string };
  hayFiltros: boolean;
  description: string;
};

export function OrdenesManager({
  ordenes,
  clientes,
  estados,
  profesionales,
  description,
}: OrdenesManagerProps) {
  const tableRef = useRef<OrdenesTableHandle>(null);
  const [canSave, setCanSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const clientesOptions = clientes.map((c) => ({ id: c.id, label: c.nombre_cliente }));

  async function handleSave() {
    if (!tableRef.current) return;
    setIsSaving(true);
    setSaveError(null);

    const { actualizaciones, creaciones } = await tableRef.current.collectChanges();
    if (actualizaciones.length === 0 && creaciones.length === 0) {
      setIsSaving(false);
      return;
    }

    const [resultadoEdiciones, resultadoCreaciones] = await Promise.all([
      actualizaciones.length > 0
        ? guardarCambiosOrdenes(actualizaciones)
        : Promise.resolve({ ok: true as const }),
      creaciones.length > 0
        ? crearOrdenesNuevas(creaciones)
        : Promise.resolve({ ok: true as const }),
    ]);

    if (!resultadoEdiciones.ok) {
      setSaveError(resultadoEdiciones.error);
    } else if (!resultadoCreaciones.ok) {
      setSaveError(resultadoCreaciones.error);
    }

    // Las filas nuevas ya no dependen del servidor para "resetearse" (a
    // diferencia de una edición, que se resetea remontando con la
    // fecha_actualizacion nueva) — si se crearon bien, hay que sacarlas
    // manualmente para que no se dupliquen con la fila real que ya llegó
    // por revalidatePath.
    if (resultadoCreaciones.ok) {
      tableRef.current.clearDrafts();
    }

    setIsSaving(false);
  }

  return (
    <>
      <PageHeader
        title="Órdenes de servicio"
        description={description}
        actions={
          <>
            <SaveButton pending={isSaving} disabled={!canSave} onClick={handleSave} />
            <Button type="button" onClick={() => tableRef.current?.addDraftRow()}>
              Nueva orden
            </Button>
          </>
        }
      />

      {saveError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {saveError}
        </p>
      )}

      <OrdenesTable
        ref={tableRef}
        ordenes={ordenes}
        clientes={clientesOptions}
        estados={estados}
        profesionales={profesionales}
        onSaveStateChange={setCanSave}
      />
    </>
  );
}
