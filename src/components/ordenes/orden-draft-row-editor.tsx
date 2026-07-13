// Fila "en blanco" que aparece al apretar "Nueva orden": vive expandida desde
// que se crea (nunca colapsada, porque no hay nada que resumir todavía) y usa
// su propia instancia de react-hook-form, igual que OrdenRowEditor, pero sin
// diff contra un valor original — al guardar se manda el formulario completo
// si es válido, no un patch parcial.

"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { OrdenCampos } from "@/components/ordenes/orden-campos";
import { OrdenCamposInfo } from "@/components/ordenes/orden-campos-info";
import {
  ordenServicioSchema,
  type OrdenServicioFormValues,
} from "@/lib/validations/orden.schema";

type SelectOption = { id: number; label: string };

export type OrdenDraftRowEditorHandle = {
  // Valida la fila nueva y devuelve el formulario completo si es válido.
  // null si todavía le faltan campos requeridos (ej. cliente).
  getValuesIfValid: () => Promise<OrdenServicioFormValues | null>;
};

type OrdenDraftRowEditorProps = {
  clientes: SelectOption[];
  estados: SelectOption[];
  profesionales: SelectOption[];
  onValidChange: (isValid: boolean) => void;
};

// Mismo motivo que en OrdenRowEditor: los campos de texto/fecha ligados con
// register() no pueden partir en `undefined` (el DOM los pinta como "").
const VALORES_VACIOS: Partial<OrdenServicioFormValues> = {
  numero_os_cliente: "",
  fecha_recepcion_os: "",
  nombre_empresa_usuaria: "",
  nit_empresa_usuaria: "",
  cronograma: "",
  secuencia: "",
  nombre_servicio: "",
  tipo_servicio: "",
  fecha_sipab: "",
  observaciones_iniciales: "",
  link: "",
};

export const OrdenDraftRowEditor = forwardRef<OrdenDraftRowEditorHandle, OrdenDraftRowEditorProps>(
  function OrdenDraftRowEditor({ clientes, estados, profesionales, onValidChange }, ref) {
    const {
      register,
      control,
      trigger,
      getValues,
      formState: { errors, isValid },
    } = useForm<OrdenServicioFormValues>({
      resolver: zodResolver(ordenServicioSchema),
      defaultValues: VALORES_VACIOS,
      mode: "onChange",
    });

    useEffect(() => {
      onValidChange(isValid);
    }, [isValid, onValidChange]);

    useImperativeHandle(ref, () => ({
      async getValuesIfValid() {
        const valid = await trigger();
        return valid ? getValues() : null;
      },
    }));

    return (
      <div className="space-y-4 p-4">
        <OrdenCamposInfo />
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
