// Orquesta las 11 secciones extendidas de "Información orden del servicio"
// (Plan MVP semana 2 + sección financiera), cada una en su propio archivo
// bajo components/ordenes/secciones/. Vive dentro de OrdenForm, después de
// SeccionDatosGenerales — comparten un único useForm (ver OrdenInfoFormValues
// en orden-form.tsx) para que un solo botón "Guardar" mande todo junto.
//
// `disabled` se usa en modo "nueva orden sin guardar": las 10 tablas
// extendidas tienen orden_id como PK/FK a ordenes_servicio(id), así que no
// pueden tener fila hasta que la orden exista — ver la nota en OrdenForm.
//
// `seccionAbierta`/`onToggleSeccion` vienen de OrdenForm: es el mismo
// acordeón único que incluye a SeccionDatosGenerales, así que el estado de
// "cuál está abierta" no puede vivir acá (ver SeccionId en orden-form.tsx).

"use client";

import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import type {
  OrdenInfoFormValues,
  SeccionId,
} from "@/components/ordenes/orden-form";
import { SeccionDatosActividad } from "@/components/ordenes/secciones/datos-actividad";
import { SeccionProfesionalContacto } from "@/components/ordenes/secciones/profesional-contacto";
import { SeccionDetalleEntrega } from "@/components/ordenes/secciones/detalle-entrega";
import { SeccionEntregablesEstandar } from "@/components/ordenes/secciones/entregables-estandar";
import { SeccionValorHora } from "@/components/ordenes/secciones/valor-hora";
import { SeccionChecklist } from "@/components/ordenes/secciones/checklist";
import { SeccionCuentaCobro } from "@/components/ordenes/secciones/cuenta-cobro";
import { SeccionActaServicio } from "@/components/ordenes/secciones/acta-servicio";
import { SeccionRadicacionImagine } from "@/components/ordenes/secciones/radicacion-imagine";
import { SeccionFacturacion } from "@/components/ordenes/secciones/facturacion";
import { SeccionLiquidacion } from "@/components/ordenes/secciones/liquidacion";

type SelectOption = { id: number; label: string };

export type OrdenInfoSeccionesProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  setValue: UseFormSetValue<OrdenInfoFormValues>;
  ciudades: SelectOption[];
  estadosEjecucion: SelectOption[];
  profesionales: (SelectOption & { valorHora: number | null })[];
  participantesArl: SelectOption[];
  entregablesEstandar: SelectOption[];
  disabled: boolean;
  seccionAbierta: SeccionId | null;
  onToggleSeccion: (id: SeccionId, open: boolean) => void;
};

export function OrdenInfoSecciones({
  register,
  control,
  errors,
  watch,
  setValue,
  ciudades,
  estadosEjecucion,
  profesionales,
  participantesArl,
  entregablesEstandar,
  disabled,
  seccionAbierta,
  onToggleSeccion,
}: OrdenInfoSeccionesProps) {
  const { perfil } = useAuth();
  // La sección financiera (cuenta de cobro, acta de servicio, radicación
  // Imagine, facturación, liquidación) está gateada a administrador y
  // financiero únicamente — ver RLS "fin_all".
  const puedeVerFinanciera =
    perfil?.rol === "administrador" || perfil?.rol === "financiero";
  // Valor hora profesional suma también a talento — ver RLS
  // "admin_fin_valor_hora".
  const puedeVerValorHora = puedeVerFinanciera || perfil?.rol === "talento";
  // profesional y lectura ven las secciones operativas (Datos actividad,
  // Profesional/contacto, Detalle entrega, Entregables estándar, Checklist)
  // pero no las editan — a diferencia de la sección financiera, acá no se
  // ocultan: solo quedan deshabilitadas, mismo <fieldset disabled> que ya
  // se usa para el modo "nueva sin guardar" de abajo.
  const soloLecturaOperativas =
    perfil?.rol === "profesional" || perfil?.rol === "lectura";
  const fieldsetDisabled = disabled || soloLecturaOperativas;

  return (
    <fieldset
      disabled={fieldsetDisabled}
      className={cn(
        "space-y-3",
        fieldsetDisabled && "pointer-events-none opacity-50",
      )}
    >
      {soloLecturaOperativas && !disabled && (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden />
          Tu rol solo puede ver estas secciones, no editarlas.
        </p>
      )}
      <SeccionDatosActividad
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        ciudades={ciudades}
        open={seccionAbierta === "datos-actividad"}
        onOpenChange={(open) => onToggleSeccion("datos-actividad", open)}
      />

      <SeccionProfesionalContacto
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        profesionales={profesionales}
        open={seccionAbierta === "profesional-contacto"}
        onOpenChange={(open) => onToggleSeccion("profesional-contacto", open)}
      />

      <SeccionDetalleEntrega
        register={register}
        control={control}
        watch={watch}
        profesionales={profesionales}
        participantesArl={participantesArl}
        open={seccionAbierta === "detalle-entrega"}
        onOpenChange={(open) => onToggleSeccion("detalle-entrega", open)}
      />

      <SeccionEntregablesEstandar
        control={control}
        watch={watch}
        entregablesEstandar={entregablesEstandar}
        open={seccionAbierta === "entregables-estandar"}
        onOpenChange={(open) => onToggleSeccion("entregables-estandar", open)}
      />

      <SeccionValorHora
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
        profesionales={profesionales}
        puedeVer={puedeVerValorHora}
        open={seccionAbierta === "valor-hora"}
        onOpenChange={(open) => onToggleSeccion("valor-hora", open)}
      />

      <SeccionChecklist
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        estadosEjecucion={estadosEjecucion}
        open={seccionAbierta === "checklist"}
        onOpenChange={(open) => onToggleSeccion("checklist", open)}
      />

      <SeccionCuentaCobro
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        puedeVerFinanciera={puedeVerFinanciera}
        open={seccionAbierta === "cuenta-cobro"}
        onOpenChange={(open) => onToggleSeccion("cuenta-cobro", open)}
      />

      <SeccionActaServicio
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        participantesArl={participantesArl}
        puedeVerFinanciera={puedeVerFinanciera}
        open={seccionAbierta === "acta-servicio"}
        onOpenChange={(open) => onToggleSeccion("acta-servicio", open)}
      />

      <SeccionRadicacionImagine
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        puedeVerFinanciera={puedeVerFinanciera}
        open={seccionAbierta === "radicacion-imagine"}
        onOpenChange={(open) => onToggleSeccion("radicacion-imagine", open)}
      />

      <SeccionFacturacion
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        puedeVerFinanciera={puedeVerFinanciera}
        open={seccionAbierta === "facturacion"}
        onOpenChange={(open) => onToggleSeccion("facturacion", open)}
      />

      <SeccionLiquidacion
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        puedeVerFinanciera={puedeVerFinanciera}
        open={seccionAbierta === "liquidacion"}
        onOpenChange={(open) => onToggleSeccion("liquidacion", open)}
      />
    </fieldset>
  );
}
