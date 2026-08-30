-- Agrega 'Material' a los valores permitidos de tipo_servicio.
--
-- Mismo caso fácil que 20260819021420_estados_orden_programada_y_en_ejecucion.sql:
-- esta migración solo AGRANDA la lista, no reescribe filas, así que alcanza
-- con DROP + ADD sin UPDATE en el medio. Toda fila que hoy pasa el CHECK
-- viejo pasa también el nuevo.
--
-- La lista tiene que quedar igual que TIPO_SERVICIO_OPCIONES en
-- src/lib/validations/orden.schema.ts, que es la fuente de verdad del front.
-- Si las dos se desincronizan, el <Select> ofrece un tipo de servicio que la
-- base rechaza al guardar con 23514 (check_violation).

ALTER TABLE "public"."ordenes_servicio"
  DROP CONSTRAINT IF EXISTS "chk_tipo_servicio";

ALTER TABLE "public"."ordenes_servicio"
  ADD CONSTRAINT "chk_tipo_servicio" CHECK ((("tipo_servicio")::"text" = ANY ((ARRAY[
    'Asesoría'::character varying,
    'Informe técnico'::character varying,
    'Capacitación'::character varying,
    'N/A'::character varying,
    -- Nuevo.
    'Material'::character varying
  ])::"text"[])));
