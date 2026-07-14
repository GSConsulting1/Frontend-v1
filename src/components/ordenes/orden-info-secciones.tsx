// Las 6 secciones extendidas de "Información orden del servicio" (Plan MVP
// semana 2), como acordeón: Datos de la actividad, Profesional y contacto,
// Detalle de entrega, Entregables estándar, Valor hora (gateada por rol) y
// Checklist del proceso. Vive dentro de OrdenForm, después de OrdenCampos
// ("Datos generales") — comparten un único useForm (ver OrdenInfoFormValues
// en orden-form.tsx) para que un solo botón "Guardar" mande todo junto.
//
// `disabled` se usa en modo "nueva orden sin guardar": las 5 tablas
// extendidas tienen orden_id como PK/FK a ordenes_servicio(id), así que no
// pueden tener fila hasta que la orden exista — ver la nota en OrdenForm.

"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { Check, ChevronRight, Lock } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INFORME_GUARDIAN_OPCIONES } from "@/lib/validations/info-orden.schema";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { RoleGate } from "@/components/auth/role-gate";
import type { OrdenInfoFormValues } from "@/components/ordenes/orden-form";

type SelectOption = { id: number; label: string };

export type OrdenInfoSeccionesProps = {
  register: UseFormRegister<OrdenInfoFormValues>;
  control: Control<OrdenInfoFormValues>;
  errors: FieldErrors<OrdenInfoFormValues>;
  watch: UseFormWatch<OrdenInfoFormValues>;
  ciudades: SelectOption[];
  estadosEjecucion: SelectOption[];
  profesionales: SelectOption[];
  entregablesEstandar: SelectOption[];
  disabled: boolean;
};

function Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4 rounded border-input accent-foreground"
        {...props}
      />
      {label}
    </label>
  );
}

function SeccionAcordeon({
  titulo,
  resumen,
  completo,
  locked,
  chipTexto,
  defaultOpen,
  children,
}: {
  titulo: string;
  resumen?: string;
  completo: boolean;
  locked?: boolean;
  chipTexto?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-lg border border-border bg-card open:border-ring"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span
          className={cn(
            "w-[3px] self-stretch rounded-full",
            completo ? "bg-foreground" : "bg-border",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{titulo}</p>
          {resumen && (
            <p className="truncate text-xs text-muted-foreground">{resumen}</p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            locked
              ? "bg-muted text-muted-foreground"
              : completo
                ? "bg-secondary text-secondary-foreground"
                : "border border-border text-muted-foreground",
          )}
        >
          {locked ? (
            <Lock className="size-3" aria-hidden />
          ) : completo ? (
            <Check className="size-3" aria-hidden />
          ) : null}
          {chipTexto ?? (completo ? "Completo" : "Sin definir")}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t border-border px-4 pt-3 pb-5">{children}</div>
    </details>
  );
}

export function OrdenInfoSecciones({
  register,
  control,
  errors,
  watch,
  ciudades,
  estadosEjecucion,
  profesionales,
  entregablesEstandar,
  disabled,
}: OrdenInfoSeccionesProps) {
  const { perfil } = useAuth();
  const puedeVerValorHora = perfil?.rol === "administrador";

  const datosActividad = watch([
    "infoOrdenServicio.nombre_actividad",
    "infoOrdenServicio.ciudad_id",
    "infoOrdenServicio.fecha_inicio_ejecucion",
  ]);
  const profesionalContacto = watch([
    "infoOrdenServicio.profesional_id",
    "infoOrdenServicio.contacto_nombre",
  ]);
  const detalleEntrega = watch([
    "detalleEntrega.entregables_especificos",
    "detalleEntrega.fecha_cierre_orden",
    "detalleEntrega.profesional_vobo_id",
  ]);
  const entregablesIds = watch("entregablesIds") ?? [];
  const valorHora = watch("valorHora.valor_hora_profesional");
  const checklist = watch([
    "checklist.estado_ejecucion_id",
    "checklist.informe_guardian",
  ]);

  const algunoLleno = (valores: unknown[]) =>
    valores.some((v) => v !== undefined && v !== null && v !== "");

  return (
    <fieldset
      disabled={disabled}
      className={cn("space-y-3", disabled && "pointer-events-none opacity-50")}
    >
      <SeccionAcordeon
        titulo="Datos de la actividad"
        resumen="Ciudad, horario y lugar donde se ejecuta"
        completo={algunoLleno(datosActividad)}
        defaultOpen
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Fecha de emisión OS" htmlFor="fecha_emision_os">
            <Input
              id="fecha_emision_os"
              type="date"
              {...register("infoOrdenServicio.fecha_emision_os")}
            />
          </FormField>
          <FormField label="Ciudad" htmlFor="ciudad_id">
            <Controller
              name="infoOrdenServicio.ciudad_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : null}
                  onValueChange={(v: string | null) =>
                    field.onChange(v ? Number(v) : undefined)
                  }
                  items={ciudades.map((c) => ({
                    label: c.label,
                    value: String(c.id),
                  }))}
                >
                  <SelectTrigger id="ciudad_id" className="w-full">
                    <SelectValue placeholder="Selecciona una ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    {ciudades.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <div className="sm:col-span-2">
            <Checkbox
              label="Actividad reprogramada"
              {...register("infoOrdenServicio.actividad_reprogramada")}
            />
          </div>
          <FormField
            label="Empresa a visitar"
            htmlFor="empresa_a_visitar"
            className="sm:col-span-2"
          >
            <Input
              id="empresa_a_visitar"
              {...register("infoOrdenServicio.empresa_a_visitar")}
            />
          </FormField>
          <FormField
            label="Nombre de la actividad"
            htmlFor="nombre_actividad"
            className="sm:col-span-2"
          >
            <Input
              id="nombre_actividad"
              {...register("infoOrdenServicio.nombre_actividad")}
            />
          </FormField>
          <FormField
            label="Descripción de la actividad"
            htmlFor="descripcion_actividad"
            className="sm:col-span-2"
          >
            <Textarea
              id="descripcion_actividad"
              {...register("infoOrdenServicio.descripcion_actividad")}
            />
          </FormField>
          <FormField
            label="Horas asignadas"
            htmlFor="horas_asignadas"
            error={errors.infoOrdenServicio?.horas_asignadas?.message}
          >
            <Input
              id="horas_asignadas"
              type="number"
              step="0.5"
              min="0"
              {...register("infoOrdenServicio.horas_asignadas", {
                setValueAs: (v) =>
                  v === "" || v === undefined ? undefined : Number(v),
              })}
            />
          </FormField>
          <FormField
            label="Fecha inicio ejecución"
            htmlFor="fecha_inicio_ejecucion"
          >
            <Input
              id="fecha_inicio_ejecucion"
              type="date"
              {...register("infoOrdenServicio.fecha_inicio_ejecucion")}
            />
          </FormField>
          <FormField
            label="Fecha fin ejecución"
            htmlFor="fecha_fin_ejecucion"
            error={errors.infoOrdenServicio?.fecha_fin_ejecucion?.message}
          >
            <Input
              id="fecha_fin_ejecucion"
              type="date"
              {...register("infoOrdenServicio.fecha_fin_ejecucion")}
            />
          </FormField>
          <FormField label="Hora inicio" htmlFor="hora_inicio">
            <Input
              id="hora_inicio"
              type="time"
              {...register("infoOrdenServicio.hora_inicio")}
            />
          </FormField>
          <FormField
            label="Hora fin"
            htmlFor="hora_fin"
            error={errors.infoOrdenServicio?.hora_fin?.message}
          >
            <Input
              id="hora_fin"
              type="time"
              {...register("infoOrdenServicio.hora_fin")}
            />
          </FormField>
          <FormField
            label="Dirección de la empresa"
            htmlFor="direccion_empresa"
            className="sm:col-span-2"
          >
            <Input
              id="direccion_empresa"
              {...register("infoOrdenServicio.direccion_empresa")}
            />
          </FormField>
          <FormField
            label="Ubicación (Google Maps)"
            htmlFor="ubicacion_google_maps"
            className="sm:col-span-2"
          >
            <Input
              id="ubicacion_google_maps"
              type="url"
              placeholder="https://maps.google.com/..."
              {...register("infoOrdenServicio.ubicacion_google_maps")}
            />
          </FormField>
        </div>
      </SeccionAcordeon>

      <SeccionAcordeon
        titulo="Profesional y contacto en sitio"
        resumen="Quién ejecuta la actividad y a quién contactar en la empresa"
        completo={algunoLleno(profesionalContacto)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Profesional asignado"
            htmlFor="profesional_id"
            className="sm:col-span-2"
          >
            <Controller
              name="infoOrdenServicio.profesional_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : null}
                  onValueChange={(v: string | null) =>
                    field.onChange(v ? Number(v) : undefined)
                  }
                  items={profesionales.map((p) => ({
                    label: p.label,
                    value: String(p.id),
                  }))}
                >
                  <SelectTrigger id="profesional_id" className="w-full">
                    <SelectValue placeholder="Selecciona un profesional" />
                  </SelectTrigger>
                  <SelectContent>
                    {profesionales.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Nombre del contacto" htmlFor="contacto_nombre">
            <Input
              id="contacto_nombre"
              {...register("infoOrdenServicio.contacto_nombre")}
            />
          </FormField>
          <FormField label="Cargo" htmlFor="contacto_cargo">
            <Input
              id="contacto_cargo"
              {...register("infoOrdenServicio.contacto_cargo")}
            />
          </FormField>
          <FormField label="Celular" htmlFor="contacto_celular">
            <Input
              id="contacto_celular"
              {...register("infoOrdenServicio.contacto_celular")}
            />
          </FormField>
          <FormField
            label="Email"
            htmlFor="contacto_email"
            error={errors.infoOrdenServicio?.contacto_email?.message}
          >
            <Input
              id="contacto_email"
              type="email"
              {...register("infoOrdenServicio.contacto_email")}
            />
          </FormField>
        </div>
      </SeccionAcordeon>

      <SeccionAcordeon
        titulo="Detalle de entrega"
        resumen="Cierre de la orden y visto bueno del profesional"
        completo={algunoLleno(detalleEntrega)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Entregables específicos"
            htmlFor="entregables_especificos"
            className="sm:col-span-2"
          >
            <Textarea
              id="entregables_especificos"
              {...register("detalleEntrega.entregables_especificos")}
            />
          </FormField>
          <FormField
            label="Fecha de cierre de la orden"
            htmlFor="fecha_cierre_orden"
          >
            <Input
              id="fecha_cierre_orden"
              type="date"
              {...register("detalleEntrega.fecha_cierre_orden")}
            />
          </FormField>
          <FormField
            label="Profesional que da VoBo"
            htmlFor="profesional_vobo_id"
          >
            <Controller
              name="detalleEntrega.profesional_vobo_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : null}
                  onValueChange={(v: string | null) =>
                    field.onChange(v ? Number(v) : undefined)
                  }
                  items={profesionales.map((p) => ({
                    label: p.label,
                    value: String(p.id),
                  }))}
                >
                  <SelectTrigger id="profesional_vobo_id" className="w-full">
                    <SelectValue placeholder="Selecciona un profesional" />
                  </SelectTrigger>
                  <SelectContent>
                    {profesionales.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            label="Comentarios sobre valor acordado"
            htmlFor="comentarios_valor_acordado"
            className="sm:col-span-2"
          >
            <Textarea
              id="comentarios_valor_acordado"
              {...register("detalleEntrega.comentarios_valor_acordado")}
            />
          </FormField>
          <Checkbox
            label="Envío OS al profesional"
            {...register("detalleEntrega.envio_os_profesional")}
          />
          <Checkbox
            label="Recepción de la orden de servicio"
            {...register("detalleEntrega.recepcion_orden_servicio")}
          />
          <FormField
            label="Participante ARL"
            htmlFor="participante_arl_id"
            className="sm:col-span-2"
          >
            <Controller
              name="detalleEntrega.participante_arl_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : null}
                  onValueChange={(v: string | null) =>
                    field.onChange(v ? Number(v) : undefined)
                  }
                  items={profesionales.map((p) => ({
                    label: p.label,
                    value: String(p.id),
                  }))}
                >
                  <SelectTrigger id="participante_arl_id" className="w-full">
                    <SelectValue placeholder="Selecciona un profesional" />
                  </SelectTrigger>
                  <SelectContent>
                    {profesionales.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
      </SeccionAcordeon>

      <SeccionAcordeon
        titulo="Entregables estándar"
        resumen={`${entregablesIds.length} de ${entregablesEstandar.length} seleccionados`}
        completo={entregablesIds.length > 0}
        chipTexto={`${entregablesIds.length} de ${entregablesEstandar.length}`}
      >
        <Controller
          name="entregablesIds"
          control={control}
          render={({ field }) => {
            const seleccionados = field.value ?? [];
            return (
              <div className="flex flex-wrap gap-2">
                {entregablesEstandar.map((e) => {
                  const activo = seleccionados.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() =>
                        field.onChange(
                          activo
                            ? seleccionados.filter((id) => id !== e.id)
                            : [...seleccionados, e.id],
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        activo
                          ? "border-border bg-secondary font-medium text-secondary-foreground"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {activo ? "✓ " : ""}
                      {e.label}
                    </button>
                  );
                })}
              </div>
            );
          }}
        />
      </SeccionAcordeon>

      <SeccionAcordeon
        titulo="Valor hora profesional"
        resumen={
          puedeVerValorHora
            ? undefined
            : "Visible solo para el rol administrador"
        }
        completo={algunoLleno([valorHora])}
        locked={!puedeVerValorHora}
        chipTexto={puedeVerValorHora ? undefined : "Solo administrador"}
      >
        <RoleGate
          allow={["administrador"]}
          fallback={
            <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Lock className="size-4" aria-hidden />
              </span>
              <div>
                <p className="font-medium text-foreground">
                  Bloqueado por tu rol
                </p>
                <p className="text-xs">
                  Solo los usuarios con rol de administrador pueden ver y editar
                  el valor hora profesional.
                </p>
              </div>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Valor hora profesional"
              htmlFor="valor_hora_profesional"
              error={errors.valorHora?.valor_hora_profesional?.message}
            >
              <Input
                id="valor_hora_profesional"
                type="number"
                step="0.01"
                min="0"
                {...register("valorHora.valor_hora_profesional", {
                  setValueAs: (v) =>
                    v === "" || v === undefined ? undefined : Number(v),
                })}
              />
            </FormField>
          </div>
        </RoleGate>
      </SeccionAcordeon>

      <SeccionAcordeon
        titulo="Checklist del proceso"
        resumen="Seguimiento de entregas y visto bueno final"
        completo={algunoLleno(checklist)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Checkbox
            label="Envío AT031"
            {...register("checklist.envio_at031")}
          />
          <Checkbox
            label="Envío AT028"
            {...register("checklist.envio_at028")}
          />
          <Checkbox label="Formatos" {...register("checklist.formatos")} />
          <FormField label="Estado de ejecución" htmlFor="estado_ejecucion_id">
            <Controller
              name="checklist.estado_ejecucion_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : null}
                  onValueChange={(v: string | null) =>
                    field.onChange(v ? Number(v) : undefined)
                  }
                  items={estadosEjecucion.map((e) => ({
                    label: e.label,
                    value: String(e.id),
                  }))}
                >
                  <SelectTrigger id="estado_ejecucion_id" className="w-full">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosEjecucion.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            label="Fecha máxima de ejecución"
            htmlFor="fecha_maxima_ejecucion"
          >
            <Input
              id="fecha_maxima_ejecucion"
              type="date"
              {...register("checklist.fecha_maxima_ejecucion")}
            />
          </FormField>
          <Checkbox
            label="Entrega soportes profesional"
            {...register("checklist.entrega_soportes_profesional")}
          />
          <Checkbox
            label="Entrega soportes cliente"
            {...register("checklist.entrega_soportes_cliente")}
          />
          <FormField
            label="Fecha máxima entrega soportes"
            htmlFor="fecha_maxima_entrega_soportes"
          >
            <Input
              id="fecha_maxima_entrega_soportes"
              type="date"
              {...register("checklist.fecha_maxima_entrega_soportes")}
            />
          </FormField>
          <FormField
            label="VoBo emitido"
            htmlFor="vobo_emitido"
            required
            error={errors.checklist?.vobo_emitido?.message}
          >
            <Checkbox
              label="Sí"
              id="vobo_emitido"
              {...register("checklist.vobo_emitido")}
            />
          </FormField>
          <Checkbox
            label="Cumplió entrega en fecha"
            {...register("checklist.cumplio_entrega_fecha")}
          />
          <FormField
            label="Informe Guardián"
            htmlFor="informe_guardian"
            className="sm:col-span-2"
          >
            <Controller
              name="checklist.informe_guardian"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? null}
                  onValueChange={(v: string | null) =>
                    field.onChange(
                      v as
                        | (typeof INFORME_GUARDIAN_OPCIONES)[number]
                        | undefined,
                    )
                  }
                  items={INFORME_GUARDIAN_OPCIONES.map((o) => ({
                    label: o,
                    value: o,
                  }))}
                >
                  <SelectTrigger id="informe_guardian" className="w-full">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {INFORME_GUARDIAN_OPCIONES.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
      </SeccionAcordeon>
    </fieldset>
  );
}
