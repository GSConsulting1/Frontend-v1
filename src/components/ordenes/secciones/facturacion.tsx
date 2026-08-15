"use client";

import { useEffect } from "react";
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { ESTADO_FACTURACION_OPCIONES } from "@/lib/validations/info-orden.schema";
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

export type SeccionFacturacionProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  setValue: UseFormSetValue<OrdenInfoFormValues>;
  puedeVerFinanciera: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// "YYYY-MM-DD" + n días corridos -> "YYYY-MM-DD". El "T00:00:00" evita que
// el parseo caiga en UTC medianoche y se corra un día para zonas horarias
// negativas (America/Bogota incluida).
function sumarDias(fechaIso: string, dias: number): string {
  const fecha = new Date(`${fechaIso}T00:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

const PLAZO_FACTURACION_DIAS = 40;

// "Facturación" vive en su propia tabla (facturacion), gateada por rol
// administrador o financiero — mismo criterio que valor-hora.tsx. Si el rol
// no puede verla, la sección ni se renderiza.
export function SeccionFacturacion({
  register,
  control,
  watch,
  setValue,
  puedeVerFinanciera,
  open,
  onOpenChange,
}: SeccionFacturacionProps) {
  const facturacion = watch([
    "facturacion.numero_prefactura",
    "facturacion.numero_factura",
  ]);
  const fechaSipab = watch("fecha_sipab");
  const alertaFacturacion = watch("facturacion.alerta_facturacion");

  // Fecha máxima para facturar = fecha_sipab (sección "Datos generales") +
  // 40 días corridos. No es un dato que el usuario escriba: se recalcula
  // sola cada vez que cambia fecha_sipab, así que el campo queda
  // deshabilitado en el JSX de abajo.
  const fechaLimiteFacturacion = fechaSipab
    ? sumarDias(fechaSipab, PLAZO_FACTURACION_DIAS)
    : undefined;

  useEffect(() => {
    // Si ya coincide (ej. recién montado en una orden existente y no
    // cambió fecha_sipab) no hace falta volver a setearlo — evitar eso es
    // lo que evita que "Guardar cambios" se habilite solo al abrir una
    // orden existente sin tocar nada. Mismo criterio que valor-hora.tsx.
    if (alertaFacturacion === fechaLimiteFacturacion) return;
    setValue("facturacion.alerta_facturacion", fechaLimiteFacturacion, {
      shouldDirty: true,
    });
    // Solo debe reaccionar a cambios reales de fecha_sipab, no a cada
    // recálculo (por eso alertaFacturacion no está en el arreglo de
    // dependencias, aunque se lea arriba).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaLimiteFacturacion, setValue]);

  if (!puedeVerFinanciera) return null;

  return (
    <SeccionAcordeon
      titulo="Facturación"
      resumen="Prefactura, factura y alertas de facturación"
      completo={algunoLleno(facturacion)}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Número de prefactura" htmlFor="numero_prefactura">
          <Input
            id="numero_prefactura"
            {...register("facturacion.numero_prefactura")}
          />
        </FormField>
        <FormField label="Número de factura" htmlFor="numero_factura">
          <Input
            id="numero_factura"
            {...register("facturacion.numero_factura")}
          />
        </FormField>
        <FormField label="Estado de facturación" htmlFor="estado_facturacion">
          <Controller
            name="facturacion.estado_facturacion"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? null}
                onValueChange={(v: string | null) =>
                  field.onChange(
                    v as (typeof ESTADO_FACTURACION_OPCIONES)[number] | undefined,
                  )
                }
                items={ESTADO_FACTURACION_OPCIONES.map((o) => ({
                  label: o,
                  value: o,
                }))}
              >
                <SelectTrigger id="estado_facturacion" className="w-full">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADO_FACTURACION_OPCIONES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField label="Alerta de facturación" htmlFor="alerta_facturacion">
          <Input
            id="alerta_facturacion"
            type="date"
            disabled
            value={fechaLimiteFacturacion ?? ""}
            className="text-destructive font-medium disabled:opacity-100"
          />
        </FormField>
      </div>
    </SeccionAcordeon>
  );
}
