// Orquesta las 6 secciones extendidas de "Información orden del servicio"
// (Plan MVP semana 2), cada una en su propio archivo bajo
// components/ordenes/secciones/. Vive dentro de OrdenForm, después de
// OrdenCampos ("Datos generales") — comparten un único useForm (ver
// OrdenInfoFormValues en orden-form.tsx) para que un solo botón "Guardar"
// mande todo junto.
//
// `disabled` se usa en modo "nueva orden sin guardar": las 5 tablas
// extendidas tienen orden_id como PK/FK a ordenes_servicio(id), así que no
// pueden tener fila hasta que la orden exista — ver la nota en OrdenForm.

"use client";

import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";
import { SeccionDatosActividad } from "@/components/ordenes/secciones/datos-actividad";
import { SeccionProfesionalContacto } from "@/components/ordenes/secciones/profesional-contacto";
import { SeccionDetalleEntrega } from "@/components/ordenes/secciones/detalle-entrega";
import { SeccionEntregablesEstandar } from "@/components/ordenes/secciones/entregables-estandar";
import { SeccionValorHora } from "@/components/ordenes/secciones/valor-hora";
import { SeccionChecklist } from "@/components/ordenes/secciones/checklist";

type SelectOption = { id: number; label: string };

export type OrdenInfoSeccionesProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  ciudades: SelectOption[];
  estadosEjecucion: SelectOption[];
  profesionales: SelectOption[];
  entregablesEstandar: SelectOption[];
  disabled: boolean;
};

export function OrdenInfoSecciones({
  register,
  control,
  errors,
  watch,
  ciudades,
  estadosEjecucion,
  profesionales,
  entregablesEstandar,
  disabled,
}: OrdenInfoSeccionesProps) {
  const { perfil } = useAuth();
  const puedeVerValorHora = perfil?.rol === "administrador";

  return (
    <fieldset
      disabled={disabled}
      className={cn("space-y-3", disabled && "pointer-events-none opacity-50")}
    >
      <SeccionDatosActividad
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        ciudades={ciudades}
      />

      <SeccionProfesionalContacto
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        profesionales={profesionales}
      />

      <SeccionDetalleEntrega
        register={register}
        control={control}
        watch={watch}
        profesionales={profesionales}
      />

      <SeccionEntregablesEstandar
        control={control}
        watch={watch}
        entregablesEstandar={entregablesEstandar}
      />

      <SeccionValorHora
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        puedeVerValorHora={puedeVerValorHora}
      />

      <SeccionChecklist
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        estadosEjecucion={estadosEjecucion}
      />
    </fieldset>
  );
}
