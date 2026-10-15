// Confirmación de "Exportar todo" (menú "⋮" del header, ver
// ordenes-acciones-menu.tsx): descarga la matriz de TODAS las órdenes que el
// usuario puede ver (la RLS decide: administrador incluye las ocultas), no
// solo las cargadas en la tabla — POST
// /api/ordenes/excel con { todas: true }, que pagina cada tabla del lado
// del servidor.
//
// A diferencia de la exportación por selección, no se dispara con un solo
// click: con toda la base el archivo es grande y tarda, así que primero se
// avisa con un <AlertDialog> (mismo componente que eliminar-ordenes-button.tsx)
// y el diálogo queda abierto con el indicador de carga hasta que termina.
//
// Mismos roles que el resto del export (administrador, financiero, talento);
// la protección real vive en la ruta.

"use client";

import { useState } from "react";
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
import { descargarMatrizExcel } from "@/components/ordenes/exportar-excel-button";

type ExportarTodoDialogProps = {
  open: boolean;
  onClose: () => void;
  onError?: (mensaje: string | null) => void;
};

export function ExportarTodoDialog({
  open,
  onClose,
  onError,
}: ExportarTodoDialogProps) {
  const [exportando, setExportando] = useState(false);

  async function handleExportar() {
    onError?.(null);
    setExportando(true);
    try {
      await descargarMatrizExcel({ todas: true });
    } catch {
      onError?.("No se pudo generar el Excel con todas las órdenes.");
    } finally {
      setExportando(false);
      onClose();
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto && !exportando) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exportar todas las órdenes</AlertDialogTitle>
          <AlertDialogDescription>
            Se va a descargar la información de todas las órdenes que puedes
            ver en el listado, no solo las que están cargadas en pantalla. Por el
            tamaño del archivo, la descarga puede tardar varios minutos: no
            cierres ni recargues la página mientras se genera.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={exportando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={exportando}
            onClick={handleExportar}
            className="relative isolate"
          >
            {exportando && <PendingRing />}
            {exportando ? "Generando…" : "Descargar todo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
