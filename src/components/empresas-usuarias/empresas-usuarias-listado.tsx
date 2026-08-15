// Envoltorio de cliente de la pestaña "Empresas usuarias" — mismo rol y misma
// forma que components/clientes/clientes-listado.tsx: sube el estado de
// selección (para el borrado en lote del header) y decide qué formulario está
// abierto, porque alta, edición y selección se apagan entre sí.
//
// Monta <ClientesTabs /> debajo de su PageHeader, igual que ClientesListado —
// ver el comentario de clientes-tabs.tsx sobre por qué no hay layout.tsx.

"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientesTabs } from "@/components/clientes/clientes-tabs";
import { CamposEmpresaUsuaria } from "@/components/empresas-usuarias/campos-empresa-usuaria";
import { EmpresasUsuariasTable } from "@/components/empresas-usuarias/empresas-usuarias-table";
import { EmpresasUsuariasAccionesMenu } from "@/components/empresas-usuarias/empresas-usuarias-acciones-menu";
import { EliminarEmpresasUsuariasButton } from "@/components/empresas-usuarias/eliminar-empresas-usuarias-button";
import { crearEmpresaUsuaria } from "@/app/clientes/empresas-usuarias/actions";
import {
  empresaUsuariaSchema,
  type EmpresaUsuariaFormValues,
} from "@/lib/validations/empresa-usuaria.schema";
import type { EmpresaUsuariaConConteo } from "@/types";

type EmpresasUsuariasListadoProps = {
  empresas: EmpresaUsuariaConConteo[];
};

export function EmpresasUsuariasListado({
  empresas,
}: EmpresasUsuariasListadoProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [accionError, setAccionError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const empresasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return empresas;
    return empresas.filter((e) =>
      [e.nombre, e.nit]
        .filter(Boolean)
        .some((campo) => campo!.toLowerCase().includes(termino)),
    );
  }, [empresas, busqueda]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmpresaUsuariaFormValues>({
    resolver: zodResolver(empresaUsuariaSchema),
  });

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Sobre la lista FILTRADA: "seleccionar todo" marca lo que se está viendo.
  function toggleAll() {
    setSelectedIds((prev) =>
      empresasFiltradas.every((e) => prev.has(e.id))
        ? new Set()
        : new Set(empresasFiltradas.map((e) => e.id)),
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

  async function onSubmit(values: EmpresaUsuariaFormValues) {
    setServerError(null);
    const result = await crearEmpresaUsuaria(values);

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

    reset();
    setFormAbierto(false);
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Empresas donde se ejecuta el servicio, referenciadas por las órdenes"
        actions={
          selectionMode ? (
            <EliminarEmpresasUsuariasButton
              selectedIds={[...selectedIds]}
              onCancelSelection={cancelarSeleccion}
              onError={setAccionError}
            />
          ) : (
            <EmpresasUsuariasAccionesMenu
              onNueva={abrirAlta}
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
          aria-label="Buscar empresa usuaria"
          className="pl-8"
        />
      </div>

      {formAbierto && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2"
          noValidate
        >
          <CamposEmpresaUsuaria
            idPrefix="nueva"
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
              {isSubmitting ? "Guardando…" : "Guardar empresa"}
            </Button>
          </div>
        </form>
      )}

      <EmpresasUsuariasTable
        empresas={empresasFiltradas}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggle={toggle}
        onToggleAll={toggleAll}
        accionError={accionError}
        editandoId={editandoId}
        onEditar={abrirEdicion}
        onCerrarEdicion={() => setEditandoId(null)}
        mensajeVacio={
          empresas.length === 0
            ? "No hay empresas usuarias registradas."
            : "Ninguna empresa coincide con la búsqueda."
        }
      />
    </>
  );
}
