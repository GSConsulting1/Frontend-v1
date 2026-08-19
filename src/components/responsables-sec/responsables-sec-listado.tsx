// Envoltorio de cliente de la pestaña "Responsables SEC". Existe por el mismo
// motivo que vobo-listado.tsx: la acción en lote del header ("Eliminar
// responsables", disparada desde el menú "⋮") necesita compartir con la tabla el
// Set de IDs seleccionados, así que ese estado se sube acá (lifting state up).
// page.tsx sigue siendo Server Component (hace el fetch) y solo renderiza este
// componente.
//
// También gobierna qué formulario está abierto —el de alta (formAbierto) o la
// fila en edición (editandoId)— porque son mutuamente excluyentes: los tres
// modos (alta, edición, selección) se apagan entre sí, si no la pantalla queda
// mostrando dos formularios y una columna de checkboxes a la vez.
//
// Sin useState duplicando la lista: al llamar a una Server Action desde un
// Client Component, Next.js vuelve a renderizar el page.tsx del segmento con
// datos frescos después del revalidatePath, así que `personas` (prop) ya llega
// actualizado.

"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfesionalesTabs } from "@/components/profesionales/profesionales-tabs";
import { CamposResponsableSec } from "@/components/responsables-sec/campos-responsable-sec";
import { ResponsablesSecTable } from "@/components/responsables-sec/responsables-sec-table";
import { ResponsablesSecAccionesMenu } from "@/components/responsables-sec/responsables-sec-acciones-menu";
import { EliminarResponsablesSecButton } from "@/components/responsables-sec/eliminar-responsables-sec-button";
import { crearResponsableSec } from "@/app/profesionales/responsables-sec/actions";
import {
  responsableSecSchema,
  type ResponsableSecFormValues,
} from "@/lib/validations/responsable-sec.schema";
import type { ResponsableSecConConteo } from "@/types";

type ResponsablesSecListadoProps = {
  personas: ResponsableSecConConteo[];
};

export function ResponsablesSecListado({
  personas,
}: ResponsablesSecListadoProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [accionError, setAccionError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // Filtro en memoria, sin ida y vuelta al servidor: la lista no está paginada
  // (es el equipo interno, son unas pocas personas), así que alcanza con
  // filtrar el array ya cargado — mismo criterio que vobo-listado.tsx.
  const personasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return personas;
    return personas.filter((p) =>
      [p.email, p.nombre_completo, p.celular]
        .filter(Boolean)
        .some((campo) => campo!.toLowerCase().includes(termino)),
    );
  }, [personas, busqueda]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResponsableSecFormValues>({
    resolver: zodResolver(responsableSecSchema),
  });

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Sobre la lista FILTRADA, no sobre `personas`: "seleccionar todo" tiene que
  // marcar lo que se está viendo, no filas escondidas por la búsqueda.
  function toggleAll() {
    setSelectedIds((prev) =>
      personasFiltradas.every((p) => prev.has(p.id))
        ? new Set()
        : new Set(personasFiltradas.map((p) => p.id)),
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

  async function onSubmit(values: ResponsableSecFormValues) {
    setServerError(null);
    const result = await crearResponsableSec(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof ResponsableSecFormValues, {
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
        title="Profesionales"
        description="Personal de GS Group que responde por las órdenes de servicio"
        actions={
          selectionMode ? (
            <EliminarResponsablesSecButton
              selectedIds={[...selectedIds]}
              onCancelSelection={cancelarSeleccion}
              onError={setAccionError}
            />
          ) : (
            <ResponsablesSecAccionesMenu
              onNuevo={abrirAlta}
              onEliminar={iniciarSeleccion}
            />
          )
        }
      />

      <ProfesionalesTabs />

      <div className="relative w-full max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por email, nombre o celular"
          aria-label="Buscar responsable SEC"
          className="pl-8"
        />
      </div>

      {formAbierto && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2"
          noValidate
        >
          <CamposResponsableSec
            idPrefix="nuevo"
            register={register}
            errors={errors}
          />

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
              {isSubmitting ? "Guardando…" : "Guardar responsable"}
            </Button>
          </div>
        </form>
      )}

      <ResponsablesSecTable
        personas={personasFiltradas}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggle={toggle}
        onToggleAll={toggleAll}
        accionError={accionError}
        editandoId={editandoId}
        onEditar={abrirEdicion}
        onCerrarEdicion={() => setEditandoId(null)}
        mensajeVacio={
          personas.length === 0
            ? "No hay responsables SEC registrados."
            : "Ningún responsable coincide con la búsqueda."
        }
      />
    </>
  );
}
