-- Migración B de dos. Esta es la que cierra de verdad. Requiere que
-- 20260810030311_preparar_policies_por_rol.sql ya esté aplicada y probada:
-- sin las policies que crea aquélla, este archivo deja 8 tablas en "denegar
-- todo" y apaga la app para todos los roles, incluido administrador.
-- Ver PLAN-fix-rls-mvp-open-access.md §5.1, migración B.
--
-- El problema que cierra, en tres hechos que por separado parecen menores:
--
--   1. "mvp_open_access" está declarada FOR ALL TO public USING (true) WITH
--      CHECK (true) en 11 tablas. En Postgres "public" no son los usuarios
--      logueados: son TODOS los roles, incluido anon.
--   2. Las policies permisivas se combinan con OR, así que mientras esa
--      exista, solo_admin_escribe_ordenes y admin_gestiona_usuarios no
--      restringen nada — siempre hay una rama que da true.
--   3. anon tiene SELECT/INSERT/UPDATE/DELETE sobre todas las tablas de
--      public, y la anon key viaja en el bundle de JavaScript del navegador.
--
-- Juntos: cualquiera con las DevTools abiertas podía hacer
-- `UPDATE usuarios SET rol = 'administrador'` sin iniciar sesión.

-- ---------------------------------------------------------------------------
-- 1. Quitar mvp_open_access de las 11 tablas
-- ---------------------------------------------------------------------------
-- A partir de acá mandan las policies reales: las del baseline
-- (autenticados_leen_ordenes, solo_admin_escribe_ordenes,
-- admin_gestiona_usuarios, usuario_lee_su_fila) y las que creó la migración A.
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."checklist_proceso";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."ciudades";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."clientes";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."detalle_entrega_profesional";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."entregables_estandar";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."estados_ejecucion";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."info_orden_servicio";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."orden_entregables_estandar";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."ordenes_servicio";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."profesionales";
DROP POLICY IF EXISTS "mvp_open_access" ON "public"."usuarios";

-- ---------------------------------------------------------------------------
-- 2. Quitarle a anon los privilegios sobre las tablas que existen hoy
-- ---------------------------------------------------------------------------
-- Con RLS habilitada y sin policy que le aplique, anon ya no llegaría a nada
-- aunque conservara el GRANT. El REVOKE igual hace falta por dos razones:
--
--   a) participantes_arl y vobo no tenían RLS hasta la migración A; el GRANT
--      era lo único que las gobernaba. Defensa en profundidad: si alguien
--      alguna vez le desactiva RLS a una tabla, el GRANT no debería estar
--      ahí esperando.
--   b) Cambia el modo de falla de "0 filas en silencio" a "permission
--      denied". Para anon eso es lo que queremos: un error ruidoso es la
--      prueba de que el cierre funciona. Un [] vacío es indistinguible de
--      una tabla sin datos.
--
-- ⚠️ Solo anon. NUNCA authenticated. lib/data/info-orden.ts:197-201 documenta
-- que el código cuenta con que RLS devuelve 0 filas y no un error; un GRANT
-- faltante devuelve 42501 permission denied, que ese archivo convierte en
-- throw. Revocarle a authenticated haría explotar la página de edición para
-- todos los roles en vez de mostrar campos vacíos.
--
-- Las sequences van aparte: sin USAGE sobre la sequence, un INSERT en una
-- tabla con id serial falla igual. Se revocan las dos por separado porque
-- son objetos distintos y ALL TABLES no las incluye.
REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM "anon";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM "anon";

-- Las funciones de public también están grantadas a anon (es_administrador(),
-- generar_id_unico_orden(), y ahora rol_actual()). Hoy es de bajo riesgo
-- —es_administrador() sin sesión devuelve false y la otra es una función de
-- trigger— pero conviene cerrarlo antes de que aparezca una SECURITY DEFINER
-- nueva que sí haga algo. Las funciones de extensiones no se ven afectadas:
-- viven en el schema "extensions", no en "public".
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "public" FROM "anon";

-- ---------------------------------------------------------------------------
-- 3. Que las tablas FUTURAS no vuelvan a nacer abiertas
-- ---------------------------------------------------------------------------
-- Este es el paso que evita repetir el ciclo, y el que faltaba en el intento
-- anterior. El baseline trae:
--
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--     GRANT ALL ON TABLES TO anon;   -- ídem SEQUENCES, ídem FUNCTIONS
--
-- Sin revocar eso, el paso 2 solo cubre las tablas de hoy: la próxima tabla
-- que cree una migración nace con GRANT completo para anon otra vez. Si
-- además alguien olvida el ENABLE ROW LEVEL SECURITY, nace completamente
-- abierta — que es exactamente cómo quedaron participantes_arl y vobo. El
-- mismo agujero, reabriéndose solo, sin que nadie escriba una línea de SQL.
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE ALL ON TABLES FROM "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE ALL ON SEQUENCES FROM "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE ALL ON FUNCTIONS FROM "anon";

-- Hay un segundo juego de default privileges, propiedad de supabase_admin,
-- con el mismo GRANT a anon (verificado con pg_default_acl: hay filas para
-- los owners "postgres" y "supabase_admin"). Aplica a los objetos que crea
-- supabase_admin, no a los de nuestras migraciones —que corren como
-- postgres—, así que no es el camino por el que se nos reabriría el agujero.
-- Se intenta igual, y si el rol que corre la migración no tiene permiso para
-- tocarlo, se sigue de largo en vez de romper el despliegue: es defensa en
-- profundidad, no un requisito.
DO $$
BEGIN
  ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public"
    REVOKE ALL ON TABLES FROM "anon";
  ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public"
    REVOKE ALL ON SEQUENCES FROM "anon";
  ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public"
    REVOKE ALL ON FUNCTIONS FROM "anon";
EXCEPTION
  WHEN insufficient_privilege OR undefined_object THEN
    RAISE NOTICE 'No se pudieron revocar los default privileges de supabase_admin (se necesita ser miembro de ese rol). Los de postgres, que son los que aplican a las tablas creadas por migraciones, sí quedaron revocados.';
END;
$$;

-- ---------------------------------------------------------------------------
-- Cómo comprobar que quedó cerrado
-- ---------------------------------------------------------------------------
-- Sin sesión, con la anon key. Tiene que devolver 401 / permission denied.
-- Un [] vacío NO alcanza: querría decir que el REVOKE no se aplicó y que solo
-- está actuando RLS.
--
--   curl -i "$SUPABASE_URL/rest/v1/usuarios?select=*" -H "apikey: $ANON_KEY"
--   curl -i -X PATCH "$SUPABASE_URL/rest/v1/usuarios?id=eq.<uuid>" \
--     -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
--     -d '{"rol":"administrador"}'
--
-- Y las dos que no estaban tapadas por mvp_open_access, que son las que
-- tienen datos personales:
--
--   curl -i "$SUPABASE_URL/rest/v1/participantes_arl?select=*" -H "apikey: $ANON_KEY"
--   curl -i "$SUPABASE_URL/rest/v1/vobo?select=*" -H "apikey: $ANON_KEY"
--
-- ---------------------------------------------------------------------------
-- Rollback (el CLI de Supabase no tiene down migrations)
-- ---------------------------------------------------------------------------
-- Vuelve a abrir la brecha, pero es preferible a dejar la app caída mientras
-- se depura. Si se usa, el repo queda desincronizado del remoto: hay que
-- escribir una migración nueva que refleje el estado revertido, no editar
-- ésta.
--
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
--   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
--   GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--     GRANT ALL ON TABLES TO anon;
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--     GRANT ALL ON SEQUENCES TO anon;
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--     GRANT ALL ON FUNCTIONS TO anon;
--   -- y recrear la policy en las 11 tablas de arriba:
--   CREATE POLICY "mvp_open_access" ON public.<tabla>
--     FOR ALL TO public USING (true) WITH CHECK (true);
