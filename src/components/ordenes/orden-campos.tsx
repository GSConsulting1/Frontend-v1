// "Datos generales": todo lo editable de ordenes_servicio, cliente incluido.
// Único consumidor: OrdenForm (formulario de página completa).
//
// El orden de los campos NO es libre: sigue el orden en que quien carga la
// orden lee el documento del cliente (datos del cliente -> cronograma ->
// servicio -> responsables) y fue definido por negocio. Los dos últimos
// campos (Estado y Link del archivo de la orden) quedan al final a
// propósito: no vienen del documento del cliente, son de gestión interna.
// Si hay que mover un campo, moverlo acá; los labels también son los
// acordados con negocio, no descripciones libres.

"use client";

import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ESTADOS_ORDEN,
  TIPO_SERVICIO_OPCIONES,
  type OrdenServicioFormValues,
} from "@/lib/validations/orden.schema";

type SelectOption = { id: number; label: string };
// El NIT viaja con la opción para poder autocompletar el campo "Nit Empresa
// usuaria" al elegir una empresa — ver el Combobox más abajo.
type EmpresaUsuariaOption = SelectOption & { nit: string | null };

export type OrdenCamposProps = {
  register: UseFormRegister<OrdenServicioFormValues>;
  control: Control<OrdenServicioFormValues>;
  errors: FieldErrors<OrdenServicioFormValues>;
  // Para copiar nombre/NIT de la empresa usuaria y el nombre del responsable
  // SEC elegidos a las columnas de texto que todavía leen el listado, el Excel
  // y el PDF.
  setValue: UseFormSetValue<OrdenServicioFormValues>;
  clientes: SelectOption[];
  empresasUsuarias: EmpresaUsuariaOption[];
  responsablesSec: SelectOption[];
  // Solo administrador puede editar Datos generales (ver structure.md,
  // supabase/migrations/20260802085134_baseline_esquema_remoto.sql) — cualquier otro rol la ve pero
  // no puede tocarla.
  disabled: boolean;
  // Excepción puntual del rol programador: llega con disabled=true (no edita
  // la sección) pero sí puede escribir en "Observaciones del responsable SEC
  // para GS". Es el único campo donde este flag se combina con `disabled`.
  // Si aparece una segunda excepción así, conviene reemplazar estos dos
  // booleanos por una matriz de permisos por campo — ver el plan en
  // PLAN-permisos-por-rol.md.
  puedeEditarObservacionesSec: boolean;
};

export function OrdenCampos({
  register,
  control,
  errors,
  setValue,
  clientes,
  empresasUsuarias,
  responsablesSec,
  disabled,
  puedeEditarObservacionesSec,
}: OrdenCamposProps) {
  // Órdenes anteriores al catálogo (o importadas desde el Excel del ARL, que
  // sigue escribiendo solo texto) pueden tener nombre cargado y la FK vacía.
  // Sin este aviso el Combobox se vería vacío y parecería que la orden no
  // tiene empresa usuaria, cuando en realidad la tiene sin vincular.
  const empresaUsuariaId = useWatch({ control, name: "empresa_usuaria_id" });
  const nombreGuardado = useWatch({
    control,
    name: "nombre_empresa_usuaria",
  });
  const sinVincular =
    !disabled && empresaUsuariaId == null && Boolean(nombreGuardado);

  // Mismo caso para el responsable SEC: hasta la migración
  // 20260816001045_catalogo_responsables_sec.sql esto era texto con un CHECK, y
  // las órdenes importadas desde el Excel del ARL pueden traer el nombre sin la
  // FK resuelta.
  const responsableSecId = useWatch({ control, name: "responsable_sec_id" });
  const responsableGuardado = useWatch({ control, name: "responsable_os" });
  const responsableSinVincular =
    !disabled && responsableSecId == null && Boolean(responsableGuardado);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Cliente"
        htmlFor="cliente_id"
        required
        error={errors.cliente_id ? "Selecciona un cliente" : undefined}
      >
        <Controller
          name="cliente_id"
          control={control}
          render={({ field }) =>
            disabled ? (
              <Input
                id="cliente_id"
                readOnly
                value={
                  clientes.find((c) => c.id === field.value)?.label ?? ""
                }
              />
            ) : (
              <Select
                value={field.value != null ? String(field.value) : null}
                onValueChange={(v: string | null) =>
                  field.onChange(v ? Number(v) : undefined)
                }
                items={clientes.map((c) => ({
                  label: c.label,
                  value: String(c.id),
                }))}
              >
                <SelectTrigger id="cliente_id" className="w-full">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
        />
      </FormField>

      <FormField
        label="Número de OS del cliente"
        htmlFor="numero_os_cliente"
      >
        <Input
          id="numero_os_cliente"
          readOnly={disabled}
          {...register("numero_os_cliente")}
        />
      </FormField>

      <FormField
        label="Fecha de recepción OS del cliente"
        htmlFor="fecha_recepcion_os"
      >
        <Input
          id="fecha_recepcion_os"
          type="date"
          readOnly={disabled}
          {...register("fecha_recepcion_os")}
        />
      </FormField>

      <FormField
        label="Nombre Empresa usuaria del cliente"
        htmlFor="empresa_usuaria_id"
      >
        {disabled ? (
          // Sin permiso de edición se muestra el texto guardado en la orden y
          // no el catálogo: es lo mismo que se ve al imprimir/exportar.
          <Input
            id="empresa_usuaria_id"
            readOnly
            {...register("nombre_empresa_usuaria")}
          />
        ) : (
          <Controller
            name="empresa_usuaria_id"
            control={control}
            render={({ field }) => (
              <Combobox
                items={empresasUsuarias}
                value={
                  empresasUsuarias.find((e) => e.id === field.value) ?? null
                }
                onValueChange={(empresa: EmpresaUsuariaOption | null) => {
                  field.onChange(empresa?.id ?? undefined);
                  // Las dos columnas de texto siguen siendo las que leen el
                  // listado, el Excel y el PDF, así que se copian acá desde la
                  // opción elegida en vez de escribirse a mano. Este es el
                  // "autollenado" del NIT.
                  setValue("nombre_empresa_usuaria", empresa?.label ?? "", {
                    shouldDirty: true,
                  });
                  setValue("nit_empresa_usuaria", empresa?.nit ?? "", {
                    shouldDirty: true,
                  });
                }}
                itemToStringLabel={(e: EmpresaUsuariaOption) => e.label}
                isItemEqualToValue={(
                  a: EmpresaUsuariaOption,
                  b: EmpresaUsuariaOption,
                ) => a.id === b.id}
                limit={100}
                autoHighlight
              >
                <ComboboxInputGroup>
                  <ComboboxInput
                    id="empresa_usuaria_id"
                    placeholder="Escribe para buscar"
                  />
                  <ComboboxClear aria-label="Limpiar empresa usuaria" />
                  <ComboboxTrigger aria-label="Ver empresas usuarias" />
                </ComboboxInputGroup>
                <ComboboxContent>
                  <ComboboxEmpty>
                    Ninguna empresa coincide. Se dan de alta en Clientes →
                    Empresas usuarias.
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(empresa: EmpresaUsuariaOption) => (
                      <ComboboxItem key={empresa.id} value={empresa}>
                        {empresa.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
          />
        )}
        {sinVincular && (
          <p className="text-sm text-muted-foreground">
            Esta orden tiene «{nombreGuardado}» cargado como texto y todavía no
            está vinculado al catálogo. Elegí la empresa de la lista para
            vincularla.
          </p>
        )}
      </FormField>

      <FormField
        label="Nit Empresa usuaria del cliente"
        htmlFor="nit_empresa_usuaria"
      >
        {/* Siempre de solo lectura: el NIT es un dato de la empresa, no de la
            orden. Se autocompleta al elegirla arriba y se corrige en
            Clientes → Empresas usuarias, no acá — así dos órdenes de la misma
            empresa no pueden terminar con NIT distinto, que es justo el
            desorden que dejó la etapa de texto libre. */}
        <Input
          id="nit_empresa_usuaria"
          readOnly
          {...register("nit_empresa_usuaria")}
        />
      </FormField>

      <FormField
        label="Cronograma"
        htmlFor="cronograma"
        error={errors.cronograma?.message}
      >
        <Input
          id="cronograma"
          type="number"
          step="1"
          min="0"
          readOnly={disabled}
          {...register("cronograma", {
            setValueAs: (v) =>
              v === "" || v === undefined ? undefined : Number(v),
          })}
        />
      </FormField>

      <FormField label="Secuencia" htmlFor="secuencia">
        <Input
          id="secuencia"
          readOnly={disabled}
          {...register("secuencia")}
        />
      </FormField>

      <FormField
        label="Nombre del servicio"
        htmlFor="nombre_servicio"
        required
        error={errors.nombre_servicio?.message}
      >
        <Input
          id="nombre_servicio"
          readOnly={disabled}
          {...register("nombre_servicio")}
        />
      </FormField>

      <FormField
        label="Horas cargadas"
        htmlFor="horas_cargadas"
        error={errors.horas_cargadas?.message}
      >
        <Input
          id="horas_cargadas"
          type="number"
          step="0.5"
          min="0"
          readOnly={disabled}
          {...register("horas_cargadas", {
            setValueAs: (v) =>
              v === "" || v === undefined ? undefined : Number(v),
          })}
        />
      </FormField>

      <FormField label="Tipo Servicio" htmlFor="tipo_servicio">
        <Controller
          name="tipo_servicio"
          control={control}
          render={({ field }) =>
            disabled ? (
              <Input id="tipo_servicio" readOnly value={field.value ?? ""} />
            ) : (
              <Select
                value={field.value ?? null}
                onValueChange={(v: string | null) =>
                  field.onChange(
                    v as (typeof TIPO_SERVICIO_OPCIONES)[number] | undefined,
                  )
                }
                items={TIPO_SERVICIO_OPCIONES.map((o) => ({
                  label: o,
                  value: o,
                }))}
              >
                <SelectTrigger id="tipo_servicio" className="w-full">
                  <SelectValue placeholder="Selecciona un tipo de servicio" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_SERVICIO_OPCIONES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
        />
      </FormField>

      <FormField label="Fecha SIPAB" htmlFor="fecha_sipab">
        <Input
          id="fecha_sipab"
          type="date"
          readOnly={disabled}
          {...register("fecha_sipab")}
        />
      </FormField>

      <FormField
        label="Asesor Gestión Riesgos / Responsable de la OS del cliente"
        htmlFor="asesor_gestion_riesgos"
      >
        <Input
          id="asesor_gestion_riesgos"
          readOnly={disabled}
          {...register("asesor_gestion_riesgos")}
        />
      </FormField>

      <div className="sm:col-span-2">
        <FormField
          label="Observaciones iniciales del cliente"
          htmlFor="observaciones_iniciales"
        >
          <Textarea
            id="observaciones_iniciales"
            readOnly={disabled}
            {...register("observaciones_iniciales")}
          />
        </FormField>
      </div>

      <FormField
        label="Tiene Valor Transporte"
        htmlFor="tarifa_valor_transporte"
        error={errors.tarifa_valor_transporte?.message}
      >
        <Input
          id="tarifa_valor_transporte"
          readOnly={disabled}
          {...register("tarifa_valor_transporte")}
        />
      </FormField>

      <FormField
        label="Responsable SEC para GS"
        htmlFor="responsable_sec_id"
      >
        {disabled ? (
          // Sin permiso de edición se muestra el texto guardado en la orden y
          // no el catálogo: es lo mismo que se ve al imprimir/exportar.
          <Input id="responsable_sec_id" readOnly {...register("responsable_os")} />
        ) : (
          <Controller
            name="responsable_sec_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value != null ? String(field.value) : null}
                onValueChange={(v: string | null) => {
                  const id = v ? Number(v) : undefined;
                  field.onChange(id);
                  // responsable_os sigue siendo la columna que leen el listado,
                  // el filtro, el Excel y el PDF, así que se copia acá desde la
                  // opción elegida en vez de escribirse a mano. Desde la
                  // migración 20260819012529 lo que se copia es el EMAIL de la
                  // casilla, no el nombre de una persona.
                  setValue(
                    "responsable_os",
                    responsablesSec.find((r) => r.id === id)?.label ?? "",
                    { shouldDirty: true },
                  );
                }}
                items={responsablesSec.map((r) => ({
                  label: r.label,
                  value: String(r.id),
                }))}
              >
                <SelectTrigger id="responsable_sec_id" className="w-full">
                  <SelectValue placeholder="Selecciona un responsable" />
                </SelectTrigger>
                <SelectContent>
                  {responsablesSec.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
        {responsableSinVincular && (
          <p className="text-sm text-muted-foreground">
            Esta orden tiene «{responsableGuardado}» cargado como texto y
            todavía no está vinculado al catálogo. Elegí la persona de la lista
            para vincularla.
          </p>
        )}
      </FormField>

      <div className="sm:col-span-2">
        <FormField
          label="Observaciones del responsable SEC para GS"
          htmlFor="observaciones_responsable_sec"
        >
          <Textarea
            id="observaciones_responsable_sec"
            readOnly={disabled && !puedeEditarObservacionesSec}
            {...register("observaciones_responsable_sec")}
          />
        </FormField>
      </div>

      {/* Estado y Link del archivo cierran la sección: son gestión interna,
          no datos que vengan de la OS del cliente (ver comentario de arriba). */}
      <FormField
        label="Estado"
        htmlFor="estado"
        error={errors.estado?.message}
      >
        <Controller
          name="estado"
          control={control}
          render={({ field }) =>
            disabled ? (
              <Input id="estado" readOnly value={field.value ?? ""} />
            ) : (
              <Select
                value={field.value ?? null}
                onValueChange={(v: string | null) =>
                  field.onChange(
                    v as (typeof ESTADOS_ORDEN)[number] | undefined,
                  )
                }
                items={ESTADOS_ORDEN.map((e) => ({ label: e, value: e }))}
              >
                <SelectTrigger id="estado" className="w-full">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_ORDEN.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
        />
      </FormField>

      <div className="sm:col-span-2">
        <FormField
          label="Link del archivo de la orden"
          htmlFor="link_archivo_orden"
          error={errors.link_archivo_orden?.message}
        >
          <Input
            id="link_archivo_orden"
            type="url"
            placeholder="https://drive.google.com/..."
            readOnly={disabled}
            {...register("link_archivo_orden")}
          />
        </FormField>
      </div>
    </div>
  );
}
