"use client";

import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

export type SeccionLiquidacionProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  puedeVerFinanciera: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CAMPOS_MONEDA = [
  { name: "valor_total_cotizado", label: "Valor total cotizado" },
  { name: "valor_desplazamiento", label: "Valor desplazamiento" },
  { name: "gasto_servicio", label: "Gasto de servicio" },
  { name: "iva", label: "IVA" },
  { name: "valor_antes_iva", label: "Valor antes de IVA" },
  { name: "retencion_fuente", label: "Retención en la fuente" },
  { name: "retencion_ica", label: "Retención ICA" },
  { name: "retencion_iva", label: "Retención IVA" },
  { name: "total", label: "Total" },
  { name: "ganancia", label: "Ganancia" },
] as const;

// "Liquidación" vive en su propia tabla (liquidacion), gateada por rol
// administrador o financiero — mismo criterio que valor-hora.tsx. Si el rol
// no puede verla, la sección ni se renderiza.
export function SeccionLiquidacion({
  register,
  errors,
  watch,
  puedeVerFinanciera,
  open,
  onOpenChange,
}: SeccionLiquidacionProps) {
  const liquidacion = watch(["liquidacion.valor_total_cotizado", "liquidacion.total"]);

  if (!puedeVerFinanciera) return null;

  return (
    <SeccionAcordeon
      titulo="Liquidación"
      resumen="Desglose de valores, retenciones y ganancia de la orden"
      completo={algunoLleno(liquidacion)}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS_MONEDA.map(({ name, label }) => (
          <FormField
            key={name}
            label={label}
            htmlFor={name}
            error={errors.liquidacion?.[name]?.message}
          >
            <Input
              id={name}
              type="number"
              step="0.01"
              {...register(`liquidacion.${name}`, {
                setValueAs: (v) =>
                  v === "" || v === undefined ? undefined : Number(v),
              })}
            />
          </FormField>
        ))}
      </div>
    </SeccionAcordeon>
  );
}
