"use client";

import * as React from "react";
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
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

type SelectOption = { id: number; label: string };
type CiudadOption = SelectOption & { departamentoId: number };

export type SeccionDatosActividadProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  departamentos: SelectOption[];
  ciudades: CiudadOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SeccionDatosActividad({
  register,
  control,
  errors,
  watch,
  departamentos,
  ciudades,
  open,
  onOpenChange,
}: SeccionDatosActividadProps) {
  const datosActividad = watch([
    "infoOrdenServicio.nombre_actividad",
    "infoOrdenServicio.ciudad_id",
    "infoOrdenServicio.fecha_inicio_ejecucion",
  ]);

  // El departamento NO vive en el formulario: la orden guarda `ciudad_id` y
  // nada más, y el departamento se deriva de la ciudad. Meterlo al form
  // obligaría a tocar el esquema de info_orden_servicio y su schema de Zod
  // para almacenar un dato redundante.
  //
  // El inicializador lazy corre una sola vez, al montar, y es lo que hace que
  // en modo edición el campo aparezca lleno: OrdenForm pasa `defaultValues` a
  // useForm de forma síncrona, así que acá ya se puede leer la ciudad
  // guardada y remontar hasta su departamento.
  const ciudadGuardada = watch("infoOrdenServicio.ciudad_id");
  const [departamentoId, setDepartamentoId] = React.useState<number | null>(
    () => ciudades.find((c) => c.id === ciudadGuardada)?.departamentoId ?? null,
  );

  const ciudadesDelDepartamento = React.useMemo(
    () =>
      departamentoId == null
        ? []
        : ciudades.filter((c) => c.departamentoId === departamentoId),
    [ciudades, departamentoId],
  );

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
        {/* Departamento y Ciudad comparten un solo Controller porque están
            acoplados: cambiar el departamento tiene que limpiar la ciudad, y
            eso se hace con el `field.onChange` de la ciudad. Los hooks de
            estado viven arriba, en el cuerpo del componente, y no acá adentro:
            la render prop de Controller no es un componente. */}
        <Controller
          name="infoOrdenServicio.ciudad_id"
          control={control}
          render={({ field }) => (
            <>
              <FormField label="Departamento" htmlFor="departamento_id">
                <Combobox
                  items={departamentos}
                  value={departamentos.find((d) => d.id === departamentoId) ?? null}
                  onValueChange={(departamento: SelectOption | null) => {
                    setDepartamentoId(departamento?.id ?? null);
                    // Sin esto quedaría seleccionada una ciudad que ya no
                    // pertenece al departamento elegido.
                    field.onChange(undefined);
                  }}
                  itemToStringLabel={(d: SelectOption) => d.label}
                  isItemEqualToValue={(a: SelectOption, b: SelectOption) =>
                    a.id === b.id
                  }
                  autoHighlight
                >
                  <ComboboxInputGroup>
                    <ComboboxInput
                      id="departamento_id"
                      placeholder="Escribe para buscar"
                    />
                    <ComboboxClear aria-label="Limpiar departamento" />
                    <ComboboxTrigger aria-label="Ver departamentos" />
                  </ComboboxInputGroup>
                  <ComboboxContent>
                    <ComboboxEmpty>Ningún departamento coincide.</ComboboxEmpty>
                    <ComboboxList>
                      {(departamento: SelectOption) => (
                        <ComboboxItem key={departamento.id} value={departamento}>
                          {departamento.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </FormField>

              <FormField label="Ciudad" htmlFor="ciudad_id">
                <Combobox
                  items={ciudadesDelDepartamento}
                  value={
                    ciudadesDelDepartamento.find((c) => c.id === field.value) ?? null
                  }
                  onValueChange={(ciudad: CiudadOption | null) =>
                    field.onChange(ciudad?.id ?? undefined)
                  }
                  itemToStringLabel={(c: CiudadOption) => c.label}
                  isItemEqualToValue={(a: CiudadOption, b: CiudadOption) =>
                    a.id === b.id
                  }
                  // El departamento más grande tiene ~125 municipios, así que
                  // el límite no llega a activarse hoy; está para que la lista
                  // no pueda crecer sin control a futuro.
                  limit={100}
                  autoHighlight
                  disabled={departamentoId == null}
                >
                  <ComboboxInputGroup>
                    <ComboboxInput
                      id="ciudad_id"
                      placeholder={
                        departamentoId == null
                          ? "Selecciona primero un departamento"
                          : "Escribe para buscar"
                      }
                    />
                    <ComboboxClear aria-label="Limpiar ciudad" />
                    <ComboboxTrigger aria-label="Ver ciudades" />
                  </ComboboxInputGroup>
                  <ComboboxContent>
                    <ComboboxEmpty>Ningún municipio coincide.</ComboboxEmpty>
                    <ComboboxList>
                      {(ciudad: CiudadOption) => (
                        <ComboboxItem key={ciudad.id} value={ciudad}>
                          {ciudad.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </FormField>
            </>
          )}
        />

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
