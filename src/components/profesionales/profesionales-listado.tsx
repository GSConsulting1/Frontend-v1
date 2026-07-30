// Listado de profesionales + formulario de alta inline (mismo criterio que
// usuarios-table.tsx: sin estado local duplicado de la lista — al llamar a
// una Server Action desde un Client Component, Next.js vuelve a renderizar
// el page.tsx del segmento actual con datos frescos después de
// revalidatePath, así que `profesionales` (prop) ya llega actualizado solo
// con eso; no hace falta useState + sincronizar a mano).

"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search } from "lucide-react";
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
  profesionalSchema,
  type ProfesionalFormValues,
} from "@/lib/validations/profesional.schema";
import { crearProfesional } from "@/app/profesionales/actions";
import type { Profesional } from "@/types";

const COLUMNAS = 4;

type ProfesionalesListadoProps = {
  profesionales: Profesional[];
};

export function ProfesionalesListado({ profesionales }: ProfesionalesListadoProps) {
  const [formAbierto, setFormAbierto] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

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
          <FormField
            label="Nombre completo"
            htmlFor="nombre_completo"
            required
            error={errors.nombre_completo?.message}
          >
            <Input id="nombre_completo" {...register("nombre_completo")} />
          </FormField>
          <FormField label="Cédula" htmlFor="cedula" error={errors.cedula?.message}>
            <Input id="cedula" {...register("cedula")} />
          </FormField>
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" {...register("email")} />
          </FormField>
          <FormField label="Teléfono" htmlFor="telefono" error={errors.telefono?.message}>
            <Input id="telefono" {...register("telefono")} />
          </FormField>

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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Cédula</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead className="text-right">Estado</TableHead>
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

          {profesionalesFiltrados.map((profesional) => (
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
                <Badge variant={profesional.activo ? "secondary" : "outline"}>
                  {profesional.activo ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
