// Los 2 campos de una empresa usuaria, compartidos por el formulario de alta
// (empresas-usuarias-listado.tsx) y por la fila de edición inline
// (empresas-usuarias-table.tsx) — mismo schema, solo cambia qué Server Action
// se llama al enviar. Mismo criterio que components/clientes/campos-cliente.tsx.

"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import type { EmpresaUsuariaFormValues } from "@/lib/validations/empresa-usuaria.schema";

type CamposEmpresaUsuariaProps = {
  idPrefix: string;
  register: UseFormRegister<EmpresaUsuariaFormValues>;
  errors: FieldErrors<EmpresaUsuariaFormValues>;
};

export function CamposEmpresaUsuaria({
  idPrefix,
  register,
  errors,
}: CamposEmpresaUsuariaProps) {
  return (
    <>
      <FormField
        label="Nombre de la empresa"
        htmlFor={`${idPrefix}-nombre`}
        required
        error={errors.nombre?.message}
      >
        <Input id={`${idPrefix}-nombre`} {...register("nombre")} />
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
