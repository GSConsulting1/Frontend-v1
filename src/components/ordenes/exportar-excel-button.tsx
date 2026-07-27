// Controles "Descargar (N)" / "Cancelar" del listado de órdenes — la etapa
// activa del export, mientras la tabla está en "modo selección" (aparecen
// los checkboxes en OrdenesTable). El punto de entrada (lo que antes era
// el primer click de este mismo botón, "Exportar Excel") ahora es el ítem
// "Exportar Excel" del menú "⋮" del header (ver ordenes-acciones-menu.tsx):
// ese ítem llama a onStartSelection/iniciarSeleccion de ordenes-listado.tsx,
// que prende selectionMode y con eso aparece este componente. Descarga la
// matriz de las filas seleccionadas llamando a POST /api/ordenes/excel con
// los IDs — mismo patrón fetch → blob → <a download> que la descarga de PDF
// en ordenes-table.tsx.
//
// Solo para administrador y financiero (RoleGate) — coincide con el chequeo
// de rol del endpoint. Es UX: la protección real vive en la ruta.

"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PendingRing } from "@/components/forms/pending-ring";
import { RoleGate } from "@/components/auth/role-gate";

type ExportarExcelButtonProps = {
  selectedIds: number[];
  onCancelSelection: () => void;
  onError?: (mensaje: string | null) => void;
};

export function ExportarExcelButton({
  selectedIds,
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
          disabled={exportando || selectedIds.length === 0}
          onClick={handleExport}
          className="relative isolate"
        >
          {exportando && <PendingRing />}
          <Download className="size-4" />
          {`Descargar${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Cancelar selección de órdenes"
          disabled={exportando}
          onClick={onCancelSelection}
        >
          <X className="size-4" />
        </Button>
      </div>
    </RoleGate>
  );
}
