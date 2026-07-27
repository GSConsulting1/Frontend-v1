"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { PendingRing } from "@/components/forms/pending-ring";
import { cn } from "@/lib/utils";

type SaveButtonProps = Omit<ComponentProps<typeof Button>, "children"> & {
  pending?: boolean;
  idleLabel?: string;
  pendingLabel?: string;
};

// Variante de Button para guardados en lote: en vez de un ícono de spinner
// que reemplaza el texto, un anillo animado recorre el borde del botón
// mientras `pending` es true — el label ("Guardando…") se mantiene visible.
export function SaveButton({
  pending = false,
  disabled,
  idleLabel = "Guardar cambios",
  pendingLabel = "Guardando…",
  className,
  variant = "secondary",
  ...props
}: SaveButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      disabled={disabled || pending}
      className={cn("relative isolate", className)}
      {...props}
    >
      {pending && <PendingRing />}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
