// Controles "Eliminar (N)" / "Cancelar" del listado de VoBo — la etapa activa
// del borrado en lote, mientras la tabla está en "modo selección" (aparecen los
// checkboxes en VoboTable). El punto de entrada es el ítem "Eliminar personas"
// del menú "⋮" del header (ver vobo-acciones-menu.tsx), mismo patrón que
// eliminar-clientes-button.tsx.
//
// El click en "Eliminar (N)" no dispara la acción de una: primero abre un
// <AlertDialog> de confirmación — un borrado en lote es irreversible y no tiene
// deshacer.
//
// Acá el resultado parcial es lo normal, no la excepción: una persona que ya
// dio el VoBo en una orden la rechaza la FK (ver lib/data/vobo.ts), así que el
// mensaje de error dice explícitamente por qué fallaron las que fallaron en vez
// de solo contarlas.

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
import { eliminarVobos } from "@/app/profesionales/vobo/actions";

type EliminarVoboButtonProps = {
  selectedIds: number[];
  onCancelSelection: () => void;
  onError?: (mensaje: string | null) => void;
};

export function EliminarVoboButton({
  selectedIds,
  onCancelSelection,
  onError,
}: EliminarVoboButtonProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function handleEliminar() {
    onError?.(null);
    setEliminando(true);
    const { eliminados, fallidos } = await eliminarVobos(selectedIds);
    setEliminando(false);
    setConfirmando(false);

    if (fallidos.length === 0) {
      onCancelSelection();
      return;
    }
    onError?.(
      eliminados > 0
        ? `Se eliminaron ${eliminados} de ${selectedIds.length} personas — ${fallidos.length} no se pudieron eliminar (ya dieron el VoBo en órdenes de servicio).`
        : `No se pudo eliminar ninguna de las ${selectedIds.length} personas seleccionadas: ya dieron el VoBo en órdenes de servicio.`,
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
          aria-label="Cancelar selección de personas de VoBo"
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
            <AlertDialogTitle>Eliminar personas de VoBo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar las{" "}
              <strong className="text-foreground">{selectedIds.length}</strong>{" "}
              personas seleccionadas? Esta acción no se puede deshacer. Las que
              ya hayan dado el VoBo en órdenes de servicio no se van a poder
              eliminar.
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
