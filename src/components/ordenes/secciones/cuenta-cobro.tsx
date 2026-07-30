"use client";

import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Checkbox } from "@/components/forms/checkbox";
import { Input } from "@/components/ui/input";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

export type SeccionCuentaCobroProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  puedeVerFinanciera: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// "Cuenta de cobro" vive en su propia tabla (cuenta_cobro), gateada por rol
// administrador o financiero — mismo criterio que valor-hora.tsx. Si el rol
// no puede verla, la sección ni se renderiza.
export function SeccionCuentaCobro({
  register,
  errors,
  watch,
  puedeVerFinanciera,
  open,
  onOpenChange,
}: SeccionCuentaCobroProps) {
  const cuentaCobro = watch([
    "cuentaCobro.fecha_radicacion",
    "cuentaCobro.valor_cuenta_cobro",
  ]);

  if (!puedeVerFinanciera) return null;

  return (
    <SeccionAcordeon
      titulo="Cuenta de cobro"
      resumen="Radicación, corte de pago y soporte de la cuenta de cobro"
      completo={algunoLleno(cuentaCobro)}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Checkbox
          label="Radicación de la cuenta"
          {...register("cuentaCobro.radicacion_cuenta")}
        />
        <FormField label="Fecha de radicación" htmlFor="fecha_radicacion">
          <Input
            id="fecha_radicacion"
            type="date"
            {...register("cuentaCobro.fecha_radicacion")}
          />
        </FormField>
        <FormField label="Número de radicado" htmlFor="numero_radicado">
          <Input
            id="numero_radicado"
            {...register("cuentaCobro.numero_radicado")}
          />
        </FormField>
        <FormField label="Fecha de corte" htmlFor="fecha_corte">
          <Input
            id="fecha_corte"
            type="date"
            {...register("cuentaCobro.fecha_corte")}
          />
        </FormField>
        <FormField label="Fecha de pago" htmlFor="fecha_pago">
          <Input
            id="fecha_pago"
            type="date"
            {...register("cuentaCobro.fecha_pago")}
          />
        </FormField>
        <FormField label="Documento soporte" htmlFor="documento_soporte">
          <Input
            id="documento_soporte"
            {...register("cuentaCobro.documento_soporte")}
          />
        </FormField>
        <FormField
          label="Valor cuenta de cobro"
          htmlFor="valor_cuenta_cobro"
          error={errors.cuentaCobro?.valor_cuenta_cobro?.message}
        >
          <Input
            id="valor_cuenta_cobro"
            type="number"
            step="0.01"
            min="0"
            {...register("cuentaCobro.valor_cuenta_cobro", {
              setValueAs: (v) =>
                v === "" || v === undefined ? undefined : Number(v),
            })}
          />
        </FormField>
      </div>
    </SeccionAcordeon>
  );
}
