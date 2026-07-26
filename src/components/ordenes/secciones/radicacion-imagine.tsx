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
import { Textarea } from "@/components/ui/textarea";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { RoleGate } from "@/components/auth/role-gate";
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

export type SeccionRadicacionImagineProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  puedeVerFinanciera: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// "Radicación Imagine" vive en su propia tabla (radicacion_imagine), gateada
// por rol administrador o financiero — mismo criterio que valor-hora.tsx.
// Admite hasta 2 radicaciones (novedades del cliente pueden forzar una
// segunda) — de ahí los campos _1/_2.
export function SeccionRadicacionImagine({
  register,
  watch,
  puedeVerFinanciera,
  open,
  onOpenChange,
}: SeccionRadicacionImagineProps) {
  const radicacionImagine = watch([
    "radicacionImagine.numero_radicado_1",
    "radicacionImagine.estado_imagine",
  ]);

  return (
    <SeccionAcordeon
      titulo="Radicación Imagine"
      resumen={
        puedeVerFinanciera
          ? "Radicaciones, novedades y estado en Imagine"
          : "Visible solo para los roles administrador y financiero"
      }
      completo={algunoLleno(radicacionImagine)}
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
                ver y editar la radicación Imagine.
              </p>
            </div>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Número de radicado 1" htmlFor="numero_radicado_1">
            <Input
              id="numero_radicado_1"
              {...register("radicacionImagine.numero_radicado_1")}
            />
          </FormField>
          <FormField label="Fecha de radicación 1" htmlFor="fecha_radicacion_1">
            <Input
              id="fecha_radicacion_1"
              type="date"
              {...register("radicacionImagine.fecha_radicacion_1")}
            />
          </FormField>
          <FormField
            label="Novedades 1"
            htmlFor="novedades_1"
            className="sm:col-span-2"
          >
            <Textarea
              id="novedades_1"
              {...register("radicacionImagine.novedades_1")}
            />
          </FormField>
          <FormField label="Número de radicado 2" htmlFor="numero_radicado_2">
            <Input
              id="numero_radicado_2"
              {...register("radicacionImagine.numero_radicado_2")}
            />
          </FormField>
          <FormField label="Fecha de radicación 2" htmlFor="fecha_radicacion_2">
            <Input
              id="fecha_radicacion_2"
              type="date"
              {...register("radicacionImagine.fecha_radicacion_2")}
            />
          </FormField>
          <FormField
            label="Novedades 2"
            htmlFor="novedades_2"
            className="sm:col-span-2"
          >
            <Textarea
              id="novedades_2"
              {...register("radicacionImagine.novedades_2")}
            />
          </FormField>
          <FormField label="Estado en Imagine" htmlFor="estado_imagine">
            <Input
              id="estado_imagine"
              {...register("radicacionImagine.estado_imagine")}
            />
          </FormField>
          <FormField
            label="Actualización SIPAB"
            htmlFor="actualizacion_sipab"
          >
            <Input
              id="actualizacion_sipab"
              type="date"
              {...register("radicacionImagine.actualizacion_sipab")}
            />
          </FormField>
        </div>
      </RoleGate>
    </SeccionAcordeon>
  );
}
