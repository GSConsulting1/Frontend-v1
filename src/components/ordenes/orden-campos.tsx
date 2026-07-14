// Campos compartidos entre el formulario de página completa (OrdenForm) y los
// dos editores inline (OrdenRowEditor para filas existentes, OrdenDraftRowEditor
// para una fila nueva) — todo lo editable de una orden, cliente incluido.

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
import type { OrdenServicioFormValues } from "@/lib/validations/orden.schema";

type SelectOption = { id: number; label: string };

export type OrdenCamposProps = {
  register: UseFormRegister<OrdenServicioFormValues>;
  control: Control<OrdenServicioFormValues>;
  errors: FieldErrors<OrdenServicioFormValues>;
  clientes: SelectOption[];
  estados: SelectOption[];
  profesionales: SelectOption[];
};

export function OrdenCampos({
  register,
  control,
  errors,
  clientes,
  estados,
  profesionales,
}: OrdenCamposProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
        htmlFor="estado_id"
        error={errors.estado_id?.message}
      >
        <Controller
          name="estado_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value != null ? String(field.value) : null}
              onValueChange={(v: string | null) =>
                field.onChange(v ? Number(v) : undefined)
              }
              items={estados.map((e) => ({
                label: e.label,
                value: String(e.id),
              }))}
            >
              <SelectTrigger id="estado_id" className="w-full">
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                {estados.map((e) => (
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
        label="Servicio"
        htmlFor="nombre_servicio"
        required
        error={errors.nombre_servicio?.message}
      >
        <Input id="nombre_servicio" {...register("nombre_servicio")} />
      </FormField>

      <FormField label="Tipo de servicio" htmlFor="tipo_servicio">
        <Input id="tipo_servicio" {...register("tipo_servicio")} />
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

      <FormField label="Cronograma" htmlFor="cronograma">
        <Input id="cronograma" type="date" {...register("cronograma")} />
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
          type="number"
          step="0.01"
          min="0"
          {...register("tarifa_valor_transporte", {
            setValueAs: (v) =>
              v === "" || v === undefined ? undefined : Number(v),
          })}
        />
      </FormField>

      <FormField
        label="Asesor gestión de riesgos"
        htmlFor="asesor_gestion_riesgos_id"
      >
        <Controller
          name="asesor_gestion_riesgos_id"
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
              <SelectTrigger id="asesor_gestion_riesgos_id" className="w-full">
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

      <FormField label="Responsable OS/SEC" htmlFor="responsable_sec_id">
        <Controller
          name="responsable_sec_id"
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
              <SelectTrigger id="responsable_sec_id" className="w-full">
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
    </div>
  );
}
