// Listado de profesionales + alta/edición/activo-inactivo — mismo criterio
// que usuarios-table.tsx: sin estado local duplicado de la lista (al llamar
// a una Server Action desde un Client Component, Next.js vuelve a
// renderizar el page.tsx del segmento actual con datos frescos después de
// revalidatePath, así que `profesionales` (prop) ya llega actualizado solo
// con eso; no hace falta useState + sincronizar a mano).
//
// "Editar" abre una fila de formulario debajo de la fila (mismos campos que
// "Agregar profesional", ver CamposProfesional) en vez de edición celda por
// celda como ordenes-table.tsx: acá las 4 columnas se editan siempre juntas,
// no tiene sentido el patrón de click-to-edit por campo suelto.
//
// A propósito sin "Eliminar": un profesional puede tener órdenes asociadas
// (info_orden_servicio, detalle_entrega_profesional) por FK, así que borrar
// rompería ese historial — ver lib/data/profesionales.ts. "Marcar inactivo"
// es la única baja, reversible y sin ese riesgo.

"use client";

import { useMemo, useState } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Pencil, Plus, Power, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  profesionalSchema,
  type ProfesionalFormValues,
} from "@/lib/validations/profesional.schema";
import {
  crearProfesional,
  actualizarProfesional,
  actualizarActivoProfesional,
} from "@/app/profesionales/actions";
import type { Profesional } from "@/types";

const COLUMNAS = 6;

const formatoValorHora = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

// Los 4 campos del alta se reusan tal cual para la edición — mismo schema,
// solo cambia qué Server Action se llama al enviar (ver ProfesionalesListado
// y EditarProfesionalRow).
function CamposProfesional({
  idPrefix,
  register,
  errors,
}: {
  idPrefix: string;
  register: UseFormRegister<ProfesionalFormValues>;
  errors: FieldErrors<ProfesionalFormValues>;
}) {
  return (
    <>
      <FormField
        label="Nombre completo"
        htmlFor={`${idPrefix}-nombre_completo`}
        required
        error={errors.nombre_completo?.message}
      >
        <Input id={`${idPrefix}-nombre_completo`} {...register("nombre_completo")} />
      </FormField>
      <FormField
        label="Cédula"
        htmlFor={`${idPrefix}-cedula`}
        error={errors.cedula?.message}
      >
        <Input id={`${idPrefix}-cedula`} {...register("cedula")} />
      </FormField>
      <FormField label="Email" htmlFor={`${idPrefix}-email`} error={errors.email?.message}>
        <Input id={`${idPrefix}-email`} type="email" {...register("email")} />
      </FormField>
      <FormField
        label="Teléfono"
        htmlFor={`${idPrefix}-telefono`}
        error={errors.telefono?.message}
      >
        <Input id={`${idPrefix}-telefono`} {...register("telefono")} />
      </FormField>
      <FormField
        label="Valor hora"
        htmlFor={`${idPrefix}-valor_hora`}
        error={errors.valor_hora?.message}
      >
        <Input
          id={`${idPrefix}-valor_hora`}
          type="number"
          step="0.01"
          min="0"
          {...register("valor_hora", {
            setValueAs: (v) => (v === "" || v === undefined ? undefined : Number(v)),
          })}
        />
      </FormField>
    </>
  );
}

type ProfesionalesListadoProps = {
  profesionales: Profesional[];
};

export function ProfesionalesListado({ profesionales }: ProfesionalesListadoProps) {
  const [formAbierto, setFormAbierto] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [accionError, setAccionError] = useState<string | null>(null);

  // Filtro en memoria, sin ida y vuelta al servidor: la lista de
  // profesionales no está paginada, así que alcanza con filtrar el array ya
  // cargado (mismo criterio que otros listados chicos del proyecto).
  const profesionalesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return profesionales;
    return profesionales.filter((p) =>
      [p.nombre_completo, p.cedula, p.email, p.telefono]
        .filter(Boolean)
        .some((campo) => campo!.toLowerCase().includes(termino)),
    );
  }, [profesionales, busqueda]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfesionalFormValues>({
    resolver: zodResolver(profesionalSchema),
  });

  async function onSubmit(values: ProfesionalFormValues) {
    setServerError(null);
    const result = await crearProfesional(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof ProfesionalFormValues, {
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

  async function toggleActivo(profesional: Profesional) {
    setAccionError(null);
    setTogglingIds((prev) => new Set(prev).add(profesional.id));
    const result = await actualizarActivoProfesional(
      profesional.id,
      !profesional.activo,
    );
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(profesional.id);
      return next;
    });
    if (!result.ok) setAccionError(result.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, cédula, email o teléfono"
            aria-label="Buscar profesional"
            className="pl-8"
          />
        </div>
        <Button
          type="button"
          variant={formAbierto ? "outline" : "default"}
          onClick={() => {
            setServerError(null);
            setEditandoId(null);
            setFormAbierto((v) => !v);
          }}
        >
          <Plus className="size-4" aria-hidden />
          {formAbierto ? "Cancelar" : "Agregar profesional"}
        </Button>
      </div>

      {formAbierto && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2"
          noValidate
        >
          <CamposProfesional idPrefix="nuevo" register={register} errors={errors} />

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
              {serverError}
            </p>
          )}

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar profesional"}
            </Button>
          </div>
        </form>
      )}

      {accionError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {accionError}
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Cédula</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead className="text-right">Valor hora</TableHead>
            <TableHead className="text-right">Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profesionalesFiltrados.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={COLUMNAS}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {profesionales.length === 0
                  ? "No hay profesionales registrados."
                  : "Ningún profesional coincide con la búsqueda."}
              </TableCell>
            </TableRow>
          )}

          {profesionalesFiltrados.map((profesional) =>
            editandoId === profesional.id ? (
              <EditarProfesionalRow
                key={profesional.id}
                profesional={profesional}
                onCancelar={() => setEditandoId(null)}
                onGuardado={() => setEditandoId(null)}
              />
            ) : (
              <TableRow key={profesional.id}>
                <TableCell className="font-medium">
                  {profesional.nombre_completo}
                </TableCell>
                <TableCell>{profesional.cedula ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    <span>{profesional.email ?? "—"}</span>
                    <span className="text-muted-foreground">
                      {profesional.telefono ?? "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {profesional.valor_hora != null
                    ? formatoValorHora.format(profesional.valor_hora)
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={profesional.activo ? "secondary" : "outline"}>
                    {profesional.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Acciones de ${profesional.nombre_completo}`}
                          disabled={togglingIds.has(profesional.id)}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setFormAbierto(false);
                          setEditandoId(profesional.id);
                        }}
                      >
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActivo(profesional)}>
                        <Power className="size-4" />
                        {profesional.activo ? "Marcar inactivo" : "Marcar activo"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ),
          )}
        </TableBody>
      </Table>
    </div>
  );
}

type EditarProfesionalRowProps = {
  profesional: Profesional;
  onCancelar: () => void;
  onGuardado: () => void;
};

function EditarProfesionalRow({
  profesional,
  onCancelar,
  onGuardado,
}: EditarProfesionalRowProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfesionalFormValues>({
    resolver: zodResolver(profesionalSchema),
    defaultValues: {
      nombre_completo: profesional.nombre_completo,
      cedula: profesional.cedula ?? "",
      email: profesional.email ?? "",
      telefono: profesional.telefono ?? "",
      valor_hora: profesional.valor_hora ?? undefined,
    },
  });

  async function onSubmit(values: ProfesionalFormValues) {
    setServerError(null);
    const result = await actualizarProfesional(profesional.id, values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof ProfesionalFormValues, {
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
      <TableCell colSpan={COLUMNAS} className="bg-muted/30">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 py-2 sm:grid-cols-2"
          noValidate
        >
          <CamposProfesional
            idPrefix={`editar-${profesional.id}`}
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
