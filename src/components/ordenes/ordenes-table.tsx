// Tabla del listado de órdenes — Client Component: cada fila existente se
// puede desplegar para editarla inline (ver OrdenRowEditor), y "Nueva orden"
// agrega una fila en blanco arriba de todo, siempre desplegada (ver
// OrdenDraftRowEditor) — no hay navegación a una página aparte para crear.
//
// Mientras una fila está colapsada, sus celdas son SOLO lectura a propósito:
// no hay <select>/<input> interactivos ahí, para que no se pueda editar nada
// sin desplegar primero.
//
// No hay checkboxes de selección: la única acción destructiva por fila es la
// "X", que ya es un affordance claro y directo — un checkbox por fila que
// solo sirve para borrar (sin una barra de acciones en lote) es un segundo
// camino a la misma acción, más confuso que útil.

"use client";

import {
  Fragment,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ChevronDown, ExternalLink, X } from "lucide-react";
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
import {
  OrdenRowEditor,
  type OrdenRowEditorHandle,
} from "@/components/ordenes/orden-row-editor";
import {
  OrdenDraftRowEditor,
  type OrdenDraftRowEditorHandle,
} from "@/components/ordenes/orden-draft-row-editor";
import { eliminarOrden } from "@/app/ordenes/actions";
import { cn } from "@/lib/utils";
import type { OrdenServicioConRelaciones } from "@/types";
import type { OrdenServicioFormValues } from "@/lib/validations/orden.schema";

type SelectOption = { id: number; label: string };

const COLUMNAS = 9;

export type OrdenesTableHandle = {
  collectChanges: () => Promise<{
    actualizaciones: { id: number; campos: Partial<OrdenServicioFormValues> }[];
    creaciones: OrdenServicioFormValues[];
  }>;
  addDraftRow: () => void;
  clearDrafts: () => void;
};

type OrdenesTableProps = {
  ordenes: OrdenServicioConRelaciones[];
  clientes: SelectOption[];
  estados: SelectOption[];
  profesionales: SelectOption[];
  onSaveStateChange: (canSave: boolean) => void;
};

export const OrdenesTable = forwardRef<OrdenesTableHandle, OrdenesTableProps>(
  function OrdenesTable({ ordenes, clientes, estados, profesionales, onSaveStateChange }, ref) {
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [draftIds, setDraftIds] = useState<string[]>([]);

    const rowRefs = useRef(new Map<number, OrdenRowEditorHandle>());
    const dirtyMap = useRef<Record<number, boolean>>({});
    const validMap = useRef<Record<number, boolean>>({});

    const draftRefs = useRef(new Map<string, OrdenDraftRowEditorHandle>());
    const draftValidMap = useRef<Record<string, boolean>>({});

    const onSaveStateChangeRef = useRef(onSaveStateChange);
    onSaveStateChangeRef.current = onSaveStateChange;

    // Lee de los refs (draftValidMap.current), no del state `draftIds`: los
    // refs se actualizan de forma síncrona en el mismo evento (addDraftRow /
    // discardDraft), mientras que el state solo se refleja en el próximo
    // render — si esta función leyera `draftIds` justo después de llamar a
    // setDraftIds, vería el valor viejo.
    const recomputeCanSave = useCallback(() => {
      const dirtyIds = Object.entries(dirtyMap.current)
        .filter(([, dirty]) => dirty)
        .map(([id]) => Number(id));
      const edicionesListas = dirtyIds.length === 0 || dirtyIds.every((id) => validMap.current[id]);

      const draftIds = Object.keys(draftValidMap.current);
      const nuevasListas = draftIds.length === 0 || draftIds.every((id) => draftValidMap.current[id]);

      const hayCambios = dirtyIds.length > 0 || draftIds.length > 0;
      onSaveStateChangeRef.current(hayCambios && edicionesListas && nuevasListas);
    }, []);

    const handleRowStateChange = useCallback(
      (id: number, isDirty: boolean, isValid: boolean) => {
        dirtyMap.current[id] = isDirty;
        validMap.current[id] = isValid;
        recomputeCanSave();
      },
      [recomputeCanSave],
    );

    const handleDraftValidChange = useCallback(
      (draftId: string, isValid: boolean) => {
        draftValidMap.current[draftId] = isValid;
        recomputeCanSave();
      },
      [recomputeCanSave],
    );

    useImperativeHandle(ref, () => ({
      async collectChanges() {
        const editEntries = Array.from(rowRefs.current.entries());
        const actualizaciones = (
          await Promise.all(
            editEntries.map(async ([id, handle]) => {
              const patch = await handle.getPatch();
              return patch ? { id, campos: patch } : null;
            }),
          )
        ).filter((r): r is { id: number; campos: Partial<OrdenServicioFormValues> } => r !== null);

        const draftEntries = Array.from(draftRefs.current.entries());
        const creaciones = (
          await Promise.all(draftEntries.map(([, handle]) => handle.getValuesIfValid()))
        ).filter((v): v is OrdenServicioFormValues => v !== null);

        return { actualizaciones, creaciones };
      },
      addDraftRow() {
        const id = crypto.randomUUID();
        draftValidMap.current[id] = false;
        recomputeCanSave();
        setDraftIds((prev) => [...prev, id]);
      },
      clearDrafts() {
        draftRefs.current.clear();
        draftValidMap.current = {};
        recomputeCanSave();
        setDraftIds([]);
      },
    }));

    function toggleExpand(id: number) {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          delete dirtyMap.current[id];
          delete validMap.current[id];
          rowRefs.current.delete(id);
          recomputeCanSave();
        } else {
          next.add(id);
        }
        return next;
      });
    }

    function discardDraft(draftId: string) {
      draftRefs.current.delete(draftId);
      delete draftValidMap.current[draftId];
      recomputeCanSave();
      setDraftIds((prev) => prev.filter((d) => d !== draftId));
    }

    async function handleDelete(orden: OrdenServicioConRelaciones) {
      const nombre = orden.cliente?.nombre_cliente ?? orden.id_unico ?? `#${orden.id}`;
      if (!window.confirm(`¿Eliminar la orden de ${nombre}? Esta acción no se puede deshacer.`)) {
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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Cliente</TableHead>
              <TableHead>Número de OS</TableHead>
              <TableHead>Fecha recepción</TableHead>
              <TableHead>Tipo servicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Archivo</TableHead>
              <TableHead className="text-right">Eliminar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenes.length === 0 && draftIds.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNAS} className="py-10 text-center text-sm text-muted-foreground">
                  No hay órdenes que coincidan con los filtros.
                </TableCell>
              </TableRow>
            )}

            {ordenes.map((orden) => {
              const isExpanded = expanded.has(orden.id);
              const isDeleting = deletingIds.has(orden.id);

              return (
                <Fragment key={orden.id}>
                  <TableRow className={cn(isDeleting && "opacity-50")}>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Contraer fila" : "Desplegar fila para editar"}
                        onClick={() => toggleExpand(orden.id)}
                      >
                        <ChevronDown
                          className={cn("size-4 transition-transform", isExpanded && "rotate-180")}
                        />
                      </Button>
                    </TableCell>
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
                      {orden.link ? (
                        <a
                          href={orden.link}
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
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isDeleting}
                        aria-label="Eliminar orden"
                        onClick={() => handleDelete(orden)}
                      >
                        <X className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={COLUMNAS} className="p-0">
                        <OrdenRowEditor
                          key={`${orden.id}-${orden.fecha_actualizacion}`}
                          ref={(handle) => {
                            if (handle) rowRefs.current.set(orden.id, handle);
                            else rowRefs.current.delete(orden.id);
                          }}
                          orden={orden}
                          clientes={clientes}
                          estados={estados}
                          profesionales={profesionales}
                          onStateChange={handleRowStateChange}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}

            {draftIds.map((draftId) => (
              <Fragment key={draftId}>
                <TableRow>
                  <TableCell colSpan={COLUMNAS} className="p-0">
                    <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
                      <span className="text-sm font-medium">Nueva orden</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Descartar nueva orden"
                        onClick={() => discardDraft(draftId)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <OrdenDraftRowEditor
                      ref={(handle) => {
                        if (handle) draftRefs.current.set(draftId, handle);
                        else draftRefs.current.delete(draftId);
                      }}
                      clientes={clientes}
                      estados={estados}
                      profesionales={profesionales}
                      onValidChange={(isValid) => handleDraftValidChange(draftId, isValid)}
                    />
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  },
);
