"use client";

import {
  Controller,
  type Control,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Checkbox } from "@/components/forms/checkbox";
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
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

type SelectOption = { id: number; label: string };

export type SeccionDetalleEntregaProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  profesionales: SelectOption[];
};

export function SeccionDetalleEntrega({
  register,
  control,
  watch,
  profesionales,
}: SeccionDetalleEntregaProps) {
  const detalleEntrega = watch([
    "detalleEntrega.entregables_especificos",
    "detalleEntrega.fecha_cierre_orden",
    "detalleEntrega.profesional_vobo_id",
  ]);

  return (
    <SeccionAcordeon
      titulo="Detalle de entrega"
      resumen="Cierre de la orden y visto bueno del profesional"
      completo={algunoLleno(detalleEntrega)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Entregables específicos"
          htmlFor="entregables_especificos"
          className="sm:col-span-2"
        >
          <Textarea
            id="entregables_especificos"
            {...register("detalleEntrega.entregables_especificos")}
          />
        </FormField>
        <FormField
          label="Fecha de cierre de la orden"
          htmlFor="fecha_cierre_orden"
        >
          <Input
            id="fecha_cierre_orden"
            type="date"
            {...register("detalleEntrega.fecha_cierre_orden")}
          />
        </FormField>
        <FormField label="Profesional que da VoBo" htmlFor="profesional_vobo_id">
          <Controller
            name="detalleEntrega.profesional_vobo_id"
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
                <SelectTrigger id="profesional_vobo_id" className="w-full">
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
        <FormField
          label="Comentarios sobre valor acordado"
          htmlFor="comentarios_valor_acordado"
          className="sm:col-span-2"
        >
          <Textarea
            id="comentarios_valor_acordado"
            {...register("detalleEntrega.comentarios_valor_acordado")}
          />
        </FormField>
        <Checkbox
          label="Envío OS al profesional"
          {...register("detalleEntrega.envio_os_profesional")}
        />
        <Checkbox
          label="Recepción de la orden de servicio"
          {...register("detalleEntrega.recepcion_orden_servicio")}
        />
        <FormField
          label="Participante ARL"
          htmlFor="participante_arl_id"
          className="sm:col-span-2"
        >
          <Controller
            name="detalleEntrega.participante_arl_id"
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
                <SelectTrigger id="participante_arl_id" className="w-full">
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
      </div>
    </SeccionAcordeon>
  );
}
