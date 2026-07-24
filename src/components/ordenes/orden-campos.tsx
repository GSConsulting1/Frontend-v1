// "Datos generales": todo lo editable de ordenes_servicio, cliente incluido.
// Único consumidor: OrdenForm (formulario de página completa).

"use client";

import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
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
import { cn } from "@/lib/utils";
import {
  ESTADO_ORDEN_OPCIONES,
  RESPONSABLE_OS_OPCIONES,
  TIPO_SERVICIO_OPCIONES,
  type OrdenServicioFormValues,
} from "@/lib/validations/orden.schema";

type SelectOption = { id: number; label: string };

export type OrdenCamposProps = {
  register: UseFormRegister<OrdenServicioFormValues>;
  control: Control<OrdenServicioFormValues>;
  errors: FieldErrors<OrdenServicioFormValues>;
  clientes: SelectOption[];
  // Solo administrador puede editar Datos generales (ver structure.md,
  // supabase/004_ordenes_servicio_rls.sql) — cualquier otro rol la ve pero
  // no puede tocarla.
  disabled: boolean;
};

export function OrdenCampos({
  register,
  control,
  errors,
  clientes,
  disabled,
}: OrdenCamposProps) {
  return (
    <fieldset
      disabled={disabled}
      className={cn("grid gap-4 sm:grid-cols-2", disabled && "pointer-events-none opacity-50")}
    >
      <FormField
        label="Cliente"
        htmlFor="cliente_id"
        required
        error={errors.cliente_id ? "Selecciona un cliente" : undefined}
      >
        <Controller
          name="cliente_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value != null ? String(field.value) : null}
              onValueChange={(v: string | null) =>
                field.onChange(v ? Number(v) : undefined)
              }
              items={clientes.map((c) => ({
                label: c.label,
                value: String(c.id),
              }))}
            >
              <SelectTrigger id="cliente_id" className="w-full">
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField
        label="Estado"
        htmlFor="estado"
        error={errors.estado?.message}
      >
        <Controller
          name="estado"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? null}
              onValueChange={(v: string | null) =>
                field.onChange(
                  v as (typeof ESTADO_ORDEN_OPCIONES)[number] | undefined,
                )
              }
              items={ESTADO_ORDEN_OPCIONES.map((o) => ({ label: o, value: o }))}
            >
              <SelectTrigger id="estado" className="w-full">
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADO_ORDEN_OPCIONES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField
        label="Servicio"
        htmlFor="nombre_servicio"
        required
        error={errors.nombre_servicio?.message}
      >
        <Input id="nombre_servicio" {...register("nombre_servicio")} />
      </FormField>

      <FormField label="Tipo de servicio" htmlFor="tipo_servicio">
        <Controller
          name="tipo_servicio"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? null}
              onValueChange={(v: string | null) =>
                field.onChange(
                  v as (typeof TIPO_SERVICIO_OPCIONES)[number] | undefined,
                )
              }
              items={TIPO_SERVICIO_OPCIONES.map((o) => ({ label: o, value: o }))}
            >
              <SelectTrigger id="tipo_servicio" className="w-full">
                <SelectValue placeholder="Selecciona un tipo de servicio" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_SERVICIO_OPCIONES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField label="Número OS del cliente" htmlFor="numero_os_cliente">
        <Input id="numero_os_cliente" {...register("numero_os_cliente")} />
      </FormField>

      <FormField
        label="Horas cargadas"
        htmlFor="horas_cargadas"
        error={errors.horas_cargadas?.message}
      >
        <Input
          id="horas_cargadas"
          type="number"
          step="0.5"
          min="0"
          {...register("horas_cargadas", {
            setValueAs: (v) =>
              v === "" || v === undefined ? undefined : Number(v),
          })}
        />
      </FormField>

      <FormField label="Fecha recepción OS" htmlFor="fecha_recepcion_os">
        <Input
          id="fecha_recepcion_os"
          type="date"
          {...register("fecha_recepcion_os")}
        />
      </FormField>

      <FormField label="Fecha SIPAB" htmlFor="fecha_sipab">
        <Input id="fecha_sipab" type="date" {...register("fecha_sipab")} />
      </FormField>

      <FormField
        label="Cronograma"
        htmlFor="cronograma"
        error={errors.cronograma?.message}
      >
        <Input
          id="cronograma"
          type="number"
          step="1"
          {...register("cronograma", {
            setValueAs: (v) =>
              v === "" || v === undefined ? undefined : Number(v),
          })}
        />
      </FormField>

      <FormField label="Secuencia" htmlFor="secuencia">
        <Input id="secuencia" {...register("secuencia")} />
      </FormField>

      <FormField label="Empresa usuaria" htmlFor="nombre_empresa_usuaria">
        <Input
          id="nombre_empresa_usuaria"
          {...register("nombre_empresa_usuaria")}
        />
      </FormField>

      <FormField label="NIT empresa usuaria" htmlFor="nit_empresa_usuaria">
        <Input id="nit_empresa_usuaria" {...register("nit_empresa_usuaria")} />
      </FormField>

      <FormField
        label="Tarifa / valor transporte"
        htmlFor="tarifa_valor_transporte"
        error={errors.tarifa_valor_transporte?.message}
      >
        <Input
          id="tarifa_valor_transporte"
          {...register("tarifa_valor_transporte")}
        />
      </FormField>

      <FormField
        label="Asesor gestión de riesgos"
        htmlFor="asesor_gestion_riesgos"
      >
        <Input
          id="asesor_gestion_riesgos"
          {...register("asesor_gestion_riesgos")}
        />
      </FormField>

      <FormField label="Responsable OS/SEC" htmlFor="responsable_os">
        <Controller
          name="responsable_os"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? null}
              onValueChange={(v: string | null) =>
                field.onChange(
                  v as (typeof RESPONSABLE_OS_OPCIONES)[number] | undefined,
                )
              }
              items={RESPONSABLE_OS_OPCIONES.map((o) => ({ label: o, value: o }))}
            >
              <SelectTrigger id="responsable_os" className="w-full">
                <SelectValue placeholder="Selecciona un responsable" />
              </SelectTrigger>
              <SelectContent>
                {RESPONSABLE_OS_OPCIONES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <div className="sm:col-span-2">
        <FormField
          label="Link del archivo de la orden"
          htmlFor="link_archivo_orden"
          error={errors.link_archivo_orden?.message}
        >
          <Input
            id="link_archivo_orden"
            type="url"
            placeholder="https://drive.google.com/..."
            {...register("link_archivo_orden")}
          />
        </FormField>
      </div>

      <div className="sm:col-span-2">
        <FormField
          label="Observaciones iniciales"
          htmlFor="observaciones_iniciales"
        >
          <Textarea
            id="observaciones_iniciales"
            {...register("observaciones_iniciales")}
          />
        </FormField>
      </div>
    </fieldset>
  );
}
