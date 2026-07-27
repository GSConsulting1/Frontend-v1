// Tabla del listado de órdenes — de solo lectura. Cada fila lleva a
// /ordenes/{id}/editar (ícono lápiz) para ver o editar toda la información
// de la orden, incluida la sección extendida "Información orden del
// servicio"; "Nueva orden" (ver app/ordenes/page.tsx) navega a
// /ordenes/nueva. Ya no hay edición inline: ambos flujos viven en la página
// completa (ver OrdenForm) — ver structure.md.
//
// El único estado de cliente que queda es el de "eliminando" para dar
// feedback mientras corre el Server Action de borrado.
//
// selectionMode (gobernado por OrdenesListado, prendido por
// ExportarExcelButton): mientras está activo aparece la columna de
// checkboxes y se bloquean los controles que modifican una orden — celdas
// editables inline y el menú "..." (Editar/PDF/Eliminar) — para que elegir
// filas a exportar no se confunda con editar/borrar la orden.

"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Loader2, MoreHorizontal, Pencil, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EstadoBadge } from "@/components/ordenes/estado-badge";
import { EditableCell } from "@/components/ordenes/editable-cell";
import { RoleGate } from "@/components/auth/role-gate";
import { eliminarOrden, actualizarCampoOrden } from "@/app/ordenes/actions";
import { cn } from "@/lib/utils";
import {
  ESTADOS_ORDEN,
  type EstadoOrden,
} from "@/lib/validations/orden.schema";
import type { OrdenServicioConRelaciones, RolUsuario } from "@/types";

const COLUMNAS_BASE = 8;
const ROLES_EDITAN_INLINE: RolUsuario[] = ["administrador", "financiero"];
const OPCIONES_ESTADO = ESTADOS_ORDEN.map((e) => ({ id: e, label: e }));

type OrdenesTableProps = {
  ordenes: OrdenServicioConRelaciones[];
  // Selección de filas para exportar a Excel — la gobierna OrdenesListado
  // (el estado se sube ahí porque el botón de exportar vive en el header).
  selectionMode: boolean;
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  exportError?: string | null;
};

export function OrdenesTable({
  ordenes,
  selectionMode,
  selectedIds,
  onToggle,
  onToggleAll,
  exportError,
}: OrdenesTableProps) {
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

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

  const todasSeleccionadas =
    ordenes.length > 0 && ordenes.every((o) => selectedIds.has(o.id));
  const algunaSeleccionada = ordenes.some((o) => selectedIds.has(o.id));

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
      {editError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {editError}
        </p>
      )}
      {exportError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {exportError}
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {selectionMode && (
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input accent-foreground"
                  aria-label="Seleccionar todas las órdenes"
                  checked={todasSeleccionadas}
                  ref={(el) => {
                    if (el) el.indeterminate = algunaSeleccionada && !todasSeleccionadas;
                  }}
                  onChange={onToggleAll}
                  disabled={ordenes.length === 0}
                />
              </TableHead>
            )}
            <TableHead className="whitespace-normal">Cliente</TableHead>
            <TableHead>Número de OS</TableHead>
            <TableHead>Fecha recepción</TableHead>
            <TableHead className="whitespace-normal">Tipo servicio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Cronograma</TableHead>
            <TableHead>Secuencia</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenes.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={selectionMode ? COLUMNAS_BASE + 1 : COLUMNAS_BASE}
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
                {selectionMode && (
                  <TableCell className="w-8">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input accent-foreground"
                      aria-label={`Seleccionar la orden ${
                        orden.cliente?.nombre_cliente ?? orden.id_unico ?? orden.id
                      }`}
                      checked={selectedIds.has(orden.id)}
                      onChange={() => onToggle(orden.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="whitespace-normal font-medium">
                  {orden.cliente?.nombre_cliente ?? "—"}
                </TableCell>
                <TableCell>{orden.numero_os_cliente ?? "—"}</TableCell>
                <TableCell>{orden.fecha_recepcion_os ?? "—"}</TableCell>
                <TableCell className="whitespace-normal">
                  {orden.tipo_servicio ?? "—"}
                </TableCell>
                <TableCell>
                  {selectionMode ? (
                    <EstadoBadge estado={orden.estado} />
                  ) : (
                    <RoleGate
                      allow={ROLES_EDITAN_INLINE}
                      fallback={<EstadoBadge estado={orden.estado} />}
                    >
                      <EditableCell
                        type="select"
                        value={orden.estado}
                        options={OPCIONES_ESTADO}
                        renderValue={() => <EstadoBadge estado={orden.estado} />}
                        onSave={(value) =>
                          actualizarCampoOrden(orden.id, {
                            estado: value as EstadoOrden | null,
                          })
                        }
                        onError={setEditError}
                      />
                    </RoleGate>
                  )}
                </TableCell>
                <TableCell>
                  {selectionMode ? (
                    <span>{orden.cronograma ?? "—"}</span>
                  ) : (
                    <RoleGate
                      allow={ROLES_EDITAN_INLINE}
                      fallback={<span>{orden.cronograma ?? "—"}</span>}
                    >
                      <EditableCell
                        type="number"
                        value={orden.cronograma}
                        onSave={(value) =>
                          actualizarCampoOrden(orden.id, { cronograma: value })
                        }
                        onError={setEditError}
                      />
                    </RoleGate>
                  )}
                </TableCell>
                <TableCell>
                  {selectionMode ? (
                    <span>{orden.secuencia ?? "—"}</span>
                  ) : (
                    <RoleGate
                      allow={ROLES_EDITAN_INLINE}
                      fallback={<span>{orden.secuencia ?? "—"}</span>}
                    >
                      <EditableCell
                        type="text"
                        value={orden.secuencia}
                        onSave={(value) =>
                          actualizarCampoOrden(orden.id, { secuencia: value })
                        }
                        onError={setEditError}
                      />
                    </RoleGate>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Acciones de la orden"
                          disabled={selectionMode}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        render={<Link href={`/ordenes/${orden.id}/editar`} />}
                      >
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      <RoleGate allow={ROLES_EDITAN_INLINE}>
                        <DropdownMenuItem
                          disabled={isDownloading}
                          onClick={() => handleDownload(orden)}
                        >
                          {isDownloading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Download className="size-4" />
                          )}
                          PDF
                        </DropdownMenuItem>
                      </RoleGate>
                      <RoleGate allow={["administrador"]}>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isDeleting}
                          onClick={() => handleDelete(orden)}
                        >
                          <X className="size-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </RoleGate>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
