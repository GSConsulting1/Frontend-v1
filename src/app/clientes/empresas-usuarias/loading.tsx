// Esqueleto de la pestaña "Empresas usuarias" — mismo contenedor, título,
// descripción, pestañas y acciones que page.tsx, para que no haya salto de
// layout al terminar de cargar. Las 5 columnas son las de
// EmpresasUsuariasTable.

import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/table-skeleton";
import { ToolbarSkeleton } from "@/components/layout/toolbar-skeleton";
import { ClientesTabs } from "@/components/clientes/clientes-tabs";
import { EmpresasUsuariasAccionesMenu } from "@/components/empresas-usuarias/empresas-usuarias-acciones-menu";

export default function EmpresasUsuariasLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Clientes"
        description="Empresas donde se ejecuta el servicio, referenciadas por las órdenes"
        actions={<EmpresasUsuariasAccionesMenu />}
      />

      <ClientesTabs />

      <ToolbarSkeleton izquierda={["h-8 w-full max-w-xs"]} />

      <TableSkeleton
        columnas={[
          { header: "Nombre", width: "w-48" },
          { header: "NIT", width: "w-28" },
          { header: "Órdenes", align: "right", width: "w-10" },
          { header: "Estado", align: "right", width: "w-16", alto: "h-5" },
          { header: "Acciones", align: "right", width: "w-7", alto: "h-7" },
        ]}
      />
    </div>
  );
}
