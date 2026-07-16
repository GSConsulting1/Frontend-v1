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

export type SeccionProfesionalContactoProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  profesionales: SelectOption[];
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
        <FormField label="Nombre del contacto" htmlFor="contacto_nombre">
          <Input
            id="contacto_nombre"
            {...register("infoOrdenServicio.contacto_nombre")}
          />
        </FormField>
        <FormField label="Cargo" htmlFor="contacto_cargo">
          <Input
            id="contacto_cargo"
            {...register("infoOrdenServicio.contacto_cargo")}
          />
        </FormField>
        <FormField label="Celular" htmlFor="contacto_celular">
          <Input
            id="contacto_celular"
            {...register("infoOrdenServicio.contacto_celular")}
          />
        </FormField>
        <FormField
          label="Email"
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
