-- ============================================================
-- RLS: ordenes_servicio — solo administrador crea/edita/borra
-- ============================================================
-- Cualquier usuario autenticado puede LEER (listado + Datos generales en
-- modo lectura). Crear, editar y borrar quedan reservados a
-- administrador — el front ya oculta "Nueva orden", el botón de borrar y
-- deshabilita los campos de Datos generales para los demás roles, pero
-- la protección real vive acá.
--
-- Usa es_administrador() de supabase/003_fix_rls_recursion.sql — hay que
-- haber corrido ese script antes que este.
-- ============================================================

ALTER TABLE ordenes_servicio ENABLE ROW LEVEL SECURITY;

-- SELECT abierto a cualquier usuario logueado (no a anon).
CREATE POLICY "autenticados_leen_ordenes"
ON ordenes_servicio FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE solo administrador. Esta policy es FOR ALL, así
-- que también cubre SELECT — pero como ya hay otra policy de SELECT más
-- permisiva arriba, Postgres las combina con OR: para leer basta con
-- estar autenticado, para escribir hace falta además ser administrador.
CREATE POLICY "solo_admin_escribe_ordenes"
ON ordenes_servicio FOR ALL
USING (public.es_administrador())
WITH CHECK (public.es_administrador());

-- ============================================================
-- Verificación rápida
-- ============================================================
-- Como cualquier rol autenticado, esto debe traer filas (antes traía
-- todo igual porque no había RLS; ahora sigue igual):
-- SELECT * FROM ordenes_servicio LIMIT 5;
--
-- Como no-administrador, esto debe fallar con "new row violates
-- row-level security policy":
-- UPDATE ordenes_servicio SET nombre_servicio = 'test' WHERE id = 1;
--
-- Como administrador, el mismo UPDATE sí debe funcionar.
