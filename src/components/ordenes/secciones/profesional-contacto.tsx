"use client";

import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

type SelectOption = { id: number; label: string };
type ProfesionalConContacto = SelectOption & {
  cedula: string | null;
  telefono: string | null;
  email: string | null;
};

export type SeccionProfesionalContactoProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  profesionales: ProfesionalConContacto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SeccionProfesionalContacto({
  register,
  control,
  errors,
  watch,
  profesionales,
  open,
  onOpenChange,
}: SeccionProfesionalContactoProps) {
  const profesionalContacto = watch([
    "infoOrdenServicio.profesional_id",
    "infoOrdenServicio.contacto_nombre",
  ]);
  const profesionalId = profesionalContacto[0];
  // Cédula/celular/correo del profesional: de solo lectura acá — son datos
  // de su ficha (se editan en /profesionales), no de esta orden puntual.
  const profesionalSeleccionado =
    profesionalId != null
      ? profesionales.find((p) => p.id === profesionalId)
      : undefined;

  return (
    <SeccionAcordeon
      titulo="Profesional y contacto en sitio"
      resumen="Quién ejecuta la actividad y a quién contactar en la empresa"
      completo={algunoLleno(profesionalContacto)}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Profesional asignado"
          htmlFor="profesional_id"
          className="sm:col-span-2"
        >
          <Controller
            name="infoOrdenServicio.profesional_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value != null ? String(field.value) : null}
                onValueChange={(v: string | null) =>
                  field.onChange(v ? Number(v) : undefined)
                }
                items={profesionales.map((p) => ({
                  label: p.label,
                  value: String(p.id),
                }))}
              >
                <SelectTrigger id="profesional_id" className="w-full">
                  <SelectValue placeholder="Selecciona un profesional" />
                </SelectTrigger>
                <SelectContent>
                  {profesionales.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField label="Cédula del profesional" htmlFor="profesional_cedula">
          <Input
            id="profesional_cedula"
            value={profesionalSeleccionado?.cedula ?? ""}
            placeholder="—"
            disabled
          />
        </FormField>
        <FormField label="Celular del profesional" htmlFor="profesional_telefono">
          <Input
            id="profesional_telefono"
            value={profesionalSeleccionado?.telefono ?? ""}
            placeholder="—"
            disabled
          />
        </FormField>
        <FormField label="Correo del profesional" htmlFor="profesional_email">
          <Input
            id="profesional_email"
            value={profesionalSeleccionado?.email ?? ""}
            placeholder="—"
            disabled
          />
        </FormField>
        <FormField
          label="Nombre del contacto en la empresa"
          htmlFor="contacto_nombre"
          className="sm:col-span-2"
        >
          <Input
            id="contacto_nombre"
            {...register("infoOrdenServicio.contacto_nombre")}
          />
        </FormField>
        <FormField label="Cargo del contacto en la empresa" htmlFor="contacto_cargo">
          <Input
            id="contacto_cargo"
            {...register("infoOrdenServicio.contacto_cargo")}
          />
        </FormField>
        <FormField label="Celular del contacto en la empresa" htmlFor="contacto_celular">
          <Input
            id="contacto_celular"
            {...register("infoOrdenServicio.contacto_celular")}
          />
        </FormField>
        <FormField
          label="Email del contacto en la empresa"
          htmlFor="contacto_email"
          error={errors.infoOrdenServicio?.contacto_email?.message}
        >
          <Input
            id="contacto_email"
            type="email"
            {...register("infoOrdenServicio.contacto_email")}
          />
        </FormField>
      </div>
    </SeccionAcordeon>
  );
}
