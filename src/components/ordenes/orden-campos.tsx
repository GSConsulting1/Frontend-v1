// "Datos generales": todo lo editable de ordenes_servicio, cliente incluido.
// Único consumidor: OrdenForm (formulario de página completa).
//
// El orden de los campos NO es libre: sigue el orden en que quien carga la
// orden lee el documento del cliente (datos del cliente -> cronograma ->
// servicio -> responsables) y fue definido por negocio. Los dos últimos
// campos (Estado y Link del archivo de la orden) quedan al final a
// propósito: no vienen del documento del cliente, son de gestión interna.
// Si hay que mover un campo, moverlo acá; los labels también son los
// acordados con negocio, no descripciones libres.

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
import {
  ESTADOS_ORDEN,
  RESPONSABLES_OS,
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
  // supabase/migrations/20260802085134_baseline_esquema_remoto.sql) — cualquier otro rol la ve pero
  // no puede tocarla.
  disabled: boolean;
  // Excepción puntual del rol programador: llega con disabled=true (no edita
  // la sección) pero sí puede escribir en "Observaciones del responsable SEC
  // para GS". Es el único campo donde este flag se combina con `disabled`.
  // Si aparece una segunda excepción así, conviene reemplazar estos dos
  // booleanos por una matriz de permisos por campo — ver el plan en
  // PLAN-permisos-por-rol.md.
  puedeEditarObservacionesSec: boolean;
};

export function OrdenCampos({
  register,
  control,
  errors,
  clientes,
  disabled,
  puedeEditarObservacionesSec,
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
          render={({ field }) =>
            disabled ? (
              <Input
                id="cliente_id"
                readOnly
                value={
                  clientes.find((c) => c.id === field.value)?.label ?? ""
                }
              />
            ) : (
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
            )
          }
        />
      </FormField>

      <FormField
        label="Número de OS del cliente"
        htmlFor="numero_os_cliente"
      >
        <Input
          id="numero_os_cliente"
          readOnly={disabled}
          {...register("numero_os_cliente")}
        />
      </FormField>

      <FormField
        label="Fecha de recepción OS del cliente"
        htmlFor="fecha_recepcion_os"
      >
        <Input
          id="fecha_recepcion_os"
          type="date"
          readOnly={disabled}
          {...register("fecha_recepcion_os")}
        />
      </FormField>

      <FormField
        label="Nombre Empresa usuaria del cliente"
        htmlFor="nombre_empresa_usuaria"
      >
        <Input
          id="nombre_empresa_usuaria"
          readOnly={disabled}
          {...register("nombre_empresa_usuaria")}
        />
      </FormField>

      <FormField
        label="Nit Empresa usuaria del cliente"
        htmlFor="nit_empresa_usuaria"
      >
        <Input
          id="nit_empresa_usuaria"
          readOnly={disabled}
          {...register("nit_empresa_usuaria")}
        />
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
          min="0"
          readOnly={disabled}
          {...register("cronograma", {
            setValueAs: (v) =>
              v === "" || v === undefined ? undefined : Number(v),
          })}
        />
      </FormField>

      <FormField label="Secuencia" htmlFor="secuencia">
        <Input
          id="secuencia"
          readOnly={disabled}
          {...register("secuencia")}
        />
      </FormField>

      <FormField
        label="Nombre del servicio"
        htmlFor="nombre_servicio"
        required
        error={errors.nombre_servicio?.message}
      >
        <Input
          id="nombre_servicio"
          readOnly={disabled}
          {...register("nombre_servicio")}
        />
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
          readOnly={disabled}
          {...register("horas_cargadas", {
            setValueAs: (v) =>
              v === "" || v === undefined ? undefined : Number(v),
          })}
        />
      </FormField>

      <FormField label="Tipo Servicio" htmlFor="tipo_servicio">
        <Controller
          name="tipo_servicio"
          control={control}
          render={({ field }) =>
            disabled ? (
              <Input id="tipo_servicio" readOnly value={field.value ?? ""} />
            ) : (
              <Select
                value={field.value ?? null}
                onValueChange={(v: string | null) =>
                  field.onChange(
                    v as (typeof TIPO_SERVICIO_OPCIONES)[number] | undefined,
                  )
                }
                items={TIPO_SERVICIO_OPCIONES.map((o) => ({
                  label: o,
                  value: o,
                }))}
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
            )
          }
        />
      </FormField>

      <FormField label="Fecha SIPAB" htmlFor="fecha_sipab">
        <Input
          id="fecha_sipab"
          type="date"
          readOnly={disabled}
          {...register("fecha_sipab")}
        />
      </FormField>

      <FormField
        label="Asesor Gestión Riesgos / Responsable de la OS del cliente"
        htmlFor="asesor_gestion_riesgos"
      >
        <Input
          id="asesor_gestion_riesgos"
          readOnly={disabled}
          {...register("asesor_gestion_riesgos")}
        />
      </FormField>

      <div className="sm:col-span-2">
        <FormField
          label="Observaciones iniciales del cliente"
          htmlFor="observaciones_iniciales"
        >
          <Textarea
            id="observaciones_iniciales"
            readOnly={disabled}
            {...register("observaciones_iniciales")}
          />
        </FormField>
      </div>

      <FormField
        label="Tiene Valor Transporte"
        htmlFor="tarifa_valor_transporte"
        error={errors.tarifa_valor_transporte?.message}
      >
        <Input
          id="tarifa_valor_transporte"
          readOnly={disabled}
          {...register("tarifa_valor_transporte")}
        />
      </FormField>

      <FormField label="Responsable SEC para GS" htmlFor="responsable_os">
        <Controller
          name="responsable_os"
          control={control}
          render={({ field }) =>
            disabled ? (
              <Input id="responsable_os" readOnly value={field.value ?? ""} />
            ) : (
              <Select
                value={field.value ?? null}
                onValueChange={(v: string | null) =>
                  field.onChange(
                    v as (typeof RESPONSABLES_OS)[number] | undefined,
                  )
                }
                items={RESPONSABLES_OS.map((r) => ({ label: r, value: r }))}
              >
                <SelectTrigger id="responsable_os" className="w-full">
                  <SelectValue placeholder="Selecciona un responsable" />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSABLES_OS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
        />
      </FormField>

      <div className="sm:col-span-2">
        <FormField
          label="Observaciones del responsable SEC para GS"
          htmlFor="observaciones_responsable_sec"
        >
          <Textarea
            id="observaciones_responsable_sec"
            readOnly={disabled && !puedeEditarObservacionesSec}
            {...register("observaciones_responsable_sec")}
          />
        </FormField>
      </div>

      {/* Estado y Link del archivo cierran la sección: son gestión interna,
          no datos que vengan de la OS del cliente (ver comentario de arriba). */}
      <FormField
        label="Estado"
        htmlFor="estado"
        error={errors.estado?.message}
      >
        <Controller
          name="estado"
          control={control}
          render={({ field }) =>
            disabled ? (
              <Input id="estado" readOnly value={field.value ?? ""} />
            ) : (
              <Select
                value={field.value ?? null}
                onValueChange={(v: string | null) =>
                  field.onChange(
                    v as (typeof ESTADOS_ORDEN)[number] | undefined,
                  )
                }
                items={ESTADOS_ORDEN.map((e) => ({ label: e, value: e }))}
              >
                <SelectTrigger id="estado" className="w-full">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_ORDEN.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
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
            readOnly={disabled}
            {...register("link_archivo_orden")}
          />
        </FormField>
      </div>
    </div>
  );
}
