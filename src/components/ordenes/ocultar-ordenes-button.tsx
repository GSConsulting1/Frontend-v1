// Controles "Ocultar (N)" / "Mostrar (N)" / "Cancelar" del listado de
// órdenes — la etapa activa del ocultamiento en lote, mientras la tabla
// está en "modo selección" (aparecen los checkboxes en OrdenesTable). El
// punto de entrada es el ítem "Ocultar / mostrar órdenes" del menú "⋮" del
// header (ver ordenes-acciones-menu.tsx), mismo patrón que
// exportar-excel-button.tsx / eliminar-ordenes-button.tsx.
//
// Dos botones en vez de uno porque la selección puede mezclar órdenes ya
// ocultas (para volver a mostrarlas) con visibles (para ocultarlas) — cada
// botón manda un valor de `oculta` fijo, no adivina a partir del estado
// actual de cada fila.
//
// Solo para administrador (RoleGate) — coincide con lo que de verdad
// respalda ocultarOrdenes() en app/ordenes/actions.ts y la RLS de
// ordenes_servicio (ver 20260829120000_ocultar_ordenes_solo_admin.sql).

"use client";

import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PendingRing } from "@/components/forms/pending-ring";
import { RoleGate } from "@/components/auth/role-gate";
import { ocultarOrdenes } from "@/app/ordenes/actions";

type OcultarOrdenesButtonProps = {
  selectedIds: number[];
  onCancelSelection: () => void;
  onError?: (mensaje: string | null) => void;
};

export function OcultarOrdenesButton({
  selectedIds,
  onCancelSelection,
  onError,
}: OcultarOrdenesButtonProps) {
  const [procesando, setProcesando] = useState<"ocultar" | "mostrar" | null>(
    null,
  );

  async function handleOcultar(oculta: boolean) {
    onError?.(null);
    setProcesando(oculta ? "ocultar" : "mostrar");
    const result = await ocultarOrdenes(selectedIds, oculta);
    setProcesando(null);

    if (result.ok) {
      onCancelSelection();
      return;
    }
    onError?.(result.error);
  }

  const deshabilitado = procesando !== null || selectedIds.length === 0;

  return (
    <RoleGate allow={["administrador"]}>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          disabled={deshabilitado}
          onClick={() => handleOcultar(true)}
          className="relative isolate"
        >
          {procesando === "ocultar" && <PendingRing />}
          <EyeOff className="size-4" />
          {`Ocultar${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`}
        </Button>
        <Button
          variant="outline"
          disabled={deshabilitado}
          onClick={() => handleOcultar(false)}
          className="relative isolate"
        >
          {procesando === "mostrar" && <PendingRing />}
          <Eye className="size-4" />
          {`Mostrar${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Cancelar selección de órdenes"
          disabled={procesando !== null}
          onClick={onCancelSelection}
        >
          <X className="size-4" />
        </Button>
      </div>
    </RoleGate>
  );
}
