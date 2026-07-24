// Botón "Exportar Excel" del listado de órdenes — al lado de "Nueva orden"
// (ver ordenes-listado.tsx). Descarga la matriz de las filas seleccionadas en
// la tabla llamando a POST /api/ordenes/excel con los IDs. Mismo patrón
// fetch → blob → <a download> que la descarga de PDF en ordenes-table.tsx.
//
// Solo para administrador y financiero (RoleGate) — coincide con el chequeo
// de rol del endpoint. Es UX: la protección real vive en la ruta.

"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/role-gate";

type ExportarExcelButtonProps = {
  selectedIds: number[];
  onError?: (mensaje: string | null) => void;
};

export function ExportarExcelButton({
  selectedIds,
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
      <Button
        variant="outline"
        disabled={exportando || selectedIds.length === 0}
        onClick={handleExport}
      >
        {exportando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Exportar Excel
        {selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
      </Button>
    </RoleGate>
  );
}
