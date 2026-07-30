"use client";

import { useEffect, useState } from "react";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Checkbox } from "@/components/forms/checkbox";
import { Input } from "@/components/ui/input";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

type ProfesionalConValorHora = { id: number; valorHora: number | null };

export type SeccionValorHoraProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  setValue: UseFormSetValue<OrdenInfoFormValues>;
  profesionales: ProfesionalConValorHora[];
  puedeVer: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// "Valor hora profesional" vive en su propia tabla (valor_hora_orden),
// gateada por rol administrador, financiero o talento — ver structure.md.
// Si el rol no puede verla, la sección ni se renderiza (no solo se
// deshabilita), así que no hace falta RoleGate acá adentro.
//
// Se precarga con la tarifa base del profesional elegido en "Profesional y
// contacto" (profesionales.valor_hora) mientras el checkbox "Ingresar valor
// manual" esté sin marcar — al tildarlo, el campo se habilita y deja de
// resincronizarse con la tarifa base, así que lo que se escriba a mano
// queda tal cual (no lo pisa un cambio posterior de profesional). El valor
// final SIEMPRE se guarda en valor_hora_orden, nunca se lee la tarifa base
// en tiempo real desde otro lado — ver la conversación que agregó esto:
// eso es a propósito, para que la liquidación de una orden vieja no cambie
// si más adelante se actualiza la tarifa del profesional.
export function SeccionValorHora({
  register,
  errors,
  watch,
  setValue,
  profesionales,
  puedeVer,
  open,
  onOpenChange,
}: SeccionValorHoraProps) {
  const valorHora = watch("valorHora.valor_hora_profesional");
  const profesionalId = watch("infoOrdenServicio.profesional_id");

  const tarifaBase =
    profesionalId != null
      ? (profesionales.find((p) => p.id === profesionalId)?.valorHora ?? undefined)
      : undefined;

  // Si el valor ya guardado no coincide con la tarifa base actual del
  // profesional, alguien lo puso a mano a propósito — arranca en modo
  // manual para no pisarlo. Si coincide (o no hay nada guardado todavía),
  // arranca en automático.
  const [valorManual, setValorManual] = useState(
    () => valorHora != null && valorHora !== tarifaBase,
  );

  useEffect(() => {
    if (valorManual) return;
    // Si ya coincide (ej. recién montado y no cambió nada) no hace falta
    // volver a setearlo — evitar eso es lo que evita que "Guardar cambios"
    // se habilite solo al abrir una orden existente sin tocar nada.
    if (valorHora === tarifaBase) return;
    setValue("valorHora.valor_hora_profesional", tarifaBase, {
      shouldDirty: true,
    });
    // Solo debe reaccionar a cambios reales de profesional/modo, no a cada
    // tecla que se escriba en el campo (por eso valorHora no está en el
    // arreglo de dependencias, aunque se lea arriba).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profesionalId, valorManual, tarifaBase, setValue]);

  if (!puedeVer) return null;

  return (
    <SeccionAcordeon
      titulo="Valor hora profesional"
      completo={algunoLleno([valorHora])}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="space-y-3">
        <Checkbox
          label="Ingresar valor manual"
          checked={valorManual}
          onChange={(e) => setValorManual(e.target.checked)}
        />
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
              disabled={!valorManual}
              {...register("valorHora.valor_hora_profesional", {
                setValueAs: (v) =>
                  v === "" || v === undefined ? undefined : Number(v),
              })}
            />
          </FormField>
        </div>
      </div>
    </SeccionAcordeon>
  );
}
