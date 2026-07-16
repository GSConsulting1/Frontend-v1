import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

// Pegajoso arriba del contenedor con scroll (`main` en app/layout.tsx) para
// que los botones de acción (ej. "Guardar cambios") sigan visibles mientras
// se hace scroll por una tabla larga o un formulario largo. `bg-background`
// es necesario para tapar el contenido que queda pasando por detrás una vez
// pegado.
export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Volver",
  actions,
}: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 -mx-6 border-b border-border bg-background px-6 pb-4">
      {backHref && (
        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {backLabel}
        </Link>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className={cn(
              "text-2xl font-semibold tracking-tight",
              backHref && "mt-1",
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
