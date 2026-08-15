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
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  X,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EstadoBadge } from "@/components/ordenes/estado-badge";
import { EditableCell } from "@/components/ordenes/editable-cell";
import { RoleGate } from "@/components/auth/role-gate";
import { useAuth } from "@/components/auth/auth-provider";
import { eliminarOrden, actualizarCampoOrden } from "@/app/ordenes/actions";
import { cn, formatearFecha } from "@/lib/utils";
import {
  ESTADOS_ORDEN,
  type EstadoOrden,
} from "@/lib/validations/orden.schema";
import type { OrdenServicioConRelaciones, RolUsuario } from "@/types";
const ROLES_EDITAN_INLINE: RolUsuario[] = ["administrador", "financiero"];
const OPCIONES_ESTADO = ESTADOS_ORDEN.map((e) => ({ id: e, label: e }));

type ColumnaOrdenable = "numero_os_cliente" | "fecha_sipab" | "secuencia";

// Encabezado clicable que persiste sort/dir en la URL (mismo patrón que
// OrdenesFiltros): la página (Server Component) lee "sort"/"dir" de
// searchParams y hace el ORDER BY en getOrdenes — acá solo se lee/escribe la
// query string, nunca se ordena en el cliente.
function SortableHeader({
  column,
  label,
  className,
}: {
  column: ColumnaOrdenable;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activo = searchParams.get("sort") === column;
  const direccionActual = searchParams.get("dir") === "asc" ? "asc" : "desc";

  function alternar() {
    const params = new URLSearchParams(searchParams.toString());
    const nuevaDireccion = activo && direccionActual === "asc" ? "desc" : "asc";
    params.set("sort", column);
    params.set("dir", nuevaDireccion);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={alternar}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {activo ? (
          direccionActual === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
        )}
      </button>
    </TableHead>
  );
}

type OrdenesTableProps = {
  ordenes: OrdenServicioConRelaciones[];
  // Selección de filas para las acciones en lote del header (exportar o
  // eliminar) — la gobierna OrdenesListado (el estado se sube ahí porque
  // el botón activo vive en el header, ver ordenes-listado.tsx).
  selectionMode: boolean;
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  accionError?: string | null;
};

export function OrdenesTable({
  ordenes,
  selectionMode,
  selectedIds,
  onToggle,
  onToggleAll,
  accionError,
}: OrdenesTableProps) {
  const { perfil } = useAuth();
  // Filtros/orden activos en /ordenes (query string) para que "Editar" los
  // devuelva vía backHref — ver EditarOrdenPage y OrdenForm.
  const searchParams = useSearchParams();
  const queryActual = searchParams.toString();
  const hrefEditar = (id: number) =>
    queryActual
      ? `/ordenes/${id}/editar?volver=${encodeURIComponent(queryActual)}`
      : `/ordenes/${id}/editar`;
  // Financiero es el único rol que ve "Cliente" + "Número de OS"; el resto ve
  // el nombre de la empresa usuaria en su lugar y no ve el número de OS.
  const esFinanciero = perfil?.rol === "financiero";
  const columnasBase = esFinanciero ? 9 : 8;
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [ordenPendienteEliminar, setOrdenPendienteEliminar] =
    useState<OrdenServicioConRelaciones | null>(null);
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

  async function confirmarEliminar() {
    const orden = ordenPendienteEliminar;
    if (!orden) return;
    setOrdenPendienteEliminar(null);

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
      {accionError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {accionError}
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
            <TableHead className="whitespace-normal">
              {esFinanciero ? "Cliente" : "Nombre Empresa usuaria del cliente"}
            </TableHead>
            {esFinanciero && (
              <SortableHeader
                column="numero_os_cliente"
                label="Número de OS"
              />
            )}
            <SortableHeader column="fecha_sipab" label="Fecha SIPAB" />
            <TableHead className="whitespace-normal">Tipo servicio</TableHead>
            <TableHead>Estado Gerencia</TableHead>
            <TableHead>Estado de ejecución</TableHead>
            <TableHead>Cronograma</TableHead>
            <SortableHeader column="secuencia" label="Secuencia" />
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenes.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={selectionMode ? columnasBase + 1 : columnasBase}
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
                  {esFinanciero
                    ? (orden.cliente?.nombre_cliente ?? "—")
                    : (orden.nombre_empresa_usuaria ?? "—")}
                </TableCell>
                {esFinanciero && (
                  <TableCell>{orden.numero_os_cliente ?? "—"}</TableCell>
                )}
                <TableCell>{formatearFecha(orden.fecha_sipab) || "—"}</TableCell>
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
                  <Badge variant="secondary">
                    {orden.checklist?.estado_ejecucion?.nombre ?? "Pendiente programar"}
                  </Badge>
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
                        render={<Link href={hrefEditar(orden.id)} />}
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
                          onClick={() => setOrdenPendienteEliminar(orden)}
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

      <AlertDialog
        open={ordenPendienteEliminar != null}
        onOpenChange={(open) => {
          if (!open) setOrdenPendienteEliminar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar orden</AlertDialogTitle>
            <AlertDialogDescription>
              {ordenPendienteEliminar && (
                <>
                  ¿Eliminar la orden de{" "}
                  <strong className="text-foreground">
                    {ordenPendienteEliminar.cliente?.nombre_cliente ??
                      ordenPendienteEliminar.id_unico ??
                      `#${ordenPendienteEliminar.id}`}
                  </strong>
                  ? Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmarEliminar}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
