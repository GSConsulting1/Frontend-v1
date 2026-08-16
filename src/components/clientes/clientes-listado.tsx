// Envoltorio de cliente del listado de clientes. Existe por el mismo motivo
// que ordenes-listado.tsx: la acción en lote del header ("Eliminar clientes",
// disparada desde el menú "⋮" — ver clientes-acciones-menu.tsx) necesita
// compartir con la tabla el Set de IDs seleccionados, así que ese estado se
// sube acá (lifting state up). page.tsx sigue siendo Server Component (hace el
// fetch) y solo renderiza este componente.
//
// A diferencia de órdenes, acá alcanza con `selectionMode: boolean` y no un
// `accionSeleccion: "exportar" | "eliminar" | null`: hay UNA sola acción en
// lote, así que no hay nada que distinguir.
//
// También gobierna qué formulario está abierto —el de alta (formAbierto) o la
// fila en edición (editandoId)— porque son mutuamente excluyentes: los tres
// modos (alta, edición, selección) se apagan entre sí, si no la pantalla queda
// mostrando dos formularios y una columna de checkboxes a la vez.
//
// Sin useState duplicando la lista: al llamar a una Server Action desde un
// Client Component, Next.js vuelve a renderizar el page.tsx del segmento con
// datos frescos después del revalidatePath, así que `clientes` (prop) ya llega
// actualizado — mismo criterio que profesionales-listado.tsx.

"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientesTabs } from "@/components/clientes/clientes-tabs";
import { CamposCliente } from "@/components/clientes/campos-cliente";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { ClientesAccionesMenu } from "@/components/clientes/clientes-acciones-menu";
import { EliminarClientesButton } from "@/components/clientes/eliminar-clientes-button";
import { crearCliente } from "@/app/clientes/actions";
import {
  clienteSchema,
  type ClienteFormValues,
} from "@/lib/validations/cliente.schema";
import type { Cliente } from "@/types";

type ClientesListadoProps = {
  clientes: Cliente[];
};

export function ClientesListado({ clientes }: ClientesListadoProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [accionError, setAccionError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // Filtro en memoria, sin ida y vuelta al servidor: la lista de clientes no
  // está paginada, así que alcanza con filtrar el array ya cargado (mismo
  // criterio que profesionales-listado.tsx).
  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return clientes;
    return clientes.filter((c) =>
      [c.nombre_cliente, c.nit]
        .filter(Boolean)
        .some((campo) => campo!.toLowerCase().includes(termino)),
    );
  }, [clientes, busqueda]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
  });

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Sobre la lista FILTRADA, no sobre `clientes`: "seleccionar todo" tiene que
  // marcar lo que se está viendo, no filas escondidas por la búsqueda.
  function toggleAll() {
    setSelectedIds((prev) =>
      clientesFiltrados.every((c) => prev.has(c.id))
        ? new Set()
        : new Set(clientesFiltrados.map((c) => c.id)),
    );
  }

  function iniciarSeleccion() {
    setAccionError(null);
    setServerError(null);
    setFormAbierto(false);
    setEditandoId(null);
    setSelectionMode(true);
  }

  function cancelarSeleccion() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setAccionError(null);
  }

  function abrirAlta() {
    cancelarSeleccion();
    setServerError(null);
    setEditandoId(null);
    setFormAbierto(true);
  }

  function abrirEdicion(id: number) {
    setFormAbierto(false);
    setServerError(null);
    setEditandoId(id);
  }

  async function onSubmit(values: ClienteFormValues) {
    setServerError(null);
    const result = await crearCliente(values);

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

    reset();
    setFormAbierto(false);
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Empresas que contratan las órdenes de servicio"
        actions={
          selectionMode ? (
            <EliminarClientesButton
              selectedIds={[...selectedIds]}
              onCancelSelection={cancelarSeleccion}
              onError={setAccionError}
            />
          ) : (
            <ClientesAccionesMenu
              onNuevo={abrirAlta}
              onEliminar={iniciarSeleccion}
            />
          )
        }
      />

      <ClientesTabs />

      <div className="relative w-full max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o NIT"
          aria-label="Buscar cliente"
          className="pl-8"
        />
      </div>

      {formAbierto && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2"
          noValidate
        >
          <CamposCliente idPrefix="nuevo" register={register} errors={errors} />

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
              {serverError}
            </p>
          )}

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setServerError(null);
                setFormAbierto(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar cliente"}
            </Button>
          </div>
        </form>
      )}

      <ClientesTable
        clientes={clientesFiltrados}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggle={toggle}
        onToggleAll={toggleAll}
        accionError={accionError}
        editandoId={editandoId}
        onEditar={abrirEdicion}
        onCerrarEdicion={() => setEditandoId(null)}
        mensajeVacio={
          clientes.length === 0
            ? "No hay clientes registrados."
            : "Ningún cliente coincide con la búsqueda."
        }
      />
    </>
  );
}
