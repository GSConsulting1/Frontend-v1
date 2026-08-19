-- Un usuario con rol `programador` ve solo las órdenes de SU casilla de
-- responsable SEC. El resto de los roles sigue viendo todo.
--
-- ES EL REEMPLAZO DE 9314a3c, QUE SE REVIRTIÓ
-- El intento anterior (revertido en f859863) vivía entero en el front y tenía
-- cuatro problemas. Vale la pena listar cómo los evita este, porque son los
-- mismos cuatro que puede volver a cometer quien toque esto:
--
--   1. Se disparaba para TODO rol distinto de administrador, y financiero /
--      talento / lectura / programador terminaban viendo el listado vacío.
--      Acá la condición nombra a `programador` explícitamente: cualquier otro
--      rol cae en la rama que devuelve `true`.
--   2. Cruzaba `usuarios.email` contra `profesionales.email` con un `.eq()`
--      exacto y sensible a mayúsculas, teniendo la FK real al lado. Acá el
--      email SÍ es la relación real —es la identidad del catálogo desde
--      20260819012529— y el join usa lower(btrim(...)), el mismo criterio del
--      índice único de `responsables_sec`, así que una diferencia de
--      mayúsculas no puede volver a esconder órdenes.
--   3. Fallaba en silencio. Sigue habiendo un caso de "cero órdenes" —un
--      programador cuyo email no está en el catálogo— pero ahora es imposible
--      que sea ambiguo por un duplicado: `responsables_sec_email_normalizado_key`
--      garantiza a lo sumo una casilla por email. El aviso en pantalla para ese
--      caso va en el front (ver ordenes/page.tsx en este mismo commit).
--   4. NO era una restricción de acceso: solo filtraba el listado, mientras
--      `mvp_open_access` dejaba leer la tabla entera con la anon key. Esta
--      migración ataca justamente eso.
--
-- ALCANCE: SOLO `ordenes_servicio`
-- `mvp_open_access` sigue viva en otras 12 tablas (checklist_proceso,
-- info_orden_servicio, clientes, usuarios, …). Limpiarlas todas es
-- PLAN-fix-rls-mvp-open-access.md y necesita la matriz tabla × rol que ese plan
-- pide como decisión de negocio. Acá se recorta a la tabla que gobierna la
-- visibilidad pedida, que es la que de verdad decide qué órdenes existen para
-- quien mira:
--   * el listado y /ordenes/[id]/editar leen `ordenes_servicio` primero, así
--     que una orden invisible da `notFound()` antes de tocar nada más;
--   * las tablas extendidas se leen embebidas en la query de la orden, así que
--     una orden filtrada no trae sus hijas.
-- Lo que queda abierto es consultarlas DIRECTO por PostgREST. Es una fuga
-- menor y preexistente, no la introduce este cambio, pero está sin cerrar
-- hasta que corra el otro plan.

-- 1. Funciones de sesión ---------------------------------------------------

-- STABLE SECURITY DEFINER con search_path fijo, igual que `es_administrador()`
-- (baseline líneas 118-125). El SECURITY DEFINER NO es cosmético: sin él, una
-- policy que consulta `usuarios` vuelve a disparar la policy de `usuarios` y
-- Postgres corta con "infinite recursion detected in policy for relation
-- usuarios". Está documentado en el encabezado del baseline.
-- Ojo: eso deja de valer si alguna vez se le pone FORCE ROW LEVEL SECURITY a
-- `usuarios`.
CREATE OR REPLACE FUNCTION "public"."rol_de_la_sesion"()
RETURNS "text"
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT "rol" FROM "usuarios" WHERE "id" = "auth"."uid"();
$$;

-- La casilla de responsable SEC de quien está logueado, o NULL si su email no
-- está en el catálogo.
--
-- El join por email es seguro justamente por lo que hizo 20260819012529: el
-- email es NOT NULL y tiene índice único sobre lower(btrim(email)), así que
-- esta consulta devuelve a lo sumo una fila. Antes de esa migración habría sido
-- el mismo error que se revirtió.
CREATE OR REPLACE FUNCTION "public"."casilla_sec_de_la_sesion"()
RETURNS integer
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT r."id"
  FROM "usuarios" u
  JOIN "responsables_sec" r
    ON lower(btrim(r."email")) = lower(btrim(u."email"))
  WHERE u."id" = "auth"."uid"();
$$;

-- La regla de visibilidad, en UN solo lugar: la usan la policy de SELECT y la
-- de UPDATE, y tienen que decir exactamente lo mismo o se puede editar algo que
-- no se puede ver.
--
-- El CASE evita la trampa de NULL que haría esto inseguro: con
-- `rol_de_la_sesion() <> 'programador'` a secas, una sesión anónima (rol NULL)
-- daría NULL, no false... pero un `OR` con NULL más adelante podría colar la
-- fila igual. Empezando por el NULL explícito, sin sesión no se ve nada.
CREATE OR REPLACE FUNCTION "public"."puede_ver_orden"("p_responsable_sec_id" integer)
RETURNS boolean
LANGUAGE "sql" STABLE
SET "search_path" TO 'public'
AS $$
  SELECT CASE
    -- Sin sesión, o con sesión pero sin fila en `usuarios`: nada.
    WHEN "public"."rol_de_la_sesion"() IS NULL THEN false
    -- Todo rol que no sea programador sigue viendo el listado completo.
    WHEN "public"."rol_de_la_sesion"() <> 'programador' THEN true
    -- Programador: solo lo suyo. Si su email no está en el catálogo,
    -- casilla_sec_de_la_sesion() es NULL, la comparación da NULL y no ve nada
    -- — deliberado, y avisado en pantalla desde el front.
    ELSE "p_responsable_sec_id" IS NOT NULL
     AND "p_responsable_sec_id" = "public"."casilla_sec_de_la_sesion"()
  END;
$$;

-- 2. Fuera las policies que vuelven decorativa a cualquier otra -------------

-- Postgres combina las policies PERMISSIVE con OR, así que basta una que
-- evalúe `true` para que todo lo demás sobre esta tabla sea decoración. Estas
-- dos son exactamente eso:
--   * mvp_open_access  → USING (true), y además para `anon`: hoy la tabla
--     entera se lee con la anon key y sin sesión (verificado con curl);
--   * autenticados_leen_ordenes → USING (auth.uid() IS NOT NULL), que le daría
--     el listado completo a cualquier programador logueado.
-- Si alguna se deja, la restricción de abajo no aplica. No es una opinión de
-- estilo: es la razón por la que `solo_admin_escribe_ordenes` no restringe nada
-- hoy.
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."ordenes_servicio";
DROP POLICY IF EXISTS "autenticados_leen_ordenes" ON "public"."ordenes_servicio";

-- 3. Lectura ---------------------------------------------------------------

CREATE POLICY "lectura_ordenes_segun_rol" ON "public"."ordenes_servicio"
  FOR SELECT
  USING ("public"."puede_ver_orden"("responsable_sec_id"));

-- 4. Escritura -------------------------------------------------------------

-- ⚠️ ESTAS DOS POLICIES NO SON OPCIONALES.
-- Con `mvp_open_access` afuera, la única policy de escritura que queda es
-- `solo_admin_escribe_ordenes` (FOR ALL, es_administrador()). O sea que sin lo
-- de acá abajo, `financiero`, `talento` y `programador` dejarían de poder
-- guardar una orden — y hoy pueden. Es el problema que anticipa
-- PLAN-permisos-por-rol.md §9: "programador no tiene policy de UPDATE propia,
-- hoy el guardado le funciona por mvp_open_access".
--
-- El objetivo acá es NO cambiar quién puede escribir; solo dejar de permitírselo
-- a `anon`. Afinar los permisos de escritura por rol es el otro plan, no este.

-- Alta: cualquier sesión con fila en `usuarios`, que es lo que puede hoy menos
-- el anónimo. Que /ordenes/nueva no tenga guardia de rol es un agujero conocido
-- (PLAN-permisos-por-rol.md §7) y se cierra allá, no acá: apretarlo en esta
-- migración rompería el alta para roles que hoy la usan.
CREATE POLICY "alta_ordenes_autenticados" ON "public"."ordenes_servicio"
  FOR INSERT
  WITH CHECK ("public"."rol_de_la_sesion"() IS NOT NULL);

-- Edición: solo sobre las órdenes que la sesión puede VER, y sin poder sacarlas
-- de su alcance (el WITH CHECK mira la fila resultante). Para todo rol que no
-- sea programador las dos expresiones dan `true`, así que no cambia nada; para
-- un programador significa que no puede editar ni reasignar una orden ajena.
CREATE POLICY "edicion_ordenes_visibles" ON "public"."ordenes_servicio"
  FOR UPDATE
  USING ("public"."puede_ver_orden"("responsable_sec_id"))
  WITH CHECK ("public"."puede_ver_orden"("responsable_sec_id"));

-- DELETE no lleva policy nueva a propósito: queda gobernado por
-- `solo_admin_escribe_ordenes`, o sea solo administrador. Es lo que la UI ya
-- dice —<RoleGate allow={["administrador"]}> en eliminar-ordenes-button.tsx—
-- y hasta hoy la base no lo respaldaba.

-- 5. Índice ----------------------------------------------------------------

-- La policy compara `responsable_sec_id` fila por fila y el listado no pagina
-- en servidor, así que se evalúa sobre todas las órdenes en cada request. El
-- índice ya existe desde 20260816001045
-- (`ordenes_servicio_responsable_sec_id_idx`), así que no hace falta crear
-- nada; queda anotado para que no se lo borre pensando que solo servía a la FK.
