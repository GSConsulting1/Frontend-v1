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
// administrador o financiero — mismo criterio que valor-hora.tsx. Si el rol
// no puede verla, la sección ni se renderiza.
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

  if (!puedeVerFinanciera) return null;

  return (
    <SeccionAcordeon
      titulo="Facturación"
      resumen="Prefactura, factura y alertas de facturación"
      completo={algunoLleno(facturacion)}
      open={open}
      onOpenChange={onOpenChange}
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
    </SeccionAcordeon>
  );
}
