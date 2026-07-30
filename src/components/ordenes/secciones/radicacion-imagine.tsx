"use client";

import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

export type SeccionRadicacionImagineProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  puedeVerFinanciera: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// "Radicación Imagine" vive en su propia tabla (radicacion_imagine), gateada
// por rol administrador o financiero — mismo criterio que valor-hora.tsx.
// Admite hasta 2 radicaciones (novedades del cliente pueden forzar una
// segunda) — de ahí los campos _1/_2. Si el rol no puede verla, la sección
// ni se renderiza.
export function SeccionRadicacionImagine({
  register,
  watch,
  puedeVerFinanciera,
  open,
  onOpenChange,
}: SeccionRadicacionImagineProps) {
  const radicacionImagine = watch([
    "radicacionImagine.numero_radicado_1",
    "radicacionImagine.estado_imagine",
  ]);

  if (!puedeVerFinanciera) return null;

  return (
    <SeccionAcordeon
      titulo="Radicación Imagine"
      resumen="Radicaciones, novedades y estado en Imagine"
      completo={algunoLleno(radicacionImagine)}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Número de radicado 1" htmlFor="numero_radicado_1">
          <Input
            id="numero_radicado_1"
            {...register("radicacionImagine.numero_radicado_1")}
          />
        </FormField>
        <FormField label="Fecha de radicación 1" htmlFor="fecha_radicacion_1">
          <Input
            id="fecha_radicacion_1"
            type="date"
            {...register("radicacionImagine.fecha_radicacion_1")}
          />
        </FormField>
        <FormField
          label="Novedades 1"
          htmlFor="novedades_1"
          className="sm:col-span-2"
        >
          <Textarea
            id="novedades_1"
            {...register("radicacionImagine.novedades_1")}
          />
        </FormField>
        <FormField label="Número de radicado 2" htmlFor="numero_radicado_2">
          <Input
            id="numero_radicado_2"
            {...register("radicacionImagine.numero_radicado_2")}
          />
        </FormField>
        <FormField label="Fecha de radicación 2" htmlFor="fecha_radicacion_2">
          <Input
            id="fecha_radicacion_2"
            type="date"
            {...register("radicacionImagine.fecha_radicacion_2")}
          />
        </FormField>
        <FormField
          label="Novedades 2"
          htmlFor="novedades_2"
          className="sm:col-span-2"
        >
          <Textarea
            id="novedades_2"
            {...register("radicacionImagine.novedades_2")}
          />
        </FormField>
        <FormField label="Estado en Imagine" htmlFor="estado_imagine">
          <Input
            id="estado_imagine"
            {...register("radicacionImagine.estado_imagine")}
          />
        </FormField>
        <FormField label="Actualización SIPAB" htmlFor="actualizacion_sipab">
          <Input
            id="actualizacion_sipab"
            type="date"
            {...register("radicacionImagine.actualizacion_sipab")}
          />
        </FormField>
      </div>
    </SeccionAcordeon>
  );
}
