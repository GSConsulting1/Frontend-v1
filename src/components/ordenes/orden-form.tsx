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
//
// El título + link "Volver" + botón "Guardar" viven en un solo PageHeader
// pegajoso (ver components/layout/page-header.tsx), como primer hijo de
// <form> — así el botón siempre está a la vista y comparte el mismo
// useForm que el resto del formulario (isDirty/isSubmitting), sin
// necesidad de Context. El botón se deshabilita salvo que haya cambios sin
// guardar (isDirty) y, tras guardar, su label hace un "flash" temporal
// (✓ Guardado / ⚠ Error) que vuelve solo al estado normal — ver
// SAVE_STATUS_TIMEOUT_MS.

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SaveButton } from "@/components/forms/save-button";
import { OrdenCampos } from "@/components/ordenes/orden-campos";
import { OrdenCamposInfo } from "@/components/ordenes/orden-campos-info";
import { OrdenInfoSecciones } from "@/components/ordenes/orden-info-secciones";
import {
  ordenServicioSchema,
  type OrdenServicioFormValues,
} from "@/lib/validations/orden.schema";
import {
  ordenInfoExtendidaSchema,
  type OrdenInfoExtendidaFormValues,
} from "@/lib/validations/info-orden.schema";
import { createOrden, guardarInformacionOrden } from "@/app/ordenes/actions";
import { useAuth } from "@/components/auth/auth-provider";

const ordenInfoFormSchema = ordenServicioSchema.extend(
  ordenInfoExtendidaSchema.shape,
);

export type OrdenInfoFormValues = OrdenServicioFormValues &
  OrdenInfoExtendidaFormValues;

type SelectOption = { id: number; label: string };

type SaveStatus = "idle" | "success" | "error";

const SAVE_STATUS_TIMEOUT_MS: Record<Exclude<SaveStatus, "idle">, number> = {
  success: 2500,
  error: 4000,
};

type OrdenFormProps = {
  mode: "nueva" | "existente";
  titulo: string;
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
  titulo,
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
  const esAdmin = perfil?.rol === "administrador";
  const [serverError, setServerError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const {
    register,
    control,
    watch,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OrdenInfoFormValues>({
    resolver: zodResolver(ordenInfoFormSchema),
    defaultValues: { entregablesIds: [], ...defaultValues },
  });

  useEffect(() => {
    if (saveStatus === "idle") return;
    const timeout = setTimeout(
      () => setSaveStatus("idle"),
      SAVE_STATUS_TIMEOUT_MS[saveStatus],
    );
    return () => clearTimeout(timeout);
  }, [saveStatus]);

  async function onSubmit(values: OrdenInfoFormValues) {
    setServerError(null);

    if (mode === "nueva") {
      const result = await createOrden(values);
      if (!result) return; // éxito -> la action ya redirigió a /ordenes/{id}/editar
      if ("error" in result) {
        setServerError(result.error);
        setSaveStatus("error");
        return;
      }
      if ("fieldErrors" in result) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof OrdenInfoFormValues, {
              message: messages[0],
            });
          }
        }
        setSaveStatus("error");
      }
      return;
    }

    // Si no es administrador, ni valorHora ni los datos generales
    // (ordenes_servicio) se mandan: RLS los rechazaría igual (ver
    // supabase/004_ordenes_servicio_rls.sql), pero tumbaría el guardado de
    // TODAS las secciones en vez de solo la parte restringida — OrdenCampos
    // ya está deshabilitado en pantalla para estos roles, así que `values`
    // trae los datos generales sin cambios de todas formas.
    const datosExtendidos: OrdenInfoFormValues = esAdmin
      ? values
      : { ...values, valorHora: undefined };

    const result = await guardarInformacionOrden(
      ordenId!,
      esAdmin ? values : null,
      datosExtendidos,
    );
    if (!result.ok) {
      setServerError(result.error);
      setSaveStatus("error");
      return;
    }
    setSaveStatus("success");
    reset(values); // marca estos valores como el nuevo baseline -> isDirty vuelve a false
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <PageHeader
        title={titulo}
        backHref="/ordenes"
        backLabel="Volver al listado"
        actions={
          <SaveButton
            type="submit"
            pending={isSubmitting}
            disabled={!isDirty}
            variant={saveStatus === "error" ? "destructive" : "secondary"}
            idleLabel={
              saveStatus === "success"
                ? "✓ Guardado"
                : saveStatus === "error"
                  ? "⚠ Error al guardar"
                  : "Guardar cambios"
            }
            title={
              saveStatus === "error" ? (serverError ?? undefined) : undefined
            }
          />
        }
      />
      <span className="sr-only" role="status" aria-live="polite">
        {saveStatus === "success" && "Cambios guardados."}
        {saveStatus === "error" &&
          (serverError ?? "Ocurrió un error al guardar.")}
      </span>

      <OrdenCamposInfo />

      {!esAdmin && (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden />
          Solo el rol administrador puede editar los datos generales — los ves,
          pero no se pueden modificar desde tu cuenta.
        </p>
      )}

      <OrdenCampos
        register={register}
        control={control}
        errors={errors}
        clientes={clientes}
        estados={estados}
        profesionales={profesionales}
        disabled={!esAdmin}
      />

      {mode === "nueva" && (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden />
          Orden sin guardar: las secciones de información extendida se habilitan
          después de guardar los datos generales, porque cada una depende del{" "}
          <code className="rounded bg-background px-1">id</code> de la orden.
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
    </form>
  );
}
