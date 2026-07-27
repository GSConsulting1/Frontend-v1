"use client";

import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { Lock } from "lucide-react";
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
import { RoleGate } from "@/components/auth/role-gate";
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

type SelectOption = { id: number; label: string };

export type SeccionActaServicioProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  // Catálogo aparte de `profesionales` (tabla `participantes_arl` en la BD
  // real) — quién firma el acta. Ver comentario en src/types/index.ts.
  participantesArl: SelectOption[];
  puedeVerFinanciera: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// "Acta de servicio" vive en su propia tabla (acta_servicio), gateada por
// rol administrador o financiero — mismo criterio que valor-hora.tsx.
export function SeccionActaServicio({
  register,
  control,
  watch,
  participantesArl,
  puedeVerFinanciera,
  open,
  onOpenChange,
}: SeccionActaServicioProps) {
  const actaServicio = watch([
    "actaServicio.fecha_acta",
    "actaServicio.profesional_acta_id",
  ]);

  return (
    <SeccionAcordeon
      titulo="Acta de servicio"
      resumen={
        puedeVerFinanciera
          ? "Fecha, hora y profesional que firma el acta"
          : "Visible solo para los roles administrador y financiero"
      }
      completo={algunoLleno(actaServicio)}
      locked={!puedeVerFinanciera}
      chipTexto={
        puedeVerFinanciera ? undefined : "Solo administrador/financiero"
      }
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
                ver y editar el acta de servicio.
              </p>
            </div>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Fecha del acta" htmlFor="fecha_acta">
            <Input
              id="fecha_acta"
              type="date"
              {...register("actaServicio.fecha_acta")}
            />
          </FormField>
          <FormField label="Hora del acta" htmlFor="hora_acta">
            <Input
              id="hora_acta"
              type="time"
              {...register("actaServicio.hora_acta")}
            />
          </FormField>
          <FormField
            label="Profesional del acta"
            htmlFor="profesional_acta_id"
            className="sm:col-span-2"
          >
            <Controller
              name="actaServicio.profesional_acta_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : null}
                  onValueChange={(v: string | null) =>
                    field.onChange(v ? Number(v) : undefined)
                  }
                  items={participantesArl.map((p) => ({
                    label: p.label,
                    value: String(p.id),
                  }))}
                >
                  <SelectTrigger id="profesional_acta_id" className="w-full">
                    <SelectValue placeholder="Selecciona un participante" />
                  </SelectTrigger>
                  <SelectContent>
                    {participantesArl.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
      </RoleGate>
    </SeccionAcordeon>
  );
}
