// Mismo criterio que app/usuarios/loading.tsx: mismo contenedor/título que
// page.tsx a propósito, para que no haya salto de layout al terminar de
// cargar.

import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/table-skeleton";

export default function ProfesionalesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Profesionales"
        description="Equipo de profesionales que ejecuta las órdenes de servicio"
      />

      <TableSkeleton
        columnas={[
          { header: "Nombre", width: "w-40" },
          { header: "Cédula", width: "w-28" },
          { header: "Contacto", width: "w-48" },
          { header: "Estado", align: "right", width: "w-20" },
        ]}
      />
    </div>
  );
}
