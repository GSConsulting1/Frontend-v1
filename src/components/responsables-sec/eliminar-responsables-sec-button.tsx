// Controles "Eliminar (N)" / "Cancelar" del listado de responsables SEC — la
// etapa activa del borrado en lote, mientras la tabla está en "modo selección"
// (aparecen los checkboxes en ResponsablesSecTable). El punto de entrada es el
// ítem "Eliminar responsables" del menú "⋮" del header (ver
// responsables-sec-acciones-menu.tsx), mismo patrón que
// eliminar-vobo-button.tsx.
//
// El click en "Eliminar (N)" no dispara la acción de una: primero abre un
// <AlertDialog> de confirmación — un borrado en lote es irreversible y no tiene
// deshacer.
//
// Acá el resultado parcial es lo normal, no la excepción: a quien ya tiene
// órdenes a cargo lo rechaza la FK (ver lib/data/responsables-sec.ts), así que
// el mensaje de error dice explícitamente por qué fallaron los que fallaron en
// vez de solo contarlos.

"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PendingRing } from "@/components/forms/pending-ring";
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
import { eliminarResponsablesSec } from "@/app/profesionales/responsables-sec/actions";

type EliminarResponsablesSecButtonProps = {
  selectedIds: number[];
  onCancelSelection: () => void;
  onError?: (mensaje: string | null) => void;
};

export function EliminarResponsablesSecButton({
  selectedIds,
  onCancelSelection,
  onError,
}: EliminarResponsablesSecButtonProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function handleEliminar() {
    onError?.(null);
    setEliminando(true);
    const { eliminados, fallidos } =
      await eliminarResponsablesSec(selectedIds);
    setEliminando(false);
    setConfirmando(false);

    if (fallidos.length === 0) {
      onCancelSelection();
      return;
    }
    onError?.(
      eliminados > 0
        ? `Se eliminaron ${eliminados} de ${selectedIds.length} responsables — ${fallidos.length} no se pudieron eliminar (tienen órdenes de servicio a cargo).`
        : `No se pudo eliminar ninguno de los ${selectedIds.length} responsables seleccionados: tienen órdenes de servicio a cargo.`,
    );
  }

  return (
    <>
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
          aria-label="Cancelar selección de responsables SEC"
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
            <AlertDialogTitle>Eliminar responsables SEC</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar los{" "}
              <strong className="text-foreground">{selectedIds.length}</strong>{" "}
              responsables seleccionados? Esta acción no se puede deshacer. Los
              que tengan órdenes de servicio a cargo no se van a poder eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>
              Cancelar
            </AlertDialogCancel>
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
    </>
  );
}
