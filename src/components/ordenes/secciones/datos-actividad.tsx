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

export type SeccionDatosActividadProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  ciudades: SelectOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SeccionDatosActividad({
  register,
  control,
  errors,
  watch,
  ciudades,
  open,
  onOpenChange,
}: SeccionDatosActividadProps) {
  const datosActividad = watch([
    "infoOrdenServicio.nombre_actividad",
    "infoOrdenServicio.ciudad_id",
    "infoOrdenServicio.fecha_inicio_ejecucion",
  ]);

  return (
    <SeccionAcordeon
      titulo="Datos de la actividad"
      resumen="Ciudad, horario y lugar donde se ejecuta"
      completo={algunoLleno(datosActividad)}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Fecha de emisión OS" htmlFor="fecha_emision_os">
          <Input
            id="fecha_emision_os"
            type="date"
            {...register("infoOrdenServicio.fecha_emision_os")}
          />
        </FormField>
        <FormField label="Ciudad" htmlFor="ciudad_id">
          <Controller
            name="infoOrdenServicio.ciudad_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value != null ? String(field.value) : null}
                onValueChange={(v: string | null) =>
                  field.onChange(v ? Number(v) : undefined)
                }
                items={ciudades.map((c) => ({
                  label: c.label,
                  value: String(c.id),
                }))}
              >
                <SelectTrigger id="ciudad_id" className="w-full">
                  <SelectValue placeholder="Selecciona una ciudad" />
                </SelectTrigger>
                <SelectContent>
                  {ciudades.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <div className="sm:col-span-2">
          <Checkbox
            label="Actividad reprogramada"
            {...register("infoOrdenServicio.actividad_reprogramada")}
          />
        </div>
        <FormField
          label="Empresa a visitar"
          htmlFor="empresa_a_visitar"
          className="sm:col-span-2"
        >
          <Input
            id="empresa_a_visitar"
            {...register("infoOrdenServicio.empresa_a_visitar")}
          />
        </FormField>
        <FormField
          label="Nombre de la actividad"
          htmlFor="nombre_actividad"
          className="sm:col-span-2"
        >
          <Input
            id="nombre_actividad"
            {...register("infoOrdenServicio.nombre_actividad")}
          />
        </FormField>
        <FormField
          label="Descripción de la actividad"
          htmlFor="descripcion_actividad"
          className="sm:col-span-2"
        >
          <Textarea
            id="descripcion_actividad"
            {...register("infoOrdenServicio.descripcion_actividad")}
          />
        </FormField>
        <FormField
          label="Horas asignadas"
          htmlFor="horas_asignadas"
          error={errors.infoOrdenServicio?.horas_asignadas?.message}
        >
          <Input
            id="horas_asignadas"
            type="number"
            step="0.5"
            min="0"
            {...register("infoOrdenServicio.horas_asignadas", {
              setValueAs: (v) =>
                v === "" || v === undefined ? undefined : Number(v),
            })}
          />
        </FormField>
        <FormField
          label="Fecha inicio ejecución"
          htmlFor="fecha_inicio_ejecucion"
        >
          <Input
            id="fecha_inicio_ejecucion"
            type="date"
            {...register("infoOrdenServicio.fecha_inicio_ejecucion")}
          />
        </FormField>
        <FormField
          label="Fecha fin ejecución"
          htmlFor="fecha_fin_ejecucion"
          error={errors.infoOrdenServicio?.fecha_fin_ejecucion?.message}
        >
          <Input
            id="fecha_fin_ejecucion"
            type="date"
            {...register("infoOrdenServicio.fecha_fin_ejecucion")}
          />
        </FormField>
        <FormField label="Hora inicio" htmlFor="hora_inicio">
          <Input
            id="hora_inicio"
            type="time"
            {...register("infoOrdenServicio.hora_inicio")}
          />
        </FormField>
        <FormField
          label="Hora fin"
          htmlFor="hora_fin"
          error={errors.infoOrdenServicio?.hora_fin?.message}
        >
          <Input
            id="hora_fin"
            type="time"
            {...register("infoOrdenServicio.hora_fin")}
          />
        </FormField>
        <FormField
          label="Dirección de la empresa"
          htmlFor="direccion_empresa"
          className="sm:col-span-2"
        >
          <Input
            id="direccion_empresa"
            {...register("infoOrdenServicio.direccion_empresa")}
          />
        </FormField>
        <FormField
          label="Ubicación (Google Maps)"
          htmlFor="ubicacion_google_maps"
          className="sm:col-span-2"
        >
          <Input
            id="ubicacion_google_maps"
            type="url"
            placeholder="https://maps.google.com/..."
            {...register("infoOrdenServicio.ubicacion_google_maps")}
          />
        </FormField>
      </div>
    </SeccionAcordeon>
  );
}
