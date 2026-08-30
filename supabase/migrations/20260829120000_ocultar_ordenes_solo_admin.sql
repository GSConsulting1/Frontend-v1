-- Ocultar órdenes: un administrador puede marcar órdenes como ocultas para
-- que dejen de existir en el listado de cualquier otro rol (financiero,
-- talento, lectura, profesional y programador), igual que si no existieran.
-- Un administrador sigue viéndolas todas (ocultas o no), para poder
-- deshacer el ocultamiento.
--
-- Reusa el mismo mecanismo que 20260819022820_visibilidad_ordenes_programador_por_casilla.sql
-- en vez de inventar uno nuevo: `puede_ver_orden()` ya es la ÚNICA función
-- que gobierna tanto la policy de SELECT como la de UPDATE de
-- ordenes_servicio, así que basta con sumarle la condición de "oculta" ahí
-- — la protección de escritura sale gratis:
--   * Un no-administrador NUNCA puede poner oculta=true, porque el WITH
--     CHECK de la policy de UPDATE evalúa la fila resultante con la MISMA
--     función: si la fila nueva queda con oculta=true, deja de ser visible
--     para ese rol y el UPDATE completo se rechaza (RLS violation).
--   * Tampoco puede volver a mostrarla (oculta=true -> false), porque el
--     USING de esa misma policy evalúa la fila ANTES del cambio: si ya
--     estaba oculta, ese rol no puede ni seleccionarla para actualizarla.
-- No hace falta un trigger aparte para bloquear el campo: es el mismo
-- patrón que ya deja "un programador no puede editar ni reasignar una
-- orden ajena", aplicado a "oculta" en vez de a responsable_sec_id.

-- 1. Columna ----------------------------------------------------------------

ALTER TABLE "public"."ordenes_servicio"
  ADD COLUMN "oculta" boolean NOT NULL DEFAULT false;

-- 2. Función de visibilidad, con el nuevo parámetro -------------------------

DROP POLICY IF EXISTS "lectura_ordenes_segun_rol" ON "public"."ordenes_servicio";
DROP POLICY IF EXISTS "edicion_ordenes_visibles" ON "public"."ordenes_servicio";
DROP FUNCTION IF EXISTS "public"."puede_ver_orden"(integer);

CREATE FUNCTION "public"."puede_ver_orden"(
  "p_responsable_sec_id" integer,
  "p_oculta" boolean
)
RETURNS boolean
LANGUAGE "sql" STABLE
SET "search_path" TO 'public'
AS $$
  SELECT CASE
    -- Sin sesión, o con sesión pero sin fila en `usuarios`: nada.
    WHEN "public"."rol_de_la_sesion"() IS NULL THEN false
    -- Administrador: ve todo, ocultas incluidas — es quien decide qué se
    -- oculta, así que tiene que poder ver lo que ya ocultó para mostrarlo
    -- de nuevo.
    WHEN "public"."es_administrador"() THEN true
    -- Oculta y no-administrador: nada, sin importar el rol ni la casilla.
    WHEN "p_oculta" THEN false
    -- Todo rol que no sea programador sigue viendo el listado completo
    -- (de lo no oculto).
    WHEN "public"."rol_de_la_sesion"() <> 'programador' THEN true
    -- Programador: solo lo suyo. Si su email no está en el catálogo,
    -- casilla_sec_de_la_sesion() es NULL, la comparación da NULL y no ve
    -- nada — deliberado, y avisado en pantalla desde el front.
    ELSE "p_responsable_sec_id" IS NOT NULL
     AND "p_responsable_sec_id" = "public"."casilla_sec_de_la_sesion"()
  END;
$$;

-- 3. Lectura ------------------------------------------------------------

CREATE POLICY "lectura_ordenes_segun_rol" ON "public"."ordenes_servicio"
  FOR SELECT
  USING ("public"."puede_ver_orden"("responsable_sec_id", "oculta"));

-- 4. Escritura ------------------------------------------------------------

CREATE POLICY "edicion_ordenes_visibles" ON "public"."ordenes_servicio"
  FOR UPDATE
  USING ("public"."puede_ver_orden"("responsable_sec_id", "oculta"))
  WITH CHECK ("public"."puede_ver_orden"("responsable_sec_id", "oculta"));
