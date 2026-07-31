"use client";

import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { Info } from "lucide-react";
import { OrdenCampos } from "@/components/ordenes/orden-campos";
import { OrdenCamposInfo } from "@/components/ordenes/orden-campos-info";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { algunoLleno } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

type SelectOption = { id: number; label: string };

export type SeccionDatosGeneralesProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  clientes: SelectOption[];
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// "Datos generales" (ordenes_servicio) como una sección más del acordeón —
// disabled = !puedeEditarGeneral (ver orden-form.tsx: administrador,
// financiero o talento), no mode === "nueva" como las otras 6: esta sí es
// editable desde el arranque, es la única sección que no depende de que la
// orden ya tenga id.
export function SeccionDatosGenerales({
  register,
  control,
  errors,
  watch,
  clientes,
  disabled,
  open,
  onOpenChange,
}: SeccionDatosGeneralesProps) {
  const datosGenerales = watch(["cliente_id", "nombre_servicio"]);

  return (
    <SeccionAcordeon
      titulo="Datos generales"
      resumen={
        disabled
          ? "Solo los roles administrador, financiero y talento pueden editarla"
          : undefined
      }
      completo={algunoLleno(datosGenerales)}
      open={open}
      onOpenChange={onOpenChange}
    >
      {disabled && (
        <p className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden />
          Solo los roles administrador, financiero y talento pueden editar los
          datos generales — puedes verlos y copiarlos, pero no modificarlos
          desde tu cuenta.
        </p>
      )}
      <OrdenCamposInfo />
      <div className="mt-4">
        <OrdenCampos
          register={register}
          control={control}
          errors={errors}
          clientes={clientes}
          disabled={disabled}
        />
      </div>
    </SeccionAcordeon>
  );
}
