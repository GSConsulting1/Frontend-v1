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

export const ordenServicioSchema = z.object({
  cliente_id: z.number().int().positive(),
  estado_id: z.number().int().positive().optional(),
  numero_os_cliente: z.string().optional(),
  fecha_recepcion_os: z.string().optional(),
  nombre_empresa_usuaria: z.string().optional(),
  nit_empresa_usuaria: z.string().optional(),
  cronograma: z.string().optional(),
  secuencia: z.string().optional(),
  nombre_servicio: z.string().trim().min(1, "Describe el servicio"),
  horas_cargadas: z.number().nonnegative("Debe ser un número positivo").optional(),
  tipo_servicio: z.string().optional(),
  fecha_sipab: z.string().optional(),
  asesor_gestion_riesgos_id: z.number().int().positive().optional(),
  observaciones_iniciales: z.string().optional(),
  tarifa_valor_transporte: z.number().nonnegative("Debe ser un número positivo").optional(),
  responsable_sec_id: z.number().int().positive().optional(),
  link: z.union([z.literal(""), z.string().trim().url("Debe ser un link válido (http/https)")]).optional(),
});

export type OrdenServicioFormValues = z.infer<typeof ordenServicioSchema>;

// Usado para validar parches parciales (edición inline fila por fila, donde
// solo se envían los campos que el usuario realmente cambió).
export const ordenServicioPartialSchema = ordenServicioSchema.partial();
