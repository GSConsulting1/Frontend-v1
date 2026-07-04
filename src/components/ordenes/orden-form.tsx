// Formulario de creación/edición de órdenes — un solo componente reutilizado
// por app/ordenes/nueva/page.tsx y app/ordenes/[id]/editar/page.tsx.
//
// Client Component: usa React Hook Form + zodResolver(ordenServicioSchema)
// para validar en el cliente con el MISMO schema que vuelve a correr en el
// servidor (src/app/ordenes/actions.ts). Al enviar, llama directamente a la
// Server Action correspondiente (createOrden/updateOrden) como una función
// normal — Next.js se encarga de la llamada RPC y del redirect al éxito.
//
// Los <Select> de shadcn acá están construidos sobre @base-ui/react (no
// nativos), así que se controlan con <Controller> de RHF en vez de
// "register" directo.

"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ordenServicioSchema,
  type OrdenServicioFormValues,
} from "@/lib/validations/orden.schema";
import { createOrden, updateOrden } from "@/app/ordenes/actions";

type SelectOption = { id: number; label: string };

type OrdenFormProps = {
  mode: "crear" | "editar";
  ordenId?: number;
  defaultValues?: Partial<OrdenServicioFormValues>;
  clientes: SelectOption[];
  estados: SelectOption[];
  profesionales: SelectOption[];
};

export function OrdenForm({
  mode,
  ordenId,
  defaultValues,
  clientes,
  estados,
  profesionales,
}: OrdenFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OrdenServicioFormValues>({
    resolver: zodResolver(ordenServicioSchema),
    defaultValues,
  });

  async function onSubmit(values: OrdenServicioFormValues) {
    setServerError(null);
    const result =
      mode === "crear"
        ? await createOrden(values)
        : await updateOrden(ordenId!, values);

    if (!result) return; // éxito -> la action ya redirigió a /ordenes

    if ("error" in result) {
      setServerError(result.error);
      return;
    }
    if ("fieldErrors" in result) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages?.[0]) {
          setError(field as keyof OrdenServicioFormValues, {
            message: messages[0],
          });
        }
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cliente_id">Cliente</Label>
          <Controller
            name="cliente_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value != null ? String(field.value) : null}
                onValueChange={(v: string | null) => field.onChange(v ? Number(v) : undefined)}
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
          {errors.cliente_id && (
            <p className="text-sm text-destructive">Selecciona un cliente</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="estado_id">Estado</Label>
          <Controller
            name="estado_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value != null ? String(field.value) : null}
                onValueChange={(v: string | null) => field.onChange(v ? Number(v) : undefined)}
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
          {errors.estado_id && (
            <p className="text-sm text-destructive">{errors.estado_id.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nombre_servicio">Servicio</Label>
          <Input id="nombre_servicio" {...register("nombre_servicio")} />
          {errors.nombre_servicio && (
            <p className="text-sm text-destructive">{errors.nombre_servicio.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tipo_servicio">Tipo de servicio</Label>
          <Input id="tipo_servicio" {...register("tipo_servicio")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="numero_os_cliente">Número OS del cliente</Label>
          <Input id="numero_os_cliente" {...register("numero_os_cliente")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="horas_cargadas">Horas cargadas</Label>
          <Input
            id="horas_cargadas"
            type="number"
            step="0.5"
            min="0"
            {...register("horas_cargadas", {
              setValueAs: (v) => (v === "" || v === undefined ? undefined : Number(v)),
            })}
          />
          {errors.horas_cargadas && (
            <p className="text-sm text-destructive">{errors.horas_cargadas.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fecha_recepcion_os">Fecha recepción OS</Label>
          <Input id="fecha_recepcion_os" type="date" {...register("fecha_recepcion_os")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fecha_sipab">Fecha SIPAB</Label>
          <Input id="fecha_sipab" type="date" {...register("fecha_sipab")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cronograma">Cronograma</Label>
          <Input id="cronograma" type="date" {...register("cronograma")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="secuencia">Secuencia</Label>
          <Input id="secuencia" {...register("secuencia")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nombre_empresa_usuaria">Empresa usuaria</Label>
          <Input id="nombre_empresa_usuaria" {...register("nombre_empresa_usuaria")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nit_empresa_usuaria">NIT empresa usuaria</Label>
          <Input id="nit_empresa_usuaria" {...register("nit_empresa_usuaria")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tarifa_valor_transporte">Tarifa / valor transporte</Label>
          <Input
            id="tarifa_valor_transporte"
            type="number"
            step="0.01"
            min="0"
            {...register("tarifa_valor_transporte", {
              setValueAs: (v) => (v === "" || v === undefined ? undefined : Number(v)),
            })}
          />
          {errors.tarifa_valor_transporte && (
            <p className="text-sm text-destructive">
              {errors.tarifa_valor_transporte.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="asesor_gestion_riesgos_id">Asesor gestión de riesgos</Label>
          <Controller
            name="asesor_gestion_riesgos_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value != null ? String(field.value) : null}
                onValueChange={(v: string | null) => field.onChange(v ? Number(v) : undefined)}
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="responsable_sec_id">Responsable SEC</Label>
          <Controller
            name="responsable_sec_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value != null ? String(field.value) : null}
                onValueChange={(v: string | null) => field.onChange(v ? Number(v) : undefined)}
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
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observaciones_iniciales">Observaciones iniciales</Label>
        <Textarea id="observaciones_iniciales" {...register("observaciones_iniciales")} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
