// Schemas de Zod para la sección "Información orden del servicio" (Plan MVP
// semana 2) — un schema por tabla, igual que hace orden.schema.ts para
// ordenes_servicio. Usados en OrdenForm (zodResolver) y en
// guardarInformacionOrden (src/app/ordenes/actions.ts) para revalidar en el
// servidor.
//
// Todos los campos son opcionales salvo `vobo_emitido` (checklist), que en
// la BD es NOT NULL sin "no aplica" — ver la nota de diseño del Plan MVP.

import { z } from "zod";

export const infoOrdenServicioSchema = z
  .object({
    fecha_emision_os: z.string().optional(),
    ciudad_id: z.number().int().positive().optional(),
    actividad_reprogramada: z.boolean().optional(),
    profesional_id: z.number().int().positive().optional(),
    empresa_a_visitar: z.string().optional(),
    nombre_actividad: z.string().optional(),
    descripcion_actividad: z.string().optional(),
    horas_asignadas: z.number().nonnegative("Debe ser un número positivo").optional(),
    fecha_inicio_ejecucion: z.string().optional(),
    fecha_fin_ejecucion: z.string().optional(),
    direccion_empresa: z.string().optional(),
    ubicacion_google_maps: z.string().optional(),
    hora_inicio: z.string().optional(),
    hora_fin: z.string().optional(),
    contacto_nombre: z.string().optional(),
    contacto_cargo: z.string().optional(),
    contacto_celular: z.string().optional(),
    contacto_email: z
      .union([z.literal(""), z.string().trim().email("Debe ser un email válido")])
      .optional(),
  })
  .refine(
    (v) =>
      !v.fecha_inicio_ejecucion || !v.fecha_fin_ejecucion || v.fecha_fin_ejecucion >= v.fecha_inicio_ejecucion,
    { message: "La fecha de fin no puede ser anterior a la de inicio", path: ["fecha_fin_ejecucion"] },
  )
  .refine((v) => !v.hora_inicio || !v.hora_fin || v.hora_fin >= v.hora_inicio, {
    message: "La hora de fin no puede ser anterior a la de inicio",
    path: ["hora_fin"],
  });

export type InfoOrdenServicioFormValues = z.infer<typeof infoOrdenServicioSchema>;

export const detalleEntregaProfesionalSchema = z.object({
  entregables_especificos: z.string().optional(),
  fecha_cierre_orden: z.string().optional(),
  profesional_vobo_id: z.number().int().positive().optional(),
  comentarios_valor_acordado: z.string().optional(),
  envio_os_profesional: z.boolean().optional(),
  recepcion_orden_servicio: z.boolean().optional(),
  participante_arl_id: z.number().int().positive().optional(),
  valor_hora_profesional: z.number().nonnegative("Debe ser un número positivo").optional(),
});

export type DetalleEntregaProfesionalFormValues = z.infer<
  typeof detalleEntregaProfesionalSchema
>;

export const INFORME_GUARDIAN_OPCIONES = [
  "No aplica",
  "Aprobado",
  "Cancelada",
  "No se ha subido el archivo",
  "Pendiente de aprobación",
  "Rechazado",
] as const;

export const checklistProcesoSchema = z.object({
  envio_at031: z.boolean().optional(),
  envio_at028: z.boolean().optional(),
  formatos: z.boolean().optional(),
  estado_ejecucion_id: z.number().int().positive().optional(),
  fecha_maxima_ejecucion: z.string().optional(),
  entrega_soportes_profesional: z.boolean().optional(),
  entrega_soportes_cliente: z.boolean().optional(),
  fecha_maxima_entrega_soportes: z.string().optional(),
  vobo_emitido: z.boolean(),
  cumplio_entrega_fecha: z.boolean().optional(),
  informe_guardian: z.enum(INFORME_GUARDIAN_OPCIONES).optional(),
});

export type ChecklistProcesoFormValues = z.infer<typeof checklistProcesoSchema>;

// Selección múltiple de orden_entregables_estandar (tabla puente, 0 a 4 por
// orden).
export const entregablesEstandarSchema = z.array(z.number().int().positive());

// Lo que envía el formulario completo de la página de edición para las
// secciones extendidas (todo opcional: una orden nueva puede no tener nada
// todavía).
export const ordenInfoExtendidaSchema = z.object({
  infoOrdenServicio: infoOrdenServicioSchema.optional(),
  detalleEntrega: detalleEntregaProfesionalSchema.optional(),
  checklist: checklistProcesoSchema.optional(),
  entregablesIds: entregablesEstandarSchema.optional(),
});

export type OrdenInfoExtendidaFormValues = z.infer<typeof ordenInfoExtendidaSchema>;
