"use client";

import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { Lock } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { RoleGate } from "@/components/auth/role-gate";
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

export type SeccionValorHoraProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  puedeVerValorHora: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// "Valor hora profesional" vive en su propia tabla (valor_hora_orden),
// gateada por rol administrador — ver structure.md.
export function SeccionValorHora({
  register,
  errors,
  watch,
  puedeVerValorHora,
  open,
  onOpenChange,
}: SeccionValorHoraProps) {
  const valorHora = watch("valorHora.valor_hora_profesional");

  return (
    <SeccionAcordeon
      titulo="Valor hora profesional"
      resumen={
        puedeVerValorHora ? undefined : "Visible solo para el rol administrador"
      }
      completo={algunoLleno([valorHora])}
      locked={!puedeVerValorHora}
      chipTexto={puedeVerValorHora ? undefined : "Solo administrador"}
      open={open}
      onOpenChange={onOpenChange}
    >
      <RoleGate
        allow={["administrador"]}
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
                Solo los usuarios con rol de administrador pueden ver y editar
                el valor hora profesional.
              </p>
            </div>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Valor hora profesional"
            htmlFor="valor_hora_profesional"
            error={errors.valorHora?.valor_hora_profesional?.message}
          >
            <Input
              id="valor_hora_profesional"
              type="number"
              step="0.01"
              min="0"
              {...register("valorHora.valor_hora_profesional", {
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
