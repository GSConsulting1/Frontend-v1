// Los 2 campos de un cliente, compartidos por el formulario de alta
// (clientes-listado.tsx) y por la fila de edición inline (clientes-table.tsx)
// — mismo schema, solo cambia qué Server Action se llama al enviar. Vive en su
// propio archivo, y no dentro de uno de los dos, porque los dos lo importan.
//
// idPrefix: los dos formularios pueden estar montados a la vez (alta abierta +
// una fila en edición), así que los id/htmlFor tienen que ser únicos o el
// <Label> apunta al input equivocado.

"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import type { ClienteFormValues } from "@/lib/validations/cliente.schema";

type CamposClienteProps = {
  idPrefix: string;
  register: UseFormRegister<ClienteFormValues>;
  errors: FieldErrors<ClienteFormValues>;
};

export function CamposCliente({
  idPrefix,
  register,
  errors,
}: CamposClienteProps) {
  return (
    <>
      <FormField
        label="Nombre del cliente"
        htmlFor={`${idPrefix}-nombre_cliente`}
        required
        error={errors.nombre_cliente?.message}
      >
        <Input
          id={`${idPrefix}-nombre_cliente`}
          {...register("nombre_cliente")}
        />
      </FormField>
      <FormField
        label="NIT"
        htmlFor={`${idPrefix}-nit`}
        error={errors.nit?.message}
      >
        <Input id={`${idPrefix}-nit`} {...register("nit")} />
      </FormField>
    </>
  );
}
