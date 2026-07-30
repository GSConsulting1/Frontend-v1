// Mismo criterio que app/usuarios/loading.tsx: mismo contenedor (max-w-6xl,
// padding) y mismo título/descripción que page.tsx a propósito, para que no
// haya salto de layout al terminar de cargar.
//
// Por eso también se reservan el buscador y el botón "Agregar profesional"
// (ToolbarSkeleton, mismo alto/lado que la barra real) y las 6 columnas de la
// tabla real — ver components/profesionales/profesionales-listado.tsx: si acá
// falta una columna o la barra de arriba, aparecen de golpe al cargar.

import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/table-skeleton";
import { ToolbarSkeleton } from "@/components/layout/toolbar-skeleton";

export default function ProfesionalesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Profesionales"
        description="Equipo de profesionales que ejecuta las órdenes de servicio"
      />

      {/* space-y-4: el mismo espaciado interno que ProfesionalesListado */}
      <div className="space-y-4">
        <ToolbarSkeleton
          izquierda={["h-8 w-full max-w-xs"]}
          derecha={["h-8 w-44"]}
        />

        <TableSkeleton
          columnas={[
            { header: "Nombre", width: "w-40" },
            { header: "Cédula", width: "w-28" },
            { header: "Contacto", width: "w-44", lineas: 2 },
            { header: "Valor hora", align: "right", width: "w-24" },
            {
              header: "Estado",
              align: "right",
              width: "w-16",
              alto: "h-5",
            },
            {
              header: "Acciones",
              align: "right",
              width: "w-7",
              alto: "h-7",
            },
          ]}
        />
      </div>
    </div>
  );
}
