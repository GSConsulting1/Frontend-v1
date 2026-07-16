// Tabla del listado de órdenes — de solo lectura. Cada fila lleva a
// /ordenes/{id}/editar (ícono lápiz) para ver o editar toda la información
// de la orden, incluida la sección extendida "Información orden del
// servicio"; "Nueva orden" (ver app/ordenes/page.tsx) navega a
// /ordenes/nueva. Ya no hay edición inline: ambos flujos viven en la página
// completa (ver OrdenForm) — ver structure.md.
//
// El único estado de cliente que queda es el de "eliminando" para dar
// feedback mientras corre el Server Action de borrado.

"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, Loader2, Pencil, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/ordenes/estado-badge";
import { RoleGate } from "@/components/auth/role-gate";
import { eliminarOrden } from "@/app/ordenes/actions";
import { cn } from "@/lib/utils";
import type { OrdenServicioConRelaciones } from "@/types";

const COLUMNAS = 9;

type OrdenesTableProps = {
  ordenes: OrdenServicioConRelaciones[];
};

export function OrdenesTable({ ordenes }: OrdenesTableProps) {
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload(orden: OrdenServicioConRelaciones) {
    setDownloadError(null);
    setDownloadingIds((prev) => new Set(prev).add(orden.id));
    try {
      const response = await fetch(`/api/ordenes/${orden.id}/pdf`);
      if (!response.ok) {
        throw new Error("No se pudo generar el PDF de la orden.");
      }
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename =
        /filename="([^"]+)"/.exec(disposition)?.[1] ??
        `orden-servicio-${orden.id}.pdf`;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("No se pudo descargar el PDF de la orden.");
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(orden.id);
        return next;
      });
    }
  }

  async function handleDelete(orden: OrdenServicioConRelaciones) {
    const nombre =
      orden.cliente?.nombre_cliente ?? orden.id_unico ?? `#${orden.id}`;
    if (
      !window.confirm(
        `¿Eliminar la orden de ${nombre}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setDeleteError(null);
    setDeletingIds((prev) => new Set(prev).add(orden.id));
    const result = await eliminarOrden(orden.id);
    if (!result.ok) {
      setDeleteError(result.error);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(orden.id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-3">
      {deleteError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deleteError}
        </p>
      )}
      {downloadError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {downloadError}
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Número de OS</TableHead>
            <TableHead>Fecha recepción</TableHead>
            <TableHead>Tipo servicio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Horas</TableHead>
            <TableHead>Archivo</TableHead>
            <TableHead className="text-right">Editar</TableHead>
            <TableHead className="text-right">PDF</TableHead>

            <RoleGate allow={["administrador"]}>
              <TableHead className="text-right">Eliminar</TableHead>
            </RoleGate>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenes.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={COLUMNAS}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No hay órdenes que coincidan con los filtros.
              </TableCell>
            </TableRow>
          )}

          {ordenes.map((orden) => {
            const isDeleting = deletingIds.has(orden.id);
            const isDownloading = downloadingIds.has(orden.id);

            return (
              <TableRow
                key={orden.id}
                className={cn(isDeleting && "opacity-50")}
              >
                <TableCell className="font-medium">
                  {orden.cliente?.nombre_cliente ?? "—"}
                </TableCell>
                <TableCell>{orden.numero_os_cliente ?? "—"}</TableCell>
                <TableCell>{orden.fecha_recepcion_os ?? "—"}</TableCell>
                <TableCell>{orden.tipo_servicio ?? "—"}</TableCell>
                <TableCell>
                  <EstadoBadge estado={orden.estado} />
                </TableCell>
                <TableCell>{orden.horas_cargadas ?? "—"}</TableCell>
                <TableCell>
                  {orden.link_archivo_orden ? (
                    <a
                      href={orden.link_archivo_orden}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      aria-label="Abrir archivo de la orden"
                    >
                      <ExternalLink className="size-4" />
                      Ver
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar orden"
                    nativeButton={false}
                    render={
                      <Link href={`/ordenes/${orden.id}/editar`}>
                        <Pencil className="size-4" />
                      </Link>
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isDownloading}
                    aria-label="Descargar PDF de la orden"
                    onClick={() => handleDownload(orden)}
                  >
                    {isDownloading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <RoleGate allow={["administrador"]}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={isDeleting}
                      aria-label="Eliminar orden"
                      onClick={() => handleDelete(orden)}
                    >
                      <X className="size-4" />
                    </Button>
                  </RoleGate>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
