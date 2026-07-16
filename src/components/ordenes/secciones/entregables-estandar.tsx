"use client";

import { Controller, type Control, type UseFormWatch } from "react-hook-form";
import { SeccionAcordeon } from "@/components/ui/seccion-acordeon";
import { cn } from "@/lib/utils";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

type SelectOption = { id: number; label: string };

export type SeccionEntregablesEstandarProps = {
  control: Control<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  entregablesEstandar: SelectOption[];
};

export function SeccionEntregablesEstandar({
  control,
  watch,
  entregablesEstandar,
}: SeccionEntregablesEstandarProps) {
  const entregablesIds = watch("entregablesIds") ?? [];

  return (
    <SeccionAcordeon
      titulo="Entregables estándar"
      resumen={`${entregablesIds.length} de ${entregablesEstandar.length} seleccionados`}
      completo={entregablesIds.length > 0}
      chipTexto={`${entregablesIds.length} de ${entregablesEstandar.length}`}
    >
      <Controller
        name="entregablesIds"
        control={control}
        render={({ field }) => {
          const seleccionados = field.value ?? [];
          return (
            <div className="flex flex-wrap gap-2">
              {entregablesEstandar.map((e) => {
                const activo = seleccionados.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() =>
                      field.onChange(
                        activo
                          ? seleccionados.filter((id) => id !== e.id)
                          : [...seleccionados, e.id],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      activo
                        ? "border-border bg-secondary font-medium text-secondary-foreground"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {activo ? "✓ " : ""}
                    {e.label}
                  </button>
                );
              })}
            </div>
          );
        }}
      />
    </SeccionAcordeon>
  );
}
