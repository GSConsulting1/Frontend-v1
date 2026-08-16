// Tabla del listado de participantes ARL. Misma anatomía que clientes-table.tsx:
// una columna de checkboxes que aparece solo en modo selección (para el borrado
// en lote del header) y un menú "⋮" por fila con las acciones de ESA fila
// (Editar / Marcar inactivo / Eliminar), bloqueado mientras se están eligiendo
// filas para que "seleccionar" no se confunda con "editar o borrar".
//
// "Editar" no navega a una página, abre una fila-formulario debajo — un
// participante son 2 campos. Cuál fila está en edición lo gobierna
// ParticipantesArlListado (editandoId), no esta tabla: el formulario de alta
// vive allá arriba y los dos no deben poder estar abiertos a la vez.
//
// El estado propio de acá es solo el efímero: qué filas están "eliminando" o
// "cambiando de estado" (feedback visual mientras corre el Server Action) y
// cuál está pendiente de confirmar en el <AlertDialog>.

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
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
import { CamposParticipanteArl } from "@/components/participantes-arl/campos-participante-arl";
import {
  actualizarParticipanteArl,
  actualizarActivoParticipanteArl,
  eliminarParticipanteArl,
} from "@/app/profesionales/participantes-arl/actions";
import {
  participanteArlSchema,
  type ParticipanteArlFormValues,
} from "@/lib/validations/participante-arl.schema";
import { cn } from "@/lib/utils";
import type { ParticipanteArl } from "@/types";

// Nombre, Cédula, Creado, Estado, Acciones (la de checkbox se suma aparte).
const COLUMNAS_BASE = 5;

// Sin `new Date()` a propósito: fecha_creacion es un timestamp sin zona y
// formatearlo con Intl daría un resultado distinto en el servidor y en el
// navegador (zonas horarias distintas → error de hidratación). Con los primeros
// 10 caracteres alcanza y es determinístico — mismo criterio que
// clientes-table.tsx.
function formatearFecha(valor: string | null): string {
  if (!valor) return "—";
  const [anio, mes, dia] = valor.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return "—";
  return `${dia}/${mes}/${anio}`;
}

type ParticipantesArlTableProps = {
  participantes: ParticipanteArl[];
  // Selección de filas para el borrado en lote del header — la gobierna
  // ParticipantesArlListado (el botón activo vive en el header, ver ese
  // archivo).
  selectionMode: boolean;
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  accionError?: string | null;
  editandoId: number | null;
  onEditar: (id: number) => void;
  onCerrarEdicion: () => void;
  mensajeVacio: string;
};

export function ParticipantesArlTable({
  participantes,
  selectionMode,
  selectedIds,
  onToggle,
  onToggleAll,
  accionError,
  editandoId,
  onEditar,
  onCerrarEdicion,
  mensajeVacio,
}: ParticipantesArlTableProps) {
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [filaError, setFilaError] = useState<string | null>(null);
  const [pendienteEliminar, setPendienteEliminar] =
    useState<ParticipanteArl | null>(null);

  async function confirmarEliminar() {
    const participante = pendienteEliminar;
    if (!participante) return;
    setPendienteEliminar(null);

    setFilaError(null);
    setDeletingIds((prev) => new Set(prev).add(participante.id));
    const result = await eliminarParticipanteArl(participante.id);
    if (!result.ok) {
      setFilaError(result.error);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(participante.id);
        return next;
      });
    }
  }

  async function toggleActivo(participante: ParticipanteArl) {
    setFilaError(null);
    setTogglingIds((prev) => new Set(prev).add(participante.id));
    const result = await actualizarActivoParticipanteArl(
      participante.id,
      !participante.activo,
    );
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(participante.id);
      return next;
    });
    if (!result.ok) setFilaError(result.error);
  }

  const todosSeleccionados =
    participantes.length > 0 &&
    participantes.every((p) => selectedIds.has(p.id));
  const algunoSeleccionado = participantes.some((p) => selectedIds.has(p.id));

  return (
    <div className="space-y-3">
      {filaError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {filaError}
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
                  aria-label="Seleccionar todos los participantes ARL"
                  checked={todosSeleccionados}
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        algunoSeleccionado && !todosSeleccionados;
                  }}
                  onChange={onToggleAll}
                  disabled={participantes.length === 0}
                />
              </TableHead>
            )}
            <TableHead>Nombre</TableHead>
            <TableHead>Cédula</TableHead>
            <TableHead>Creado</TableHead>
            <TableHead className="text-right">Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participantes.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={selectionMode ? COLUMNAS_BASE + 1 : COLUMNAS_BASE}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {mensajeVacio}
              </TableCell>
            </TableRow>
          )}

          {participantes.map((participante) => {
            if (editandoId === participante.id) {
              return (
                <EditarParticipanteArlRow
                  key={participante.id}
                  participante={participante}
                  colSpan={selectionMode ? COLUMNAS_BASE + 1 : COLUMNAS_BASE}
                  onCancelar={onCerrarEdicion}
                  onGuardado={onCerrarEdicion}
                />
              );
            }

            const isDeleting = deletingIds.has(participante.id);
            const isToggling = togglingIds.has(participante.id);

            return (
              <TableRow
                key={participante.id}
                className={cn(isDeleting && "opacity-50")}
              >
                {selectionMode && (
                  <TableCell className="w-8">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input accent-foreground"
                      aria-label={`Seleccionar a ${participante.nombre_completo}`}
                      checked={selectedIds.has(participante.id)}
                      onChange={() => onToggle(participante.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="whitespace-normal font-medium">
                  {participante.nombre_completo}
                </TableCell>
                <TableCell>{participante.cedula ?? "—"}</TableCell>
                <TableCell>
                  {formatearFecha(participante.fecha_creacion)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={participante.activo ? "secondary" : "outline"}
                  >
                    {participante.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Acciones de ${participante.nombre_completo}`}
                          disabled={selectionMode || isDeleting || isToggling}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEditar(participante.id)}
                      >
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toggleActivo(participante)}
                      >
                        <Power className="size-4" />
                        {participante.activo
                          ? "Marcar inactivo"
                          : "Marcar activo"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setPendienteEliminar(participante)}
                      >
                        <Trash2 className="size-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={pendienteEliminar != null}
        onOpenChange={(open) => {
          if (!open) setPendienteEliminar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar participante ARL</AlertDialogTitle>
            <AlertDialogDescription>
              {pendienteEliminar && (
                <>
                  ¿Eliminar a{" "}
                  <strong className="text-foreground">
                    {pendienteEliminar.nombre_completo}
                  </strong>
                  ? Esta acción no se puede deshacer. Si ya está asociado a
                  órdenes de servicio, no se va a poder eliminar.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmarEliminar}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type EditarParticipanteArlRowProps = {
  participante: ParticipanteArl;
  colSpan: number;
  onCancelar: () => void;
  onGuardado: () => void;
};

function EditarParticipanteArlRow({
  participante,
  colSpan,
  onCancelar,
  onGuardado,
}: EditarParticipanteArlRowProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ParticipanteArlFormValues>({
    resolver: zodResolver(participanteArlSchema),
    defaultValues: {
      nombre_completo: participante.nombre_completo,
      cedula: participante.cedula ?? "",
    },
  });

  async function onSubmit(values: ParticipanteArlFormValues) {
    setServerError(null);
    const result = await actualizarParticipanteArl(participante.id, values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof ParticipanteArlFormValues, {
              message: messages[0],
            });
          }
        }
      }
      if (result.error) setServerError(result.error);
      return;
    }

    onGuardado();
  }

  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="bg-muted/30">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 py-2 sm:grid-cols-2"
          noValidate
        >
          <CamposParticipanteArl
            idPrefix={`editar-${participante.id}`}
            register={register}
            errors={errors}
          />

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
              {serverError}
            </p>
          )}

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </TableCell>
    </TableRow>
  );
}
