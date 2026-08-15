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
});

export type DetalleEntregaProfesionalFormValues = z.infer<
  typeof detalleEntregaProfesionalSchema
>;

// Tabla aparte (valor_hora_orden) desde supabase/002_usuarios_roles_rls.sql
// — RLS ahí permite leer/escribir solo a administrador. orden-form.tsx omite
// esta clave del payload para cualquier otro rol (ver su onSubmit), así que
// guardarInfoOrdenCompleta ni intenta el upsert para quien no es admin — si
// lo intentara, RLS lo rechazaría y tumbaría el guardado del resto de
// secciones también.
export const valorHoraOrdenSchema = z.object({
  valor_hora_profesional: z.number().nonnegative("Debe ser un número positivo").optional(),
});

export type ValorHoraOrdenFormValues = z.infer<typeof valorHoraOrdenSchema>;

export const INFORME_GUARDIAN_OPCIONES = [
  "No aplica",
  "Aprobado",
  "Cancelada",
  "No se ha subido el archivo",
  "Pendiente de aprobación",
  "Rechazado",
] as const;

export const checklistProcesoSchema = z
  .object({
    envio_at031: z.boolean().optional(),
    envio_at028: z.boolean().optional(),
    formatos: z.boolean().optional(),
    // Requerido: cada orden debe arrancar en un estado de ejecución visible
    // (ver editar/page.tsx, que la precarga con "Pendiente programar" si la
    // orden aún no tiene checklist). Sigue .optional() acá para que el
    // formulario pueda arrancar sin valor si ese catálogo llegara a fallar;
    // el .refine de abajo es el que realmente lo exige al guardar.
    estado_ejecucion_id: z.number().int().positive().optional(),
    fecha_maxima_ejecucion: z.string().optional(),
    entrega_soportes_profesional: z.boolean().optional(),
    entrega_soportes_cliente: z.boolean().optional(),
    fecha_maxima_entrega_soportes: z.string().optional(),
    vobo_emitido: z.boolean(),
    cumplio_entrega_fecha: z.boolean().optional(),
    informe_guardian: z.enum(INFORME_GUARDIAN_OPCIONES).optional(),
  })
  .refine((v) => v.estado_ejecucion_id != null, {
    message: "Selecciona un estado de ejecución",
    path: ["estado_ejecucion_id"],
  });

export type ChecklistProcesoFormValues = z.infer<typeof checklistProcesoSchema>;

// Selección múltiple de orden_entregables_estandar (tabla puente, 0 a 4 por
// orden).
export const entregablesEstandarSchema = z.array(z.number().int().positive());

// Sección financiera: 5 tablas 1-a-1 con ordenes_servicio, mismo criterio de
// RLS que valorHoraOrdenSchema (solo administrador + financiero) — ver
// RolUsuario en src/types/index.ts. orden-form.tsx omite estas 5 claves del
// payload para cualquier otro rol (igual que ya hace con valorHora).
export const cuentaCobroSchema = z.object({
  radicacion_cuenta: z.boolean().optional(),
  fecha_radicacion: z.string().optional(),
  numero_radicado: z.string().optional(),
  fecha_corte: z.string().optional(),
  fecha_pago: z.string().optional(),
  documento_soporte: z.string().optional(),
  valor_cuenta_cobro: z.number().nonnegative("Debe ser un número positivo").optional(),
});

export type CuentaCobroFormValues = z.infer<typeof cuentaCobroSchema>;

export const actaServicioSchema = z.object({
  fecha_acta: z.string().optional(),
  hora_acta: z.string().optional(),
  profesional_acta_id: z.number().int().positive().optional(),
});

export type ActaServicioFormValues = z.infer<typeof actaServicioSchema>;

// Debe calzar exacto con el CHECK "chk_estado_imagine" de la tabla
// radicacion_imagine (ver migración
// 20260815120000_alinear_estados_imagine_y_facturacion) — un valor que no
// esté en esta lista pasa Zod pero revienta 23514 al llegar a Supabase.
export const ESTADO_IMAGINE_OPCIONES = [
  "Radicada",
  "Pendiente de radicar",
  "Rechazada",
] as const;

export const radicacionImagineSchema = z.object({
  numero_radicado_1: z.string().optional(),
  fecha_radicacion_1: z.string().optional(),
  novedades_1: z.string().optional(),
  numero_radicado_2: z.string().optional(),
  fecha_radicacion_2: z.string().optional(),
  novedades_2: z.string().optional(),
  estado_imagine: z.enum(ESTADO_IMAGINE_OPCIONES).optional(),
  actualizacion_sipab: z.string().optional(),
});

export type RadicacionImagineFormValues = z.infer<typeof radicacionImagineSchema>;

// Debe calzar exacto con el CHECK "chk_estado_facturacion" de la tabla
// facturacion (ver migración 20260815120000_alinear_facturacion_estado_y_alerta) —
// un valor que no esté en esta lista pasa Zod pero revienta 23514 al llegar
// a Supabase.
export const ESTADO_FACTURACION_OPCIONES = [
  "Pendiente de facturar",
  "Facturado",
] as const;

export const facturacionSchema = z.object({
  numero_prefactura: z.string().optional(),
  numero_factura: z.string().optional(),
  estado_facturacion: z.enum(ESTADO_FACTURACION_OPCIONES).optional(),
  // alerta_facturacion no la escribe el usuario: se recalcula sola en
  // facturacion.tsx a partir de fecha_sipab (datos generales) + 40 días
  // corridos — sigue siendo texto (fecha ISO) porque así vive en BD. La
  // misma migración de arriba quita el CHECK viejo (catálogo de
  // informe_guardian copiado por error a esta columna) que le impedía
  // guardar una fecha.
  alerta_facturacion: z.string().optional(),
});

export type FacturacionFormValues = z.infer<typeof facturacionSchema>;

export const liquidacionSchema = z.object({
  valor_total_cotizado: z.number().nonnegative("Debe ser un número positivo").optional(),
  valor_desplazamiento: z.number().nonnegative("Debe ser un número positivo").optional(),
  gasto_servicio: z.number().nonnegative("Debe ser un número positivo").optional(),
  iva: z.number().nonnegative("Debe ser un número positivo").optional(),
  valor_antes_iva: z.number().nonnegative("Debe ser un número positivo").optional(),
  retencion_fuente: z.number().nonnegative("Debe ser un número positivo").optional(),
  retencion_ica: z.number().nonnegative("Debe ser un número positivo").optional(),
  retencion_iva: z.number().nonnegative("Debe ser un número positivo").optional(),
  total: z.number().nonnegative("Debe ser un número positivo").optional(),
  ganancia: z.number().optional(),
});

export type LiquidacionFormValues = z.infer<typeof liquidacionSchema>;

// Lo que envía el formulario completo de la página de edición para las
// secciones extendidas (todo opcional: una orden nueva puede no tener nada
// todavía).
export const ordenInfoExtendidaSchema = z.object({
  infoOrdenServicio: infoOrdenServicioSchema.optional(),
  detalleEntrega: detalleEntregaProfesionalSchema.optional(),
  checklist: checklistProcesoSchema.optional(),
  entregablesIds: entregablesEstandarSchema.optional(),
  valorHora: valorHoraOrdenSchema.optional(),
  cuentaCobro: cuentaCobroSchema.optional(),
  actaServicio: actaServicioSchema.optional(),
  radicacionImagine: radicacionImagineSchema.optional(),
  facturacion: facturacionSchema.optional(),
  liquidacion: liquidacionSchema.optional(),
});

export type OrdenInfoExtendidaFormValues = z.infer<typeof ordenInfoExtendidaSchema>;
