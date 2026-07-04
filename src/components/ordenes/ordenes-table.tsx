// Tabla del listado de órdenes. Server Component (no necesita "use client"
// salvo que se agregue interacción tipo sort en cliente). Usa los primitivos
// de shadcn/ui ya instalados: src/components/ui/table.tsx, badge.tsx.

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstadoBadge } from "@/components/ordenes/estado-badge";
import type { OrdenServicioConRelaciones } from "@/types";

export function OrdenesTable({
  ordenes,
}: {
  ordenes: OrdenServicioConRelaciones[];
}) {
  if (ordenes.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay órdenes que coincidan con los filtros.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Servicio</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha recepción</TableHead>
          <TableHead>Horas</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ordenes.map((orden) => (
          <TableRow key={orden.id}>
            <TableCell>{orden.cliente?.nombre_cliente ?? "—"}</TableCell>
            <TableCell className="max-w-70 truncate">
              {orden.nombre_servicio}
            </TableCell>
            <TableCell>
              <EstadoBadge estado={orden.estado} />
            </TableCell>
            <TableCell>{orden.fecha_recepcion_os ?? "—"}</TableCell>
            <TableCell>{orden.horas_cargadas ?? "—"}</TableCell>
            <TableCell className="text-right">
              <Link
                href={`/ordenes/${orden.id}/editar`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Editar
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
