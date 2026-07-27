// Botón "Exportar Excel" del listado de órdenes — al lado de "Nueva orden"
// (ver ordenes-listado.tsx). Descarga la matriz de las filas seleccionadas en
// la tabla llamando a POST /api/ordenes/excel con los IDs. Mismo patrón
// fetch → blob → <a download> que la descarga de PDF en ordenes-table.tsx.
//
// El botón siempre está activo (no depende de tener filas seleccionadas):
// el primer click solo prende el "modo selección" en OrdenesTable (aparecen
// los checkboxes); ahí el label cambia a "Descargar (N)" para que sea obvio
// que el click ya no hace lo mismo que antes. Un botón "Cancelar" aparte
// permite salir del modo selección sin descargar. Ver ordenes-listado.tsx,
// donde vive el estado de selectionMode/selectedIds.
//
// Solo para administrador y financiero (RoleGate) — coincide con el chequeo
// de rol del endpoint. Es UX: la protección real vive en la ruta.

"use client";

import { useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/role-gate";

type ExportarExcelButtonProps = {
  selectedIds: number[];
  selectionMode: boolean;
  onStartSelection: () => void;
  onCancelSelection: () => void;
  onError?: (mensaje: string | null) => void;
};

export function ExportarExcelButton({
  selectedIds,
  selectionMode,
  onStartSelection,
  onCancelSelection,
  onError,
}: ExportarExcelButtonProps) {
  const [exportando, setExportando] = useState(false);

  async function handleExport() {
    onError?.(null);
    setExportando(true);
    try {
      const response = await fetch("/api/ordenes/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!response.ok) {
        throw new Error("No se pudo generar el Excel.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ordenes-servicio.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      onCancelSelection();
    } catch {
      onError?.(
        "No se pudo generar el Excel de las órdenes seleccionadas.",
      );
    } finally {
      setExportando(false);
    }
  }

  return (
    <RoleGate allow={["administrador", "financiero"]}>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          disabled={exportando || (selectionMode && selectedIds.length === 0)}
          onClick={selectionMode ? handleExport : onStartSelection}
        >
          {exportando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {selectionMode
            ? `Descargar${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`
            : "Exportar Excel"}
        </Button>
        {selectionMode && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancelar selección de órdenes"
            disabled={exportando}
            onClick={onCancelSelection}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </RoleGate>
  );
}
