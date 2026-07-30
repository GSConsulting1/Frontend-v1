// Esqueleto genérico de tabla para los loading.tsx de Next.js (Server
// Component, sin "use client" — App Router lo muestra automáticamente
// mientras el page.tsx async de la misma carpeta todavía está resolviendo
// sus datos, sin que cada pantalla tenga que armar su propio spinner).
//
// No conoce el dominio: cada loading.tsx pasa sus propias columnas (mismos
// headers/anchos que la tabla real, para que no haya salto de layout al
// terminar de cargar). Si una pantalla nueva necesita esto, se agrega su
// loading.tsx reusando este componente, no se copia la tabla a mano.

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ColumnaSkeleton = {
  header: string;
  align?: "left" | "right";
  // Clase de ancho de Tailwind para la barra gris de esa columna (ej.
  // "w-40") — no el ancho de la celda en sí.
  width?: string;
  // Alto de la barra, solo si la celda real no es una línea de texto: el
  // default "h-4" imita un texto, pero una columna con un Badge mide h-5 y
  // una con un botón de ícono (size="icon-sm") mide h-7 — sin esto la fila
  // del esqueleto queda más baja que la real y la tabla salta al cargar.
  alto?: string;
  // Barras apiladas para celdas de más de una línea (ej. la columna
  // "Contacto" de profesionales: email arriba, teléfono abajo).
  lineas?: number;
};

type TableSkeletonProps = {
  columnas: ColumnaSkeleton[];
  filas?: number;
};

export function TableSkeleton({ columnas, filas = 5 }: TableSkeletonProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columnas.map((columna) => (
            <TableHead
              key={columna.header}
              className={columna.align === "right" ? "text-right" : undefined}
            >
              {columna.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: filas }).map((_, fila) => (
          <TableRow key={fila}>
            {columnas.map((columna, indice) => (
              <TableCell
                key={indice}
                className={columna.align === "right" ? "text-right" : undefined}
              >
                <div
                  className={cn(
                    "flex flex-col gap-1.5",
                    columna.align === "right" && "items-end",
                  )}
                >
                  {Array.from({ length: columna.lineas ?? 1 }).map((_, linea) => (
                    <Skeleton
                      key={linea}
                      className={cn(
                        columna.alto ?? "h-4",
                        columna.width ?? "w-32",
                      )}
                    />
                  ))}
                </div>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
