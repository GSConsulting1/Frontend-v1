// Esqueleto de la barra de controles que va arriba de una tabla (buscador,
// botón "Filtros", botón de alta) — el complemento de table-skeleton.tsx para
// los loading.tsx de Next.js. Sin esto la barra aparecía de golpe al terminar
// de cargar y empujaba la tabla hacia abajo: el esqueleto tiene que reservar
// su alto igual que reserva el de la tabla.
//
// No conoce el dominio: cada loading.tsx describe sus controles con las
// mismas clases de tamaño que el control real (`Input` y `Button` con size
// default miden h-8; `Button size="sm"`, h-7), en el mismo orden y del mismo
// lado que en el componente que se está cargando.

import { Skeleton } from "@/components/ui/skeleton";

type ToolbarSkeletonProps = {
  // Clases de Tailwind (alto + ancho) de cada bloque, en orden de aparición.
  izquierda?: string[];
  derecha?: string[];
};

export function ToolbarSkeleton({
  izquierda = [],
  derecha = [],
}: ToolbarSkeletonProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {izquierda.map((tamano, indice) => (
          <Skeleton key={indice} className={tamano} />
        ))}
      </div>

      {derecha.length > 0 && (
        <div className="flex items-center gap-2">
          {derecha.map((tamano, indice) => (
            <Skeleton key={indice} className={tamano} />
          ))}
        </div>
      )}
    </div>
  );
}
