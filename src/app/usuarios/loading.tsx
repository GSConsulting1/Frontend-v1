// Next.js muestra esto automáticamente (App Router: loading.tsx por
// segmento) mientras page.tsx todavía está resolviendo getPerfilActual()/
// getUsuarios() — incluye el chequeo de "solo administrador entra" que
// puede terminar en redirect(). Sin esto, esa espera se veía como pantalla
// congelada; con esto, se ve la tabla "cargando" de inmediato.
//
// Mismo contenedor (max-w-4xl, padding) y mismo título/descripción que
// page.tsx a propósito: que al terminar de cargar no haya salto de layout.

import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/table-skeleton";

export default function UsuariosLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Usuarios"
        description="Asigna el rol de cada usuario del sistema"
      />

      <TableSkeleton
        columnas={[
          { header: "Nombre", width: "w-40" },
          { header: "Email", width: "w-56" },
          { header: "Rol", align: "right", width: "w-32" },
        ]}
      />
    </div>
  );
}
