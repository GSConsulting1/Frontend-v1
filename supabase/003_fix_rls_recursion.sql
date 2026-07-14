-- ============================================================
-- Fix: recursión infinita en las policies de usuarios/valor_hora_orden
-- ============================================================
-- Síntoma: "infinite recursion detected in policy for relation usuarios"
-- al leer cualquier tabla cuya policy consulta `usuarios` para saber el
-- rol (valor_hora_orden, y la propia tabla usuarios).
--
-- Causa: la policy "admin_gestiona_usuarios" hace
--   EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() ...)
-- Esa subconsulta contra `usuarios` vuelve a disparar la misma policy de
-- `usuarios` para evaluarse a sí misma -> recursión infinita. Cualquier
-- otra policy que consulte `usuarios` (como las de valor_hora_orden)
-- hereda el mismo problema.
--
-- Solución: un chequeo de rol en una función SECURITY DEFINER. Al correr
-- con los privilegios de quien la creó (el dueño de la función bypassea
-- RLS por default, a menos que la tabla tenga FORCE ROW LEVEL SECURITY),
-- la consulta interna a `usuarios` no vuelve a disparar la policy.
-- ============================================================

CREATE OR REPLACE FUNCTION public.es_administrador()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'administrador'
  );
$$;

-- Reemplazar las 3 policies que hoy recurren, para que usen la función
-- en vez de la subconsulta inline.

DROP POLICY IF EXISTS "admin_gestiona_usuarios" ON usuarios;
CREATE POLICY "admin_gestiona_usuarios"
ON usuarios FOR ALL
USING (public.es_administrador())
WITH CHECK (public.es_administrador());

DROP POLICY IF EXISTS "solo_admin_lee_valor_hora" ON valor_hora_orden;
CREATE POLICY "solo_admin_lee_valor_hora"
ON valor_hora_orden FOR SELECT
USING (public.es_administrador());

DROP POLICY IF EXISTS "solo_admin_escribe_valor_hora" ON valor_hora_orden;
CREATE POLICY "solo_admin_escribe_valor_hora"
ON valor_hora_orden FOR ALL
USING (public.es_administrador())
WITH CHECK (public.es_administrador());

-- ============================================================
-- Verificación rápida (correr autenticada como cada rol)
-- ============================================================
-- Como cualquier usuario logueado, esto ya no debe tirar "infinite
-- recursion" (antes tumbaba hasta a los no-administrador):
-- SELECT * FROM usuarios WHERE id = auth.uid();
--
-- Como no-administrador, 0 filas (sin error):
-- SELECT * FROM valor_hora_orden;
--
-- Como administrador, sí trae filas:
-- SELECT * FROM valor_hora_orden;
