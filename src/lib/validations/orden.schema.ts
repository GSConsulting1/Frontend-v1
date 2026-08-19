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

// RESPONSABLES_OS ya no existe: la lista de responsables SEC dejó de ser una
// constante (y un CHECK en la base) para pasar a la tabla `responsables_sec`,
// que se administra desde /profesionales/responsables-sec. Quien necesite las
// opciones las pide con getResponsablesSecParaSelect()
// (lib/data/responsables-sec.ts) — ver la migración
// 20260816001045_catalogo_responsables_sec.sql para el porqué.

export type EstadoOrden = (typeof ESTADOS_ORDEN)[number];

export const ordenServicioSchema = z.object({
  cliente_id: z.number().int().positive(),
  estado: z.enum(ESTADOS_ORDEN).optional(),
  numero_os_cliente: z.string().optional(),
  fecha_recepcion_os: z.string().optional(),
  // La empresa usuaria se elige del catálogo `empresas_usuarias`
  // (empresa_usuaria_id), y nombre/NIT se copian de la opción elegida — el
  // Combobox de OrdenCampos los llena con setValue, no se escriben a mano.
  // Los tres campos conviven a propósito: la FK es la fuente de verdad nueva,
  // pero el listado, el Excel y el PDF todavía leen las dos columnas de texto.
  // Optional (no obligatoria) porque hay órdenes viejas sin vincular.
  empresa_usuaria_id: z.number().int().positive().optional(),
  nombre_empresa_usuaria: z.string().optional(),
  nit_empresa_usuaria: z.string().optional(),
  // `cronograma` es numeric en la base real (no una fecha) — ver
  // database.types.ts.
  cronograma: z.number().nonnegative("Debe ser un número positivo").optional(),
  secuencia: z.string().optional(),
  nombre_servicio: z.string().trim().min(1, "Describe el servicio"),
  horas_cargadas: z
    .number()
    .nonnegative("Debe ser un número positivo")
    .optional(),
  tipo_servicio: z.enum(TIPO_SERVICIO_OPCIONES).optional(),
  fecha_sipab: z.string().optional(),
  // Sin CHECK en la DB (a diferencia de estado/responsable_os arriba): texto
  // libre a propósito, para asesores externos que no están en `profesionales`.
  asesor_gestion_riesgos: z.string().optional(),
  observaciones_iniciales: z.string().optional(),
  // `tarifa_valor_transporte` es character varying en la base real (no
  // numeric) — se guarda tal cual la escribe quien carga la orden.
  tarifa_valor_transporte: z.string().optional(),
  // El responsable SEC se elige del catálogo `responsables_sec`
  // (responsable_sec_id) y el EMAIL se copia de la opción elegida — el
  // <Select> de OrdenCampos lo llena con setValue, no se escribe a mano.
  // Mismo arreglo que empresa_usuaria_id: la FK es la fuente de verdad y
  // responsable_os queda como copia denormalizada del email, que es lo que
  // siguen leyendo el filtro del listado, el Excel de export y el PDF.
  //
  // El nombre del responsable NO viaja por acá y no debería volver a hacerlo:
  // desde 20260819012529_responsables_sec_identidad_por_email.sql la identidad
  // de una casilla es su email, entre otras cosas porque tres personas
  // distintas compartían una sola.
  //
  // responsable_os ya NO es un z.enum: la lista dejó de estar hardcodeada acá
  // (y en un CHECK de la base) y ahora es una tabla. Validar contra el catálogo
  // es tarea de la FK; lo que llegue en este campo sin un id al lado es texto
  // de órdenes viejas o importadas.
  responsable_sec_id: z.number().int().positive().optional(),
  responsable_os: z.string().optional(),
  // Contraparte interna de observaciones_iniciales (que son del cliente):
  // lo que anota el responsable SEC de GS sobre la orden.
  observaciones_responsable_sec: z.string().optional(),
  link_archivo_orden: z
    .union([
      z.literal(""),
      z.string().trim().url("Debe ser un link válido (http/https)"),
    ])
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
