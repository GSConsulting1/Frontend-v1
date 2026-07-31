// Primitivo de acordeón (<details> nativo) sin conocimiento de dominio —
// usado por src/components/ordenes/secciones/* para agrupar campos con
// estado completo/incompleto/bloqueado. Ver structure.md.
//
// Controlado (`open`/`onOpenChange`) en vez de `defaultOpen`: el padre
// (OrdenForm/OrdenInfoSecciones) mantiene un único id de sección abierta y
// se lo pasa a cada instancia, así se fuerza que solo una esté
// descolapsada a la vez — al abrir una, React vuelve a poner `open={false}`
// en las demás en el siguiente render.

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export type SeccionAcordeonProps = {
  titulo: string;
  resumen?: string;
  completo: boolean;
  locked?: boolean;
  chipTexto?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function SeccionAcordeon({
  titulo,
  resumen,
  open,
  onOpenChange,
  children,
}: SeccionAcordeonProps) {
  return (
    <details
      className="group rounded-lg border border-border bg-card open:border-ring"
      open={open}
      onToggle={(e) => onOpenChange(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{titulo}</p>
          {resumen && (
            <p className="truncate text-xs text-muted-foreground">{resumen}</p>
          )}
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t border-border px-4 pt-3 pb-5">{children}</div>
    </details>
  );
}
