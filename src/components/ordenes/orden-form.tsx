// Formulario de página completa para editar una orden — usado por
// app/ordenes/[id]/editar/page.tsx. La creación ya no pasa por acá: se hace
// inline en la tabla del listado (ver ordenes-table.tsx + orden-draft-row-editor.tsx).
//
// Client Component: usa React Hook Form + zodResolver(ordenServicioSchema)
// para validar en el cliente con el MISMO schema que vuelve a correr en el
// servidor (src/app/ordenes/actions.ts). Al enviar, llama directamente a la
// Server Action updateOrden como una función normal — Next.js se encarga de
// la llamada RPC y del redirect al éxito.
//
// Los campos viven en OrdenCampos (components/ordenes/orden-campos.tsx),
// compartido con los editores inline del listado.

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { OrdenCampos } from "@/components/ordenes/orden-campos";
import { OrdenCamposInfo } from "@/components/ordenes/orden-campos-info";
import {
  ordenServicioSchema,
  type OrdenServicioFormValues,
} from "@/lib/validations/orden.schema";
import { updateOrden } from "@/app/ordenes/actions";

type SelectOption = { id: number; label: string };

type OrdenFormProps = {
  ordenId: number;
  defaultValues?: Partial<OrdenServicioFormValues>;
  clientes: SelectOption[];
  estados: SelectOption[];
  profesionales: SelectOption[];
};

export function OrdenForm({
  ordenId,
  defaultValues,
  clientes,
  estados,
  profesionales,
}: OrdenFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OrdenServicioFormValues>({
    resolver: zodResolver(ordenServicioSchema),
    defaultValues,
  });

  async function onSubmit(values: OrdenServicioFormValues) {
    setServerError(null);
    const result = await updateOrden(ordenId, values);

    if (!result) return; // éxito -> la action ya redirigió a /ordenes

    if ("error" in result) {
      setServerError(result.error);
      return;
    }
    if ("fieldErrors" in result) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages?.[0]) {
          setError(field as keyof OrdenServicioFormValues, {
            message: messages[0],
          });
        }
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <OrdenCamposInfo />

      <OrdenCampos
        register={register}
        control={control}
        errors={errors}
        clientes={clientes}
        estados={estados}
        profesionales={profesionales}
      />

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
