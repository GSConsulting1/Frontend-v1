// Formulario de página completa para una orden — usado por
// app/ordenes/nueva/page.tsx (mode="nueva") y
// app/ordenes/[id]/editar/page.tsx (mode="existente"). Reemplaza tanto la
// creación como la edición inline que antes vivían en la tabla del listado
// (ver structure.md): ahora `ordenes-table.tsx` es de solo lectura y ambos
// flujos pasan por acá.
//
// Client Component: un único useForm cubre los datos generales de la orden
// (SeccionDatosGenerales) MÁS las 11 secciones extendidas de "Información
// orden del servicio" (OrdenInfoSecciones), con un solo botón "Guardar". El
// schema combinado (`ordenInfoFormSchema`) es ordenServicioSchema + las
// claves anidadas de ordenInfoExtendidaSchema — al enviar el mismo `values`
// a los dos Server Actions, cada schema de Zod ignora las claves que no le
// corresponden (comportamiento default de z.object()), así que no hace
// falta separar el payload a mano.
//
// En mode="nueva", OrdenInfoSecciones recibe disabled: las 10 tablas
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
//
// Las 7 secciones (Datos generales + las 6 de OrdenInfoSecciones) son un
// único acordeón: `seccionAbierta` guarda el id de la que está
// descolapsada (o null) y se lo pasa a cada una — al abrir una se cierran
// las demás. Arranca en la primera sección habilitada (para
// administrador/financiero/talento: "Datos generales"; si no, la primera de
// las 6 salvo que mode === "nueva", donde esas 6 están deshabilitadas hasta
// guardar).

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SaveButton } from "@/components/forms/save-button";
import { SeccionDatosGenerales } from "@/components/ordenes/secciones/datos-generales";
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

// Las 12 secciones del acordeón único de OrdenForm (Datos generales + las 11
// de OrdenInfoSecciones) — un solo id abierto a la vez, ver arriba.
export type SeccionId =
  | "datos-generales"
  | "datos-actividad"
  | "profesional-contacto"
  | "detalle-entrega"
  | "entregables-estandar"
  | "valor-hora"
  | "checklist"
  | "cuenta-cobro"
  | "acta-servicio"
  | "radicacion-imagine"
  | "facturacion"
  | "liquidacion";

type OrdenFormProps = {
  mode: "nueva" | "existente";
  titulo: string;
  ordenId?: number;
  defaultValues?: Partial<OrdenInfoFormValues>;
  clientes: SelectOption[];
  // valorHora viaja acá para precargar "Valor hora profesional" con la
  // tarifa base del profesional elegido — ver SeccionValorHora.
  profesionales: (SelectOption & { valorHora: number | null })[];
  participantesArl: SelectOption[];
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
  profesionales,
  participantesArl,
  ciudades,
  estadosEjecucion,
  entregablesEstandar,
}: OrdenFormProps) {
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === "administrador";
  // Las 5 tablas de la sección financiera (cuenta de cobro, acta de
  // servicio, radicación Imagine, facturación, liquidación) están gateadas
  // a administrador y financiero únicamente (ver RLS "fin_all").
  const puedeVerFinanciera = esAdmin || perfil?.rol === "financiero";
  // Datos generales + "Valor hora profesional" suman también a talento —
  // ve/edita todo salvo la sección financiera de arriba (ver RLS
  // "admin_fin_valor_hora").
  const puedeEditarGeneral = puedeVerFinanciera || perfil?.rol === "talento";
  const [serverError, setServerError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [seccionAbierta, setSeccionAbierta] = useState<SeccionId | null>(
    puedeEditarGeneral ? "datos-generales" : mode !== "nueva" ? "datos-actividad" : null,
  );
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OrdenInfoFormValues>({
    resolver: zodResolver(ordenInfoFormSchema),
    defaultValues: { entregablesIds: [], ...defaultValues },
  });

  // El evento nativo `toggle` de <details> se dispara tanto cuando el
  // usuario hace click en el summary como cuando React cierra una sección
  // por código (al abrir otra) — hay que respetar el `open` real del
  // evento en vez de invertir el estado a ciegas, si no, el cierre
  // programático de la sección anterior dispara su propio toggle y la
  // vuelve a abrir (parpadeo infinito entre las dos).
  function toggleSeccion(id: SeccionId, open: boolean) {
    setSeccionAbierta((actual) => {
      if (open) return id;
      return actual === id ? null : actual;
    });
  }

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

    // Si no puede editar datos generales (no es administrador, financiero
    // ni talento), esos datos (ordenes_servicio) no se mandan:
    // SeccionDatosGenerales ya está deshabilitada en pantalla para los demás
    // roles, así que `values` trae esos datos sin cambios de todas formas.
    // Mismo criterio para valorHora; la sección financiera de 5 tablas usa
    // el flag más angosto (puedeVerFinanciera) porque talento no la ve.
    const datosExtendidos: OrdenInfoFormValues = {
      ...values,
      ...(puedeEditarGeneral ? {} : { valorHora: undefined }),
      ...(puedeVerFinanciera
        ? {}
        : {
            cuentaCobro: undefined,
            actaServicio: undefined,
            radicacionImagine: undefined,
            facturacion: undefined,
            liquidacion: undefined,
          }),
    };

    const result = await guardarInformacionOrden(
      ordenId!,
      puedeEditarGeneral ? values : null,
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

      <div className="space-y-3">
        <SeccionDatosGenerales
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          clientes={clientes}
          disabled={!puedeEditarGeneral}
          open={seccionAbierta === "datos-generales"}
          onOpenChange={(open) => toggleSeccion("datos-generales", open)}
        />

        {mode === "nueva" && (
          <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <Info className="size-4 shrink-0" aria-hidden />
            Orden sin guardar: las secciones de información extendida se
            habilitan después de guardar los datos generales, porque cada una
            depende del <code className="rounded bg-background px-1">
              id
            </code>{" "}
            de la orden.
          </p>
        )}

        <OrdenInfoSecciones
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          ciudades={ciudades}
          estadosEjecucion={estadosEjecucion}
          profesionales={profesionales}
          participantesArl={participantesArl}
          entregablesEstandar={entregablesEstandar}
          disabled={mode === "nueva"}
          seccionAbierta={seccionAbierta}
          onToggleSeccion={toggleSeccion}
        />
      </div>
    </form>
  );
}
