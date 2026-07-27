// Controles "Eliminar (N)" / "Cancelar" del listado de órdenes — la etapa
// activa del borrado en lote, mientras la tabla está en "modo selección"
// (aparecen los checkboxes en OrdenesTable). El punto de entrada es el
// ítem "Eliminar órdenes" del menú "⋮" del header (ver
// ordenes-acciones-menu.tsx), mismo patrón que exportar-excel-button.tsx.
//
// A diferencia de exportar-excel-button.tsx, acá el click en "Eliminar
// (N)" no dispara la acción de una: primero abre un <AlertDialog> de
// confirmación (mismo componente y espíritu que el de cambio de rol en
// usuarios-table.tsx) — un borrado en lote es irreversible y no tiene
// deshacer, así que pesa más que el patrón "un solo click" del export.
//
// Solo para administrador (RoleGate) — coincide con el borrado por fila
// (ordenes-table.tsx) y con solo_admin_escribe_ordenes en Supabase. Es UX:
// la protección real vive en RLS.

"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PendingRing } from "@/components/forms/pending-ring";
import { RoleGate } from "@/components/auth/role-gate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { eliminarOrdenes } from "@/app/ordenes/actions";

type EliminarOrdenesButtonProps = {
  selectedIds: number[];
  onCancelSelection: () => void;
  onError?: (mensaje: string | null) => void;
};

export function EliminarOrdenesButton({
  selectedIds,
  onCancelSelection,
  onError,
}: EliminarOrdenesButtonProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function handleEliminar() {
    onError?.(null);
    setEliminando(true);
    const { eliminadas, fallidas } = await eliminarOrdenes(selectedIds);
    setEliminando(false);
    setConfirmando(false);

    if (fallidas.length === 0) {
      onCancelSelection();
      return;
    }
    onError?.(
      eliminadas > 0
        ? `Se eliminaron ${eliminadas} de ${selectedIds.length} órdenes — ${fallidas.length} fallaron.`
        : `No se pudo eliminar ninguna de las ${selectedIds.length} órdenes seleccionadas.`,
    );
  }

  return (
    <RoleGate allow={["administrador"]}>
      <div className="flex items-center gap-1.5">
        <Button
          variant="destructive"
          disabled={selectedIds.length === 0}
          onClick={() => setConfirmando(true)}
        >
          <Trash2 className="size-4" />
          {`Eliminar${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Cancelar selección de órdenes"
          disabled={eliminando}
          onClick={onCancelSelection}
        >
          <X className="size-4" />
        </Button>
      </div>

      <AlertDialog
        open={confirmando}
        onOpenChange={(open) => {
          if (!open && !eliminando) setConfirmando(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar órdenes</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar las <strong className="text-foreground">{selectedIds.length}</strong>{" "}
              órdenes seleccionadas? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={eliminando}
              onClick={handleEliminar}
              className="relative isolate"
            >
              {eliminando && <PendingRing />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleGate>
  );
}
