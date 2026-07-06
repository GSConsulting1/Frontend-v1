import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

// Pegajoso arriba del contenedor con scroll (`main` en app/layout.tsx) para
// que los botones de acción (ej. "Guardar cambios") sigan visibles mientras
// se hace scroll por una tabla larga. `bg-background` es necesario para
// tapar las filas que quedan pasando por detrás una vez pegado.
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 -mx-6 border-b border-border bg-background px-6 pb-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
