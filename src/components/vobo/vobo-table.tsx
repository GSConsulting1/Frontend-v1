// Tabla del listado de VoBo. Misma anatomía que clientes-table.tsx: una columna
// de checkboxes que aparece solo en modo selección (para el borrado en lote del
// header) y un menú "⋮" por fila con las acciones de ESA fila (Editar / Marcar
// inactivo / Eliminar), bloqueado mientras se están eligiendo filas para que
// "seleccionar" no se confunda con "editar o borrar".
//
// "Editar" no navega a una página, abre una fila-formulario debajo — son 3
// campos. Cuál fila está en edición lo gobierna VoboListado (editandoId), no
// esta tabla: el formulario de alta vive allá arriba y los dos no deben poder
// estar abiertos a la vez.
//
// Sin columna "Creado" (a diferencia de clientes-table.tsx): acá el email y el
// celular son los datos que se buscan a ojo, y sumar una sexta columna los
// aprieta sin aportar nada. `fecha_creacion` existe igual en la tabla.

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
import { CamposVobo } from "@/components/vobo/campos-vobo";
import {
  actualizarVobo,
  actualizarActivoVobo,
  eliminarVobo,
} from "@/app/profesionales/vobo/actions";
import { voboSchema, type VoboFormValues } from "@/lib/validations/vobo.schema";
import { cn } from "@/lib/utils";
import type { Vobo } from "@/types";

// Nombre, Email, Celular, Estado, Acciones (la de checkbox se suma aparte).
const COLUMNAS_BASE = 5;

type VoboTableProps = {
  personas: Vobo[];
  // Selección de filas para el borrado en lote del header — la gobierna
  // VoboListado (el botón activo vive en el header, ver ese archivo).
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

export function VoboTable({
  personas,
  selectionMode,
  selectedIds,
  onToggle,
  onToggleAll,
  accionError,
  editandoId,
  onEditar,
  onCerrarEdicion,
  mensajeVacio,
}: VoboTableProps) {
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [filaError, setFilaError] = useState<string | null>(null);
  const [pendienteEliminar, setPendienteEliminar] = useState<Vobo | null>(null);

  async function confirmarEliminar() {
    const persona = pendienteEliminar;
    if (!persona) return;
    setPendienteEliminar(null);

    setFilaError(null);
    setDeletingIds((prev) => new Set(prev).add(persona.id));
    const result = await eliminarVobo(persona.id);
    if (!result.ok) {
      setFilaError(result.error);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(persona.id);
        return next;
      });
    }
  }

  async function toggleActivo(persona: Vobo) {
    setFilaError(null);
    setTogglingIds((prev) => new Set(prev).add(persona.id));
    const result = await actualizarActivoVobo(persona.id, !persona.activo);
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(persona.id);
      return next;
    });
    if (!result.ok) setFilaError(result.error);
  }

  const todosSeleccionados =
    personas.length > 0 && personas.every((p) => selectedIds.has(p.id));
  const algunoSeleccionado = personas.some((p) => selectedIds.has(p.id));

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
                  aria-label="Seleccionar todas las personas de VoBo"
                  checked={todosSeleccionados}
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        algunoSeleccionado && !todosSeleccionados;
                  }}
                  onChange={onToggleAll}
                  disabled={personas.length === 0}
                />
              </TableHead>
            )}
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Celular</TableHead>
            <TableHead className="text-right">Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {personas.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={selectionMode ? COLUMNAS_BASE + 1 : COLUMNAS_BASE}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {mensajeVacio}
              </TableCell>
            </TableRow>
          )}

          {personas.map((persona) => {
            if (editandoId === persona.id) {
              return (
                <EditarVoboRow
                  key={persona.id}
                  persona={persona}
                  colSpan={selectionMode ? COLUMNAS_BASE + 1 : COLUMNAS_BASE}
                  onCancelar={onCerrarEdicion}
                  onGuardado={onCerrarEdicion}
                />
              );
            }

            const isDeleting = deletingIds.has(persona.id);
            const isToggling = togglingIds.has(persona.id);

            return (
              <TableRow
                key={persona.id}
                className={cn(isDeleting && "opacity-50")}
              >
                {selectionMode && (
                  <TableCell className="w-8">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input accent-foreground"
                      aria-label={`Seleccionar a ${persona.nombre_completo}`}
                      checked={selectedIds.has(persona.id)}
                      onChange={() => onToggle(persona.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="whitespace-normal font-medium">
                  {persona.nombre_completo}
                </TableCell>
                <TableCell>{persona.email ?? "—"}</TableCell>
                <TableCell>{persona.celular ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={persona.activo ? "secondary" : "outline"}>
                    {persona.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Acciones de ${persona.nombre_completo}`}
                          disabled={selectionMode || isDeleting || isToggling}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditar(persona.id)}>
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActivo(persona)}>
                        <Power className="size-4" />
                        {persona.activo ? "Marcar inactivo" : "Marcar activo"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setPendienteEliminar(persona)}
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
            <AlertDialogTitle>Eliminar persona de VoBo</AlertDialogTitle>
            <AlertDialogDescription>
              {pendienteEliminar && (
                <>
                  ¿Eliminar a{" "}
                  <strong className="text-foreground">
                    {pendienteEliminar.nombre_completo}
                  </strong>
                  ? Esta acción no se puede deshacer. Si ya dio el VoBo en
                  alguna orden de servicio, no se va a poder eliminar.
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

type EditarVoboRowProps = {
  persona: Vobo;
  colSpan: number;
  onCancelar: () => void;
  onGuardado: () => void;
};

function EditarVoboRow({
  persona,
  colSpan,
  onCancelar,
  onGuardado,
}: EditarVoboRowProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VoboFormValues>({
    resolver: zodResolver(voboSchema),
    defaultValues: {
      nombre_completo: persona.nombre_completo,
      email: persona.email ?? "",
      celular: persona.celular ?? "",
    },
  });

  async function onSubmit(values: VoboFormValues) {
    setServerError(null);
    const result = await actualizarVobo(persona.id, values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof VoboFormValues, { message: messages[0] });
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
          <CamposVobo
            idPrefix={`editar-${persona.id}`}
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
