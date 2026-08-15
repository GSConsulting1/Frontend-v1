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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { ESTADO_IMAGINE_OPCIONES } from "@/lib/validations/info-orden.schema";
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
  control,
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
          <Controller
            name="radicacionImagine.estado_imagine"
            control={control}
            // Fallback para mode="nueva" (sin defaultValues aún, ver
            // orden-form.tsx): mismo motivo que el defaultValue de
            // estado_ejecucion_id en checklist.tsx. En mode="existente" no
            // pisa nada porque editar/page.tsx ya manda un valor explícito
            // en defaultValues, que RHF prioriza sobre este.
            defaultValue="Pendiente de radicar"
            render={({ field }) => (
              <Select
                value={field.value ?? null}
                onValueChange={(v: string | null) =>
                  field.onChange(
                    v as (typeof ESTADO_IMAGINE_OPCIONES)[number] | undefined,
                  )
                }
                items={ESTADO_IMAGINE_OPCIONES.map((o) => ({
                  label: o,
                  value: o,
                }))}
              >
                <SelectTrigger id="estado_imagine" className="w-full">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADO_IMAGINE_OPCIONES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
