// Tabla de la pestaña "Empresas usuarias" — misma anatomía que
// components/clientes/clientes-table.tsx (columna de checkboxes en modo
// selección, menú "⋮" por fila, fila-formulario para editar inline).
//
// Dos diferencias con clientes, las dos por la columna "Órdenes":
//
//   1. El conteo se muestra, así que se ve de antemano cuáles se pueden borrar
//      (solo las de 0 órdenes; al resto las frena la FK).
//   2. Por eso mismo el ítem "Eliminar" del menú va deshabilitado cuando la
//      empresa tiene órdenes: acá SÍ sabemos el dato antes de intentar, y
//      ofrecer una acción que va a fallar siempre es peor que no ofrecerla. En
//      clientes-table.tsx queda habilitado porque ahí ese conteo no se carga.

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
import { CamposEmpresaUsuaria } from "@/components/empresas-usuarias/campos-empresa-usuaria";
import {
  actualizarEmpresaUsuaria,
  actualizarActivoEmpresaUsuaria,
  eliminarEmpresaUsuaria,
} from "@/app/clientes/empresas-usuarias/actions";
import {
  empresaUsuariaSchema,
  type EmpresaUsuariaFormValues,
} from "@/lib/validations/empresa-usuaria.schema";
import { cn } from "@/lib/utils";
import type { EmpresaUsuariaConConteo } from "@/types";

// Nombre, NIT, Órdenes, Estado, Acciones (la de checkbox se suma aparte).
const COLUMNAS_BASE = 5;

type EmpresasUsuariasTableProps = {
  empresas: EmpresaUsuariaConConteo[];
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

export function EmpresasUsuariasTable({
  empresas,
  selectionMode,
  selectedIds,
  onToggle,
  onToggleAll,
  accionError,
  editandoId,
  onEditar,
  onCerrarEdicion,
  mensajeVacio,
}: EmpresasUsuariasTableProps) {
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [filaError, setFilaError] = useState<string | null>(null);
  const [empresaPendienteEliminar, setEmpresaPendienteEliminar] =
    useState<EmpresaUsuariaConConteo | null>(null);

  async function confirmarEliminar() {
    const empresa = empresaPendienteEliminar;
    if (!empresa) return;
    setEmpresaPendienteEliminar(null);

    setFilaError(null);
    setDeletingIds((prev) => new Set(prev).add(empresa.id));
    const result = await eliminarEmpresaUsuaria(empresa.id);
    if (!result.ok) {
      setFilaError(result.error);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(empresa.id);
        return next;
      });
    }
  }

  async function toggleActivo(empresa: EmpresaUsuariaConConteo) {
    setFilaError(null);
    setTogglingIds((prev) => new Set(prev).add(empresa.id));
    const result = await actualizarActivoEmpresaUsuaria(
      empresa.id,
      !empresa.activo,
    );
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(empresa.id);
      return next;
    });
    if (!result.ok) setFilaError(result.error);
  }

  const todasSeleccionadas =
    empresas.length > 0 && empresas.every((e) => selectedIds.has(e.id));
  const algunaSeleccionada = empresas.some((e) => selectedIds.has(e.id));

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
                  aria-label="Seleccionar todas las empresas usuarias"
                  checked={todasSeleccionadas}
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        algunaSeleccionada && !todasSeleccionadas;
                  }}
                  onChange={onToggleAll}
                  disabled={empresas.length === 0}
                />
              </TableHead>
            )}
            <TableHead>Nombre</TableHead>
            <TableHead>NIT</TableHead>
            <TableHead className="text-right">Órdenes</TableHead>
            <TableHead className="text-right">Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={selectionMode ? COLUMNAS_BASE + 1 : COLUMNAS_BASE}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {mensajeVacio}
              </TableCell>
            </TableRow>
          )}

          {empresas.map((empresa) => {
            if (editandoId === empresa.id) {
              return (
                <EditarEmpresaUsuariaRow
                  key={empresa.id}
                  empresa={empresa}
                  colSpan={selectionMode ? COLUMNAS_BASE + 1 : COLUMNAS_BASE}
                  onCancelar={onCerrarEdicion}
                  onGuardado={onCerrarEdicion}
                />
              );
            }

            const isDeleting = deletingIds.has(empresa.id);
            const isToggling = togglingIds.has(empresa.id);
            const tieneOrdenes = empresa.ordenes > 0;

            return (
              <TableRow
                key={empresa.id}
                className={cn(isDeleting && "opacity-50")}
              >
                {selectionMode && (
                  <TableCell className="w-8">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input accent-foreground"
                      aria-label={`Seleccionar la empresa ${empresa.nombre}`}
                      checked={selectedIds.has(empresa.id)}
                      onChange={() => onToggle(empresa.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="whitespace-normal font-medium">
                  {empresa.nombre}
                </TableCell>
                <TableCell>{empresa.nit ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {empresa.ordenes}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={empresa.activo ? "secondary" : "outline"}>
                    {empresa.activo ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Acciones de ${empresa.nombre}`}
                          disabled={selectionMode || isDeleting || isToggling}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditar(empresa.id)}>
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActivo(empresa)}>
                        <Power className="size-4" />
                        {empresa.activo ? "Marcar inactiva" : "Marcar activa"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={tieneOrdenes}
                        onClick={() => setEmpresaPendienteEliminar(empresa)}
                      >
                        <Trash2 className="size-4" />
                        {tieneOrdenes
                          ? `Eliminar (tiene ${empresa.ordenes} ${
                              empresa.ordenes === 1 ? "orden" : "órdenes"
                            })`
                          : "Eliminar"}
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
        open={empresaPendienteEliminar != null}
        onOpenChange={(open) => {
          if (!open) setEmpresaPendienteEliminar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar empresa usuaria</AlertDialogTitle>
            <AlertDialogDescription>
              {empresaPendienteEliminar && (
                <>
                  ¿Eliminar a{" "}
                  <strong className="text-foreground">
                    {empresaPendienteEliminar.nombre}
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

type EditarEmpresaUsuariaRowProps = {
  empresa: EmpresaUsuariaConConteo;
  colSpan: number;
  onCancelar: () => void;
  onGuardado: () => void;
};

function EditarEmpresaUsuariaRow({
  empresa,
  colSpan,
  onCancelar,
  onGuardado,
}: EditarEmpresaUsuariaRowProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmpresaUsuariaFormValues>({
    resolver: zodResolver(empresaUsuariaSchema),
    defaultValues: {
      nombre: empresa.nombre,
      nit: empresa.nit ?? "",
    },
  });

  async function onSubmit(values: EmpresaUsuariaFormValues) {
    setServerError(null);
    const result = await actualizarEmpresaUsuaria(empresa.id, values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof EmpresaUsuariaFormValues, {
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
          <CamposEmpresaUsuaria
            idPrefix={`editar-${empresa.id}`}
            register={register}
            errors={errors}
          />

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
              {serverError}
            </p>
          )}

          {/* El nombre y el NIT están copiados en cada orden de esta empresa
              (las columnas que leen el listado, el Excel y el PDF), así que
              editarlos acá los reescribe allá — ver
              actualizarEmpresaUsuariaRecord en lib/data/empresas-usuarias.ts. */}
          <p className="text-sm text-muted-foreground sm:col-span-2">
            El nombre y el NIT se actualizan también en las órdenes de servicio
            de esta empresa.
          </p>

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
