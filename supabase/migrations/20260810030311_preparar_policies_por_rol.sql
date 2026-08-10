-- Migración A de dos. Deja el esquema listo para que se pueda quitar
-- "mvp_open_access" sin apagar la app, pero NO la quita — eso es la migración
-- B (20260810030313_cerrar_rls_mvp_open_access.sql). Ver
-- PLAN-fix-rls-mvp-open-access.md §5.1.
--
-- Por qué en dos pasos: mientras "mvp_open_access" (FOR ALL TO public USING
-- (true)) siga viva, agregar policies permisivas es un no-op de
-- comportamiento — Postgres las combina con OR y ya hay una rama que da true.
-- Así que TODO lo de acá se puede aplicar y dejar reposar sin cambiar nada de
-- lo que un usuario ve hoy, con una sola excepción, marcada abajo:
-- participantes_arl y vobo, que hoy no tienen RLS y pasan a tenerla.
--
-- La matriz de roles NO se inventó: sale de auditar qué hace hoy el front,
-- archivo por archivo. Cada bloque de abajo cita la línea que lo respalda.
-- El criterio es "que ningún rol pierda nada de lo que hoy puede hacer" — el
-- objetivo de este par de migraciones es cerrarle la puerta a anon, no
-- reacomodar permisos de gente logueada. Los desacuerdos entre lo que el
-- front ofrece y lo que la base permite se dejan documentados abajo, sin
-- cambiarlos.

-- ---------------------------------------------------------------------------
-- Helper: rol_actual()
-- ---------------------------------------------------------------------------
-- Mismo patrón que es_administrador() (ver baseline): SECURITY DEFINER para
-- que, al consultar "usuarios" desde una policy de OTRA tabla, no dispare la
-- RLS de "usuarios" — evita la recursión infinita y evita que la policy de
-- "usuarios" le esconda la fila a quien no sea admin. STABLE porque el rol no
-- cambia dentro del mismo statement.
--
-- Devuelve NULL cuando no hay sesión (auth.uid() es NULL) y cuando la sesión
-- no tiene fila en "usuarios". Eso importa: todas las comparaciones de abajo
-- son "rol_actual() = ANY (...)", que con NULL da NULL, o sea no pasa. anon
-- queda afuera por construcción, sin necesidad de nombrarlo.
CREATE OR REPLACE FUNCTION "public"."rol_actual"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid();
$$;

ALTER FUNCTION "public"."rol_actual"() OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- Limpieza: policies duplicadas (PLAN §3b)
-- ---------------------------------------------------------------------------
-- Mismo predicado con dos nombres. Borrar una de cada par es un no-op: el OR
-- de dos predicados idénticos es el mismo predicado.
DROP POLICY IF EXISTS "usuario_lee_su_propia_fila" ON "public"."usuarios";
DROP POLICY IF EXISTS "admin_y_financiero_valor_hora" ON "public"."valor_hora_orden";

-- ---------------------------------------------------------------------------
-- ordenes_servicio
-- ---------------------------------------------------------------------------
-- Ya existen y no se tocan: autenticados_leen_ordenes (SELECT, auth.uid() IS
-- NOT NULL) y solo_admin_escribe_ordenes (FOR ALL, es_administrador()). Esa
-- segunda cubre a administrador para INSERT/UPDATE/DELETE, así que acá solo
-- se agrega lo que le falta a los demás roles:
--
--   INSERT — "Nueva orden" es solo admin (ordenes-acciones-menu.tsx:70), pero
--   "Importar desde Excel" es admin/financiero/talento
--   (ordenes-acciones-menu.tsx:52-54, `puedeImportar = puedeExportar`) y usa
--   el mismo INSERT. La policy tiene que cubrir la unión.
--
--   UPDATE — financiero y talento editan toda la sección "Datos generales"
--   del formulario (orden-form.tsx:147, `puedeEditarGeneral =
--   puedeVerFinanciera || talento`), y updateOrdenRecord manda la fila
--   completa (ordenes.ts:446). O sea: para estos dos roles NO hay
--   restricción por columna, y no se les pone una acá. Ojo que
--   PLAN-fix-rls-mvp-open-access.md §3e propone limitar a financiero a
--   (cronograma, estado, secuencia) — eso describe el 005 que nunca se
--   aplicó y quedó viejo: esas tres son las columnas de la edición INLINE de
--   la tabla (campoOrdenInlineSchema en validations/orden.schema.ts:102), no
--   las del formulario. Aplicarlo tal cual rompería el formulario para
--   financiero y talento.
--
--   UPDATE de programador — es el único caso que sí necesita restricción por
--   columna: la UI le deja editar un solo campo,
--   observaciones_responsable_sec (orden-form.tsx:158), pero el formulario
--   reenvía la fila entera (los demás campos quedan readOnly, no ausentes).
--   Una policy no puede filtrar columnas, solo filas — de ahí el trigger de
--   más abajo.
--
--   DELETE — sigue siendo solo de administrador
--   (ordenes-acciones-menu.tsx:90), que ya lo cubre
--   solo_admin_escribe_ordenes. No se agrega nada.
CREATE POLICY "financiero_talento_crean_ordenes" ON "public"."ordenes_servicio"
  FOR INSERT
  WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['financiero'::"text", 'talento'::"text"])));

CREATE POLICY "financiero_talento_actualizan_ordenes" ON "public"."ordenes_servicio"
  FOR UPDATE
  USING (("public"."rol_actual"() = ANY (ARRAY['financiero'::"text", 'talento'::"text"])))
  WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['financiero'::"text", 'talento'::"text"])));

CREATE POLICY "programador_actualiza_ordenes" ON "public"."ordenes_servicio"
  FOR UPDATE
  USING (("public"."rol_actual"() = 'programador'::"text"))
  WITH CHECK (("public"."rol_actual"() = 'programador'::"text"));

-- Trigger que hace cumplir el "una sola columna" de programador.
--
-- Está escrito como lista de columnas PERMITIDAS, no de prohibidas, y compara
-- OLD contra NEW en jsonb en vez de columna por columna. La diferencia no es
-- estética: con una lista de prohibidas, la próxima columna que se le agregue
-- a ordenes_servicio queda escribible por programador sin que nadie lo note
-- (falla abierta). Así como está, una columna nueva queda prohibida por
-- omisión y hay que agregarla acá a propósito (falla cerrada).
--
-- Las dos permitidas: observaciones_responsable_sec es la que la UI le
-- ofrece, y fecha_actualizacion la escribe updateOrdenRecord en cada guardado
-- para cualquier rol (ordenes.ts:446).
--
-- rol_actual() devuelve NULL sin sesión, así que el service role (rutas de
-- PDF/Excel) y las migraciones no pasan por la restricción.
--
-- ⚠️ Este trigger es la ÚNICA parte de esta migración que empieza a actuar
-- apenas se aplica: un trigger no es una policy, así que no lo tapa el OR de
-- mvp_open_access. Probado contra la DB local: el guardado real de
-- programador pasa, porque updateOrdenRecord reenvía la fila entera con los
-- demás valores sin cambiar y la comparación no encuentra diferencias.
--
-- El borde a tener presente es el de la normalización: si el front alguna vez
-- mandara "" en una columna que en la base está en NULL, el trigger lo leería
-- como un cambio y bloquearía el guardado. Hoy no pasa porque
-- normalizarInput() pasa todos los campos de texto por orNull()
-- (lib/utils.ts:11), que convierte "" en NULL antes de persistir. Si esa
-- normalización cambia, esto se rompe para programador y solo para él.
CREATE OR REPLACE FUNCTION "public"."restringir_columnas_por_rol"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_rol text := public.rol_actual();
  v_permitidas text[] := ARRAY['observaciones_responsable_sec', 'fecha_actualizacion'];
  v_cambiadas text;
BEGIN
  IF v_rol IS DISTINCT FROM 'programador' THEN
    RETURN NEW;
  END IF;

  SELECT string_agg(n.key, ', ' ORDER BY n.key)
    INTO v_cambiadas
    FROM jsonb_each(to_jsonb(NEW)) n
    JOIN jsonb_each(to_jsonb(OLD)) o ON o.key = n.key
   WHERE n.value IS DISTINCT FROM o.value
     AND NOT (n.key = ANY (v_permitidas));

  IF v_cambiadas IS NOT NULL THEN
    RAISE EXCEPTION
      'El rol programador solo puede editar observaciones_responsable_sec (intentó cambiar: %)',
      v_cambiadas;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."restringir_columnas_por_rol"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "restringir_columnas_por_rol_trigger" ON "public"."ordenes_servicio";
CREATE TRIGGER "restringir_columnas_por_rol_trigger"
  BEFORE UPDATE ON "public"."ordenes_servicio"
  FOR EACH ROW EXECUTE FUNCTION "public"."restringir_columnas_por_rol"();

-- ---------------------------------------------------------------------------
-- info_orden_servicio, checklist_proceso, detalle_entrega_profesional
-- ---------------------------------------------------------------------------
-- Primero el arreglo de PLAN §3a: las 5 policies "admin_y_financiero_editan_*"
-- están las 5 declaradas sobre info_orden_servicio, aunque cuatro de los
-- nombres apuntan a otras tablas. Es un residuo: ninguna toca de verdad
-- checklist_proceso ni detalle_entrega_profesional, y por eso esas dos se
-- quedaron sin policy propia. Se borran las 5 (todas con el mismo predicado
-- admin/financiero) y se reparte de nuevo, tabla por tabla.
--
-- Quién escribe estas 3 hoy: guardarInfoOrdenCompleta no valida rol del lado
-- del servidor, y en el front soloLecturaOperativas
-- (orden-info-secciones.tsx:100-101) deshabilita las secciones operativas
-- SOLO para profesional y lectura. O sea que administrador, financiero,
-- talento y programador guardan estas 3 tablas hoy. Restringirlas a
-- admin+financiero como sugiere el nombre viejo sería quitarle a talento y
-- programador algo que hoy hacen.
--
-- profesional y lectura sí necesitan LEER (ven la sección, solo no la
-- editan): de ahí la policy de SELECT aparte para cualquier autenticado.
--
-- El INSERT y el UPDATE van como policies separadas y ambas hacen falta:
-- guardarInfoOrdenCompleta usa .upsert(), que en Postgres es INSERT ... ON
-- CONFLICT DO UPDATE y exige pasar el WITH CHECK del INSERT y además el
-- USING y el WITH CHECK del UPDATE.
--
-- El DELETE de estas 3 solo ocurre en eliminarInfoOrdenCompleta
-- (info-orden.ts:599), que llama eliminarOrden, exclusivo de administrador
-- (ordenes-acciones-menu.tsx:90). Por eso DELETE sí queda solo para admin,
-- a diferencia del INSERT/UPDATE.
DROP POLICY IF EXISTS "admin_y_financiero_editan_acta_servicio" ON "public"."info_orden_servicio";
DROP POLICY IF EXISTS "admin_y_financiero_editan_checklist_proceso" ON "public"."info_orden_servicio";
DROP POLICY IF EXISTS "admin_y_financiero_editan_detalle_entrega_profesional" ON "public"."info_orden_servicio";
DROP POLICY IF EXISTS "admin_y_financiero_editan_info_orden" ON "public"."info_orden_servicio";
DROP POLICY IF EXISTS "admin_y_financiero_editan_ordenes_servicio" ON "public"."info_orden_servicio";

CREATE POLICY "autenticados_leen_info_orden" ON "public"."info_orden_servicio"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));
CREATE POLICY "gestion_escribe_info_orden" ON "public"."info_orden_servicio"
  FOR INSERT WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])));
CREATE POLICY "gestion_actualiza_info_orden" ON "public"."info_orden_servicio"
  FOR UPDATE
  USING (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])))
  WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])));
CREATE POLICY "admin_borra_info_orden" ON "public"."info_orden_servicio"
  FOR DELETE USING ("public"."es_administrador"());

CREATE POLICY "autenticados_leen_checklist_proceso" ON "public"."checklist_proceso"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));
CREATE POLICY "gestion_escribe_checklist_proceso" ON "public"."checklist_proceso"
  FOR INSERT WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])));
CREATE POLICY "gestion_actualiza_checklist_proceso" ON "public"."checklist_proceso"
  FOR UPDATE
  USING (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])))
  WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])));
CREATE POLICY "admin_borra_checklist_proceso" ON "public"."checklist_proceso"
  FOR DELETE USING ("public"."es_administrador"());

CREATE POLICY "autenticados_leen_detalle_entrega" ON "public"."detalle_entrega_profesional"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));
CREATE POLICY "gestion_escribe_detalle_entrega" ON "public"."detalle_entrega_profesional"
  FOR INSERT WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])));
CREATE POLICY "gestion_actualiza_detalle_entrega" ON "public"."detalle_entrega_profesional"
  FOR UPDATE
  USING (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])))
  WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])));
CREATE POLICY "admin_borra_detalle_entrega" ON "public"."detalle_entrega_profesional"
  FOR DELETE USING ("public"."es_administrador"());

-- ---------------------------------------------------------------------------
-- orden_entregables_estandar
-- ---------------------------------------------------------------------------
-- Acá no hay UPDATE: guardarInfoOrdenCompleta borra todas las filas de la
-- orden y reinserta la selección actual (info-orden.ts:540-549). Ese
-- delete+insert lo dispara el mismo grupo de roles que las 3 tablas de
-- arriba, así que el DELETE necesita ese grupo completo — no solo admin, a
-- diferencia de info_orden_servicio. El borrado de la orden entera
-- (eliminarInfoOrdenCompleta) también pasa por acá, y admin está en el grupo.
CREATE POLICY "autenticados_leen_orden_entregables" ON "public"."orden_entregables_estandar"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));
CREATE POLICY "gestion_escribe_orden_entregables" ON "public"."orden_entregables_estandar"
  FOR INSERT WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])));
CREATE POLICY "gestion_borra_orden_entregables" ON "public"."orden_entregables_estandar"
  FOR DELETE USING (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])));

-- ---------------------------------------------------------------------------
-- profesionales
-- ---------------------------------------------------------------------------
-- La gestión del catálogo (crear/editar/activar) es de administrador,
-- financiero y talento: profesionales/page.tsx:18-28 redirige a cualquier
-- otro rol. No hay DELETE en ningún lado del código — profesionales.ts solo
-- hace insert y update (líneas 63, 94, 115), la baja es un update de
-- `activo` — así que no se crea policy de DELETE.
--
-- Pero el SELECT tiene que ser de cualquier autenticado, no de esos 3:
-- getProfesionalesParaSelect() se llama sin chequeo de rol desde
-- /ordenes/nueva y /ordenes/[id]/editar (para el combo "Profesional
-- asignado" y para resolver el nombre vía el join profesional:profesionales
-- en info-orden.ts). Con SELECT restringido a los 3 roles de gestión,
-- profesional y lectura verían ese campo vacío al abrir una orden, en
-- silencio.
--
-- ⚠️ Consecuencia conocida y aceptada acá: getProfesionalesParaSelect
-- selecciona también valor_hora (ordenes.ts:379 y alrededores), así que con
-- SELECT abierto cualquier rol autenticado puede leer el valor hora de cada
-- profesional. RLS filtra filas, no columnas: la solución no es una policy
-- sino dejar de pedir esa columna en esa query o exponer una vista. Queda
-- documentado, no se cambia acá — hoy pasa exactamente lo mismo vía
-- mvp_open_access, así que esto no lo empeora.
CREATE POLICY "autenticados_leen_profesionales" ON "public"."profesionales"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));
CREATE POLICY "admin_fin_talento_crean_profesionales" ON "public"."profesionales"
  FOR INSERT WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text"])));
CREATE POLICY "admin_fin_talento_actualizan_profesionales" ON "public"."profesionales"
  FOR UPDATE
  USING (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text"])))
  WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text"])));

-- ---------------------------------------------------------------------------
-- Catálogos de solo lectura: clientes, ciudades, estados_ejecucion,
-- entregables_estandar
-- ---------------------------------------------------------------------------
-- Ninguna pantalla los crea, edita ni borra: verificado grepeando lib/data
-- por insert/update/upsert/delete contra estas 4 tablas, cero resultados.
-- Se administran por migración o desde el dashboard (service role, que
-- bypassea RLS). Policy de SELECT y nada más — mismo criterio que ya se usó
-- para "departamentos" en 20260802163953_departamentos_y_municipios.sql.
--
-- clientes y estados_ejecucion además se leen embebidos desde getOrdenes
-- (ordenes.ts:171-173): si a un rol le faltara el SELECT acá, PostgREST no
-- daría error, devolvería cliente: null y las columnas Cliente y Estado del
-- listado saldrían vacías sin que nadie se entere.
CREATE POLICY "autenticados_leen_clientes" ON "public"."clientes"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));

CREATE POLICY "autenticados_leen_ciudades" ON "public"."ciudades"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));

CREATE POLICY "autenticados_leen_estados_ejecucion" ON "public"."estados_ejecucion"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));

CREATE POLICY "autenticados_leen_entregables_estandar" ON "public"."entregables_estandar"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));

-- ---------------------------------------------------------------------------
-- participantes_arl y vobo  ⚠️ ÚNICO CAMBIO DE COMPORTAMIENTO DE ESTA MIGRACIÓN
-- ---------------------------------------------------------------------------
-- Estas dos nunca tuvieron ENABLE ROW LEVEL SECURITY, así que no las tapa
-- "mvp_open_access" ni ninguna policy: manda el GRANT, y anon tiene
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE sobre ambas. Contienen nombres y
-- cédulas de personas reales.
--
-- Esto es lo que hace que "RLS sola alcanza, no hace falta tocar los GRANT"
-- sea falso: ese argumento vale para una tabla con RLS habilitada, y estas
-- dos no la tienen. Sin este bloque, la migración B cerraría las 11 tablas de
-- mvp_open_access y dejaría estas dos abiertas de par en par.
--
-- El ENABLE y la policy de SELECT van juntos y en este orden a propósito: las
-- lee getCatalogos() (info-orden.ts:75-84), y acta_servicio embebe
-- participantes_arl. Habilitar RLS sin policy deja las dos tablas en
-- "denegar todo" y apaga en silencio los selectores de participante ARL y
-- VoBo del formulario de edición.
--
-- Escritura: ninguna. El código nunca inserta ni actualiza acá; se siembran
-- por seed/migración (service role, que bypassea RLS). vobo recibió filas en
-- 20260810015141_agregar_abigail_johanna_responsable_os_y_vobo.sql, que es
-- exactamente ese camino.
ALTER TABLE "public"."participantes_arl" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados_leen_participantes_arl" ON "public"."participantes_arl"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));

ALTER TABLE "public"."vobo" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados_leen_vobo" ON "public"."vobo"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));

-- ---------------------------------------------------------------------------
-- Lo que esta migración NO hace, a propósito
-- ---------------------------------------------------------------------------
-- valor_hora_orden no necesita policies nuevas. PLAN-fix-rls-mvp-open-access.md
-- §3c dice que "talento" no está en sus policies y que por eso ese rol no
-- puede usar la sección; eso ya se arregló en
-- 20260804231809_extender_rls_valor_hora_talento.sql, posterior al plan, que
-- extendió las dos policies a administrador/financiero/talento — o sea,
-- exactamente el mismo conjunto que puedeEditarGeneral en orden-form.tsx:147.
-- Lo único que se hace acá con esa tabla es borrar el duplicado (arriba), que
-- con ambas policies ya idénticas sigue siendo un no-op.
--
-- Las 5 tablas de la sección financiera (acta_servicio, cuenta_cobro,
-- facturacion, liquidacion, radicacion_imagine) tampoco se tocan: ya tienen
-- fin_all (administrador + financiero), nunca tuvieron mvp_open_access y su
-- comportamiento actual es el correcto. Para talento, programador,
-- profesional y lectura hoy devuelven 0 filas, y van a seguir devolviendo 0
-- filas — si algo se ve raro ahí después de aplicar esto, no lo causó este
-- cambio.
