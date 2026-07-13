// Panel de edición que aparece al desplegar una fila del listado. Cada fila
// desplegada tiene su PROPIA instancia de react-hook-form (en vez de un
// estado central por campo) para poder reusar OrdenCampos tal cual y apoyarse
// en zodResolver para la validación — igual que OrdenForm, pero sin submit
// propio: el padre (OrdenesTable) pide el patch vía `ref` cuando el usuario
// aprieta "Guardar cambios".

"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { OrdenCampos } from "@/components/ordenes/orden-campos";
import {
  ordenServicioSchema,
  type OrdenServicioFormValues,
} from "@/lib/validations/orden.schema";
import type { OrdenServicioConRelaciones } from "@/types";

type SelectOption = { id: number; label: string };

export type OrdenRowEditorHandle = {
  // Valida la fila y devuelve solo los campos que cambiaron respecto al
  // valor original. null si no hay cambios válidos que enviar.
  getPatch: () => Promise<Partial<OrdenServicioFormValues> | null>;
};

type OrdenRowEditorProps = {
  orden: OrdenServicioConRelaciones;
  clientes: SelectOption[];
  estados: SelectOption[];
  profesionales: SelectOption[];
  onStateChange: (id: number, isDirty: boolean, isValid: boolean) => void;
};

// Los campos de texto/fecha van ligados con register() a un <input> nativo:
// el DOM no puede renderizar value={undefined}, así que el navegador los
// muestra como "" desde el primer render. Si defaultValues se queda en
// `undefined` para esos campos, react-hook-form los ve como "distintos" del
// valor real del DOM y marca la fila dirty sin que el usuario toque nada —
// por eso acá se normaliza a "" en vez de undefined. Los campos que van por
// <Controller> (los <Select>) no tienen este problema porque no leen del DOM.
function toFormValues(orden: OrdenServicioConRelaciones): OrdenServicioFormValues {
  return {
    cliente_id: orden.cliente_id,
    estado_id: orden.estado_id ?? undefined,
    numero_os_cliente: orden.numero_os_cliente ?? "",
    fecha_recepcion_os: orden.fecha_recepcion_os ?? "",
    nombre_empresa_usuaria: orden.nombre_empresa_usuaria ?? "",
    nit_empresa_usuaria: orden.nit_empresa_usuaria ?? "",
    cronograma: orden.cronograma ?? "",
    secuencia: orden.secuencia ?? "",
    nombre_servicio: orden.nombre_servicio ?? "",
    horas_cargadas: orden.horas_cargadas ?? undefined,
    tipo_servicio: orden.tipo_servicio ?? "",
    fecha_sipab: orden.fecha_sipab ?? "",
    asesor_gestion_riesgos_id: orden.asesor_gestion_riesgos_id ?? undefined,
    observaciones_iniciales: orden.observaciones_iniciales ?? "",
    // La columna real en Supabase es character varying(1) (guarda "1", "2"
    // como texto) aunque el tipo generado diga `number` — sin este Number(),
    // el valor de la BD (string) nunca es === al valor que produce el input
    // (siempre number), así que la fila queda "sucia" aunque no se toque nada.
    tarifa_valor_transporte:
      orden.tarifa_valor_transporte != null ? Number(orden.tarifa_valor_transporte) : undefined,
    responsable_sec_id: orden.responsable_sec_id ?? undefined,
    link: orden.link ?? "",
  };
}

export const OrdenRowEditor = forwardRef<OrdenRowEditorHandle, OrdenRowEditorProps>(
  function OrdenRowEditor({ orden, clientes, estados, profesionales, onStateChange }, ref) {
    const defaultsRef = useRef(toFormValues(orden));
    const {
      register,
      control,
      trigger,
      getValues,
      formState: { errors, isDirty, isValid },
    } = useForm<OrdenServicioFormValues>({
      resolver: zodResolver(ordenServicioSchema),
      defaultValues: defaultsRef.current,
      mode: "onChange",
    });

    useEffect(() => {
      onStateChange(orden.id, isDirty, isValid);
    }, [orden.id, isDirty, isValid, onStateChange]);

    useImperativeHandle(ref, () => ({
      async getPatch() {
        const valid = await trigger();
        if (!valid) return null;

        const values = getValues();
        const defaults = defaultsRef.current;
        const patch: Partial<OrdenServicioFormValues> = {};
        (Object.keys(values) as (keyof OrdenServicioFormValues)[]).forEach((campo) => {
          if (values[campo] !== defaults[campo]) {
            patch[campo] = values[campo] as never;
          }
        });
        return Object.keys(patch).length > 0 ? patch : null;
      },
    }));

    return (
      <div className="space-y-4 border-t border-border bg-muted/30 p-4">
        <OrdenCampos
          register={register}
          control={control}
          errors={errors}
          clientes={clientes}
          estados={estados}
          profesionales={profesionales}
        />
      </div>
    );
  },
);
