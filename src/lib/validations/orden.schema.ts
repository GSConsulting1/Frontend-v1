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

// Los 3 arrays de acá abajo son los valores exactos de los CHECK de
// `ordenes_servicio` en Supabase (no hay tablas de catálogo — a
// diferencia de `estados_ejecucion`/`entregables_estandar`, estos son
// listas fijas, mismo patrón que INFORME_GUARDIAN_OPCIONES en
// info-orden.schema.ts). Si se agrega/renombra un valor en la base, hay
// que reflejarlo acá también.
export const ESTADO_ORDEN_OPCIONES = [
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

export const RESPONSABLE_OS_OPCIONES = [
  "Yulieth Amell",
  "Bibiana Sarmiento",
  "Daniela Rosso",
  "Lucia Bejarano",
  "Lina Amell",
] as const;

export const ordenServicioSchema = z.object({
  cliente_id: z.number().int().positive(),
  estado: z.enum(ESTADO_ORDEN_OPCIONES).optional(),
  numero_os_cliente: z.string().optional(),
  fecha_recepcion_os: z.string().optional(),
  nombre_empresa_usuaria: z.string().optional(),
  nit_empresa_usuaria: z.string().optional(),
  // `cronograma` es numeric en la base real (no una fecha) — ver
  // database.types.ts.
  cronograma: z.number().optional(),
  secuencia: z.string().optional(),
  nombre_servicio: z.string().trim().min(1, "Describe el servicio"),
  horas_cargadas: z.number().nonnegative("Debe ser un número positivo").optional(),
  tipo_servicio: z.enum(TIPO_SERVICIO_OPCIONES).optional(),
  fecha_sipab: z.string().optional(),
  // Texto libre, sin FK a profesionales (a diferencia de los campos
  // *_id de las tablas extendidas) — así es la columna real.
  asesor_gestion_riesgos: z.string().optional(),
  observaciones_iniciales: z.string().optional(),
  // `tarifa_valor_transporte` es character varying en la base real (no
  // numeric) — se guarda tal cual la escribe quien carga la orden.
  tarifa_valor_transporte: z.string().optional(),
  responsable_os: z.enum(RESPONSABLE_OS_OPCIONES).optional(),
  link_archivo_orden: z
    .union([z.literal(""), z.string().trim().url("Debe ser un link válido (http/https)")])
    .optional(),
});

export type OrdenServicioFormValues = z.infer<typeof ordenServicioSchema>;
