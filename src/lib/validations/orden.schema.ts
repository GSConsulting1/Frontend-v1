// Schema de Zod para el formulario de creación/edición de órdenes de servicio.
// Única fuente de verdad, usada en DOS lugares (evita reglas duplicadas):
//   1. src/components/ordenes/orden-form.tsx -> zodResolver de React Hook Form,
//      validación en el cliente para feedback inmediato.
//   2. src/app/ordenes/actions.ts -> vuelve a validar en el servidor antes de
//      llamar a Supabase (nunca confiar solo en la validación del navegador).
//
// El schema espera valores YA normalizados a su tipo final (number | string |
// undefined) — la conversión desde el string crudo que entrega un <input> se
// hace en OrdenForm (register con setValueAs, o el onValueChange de cada
// <Select>), no acá. Eso mantiene z.input === z.output y evita el lío de
// tipos que da usar z.preprocess/z.coerce junto con zodResolver.

import { z } from "zod";

// Reemplazan a la tabla catálogo `estados_orden` (eliminada) y al set fijo de
// `responsable_sec_id` — la DB ya no tiene FK para estos dos campos, solo un
// CHECK constraint con esta misma lista de valores (ver
// supabase/005_ordenes_servicio_financiero_edicion.sql y el ALTER TABLE que
// migró ordenes_servicio.estado_id/responsable_sec_id a texto). Si cambia el
// CHECK en la DB, hay que reflejarlo acá también — es la única fuente de
// verdad del lado del front.
export const ESTADOS_ORDEN = [
  "Pendiente revisión Bolívar",
  "Enviado a facturación",
  "Cancelada",
  "Programar urgente",
  "Facturar urgente",
  "Pendiente cobro hora fallida",
  "Pendiente por cancelar",
  "Programar mes siguiente",
  "Facturada",
] as const;

export const TIPO_SERVICIO_OPCIONES = [
  "Asesoría",
  "Informe técnico",
  "Capacitación",
  "N/A",
] as const;

export const RESPONSABLES_OS = [
  "Yulieth Amell",
  "Bibiana Sarmiento",
  "Daniela Rosso",
  "Lucia Bejarano",
  "Lina Amell",
] as const;

export type EstadoOrden = (typeof ESTADOS_ORDEN)[number];
export type ResponsableOs = (typeof RESPONSABLES_OS)[number];

export const ordenServicioSchema = z.object({
  cliente_id: z.number().int().positive(),
  estado: z.enum(ESTADOS_ORDEN).optional(),
  numero_os_cliente: z.string().optional(),
  fecha_recepcion_os: z.string().optional(),
  nombre_empresa_usuaria: z.string().optional(),
  nit_empresa_usuaria: z.string().optional(),
  // `cronograma` es numeric en la base real (no una fecha) — ver
  // database.types.ts.
  cronograma: z.number().nonnegative("Debe ser un número positivo").optional(),
  secuencia: z.string().optional(),
  nombre_servicio: z.string().trim().min(1, "Describe el servicio"),
  horas_cargadas: z.number().nonnegative("Debe ser un número positivo").optional(),
  tipo_servicio: z.enum(TIPO_SERVICIO_OPCIONES).optional(),
  fecha_sipab: z.string().optional(),
  // Sin CHECK en la DB (a diferencia de estado/responsable_os arriba): texto
  // libre a propósito, para asesores externos que no están en `profesionales`.
  asesor_gestion_riesgos: z.string().optional(),
  observaciones_iniciales: z.string().optional(),
  // `tarifa_valor_transporte` es character varying en la base real (no
  // numeric) — se guarda tal cual la escribe quien carga la orden.
  tarifa_valor_transporte: z.string().optional(),
  responsable_os: z.enum(RESPONSABLES_OS).optional(),
  // Contraparte interna de observaciones_iniciales (que son del cliente):
  // lo que anota el responsable SEC de GS sobre la orden.
  observaciones_responsable_sec: z.string().optional(),
  link_archivo_orden: z
    .union([z.literal(""), z.string().trim().url("Debe ser un link válido (http/https)")])
    .optional(),
});

export type OrdenServicioFormValues = z.infer<typeof ordenServicioSchema>;

// Subconjunto de columnas editables directamente desde la tabla de listado
// (ver OrdenesTable / actualizarCampoOrden en app/ordenes/actions.ts) —
// ninguna es obligatoria para guardar la orden (cliente_id y
// nombre_servicio quedan fuera de este set a propósito, ver
// ordenServicioSchema arriba). A diferencia del schema de arriba, acá sí se
// permite null explícito: la edición inline puede "vaciar" el campo, no
// solo dejarlo sin tocar.
export const campoOrdenInlineSchema = z
  .object({
    cronograma: ordenServicioSchema.shape.cronograma.nullable(),
    estado: ordenServicioSchema.shape.estado.nullable(),
    secuencia: ordenServicioSchema.shape.secuencia.nullable(),
  })
  .partial();

export type CampoOrdenInlinePatch = z.infer<typeof campoOrdenInlineSchema>;
