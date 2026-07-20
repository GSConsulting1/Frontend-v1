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

export type SeccionFacturacionProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  puedeVerFinanciera: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// "Facturación" vive en su propia tabla (facturacion), gateada por rol
// administrador o financiero — mismo criterio que valor-hora.tsx.
export function SeccionFacturacion({
  register,
  watch,
  puedeVerFinanciera,
  open,
  onOpenChange,
}: SeccionFacturacionProps) {
  const facturacion = watch([
    "facturacion.numero_prefactura",
    "facturacion.numero_factura",
  ]);

  return (
    <SeccionAcordeon
      titulo="Facturación"
      resumen={
        puedeVerFinanciera
          ? "Prefactura, factura y alertas de facturación"
          : "Visible solo para los roles administrador y financiero"
      }
      completo={algunoLleno(facturacion)}
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
                ver y editar la facturación.
              </p>
            </div>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Número de prefactura" htmlFor="numero_prefactura">
            <Input
              id="numero_prefactura"
              {...register("facturacion.numero_prefactura")}
            />
          </FormField>
          <FormField label="Número de factura" htmlFor="numero_factura">
            <Input
              id="numero_factura"
              {...register("facturacion.numero_factura")}
            />
          </FormField>
          <FormField label="Estado de facturación" htmlFor="estado_facturacion">
            <Input
              id="estado_facturacion"
              {...register("facturacion.estado_facturacion")}
            />
          </FormField>
          <FormField label="Alerta de facturación" htmlFor="alerta_facturacion">
            <Input
              id="alerta_facturacion"
              {...register("facturacion.alerta_facturacion")}
            />
          </FormField>
        </div>
      </RoleGate>
    </SeccionAcordeon>
  );
}
