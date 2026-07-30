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

export type SeccionValorHoraProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  puedeVer: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// "Valor hora profesional" vive en su propia tabla (valor_hora_orden),
// gateada por rol administrador, financiero o talento — ver structure.md.
// Si el rol no puede verla, la sección ni se renderiza (no solo se
// deshabilita), así que no hace falta RoleGate acá adentro.
export function SeccionValorHora({
  register,
  errors,
  watch,
  puedeVer,
  open,
  onOpenChange,
}: SeccionValorHoraProps) {
  const valorHora = watch("valorHora.valor_hora_profesional");

  if (!puedeVer) return null;

  return (
    <SeccionAcordeon
      titulo="Valor hora profesional"
      completo={algunoLleno([valorHora])}
      open={open}
      onOpenChange={onOpenChange}
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
    </SeccionAcordeon>
  );
}
