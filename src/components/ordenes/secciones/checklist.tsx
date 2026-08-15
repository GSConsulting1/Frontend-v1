"use client";

import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Checkbox } from "@/components/forms/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { INFORME_GUARDIAN_OPCIONES } from "@/lib/validations/info-orden.schema";
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

type SelectOption = { id: number; label: string };

export type SeccionChecklistProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  estadosEjecucion: SelectOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SeccionChecklist({
  register,
  control,
  errors,
  watch,
  estadosEjecucion,
  open,
  onOpenChange,
}: SeccionChecklistProps) {
  const checklist = watch([
    "checklist.estado_ejecucion_id",
    "checklist.informe_guardian",
  ]);

  return (
    <SeccionAcordeon
      titulo="Checklist del proceso"
      resumen="Seguimiento de entregas y visto bueno final"
      completo={algunoLleno(checklist)}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Checkbox label="Envío AT031" {...register("checklist.envio_at031")} />
        <Checkbox label="Envío AT028" {...register("checklist.envio_at028")} />
        <Checkbox label="Formatos" {...register("checklist.formatos")} />
        <FormField
          label="Estado de ejecución"
          htmlFor="estado_ejecucion_id"
          required
          error={errors.checklist?.estado_ejecucion_id?.message}
        >
          <Controller
            name="checklist.estado_ejecucion_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value != null ? String(field.value) : null}
                onValueChange={(v: string | null) =>
                  field.onChange(v ? Number(v) : undefined)
                }
                items={estadosEjecucion.map((e) => ({
                  label: e.label,
                  value: String(e.id),
                }))}
              >
                <SelectTrigger id="estado_ejecucion_id" className="w-full">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {estadosEjecucion.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField
          label="Fecha máxima de ejecución"
          htmlFor="fecha_maxima_ejecucion"
        >
          <Input
            id="fecha_maxima_ejecucion"
            type="date"
            {...register("checklist.fecha_maxima_ejecucion")}
          />
        </FormField>
        <Checkbox
          label="Entrega soportes profesional"
          {...register("checklist.entrega_soportes_profesional")}
        />
        <Checkbox
          label="Entrega soportes cliente"
          {...register("checklist.entrega_soportes_cliente")}
        />
        <FormField
          label="Fecha máxima entrega soportes"
          htmlFor="fecha_maxima_entrega_soportes"
        >
          <Input
            id="fecha_maxima_entrega_soportes"
            type="date"
            {...register("checklist.fecha_maxima_entrega_soportes")}
          />
        </FormField>
        <FormField
          label="VoBo emitido"
          htmlFor="vobo_emitido"
          required
          error={errors.checklist?.vobo_emitido?.message}
        >
          <Controller
            name="checklist.vobo_emitido"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? "true" : "false"}
                onValueChange={(v: string | null) => field.onChange(v === "true")}
                items={[
                  { label: "Sí", value: "true" },
                  { label: "No", value: "false" },
                ]}
              >
                <SelectTrigger id="vobo_emitido" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sí</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <Checkbox
          label="Cumplió la entrega en la fecha pactada"
          {...register("checklist.cumplio_entrega_fecha")}
        />
        <FormField
          label="Informe Guardián"
          htmlFor="informe_guardian"
          className="sm:col-span-2"
        >
          <Controller
            name="checklist.informe_guardian"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? null}
                onValueChange={(v: string | null) =>
                  field.onChange(
                    v as (typeof INFORME_GUARDIAN_OPCIONES)[number] | undefined,
                  )
                }
                items={INFORME_GUARDIAN_OPCIONES.map((o) => ({
                  label: o,
                  value: o,
                }))}
              >
                <SelectTrigger id="informe_guardian" className="w-full">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {INFORME_GUARDIAN_OPCIONES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>
    </SeccionAcordeon>
  );
}
