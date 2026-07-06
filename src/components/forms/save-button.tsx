"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
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
      {pending && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[-1px] overflow-hidden rounded-[inherit]"
          style={{
            padding: 1,
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            maskComposite: "exclude",
          }}
        >
          <span
            className="absolute inset-[-60%] animate-spin"
            style={{
              animationDuration: "1.1s",
              background:
                "conic-gradient(from 0deg, transparent 0deg, var(--primary) 55deg, transparent 130deg)",
            }}
          />
        </span>
      )}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
