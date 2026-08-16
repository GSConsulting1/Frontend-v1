// Los 2 campos de un participante ARL, compartidos por el formulario de alta
// (participantes-arl-listado.tsx) y por la fila de edición inline
// (participantes-arl-table.tsx) — mismo schema, solo cambia qué Server Action
// se llama al enviar. Vive en su propio archivo, y no dentro de uno de los dos,
// porque los dos lo importan.
//
// idPrefix: los dos formularios pueden estar montados a la vez (alta abierta +
// una fila en edición), así que los id/htmlFor tienen que ser únicos o el
// <Label> apunta al input equivocado.

"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import type { ParticipanteArlFormValues } from "@/lib/validations/participante-arl.schema";

type CamposParticipanteArlProps = {
  idPrefix: string;
  register: UseFormRegister<ParticipanteArlFormValues>;
  errors: FieldErrors<ParticipanteArlFormValues>;
};

export function CamposParticipanteArl({
  idPrefix,
  register,
  errors,
}: CamposParticipanteArlProps) {
  return (
    <>
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
        label="Cédula"
        htmlFor={`${idPrefix}-cedula`}
        error={errors.cedula?.message}
      >
        <Input id={`${idPrefix}-cedula`} {...register("cedula")} />
      </FormField>
    </>
  );
}
