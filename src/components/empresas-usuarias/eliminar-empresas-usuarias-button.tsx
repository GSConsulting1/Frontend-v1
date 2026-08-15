// Controles "Eliminar (N)" / "Cancelar" de la pestaña "Empresas usuarias" —
// misma anatomía que components/clientes/eliminar-clientes-button.tsx.
//
// Acá el resultado parcial es todavía más esperable que en clientes: cualquier
// empresa que aparezca en una orden la frena la FK, así que en la práctica solo
// se pueden borrar las que tienen 0 órdenes (la columna "Órdenes" de la tabla
// deja verlo antes de intentar).

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
import { eliminarEmpresasUsuarias } from "@/app/clientes/empresas-usuarias/actions";

type EliminarEmpresasUsuariasButtonProps = {
  selectedIds: number[];
  onCancelSelection: () => void;
  onError?: (mensaje: string | null) => void;
};

export function EliminarEmpresasUsuariasButton({
  selectedIds,
  onCancelSelection,
  onError,
}: EliminarEmpresasUsuariasButtonProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function handleEliminar() {
    onError?.(null);
    setEliminando(true);
    const { eliminadas, fallidas } = await eliminarEmpresasUsuarias(selectedIds);
    setEliminando(false);
    setConfirmando(false);

    if (fallidas.length === 0) {
      onCancelSelection();
      return;
    }
    onError?.(
      eliminadas > 0
        ? `Se eliminaron ${eliminadas} de ${selectedIds.length} empresas — ${fallidas.length} no se pudieron eliminar (tienen órdenes de servicio asociadas).`
        : `No se pudo eliminar ninguna de las ${selectedIds.length} empresas seleccionadas: tienen órdenes de servicio asociadas.`,
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
          aria-label="Cancelar selección de empresas"
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
            <AlertDialogTitle>Eliminar empresas usuarias</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar las{" "}
              <strong className="text-foreground">{selectedIds.length}</strong>{" "}
              empresas seleccionadas? Esta acción no se puede deshacer. Las que
              tengan órdenes de servicio asociadas no se van a poder eliminar.
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
    </>
  );
}
