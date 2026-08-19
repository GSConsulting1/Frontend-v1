// Los 3 campos de una casilla de responsable SEC, compartidos por el alta
// (responsables-sec-listado.tsx) y por la fila de edición inline
// (responsables-sec-table.tsx) — mismo schema, solo cambia qué Server Action se
// llama al enviar. Vive en su propio archivo, y no dentro de uno de los dos,
// porque los dos lo importan.
//
// idPrefix: los dos formularios pueden estar montados a la vez (alta abierta +
// una fila en edición), así que los id/htmlFor tienen que ser únicos o el
// <Label> apunta al input equivocado.

"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import type { ResponsableSecFormValues } from "@/lib/validations/responsable-sec.schema";

type CamposResponsableSecProps = {
  idPrefix: string;
  register: UseFormRegister<ResponsableSecFormValues>;
  errors: FieldErrors<ResponsableSecFormValues>;
};

export function CamposResponsableSec({
  idPrefix,
  register,
  errors,
}: CamposResponsableSecProps) {
  return (
    <>
      {/* El email va primero porque es la IDENTIDAD de la casilla: es lo único
          que se muestra en el formulario de órdenes, el filtro, el Excel y el
          PDF, lo único único en la tabla, y lo que empareja con `usuarios`.
          El nombre quedó como etiqueta interna de esta pantalla. */}
      <FormField
        label="Email"
        htmlFor={`${idPrefix}-email`}
        required
        error={errors.email?.message}
      >
        <Input id={`${idPrefix}-email`} type="email" {...register("email")} />
      </FormField>
      <FormField
        label="Nombre completo"
        htmlFor={`${idPrefix}-nombre_completo`}
        required
        error={errors.nombre_completo?.message}
      >
        <Input
          id={`${idPrefix}-nombre_completo`}
          {...register("nombre_completo")}
        />
      </FormField>
      <FormField
        label="Celular"
        htmlFor={`${idPrefix}-celular`}
        error={errors.celular?.message}
      >
        <Input id={`${idPrefix}-celular`} {...register("celular")} />
      </FormField>
    </>
  );
}
