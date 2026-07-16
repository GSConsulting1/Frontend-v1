// Primitivo de acordeón (<details> nativo) sin conocimiento de dominio —
// usado por src/components/ordenes/secciones/* para agrupar campos con
// estado completo/incompleto/bloqueado. Ver structure.md.

import type { ReactNode } from "react";
import { Check, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type SeccionAcordeonProps = {
  titulo: string;
  resumen?: string;
  completo: boolean;
  locked?: boolean;
  chipTexto?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function SeccionAcordeon({
  titulo,
  resumen,
  completo,
  locked,
  chipTexto,
  defaultOpen,
  children,
}: SeccionAcordeonProps) {
  return (
    <details
      className="group rounded-lg border border-border bg-card open:border-ring"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span
          className={cn(
            "w-[3px] self-stretch rounded-full",
            completo ? "bg-foreground" : "bg-border",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{titulo}</p>
          {resumen && (
            <p className="truncate text-xs text-muted-foreground">{resumen}</p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            locked
              ? "bg-muted text-muted-foreground"
              : completo
                ? "bg-secondary text-secondary-foreground"
                : "border border-border text-muted-foreground",
          )}
        >
          {locked ? (
            <Lock className="size-3" aria-hidden />
          ) : completo ? (
            <Check className="size-3" aria-hidden />
          ) : null}
          {chipTexto ?? (completo ? "Completo" : "Sin definir")}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t border-border px-4 pt-3 pb-5">{children}</div>
    </details>
  );
}
