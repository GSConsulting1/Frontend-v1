// Pie de paginación del listado de órdenes. Componente controlado y puro: no
// tiene estado propio ni toca el router — la página vive en OrdenesListado
// (ver ordenes-listado.tsx), que es también quien corta el array.
//
// La paginación de esta versión es de CLIENTE: page.tsx sigue trayendo todas
// las órdenes que pasan los filtros y el corte se hace en memoria. Cuando se
// migre a server-side (.range() + count en lib/data/ordenes.ts) este
// componente no cambia: solo cambia quién calcula totalPaginas.
//
// No se usa el "pagination" de shadcn a propósito: son 7 sub-componentes que
// además exigirían carpeta + barrel index.ts (convención de structure.md)
// para algo que sale con el Button que ya existe.

"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const ORDENES_POR_PAGINA = 25;

type OrdenesPaginacionProps = {
  pagina: number;
  totalPaginas: number;
  totalFilas: number;
  onPaginaChange: (pagina: number) => void;
};

export function OrdenesPaginacion({
  pagina,
  totalPaginas,
  totalFilas,
  onPaginaChange,
}: OrdenesPaginacionProps) {
  // Con una sola página el pie no aporta nada y solo mete ruido visual.
  if (totalPaginas <= 1) return null;

  const desde = (pagina - 1) * ORDENES_POR_PAGINA + 1;
  const hasta = Math.min(pagina * ORDENES_POR_PAGINA, totalFilas);
  const esPrimera = pagina <= 1;
  const esUltima = pagina >= totalPaginas;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Mostrando {desde}–{hasta} de {totalFilas}{" "}
        {totalFilas === 1 ? "orden" : "órdenes"}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Primera página"
          disabled={esPrimera}
          onClick={() => onPaginaChange(1)}
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Página anterior"
          disabled={esPrimera}
          onClick={() => onPaginaChange(pagina - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <span
          aria-live="polite"
          className="px-2 text-sm text-muted-foreground tabular-nums"
        >
          Página {pagina} de {totalPaginas}
        </span>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Página siguiente"
          disabled={esUltima}
          onClick={() => onPaginaChange(pagina + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Última página"
          disabled={esUltima}
          onClick={() => onPaginaChange(totalPaginas)}
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
