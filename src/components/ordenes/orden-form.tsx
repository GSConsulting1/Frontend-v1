// Formulario de página completa para una orden — usado por
// app/ordenes/nueva/page.tsx (mode="nueva") y
// app/ordenes/[id]/editar/page.tsx (mode="existente"). Reemplaza tanto la
// creación como la edición inline que antes vivían en la tabla del listado
// (ver structure.md): ahora `ordenes-table.tsx` es de solo lectura y ambos
// flujos pasan por acá.
//
// Client Component: un único useForm cubre los datos generales de la orden
// (OrdenCampos) MÁS las 6 secciones extendidas de "Información orden del
// servicio" (OrdenInfoSecciones), con un solo botón "Guardar". El schema
// combinado (`ordenInfoFormSchema`) es ordenServicioSchema + las 4 claves
// anidadas de ordenInfoExtendidaSchema — al enviar el mismo `values` a los
// dos Server Actions, cada schema de Zod ignora las claves que no le
// corresponden (comportamiento default de z.object()), así que no hace
// falta separar el payload a mano.
//
// En mode="nueva", OrdenInfoSecciones recibe disabled: las 5 tablas
// extendidas usan orden_id como PK/FK hacia ordenes_servicio(id) — no pueden
// tener fila hasta que la orden exista. Al guardar los datos generales,
// createOrden redirige a /ordenes/{id}/editar, donde ya se pueden llenar.

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrdenCampos } from "@/components/ordenes/orden-campos";
import { OrdenCamposInfo } from "@/components/ordenes/orden-campos-info";
import { OrdenInfoSecciones } from "@/components/ordenes/orden-info-secciones";
import { ordenServicioSchema, type OrdenServicioFormValues } from "@/lib/validations/orden.schema";
import { ordenInfoExtendidaSchema, type OrdenInfoExtendidaFormValues } from "@/lib/validations/info-orden.schema";
import { createOrden, guardarInformacionOrden } from "@/app/ordenes/actions";
import { useAuth } from "@/components/auth/auth-provider";

const ordenInfoFormSchema = ordenServicioSchema.extend(ordenInfoExtendidaSchema.shape);

export type OrdenInfoFormValues = OrdenServicioFormValues & OrdenInfoExtendidaFormValues;

type SelectOption = { id: number; label: string };

type OrdenFormProps = {
  mode: "nueva" | "existente";
  ordenId?: number;
  defaultValues?: Partial<OrdenInfoFormValues>;
  clientes: SelectOption[];
  estados: SelectOption[];
  profesionales: SelectOption[];
  ciudades: SelectOption[];
  estadosEjecucion: SelectOption[];
  entregablesEstandar: SelectOption[];
};

export function OrdenForm({
  mode,
  ordenId,
  defaultValues,
  clientes,
  estados,
  profesionales,
  ciudades,
  estadosEjecucion,
  entregablesEstandar,
}: OrdenFormProps) {
  const { perfil } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const {
    register,
    control,
    watch,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OrdenInfoFormValues>({
    resolver: zodResolver(ordenInfoFormSchema),
    defaultValues: { entregablesIds: [], ...defaultValues },
  });

  async function onSubmit(values: OrdenInfoFormValues) {
    setServerError(null);
    setGuardado(false);

    if (mode === "nueva") {
      const result = await createOrden(values);
      if (!result) return; // éxito -> la action ya redirigió a /ordenes/{id}/editar
      if ("error" in result) {
        setServerError(result.error);
        return;
      }
      if ("fieldErrors" in result) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof OrdenInfoFormValues, { message: messages[0] });
          }
        }
      }
      return;
    }

    // Si no es administrador, valorHora nunca se manda: RLS en
    // valor_hora_orden rechazaría el upsert igual, pero tumbaría todo el
    // guardado (incluidas las demás secciones) en vez de solo esa parte.
    const datosExtendidos: OrdenInfoFormValues =
      perfil?.rol === "administrador" ? values : { ...values, valorHora: undefined };

    const result = await guardarInformacionOrden(ordenId!, values, datosExtendidos);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    setGuardado(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}
      {guardado && (
        <p className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          <Info className="size-4 shrink-0" aria-hidden />
          Cambios guardados.
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

      {mode === "nueva" && (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden />
          Orden sin guardar: las secciones de información extendida se habilitan después de
          guardar los datos generales, porque cada una depende del <code className="rounded bg-background px-1">id</code> de la orden.
        </p>
      )}

      <OrdenInfoSecciones
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        ciudades={ciudades}
        estadosEjecucion={estadosEjecucion}
        profesionales={profesionales}
        entregablesEstandar={entregablesEstandar}
        disabled={mode === "nueva"}
      />

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
