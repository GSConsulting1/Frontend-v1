"use client";

import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { Lock } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { Checkbox } from "@/components/forms/checkbox";
import { Input } from "@/components/ui/input";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { RoleGate } from "@/components/auth/role-gate";
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
// administrador o financiero — mismo criterio que valor-hora.tsx.
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

  return (
    <SeccionAcordeon
      titulo="Cuenta de cobro"
      resumen={
        puedeVerFinanciera
          ? "Radicación, corte de pago y soporte de la cuenta de cobro"
          : "Visible solo para los roles administrador y financiero"
      }
      completo={algunoLleno(cuentaCobro)}
      locked={!puedeVerFinanciera}
      chipTexto={puedeVerFinanciera ? undefined : "Solo administrador/financiero"}
      open={open}
      onOpenChange={onOpenChange}
    >
      <RoleGate
        allow={["administrador", "financiero"]}
        fallback={
          <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Lock className="size-4" aria-hidden />
            </span>
            <div>
              <p className="font-medium text-foreground">
                Bloqueado por tu rol
              </p>
              <p className="text-xs">
                Solo los usuarios con rol de administrador o financiero pueden
                ver y editar la cuenta de cobro.
              </p>
            </div>
          </div>
        }
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
          <FormField label="Corte de pago" htmlFor="corte_pago">
            <Input id="corte_pago" {...register("cuentaCobro.corte_pago")} />
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
      </RoleGate>
    </SeccionAcordeon>
  );
}
