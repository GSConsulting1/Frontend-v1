-- Cierra el hueco de seguridad "mvp_open_access": esa policy (USING (true)
-- WITH CHECK (true)) está declarada FOR ALL TO public en 11 tablas, y en
-- Postgres "public" no es "usuarios logueados" sino todos los roles,
-- incluido "anon" — la anon key, que viaja en el bundle del navegador,
-- puede leer y escribir esas tablas sin sesión. Además, donde ya existían
-- policies reales (usuarios, ordenes_servicio), quedaban neutralizadas: las
-- policies permisivas se combinan con OR, así que "true" le ganaba a
-- cualquier restricción de al lado. Ver comentario de referencia en
-- supabase/migrations/20260802163953_departamentos_y_municipios.sql.
--
-- Esta migración NO toca los GRANT (siguen ALL para anon/authenticated,
-- como ya estaban). RLS por sí sola alcanza para cerrar el hueco: con RLS
-- habilitada, un GRANT amplio no le da a un rol más acceso del que sus
-- policies permiten. Achicar los GRANT ahora, sin stack local para
-- correr db:reset y probar cada combinación de rol x tabla x operación,
-- suma riesgo de romper un flujo real por un grant olvidado — un fallo
-- de tipo "permission denied" que ni siquiera pasa por RLS. Se deja como
-- mejora aparte, no como parte de este cierre.
--
-- La matriz de roles/tablas se armó auditando qué hace hoy el frontend
-- (RoleGate, redirects server-side, server actions) tabla por tabla, no
-- adivinando — ver detalle por tabla abajo.

-- ---------------------------------------------------------------------------
-- Helper: rol_actual()
-- ---------------------------------------------------------------------------
-- Mismo patrón que es_administrador() (ver baseline): SECURITY DEFINER para
-- que, al consultar "usuarios" desde una policy de OTRA tabla, no dispare la
-- RLS de "usuarios" (evita recursión y evita que la propia policy de
-- "usuarios" le esconda la fila a quien no sea admin/el dueño). STABLE
-- porque el rol no cambia dentro de la misma transacción/statement.
CREATE OR REPLACE FUNCTION "public"."rol_actual"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid();
$$;

ALTER FUNCTION "public"."rol_actual"() OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- usuarios
-- ---------------------------------------------------------------------------
-- Ya tiene policies reales (admin_gestiona_usuarios, usuario_lee_su_fila,
-- usuario_lee_su_propia_fila) — solo hay que sacarle mvp_open_access de
-- encima. Nadie en el código de la app hace INSERT/DELETE sobre usuarios
-- (las filas se crean a mano, ver comentario en auth-provider.tsx), así que
-- no hace falta agregar policy para eso.
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."usuarios";

-- ---------------------------------------------------------------------------
-- ordenes_servicio
-- ---------------------------------------------------------------------------
-- autenticados_leen_ordenes (SELECT) y solo_admin_escribe_ordenes (FOR ALL,
-- admin) ya existen y quedan igual. Lo que falta, confirmado auditando
-- src/app/ordenes/actions.ts y ordenes-acciones-menu.tsx:
--   - INSERT: "Nueva orden" es solo admin en la UI, pero "Importar desde
--     Excel" (importarOrdenesDesdeExcel) es admin/financiero/talento y usa
--     el mismo INSERT — la policy tiene que cubrir la unión.
--   - UPDATE: financiero y talento editan la sección "Datos generales"
--     (puedeEditarGeneral en orden-form.tsx).
--   - programador solo debería poder tocar una columna
--     (observaciones_responsable_sec), pero el formulario reenvía la fila
--     completa (los demás campos quedan readOnly, no ocultos). Una policy
--     de UPDATE no puede restringir por columna — de ahí el trigger de más
--     abajo, que rechaza el UPDATE si programador intenta cambiar
--     cualquier otra columna.
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."ordenes_servicio";

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

-- Trigger que hace cumplir el "una sola columna" de programador. Compara
-- OLD vs. NEW columna por columna (con IS NOT DISTINCT FROM, que trata
-- NULL = NULL como true) y deja pasar únicamente observaciones_responsable_sec
-- (la editable) y fecha_actualizacion (la actualiza updateOrdenRecord en
-- cada guardado, para cualquier rol).
CREATE OR REPLACE FUNCTION "public"."restringir_update_programador"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF public.rol_actual() = 'programador' THEN
    IF NOT (
      NEW.asesor_gestion_riesgos IS NOT DISTINCT FROM OLD.asesor_gestion_riesgos AND
      NEW.cliente_id IS NOT DISTINCT FROM OLD.cliente_id AND
      NEW.cronograma IS NOT DISTINCT FROM OLD.cronograma AND
      NEW.estado IS NOT DISTINCT FROM OLD.estado AND
      NEW.fecha_creacion IS NOT DISTINCT FROM OLD.fecha_creacion AND
      NEW.fecha_recepcion_os IS NOT DISTINCT FROM OLD.fecha_recepcion_os AND
      NEW.fecha_sipab IS NOT DISTINCT FROM OLD.fecha_sipab AND
      NEW.horas_cargadas IS NOT DISTINCT FROM OLD.horas_cargadas AND
      NEW.id_unico IS NOT DISTINCT FROM OLD.id_unico AND
      NEW.link_archivo_orden IS NOT DISTINCT FROM OLD.link_archivo_orden AND
      NEW.nit_empresa_usuaria IS NOT DISTINCT FROM OLD.nit_empresa_usuaria AND
      NEW.nombre_empresa_usuaria IS NOT DISTINCT FROM OLD.nombre_empresa_usuaria AND
      NEW.nombre_servicio IS NOT DISTINCT FROM OLD.nombre_servicio AND
      NEW.numero_os_cliente IS NOT DISTINCT FROM OLD.numero_os_cliente AND
      NEW.observaciones_iniciales IS NOT DISTINCT FROM OLD.observaciones_iniciales AND
      NEW.responsable_os IS NOT DISTINCT FROM OLD.responsable_os AND
      NEW.secuencia IS NOT DISTINCT FROM OLD.secuencia AND
      NEW.tarifa_valor_transporte IS NOT DISTINCT FROM OLD.tarifa_valor_transporte AND
      NEW.tipo_servicio IS NOT DISTINCT FROM OLD.tipo_servicio
    ) THEN
      RAISE EXCEPTION 'El rol programador solo puede editar observaciones_responsable_sec';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."restringir_update_programador"() OWNER TO "postgres";

CREATE TRIGGER "restringir_update_programador_trigger"
  BEFORE UPDATE ON "public"."ordenes_servicio"
  FOR EACH ROW EXECUTE FUNCTION "public"."restringir_update_programador"();

-- ---------------------------------------------------------------------------
-- info_orden_servicio, checklist_proceso, detalle_entrega_profesional
-- ---------------------------------------------------------------------------
-- Las 5 policies "admin_y_financiero_editan_*" del baseline (acta_servicio,
-- checklist_proceso, detalle_entrega_profesional, info_orden, ordenes_servicio
-- en el nombre) están las 5 declaradas sobre info_orden_servicio — un
-- residuo de nombres, ninguna toca de verdad checklist_proceso ni
-- detalle_entrega_profesional. Se reemplazan las 5 (todas con la misma
-- condición admin/financiero) por una sola política de escritura, más
-- amplia, que sí coincide con lo que hace guardarInfoOrdenCompleta hoy: no
-- valida rol del lado del servidor, así que en la práctica cualquier
-- autenticado que no sea profesional/lectura puede guardar estas 3 tablas
-- (soloLecturaOperativas en orden-info-secciones.tsx solo excluye a esos
-- dos roles — administrador, financiero, talento Y programador quedan
-- habilitados). profesional/lectura sí necesitan poder LEER estas 3 tablas
-- (ven la sección, solo no la editan) — de ahí la policy de SELECT
-- separada para cualquier autenticado.
--
-- El DELETE de estas 3 tablas solo pasa en eliminarOrden/eliminarOrdenes
-- (borrado de la orden completa), que en la UI es exclusivo de admin — así
-- que ese sí queda restringido a administrador, a diferencia del
-- INSERT/UPDATE.
DROP POLICY IF EXISTS "admin_y_financiero_editan_acta_servicio" ON "public"."info_orden_servicio";
DROP POLICY IF EXISTS "admin_y_financiero_editan_checklist_proceso" ON "public"."info_orden_servicio";
DROP POLICY IF EXISTS "admin_y_financiero_editan_detalle_entrega_profesional" ON "public"."info_orden_servicio";
DROP POLICY IF EXISTS "admin_y_financiero_editan_info_orden" ON "public"."info_orden_servicio";
DROP POLICY IF EXISTS "admin_y_financiero_editan_ordenes_servicio" ON "public"."info_orden_servicio";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."info_orden_servicio";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."checklist_proceso";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."detalle_entrega_profesional";

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
-- guardarInfoOrdenCompleta no hace UPDATE acá: borra todo lo de la orden e
-- inserta de nuevo la selección actual (ver info-orden.ts). Ese
-- delete+insert lo dispara el mismo grupo de roles que las 3 tablas de
-- arriba (todos menos profesional/lectura), así que DELETE necesita ese
-- mismo grupo — no solo admin — a diferencia de info_orden_servicio.
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."orden_entregables_estandar";

CREATE POLICY "autenticados_leen_orden_entregables" ON "public"."orden_entregables_estandar"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));
CREATE POLICY "gestion_escribe_orden_entregables" ON "public"."orden_entregables_estandar"
  FOR INSERT WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])));
CREATE POLICY "gestion_borra_orden_entregables" ON "public"."orden_entregables_estandar"
  FOR DELETE USING (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text", 'programador'::"text"])));

-- ---------------------------------------------------------------------------
-- profesionales
-- ---------------------------------------------------------------------------
-- src/app/profesionales/page.tsx redirige a quien no sea
-- administrador/financiero/talento — esa es la gestión del catálogo
-- (crear/editar/activar profesional). Pero el SELECT de esta tabla también
-- lo necesita CUALQUIER autenticado: getProfesionalesParaSelect() se llama
-- sin chequeo de rol desde /ordenes/[id]/editar y /ordenes/nueva (para el
-- combo "Profesional asignado" y para resolver el nombre del profesional
-- vía el join profesional:profesionales(...) en info-orden.ts) — con SELECT
-- restringido a esos 3 roles, profesional/lectura verían ese campo vacío al
-- abrir una orden. Por eso SELECT es abierto a cualquier autenticado y solo
-- INSERT/UPDATE quedan restringidos.
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."profesionales";

CREATE POLICY "autenticados_leen_profesionales" ON "public"."profesionales"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));
CREATE POLICY "admin_fin_talento_crean_profesionales" ON "public"."profesionales"
  FOR INSERT WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text"])));
CREATE POLICY "admin_fin_talento_actualizan_profesionales" ON "public"."profesionales"
  FOR UPDATE
  USING (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text"])))
  WITH CHECK (("public"."rol_actual"() = ANY (ARRAY['administrador'::"text", 'financiero'::"text", 'talento'::"text"])));

-- ---------------------------------------------------------------------------
-- clientes, ciudades, estados_ejecucion, entregables_estandar
-- ---------------------------------------------------------------------------
-- Catálogos: no existe ninguna pantalla en la app que cree/edite/borre
-- filas acá (confirmado grepeando lib/data por insert/update/upsert/delete
-- contra estas 4 tablas — cero resultados). Quedan de solo lectura para
-- cualquier autenticado, mismo criterio que ya usaron para "departamentos"
-- en 20260802163953_departamentos_y_municipios.sql.
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."clientes";
CREATE POLICY "autenticados_leen_clientes" ON "public"."clientes"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));

DROP POLICY IF EXISTS "mvp_open_access" ON "public"."ciudades";
CREATE POLICY "autenticados_leen_ciudades" ON "public"."ciudades"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));

DROP POLICY IF EXISTS "mvp_open_access" ON "public"."estados_ejecucion";
CREATE POLICY "autenticados_leen_estados_ejecucion" ON "public"."estados_ejecucion"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));

DROP POLICY IF EXISTS "mvp_open_access" ON "public"."entregables_estandar";
CREATE POLICY "autenticados_leen_entregables_estandar" ON "public"."entregables_estandar"
  FOR SELECT USING (("auth"."uid"() IS NOT NULL));
