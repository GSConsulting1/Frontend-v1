-- El formulario (facturacion.tsx) cambió "Estado de facturación" a un
-- <Select> cerrado con "Facturado" / "Pendiente de facturar", pero el CHECK
-- de la BD seguía con la redacción vieja ('Facturada' / 'Pendiente
-- facturar'), así que cualquier guardado revienta con 23514
-- (check_violation). Se actualizan primero las filas existentes a la
-- redacción nueva y luego se reemplaza el CHECK, para no dejar ninguna fila
-- en violación.
UPDATE "public"."facturacion"
SET "estado_facturacion" = 'Facturado'
WHERE "estado_facturacion" = 'Facturada';

UPDATE "public"."facturacion"
SET "estado_facturacion" = 'Pendiente de facturar'
WHERE "estado_facturacion" = 'Pendiente facturar';

ALTER TABLE "public"."facturacion"
  DROP CONSTRAINT IF EXISTS "chk_estado_facturacion";

ALTER TABLE "public"."facturacion"
  ADD CONSTRAINT "chk_estado_facturacion" CHECK ((("estado_facturacion")::"text" = ANY ((ARRAY[
    'Facturado'::character varying,
    'Pendiente de facturar'::character varying
  ])::"text"[])));

-- "alerta_facturacion" pasó a ser la fecha máxima para facturar
-- (fecha_sipab + 40 días corridos, calculada sola en facturacion.tsx — el
-- usuario ya no la escribe). El CHECK que traía ('Aprobado', 'Cancelado',
-- 'No aplica', ...) es el catálogo de informe_guardian copiado por error a
-- esta columna en el baseline: nunca hubo una fecha real ahí (cualquier fila
-- con valor tenía que ser una de esas 6 cadenas, o NULL), así que se puede
-- quitar sin perder datos legítimos.
ALTER TABLE "public"."facturacion"
  DROP CONSTRAINT IF EXISTS "facturacion_alerta_facturacion_check";

-- Backfill: hoy toda fila de facturacion tiene alerta_facturacion en NULL o
-- en uno de esos 6 valores basura, así que se recalcula para que el listado
-- y la exportación a Excel (matriz-ordenes.ts) no queden vacíos hasta que
-- alguien abra y guarde cada orden a mano.
UPDATE "public"."facturacion" AS f
SET "alerta_facturacion" = to_char(o."fecha_sipab" + 40, 'YYYY-MM-DD')
FROM "public"."ordenes_servicio" AS o
WHERE o."id" = f."orden_id"
  AND o."fecha_sipab" IS NOT NULL;

-- Mismo problema en radicacion_imagine.estado_imagine: el <Select> nuevo de
-- radicacion-imagine.tsx ofrece "Radicada" / "Pendiente de radicar" /
-- "Rechazada", pero el CHECK de la BD seguía con el catálogo viejo
-- ('Pendiente Revisión Bolívar', 'Devuelto', 'Pendiente por cargar').
-- Mapeo acordado para no perder la info de las órdenes existentes:
--   'Pendiente Revisión Bolívar' -> 'Pendiente de radicar'
--   'Pendiente por cargar'       -> 'Pendiente de radicar'
--   'Devuelto'                   -> 'Rechazada' (Imagine la regresó con
--                                    novedades, equivalente a rechazada)
UPDATE "public"."radicacion_imagine"
SET "estado_imagine" = 'Pendiente de radicar'
WHERE "estado_imagine" IN ('Pendiente Revisión Bolívar', 'Pendiente por cargar');

UPDATE "public"."radicacion_imagine"
SET "estado_imagine" = 'Rechazada'
WHERE "estado_imagine" = 'Devuelto';

ALTER TABLE "public"."radicacion_imagine"
  DROP CONSTRAINT IF EXISTS "chk_estado_imagine";

ALTER TABLE "public"."radicacion_imagine"
  ADD CONSTRAINT "chk_estado_imagine" CHECK (("estado_imagine" = ANY (ARRAY[
    'Radicada',
    'Pendiente de radicar',
    'Rechazada'
  ])));
