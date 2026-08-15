// Tabla del listado de clientes. Misma anatomía que ordenes-table.tsx: una
// columna de checkboxes que aparece solo en modo selección (para el borrado en
// lote del header) y un menú "⋮" por fila con las acciones de ESA fila
// (Editar / Marcar inactivo / Eliminar), bloqueado mientras se están eligiendo
// filas para que "seleccionar" no se confunda con "editar o borrar".
//
// La diferencia con órdenes: "Editar" no navega a una página, abre una
// fila-formulario debajo (mismo patrón que profesionales-listado.tsx) — un
// cliente son 2 campos. Cuál fila está en edición lo gobierna
// ClientesListado (editandoId), no esta tabla: el formulario de alta vive allá
// arriba y los dos no deben poder estar abiertos a la vez.
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
import { CamposCliente } from "@/components/clientes/campos-cliente";
import {
  actualizarCliente,
  actualizarActivoCliente,
  eliminarCliente,
} from "@/app/clientes/actions";
import {
  clienteSchema,
  type ClienteFormValues,
} from "@/lib/validations/cliente.schema";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/types";

// Nombre, NIT, Creado, Estado, Acciones (la de checkbox se suma aparte).
const COLUMNAS_BASE = 5;

// Sin `new Date()` a propósito: fecha_creacion es un timestamp sin zona y
// formatearlo con Intl daría un resultado distinto en el servidor y en el
// navegador (zonas horarias distintas → error de hidratación). Con los
// primeros 10 caracteres alcanza y es determinístico.
function formatearFecha(valor: string | null): string {
  if (!valor) return "—";
  const [anio, mes, dia] = valor.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return "—";
  return `${dia}/${mes}/${anio}`;
}

type ClientesTableProps = {
  clientes: Cliente[];
  // Selección de filas para el borrado en lote del header — la gobierna
  // ClientesListado (el botón activo vive en el header, ver ese archivo).
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

export function ClientesTable({
  clientes,
  selectionMode,
  selectedIds,
  onToggle,
  onToggleAll,
  accionError,
  editandoId,
  onEditar,
  onCerrarEdicion,
  mensajeVacio,
}: ClientesTableProps) {
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [filaError, setFilaError] = useState<string | null>(null);
  const [clientePendienteEliminar, setClientePendienteEliminar] =
    useState<Cliente | null>(null);

  async function confirmarEliminar() {
    const cliente = clientePendienteEliminar;
    if (!cliente) return;
    setClientePendienteEliminar(null);

    setFilaError(null);
    setDeletingIds((prev) => new Set(prev).add(cliente.id));
    const result = await eliminarCliente(cliente.id);
    if (!result.ok) {
      setFilaError(result.error);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(cliente.id);
        return next;
      });
    }
  }

  async function toggleActivo(cliente: Cliente) {
    setFilaError(null);
    setTogglingIds((prev) => new Set(prev).add(cliente.id));
    const result = await actualizarActivoCliente(cliente.id, !cliente.activo);
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(cliente.id);
      return next;
    });
    if (!result.ok) setFilaError(result.error);
  }

  const todosSeleccionados =
    clientes.length > 0 && clientes.every((c) => selectedIds.has(c.id));
  const algunoSeleccionado = clientes.some((c) => selectedIds.has(c.id));

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
                  aria-label="Seleccionar todos los clientes"
                  checked={todosSeleccionados}
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        algunoSeleccionado && !todosSeleccionados;
                  }}
                  onChange={onToggleAll}
                  disabled={clientes.length === 0}
                />
              </TableHead>
            )}
            <TableHead>Nombre</TableHead>
            <TableHead>NIT</TableHead>
            <TableHead>Creado</TableHead>
            <TableHead className="text-right">Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={selectionMode ? COLUMNAS_BASE + 1 : COLUMNAS_BASE}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {mensajeVacio}
              </TableCell>
            </TableRow>
          )}

          {clientes.map((cliente) => {
            if (editandoId === cliente.id) {
              return (
                <EditarClienteRow
                  key={cliente.id}
                  cliente={cliente}
                  colSpan={selectionMode ? COLUMNAS_BASE + 1 : COLUMNAS_BASE}
                  onCancelar={onCerrarEdicion}
                  onGuardado={onCerrarEdicion}
                />
              );
            }

            const isDeleting = deletingIds.has(cliente.id);
            const isToggling = togglingIds.has(cliente.id);

            return (
              <TableRow
                key={cliente.id}
                className={cn(isDeleting && "opacity-50")}
              >
                {selectionMode && (
                  <TableCell className="w-8">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input accent-foreground"
                      aria-label={`Seleccionar el cliente ${cliente.nombre_cliente}`}
                      checked={selectedIds.has(cliente.id)}
                      onChange={() => onToggle(cliente.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="whitespace-normal font-medium">
                  {cliente.nombre_cliente}
                </TableCell>
                <TableCell>{cliente.nit ?? "—"}</TableCell>
                <TableCell>{formatearFecha(cliente.fecha_creacion)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={cliente.activo ? "secondary" : "outline"}>
                    {cliente.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Acciones de ${cliente.nombre_cliente}`}
                          disabled={selectionMode || isDeleting || isToggling}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditar(cliente.id)}>
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActivo(cliente)}>
                        <Power className="size-4" />
                        {cliente.activo ? "Marcar inactivo" : "Marcar activo"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setClientePendienteEliminar(cliente)}
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
        open={clientePendienteEliminar != null}
        onOpenChange={(open) => {
          if (!open) setClientePendienteEliminar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              {clientePendienteEliminar && (
                <>
                  ¿Eliminar a{" "}
                  <strong className="text-foreground">
                    {clientePendienteEliminar.nombre_cliente}
                  </strong>
                  ? Esta acción no se puede deshacer. Si el cliente ya tiene
                  órdenes de servicio, no se va a poder eliminar.
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

type EditarClienteRowProps = {
  cliente: Cliente;
  colSpan: number;
  onCancelar: () => void;
  onGuardado: () => void;
};

function EditarClienteRow({
  cliente,
  colSpan,
  onCancelar,
  onGuardado,
}: EditarClienteRowProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre_cliente: cliente.nombre_cliente,
      nit: cliente.nit ?? "",
    },
  });

  async function onSubmit(values: ClienteFormValues) {
    setServerError(null);
    const result = await actualizarCliente(cliente.id, values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof ClienteFormValues, {
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
          <CamposCliente
            idPrefix={`editar-${cliente.id}`}
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
