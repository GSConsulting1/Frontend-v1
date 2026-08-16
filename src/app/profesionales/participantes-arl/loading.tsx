// Esqueleto de la pestaña "Participantes ARL" — mismo contenedor, título,
// descripción, pestañas y acciones que page.tsx, para que no haya salto de
// layout al terminar de cargar. Las 5 columnas son las de ParticipantesArlTable:
// si acá falta una, aparece de golpe al cargar y empuja el resto.
//
// El menú "⋮" se muestra real (no depende de datos); no se le pasan handlers
// porque acá todavía no hay tabla ni estado de selección, y de todas formas una
// función no se puede pasar de este Server Component a un Client Component.

import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/table-skeleton";
import { ToolbarSkeleton } from "@/components/layout/toolbar-skeleton";
import { ProfesionalesTabs } from "@/components/profesionales/profesionales-tabs";
import { ParticipantesArlAccionesMenu } from "@/components/participantes-arl/participantes-arl-acciones-menu";

export default function ParticipantesArlLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Profesionales"
        description="Equipo de la ARL que firma el detalle de entrega y el acta de servicio"
        actions={<ParticipantesArlAccionesMenu />}
      />

      <ProfesionalesTabs />

      <ToolbarSkeleton izquierda={["h-8 w-full max-w-xs"]} />

      <TableSkeleton
        columnas={[
          { header: "Nombre", width: "w-48" },
          { header: "Cédula", width: "w-28" },
          { header: "Creado", width: "w-24" },
          { header: "Estado", align: "right", width: "w-16", alto: "h-5" },
          { header: "Acciones", align: "right", width: "w-7", alto: "h-7" },
        ]}
      />
    </div>
  );
}
