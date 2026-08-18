# Plan: visibilidad de órdenes por rol (el reemplazo de 9314a3c)

Estado: **pendiente**. Escrito el 2026-08-18, justo después de revertir el
primer intento en `revert/filtro-ordenes-por-email`.

Todo lo que se afirma acá está verificado contra el código y el esquema reales,
con archivo y línea, para que no haya que abrir psql ni confiar en la memoria.
Las referencias al esquema apuntan a
`supabase/migrations/20260802085134_baseline_esquema_remoto.sql`.

**Dependencia dura:** este plan no se puede ejecutar antes que
`PLAN-fix-rls-mvp-open-access.md`. La razón está en la sección 4.

---

## 1. Qué se quiere

Que un usuario con rol `profesional` vea en `/ordenes` únicamente las órdenes
que tiene asignadas, y no pueda llegar a las demás ni por URL directa ni
pegándole a la API.

## 2. Qué se intentó y por qué se revirtió

Commit `9314a3c` (14 ago), revertido en la rama `revert/filtro-ordenes-por-email`.
Metía un filtro en dos archivos de aplicación —`src/app/ordenes/page.tsx` y
`src/lib/data/ordenes.ts`— que resolvía el profesional cruzando
`usuarios.email` contra `profesionales.email`. Cuatro problemas, cada uno
suficiente para tumbarlo:

1. **Se disparaba para todo rol distinto de `administrador`.** La condición era
   `perfil.rol !== "administrador"`, así que `financiero`, `talento`, `lectura`
   y `programador` entraban también. Ninguno de esos roles tiene fila en
   `profesionales`, así que caían en el `return []` y veían el listado vacío.
   Se reproduce con el seed local tal cual está: `financiero@local.test`,
   `talento@local.test`, `programador@local.test` y `lectura@local.test`
   (`supabase/seed.sql:164-171`) no existen en `profesionales`.

2. **Cruzaba por email teniendo la relación real en la misma tabla.**
   `usuarios.profesional_id` existe (baseline línea 534) y tiene FK a
   `profesionales` (`usuarios_profesional_id_fkey`, línea 834). El tipo del
   front hasta lo documenta: *"un usuario con rol profesional tiene
   profesional_id apuntando a su fila en esa tabla"* (`src/types/index.ts:106-108`).
   El código usaba un `.eq("email", ...)` exacto y sensible a mayúsculas.

3. **Fallaba en silencio.** Todos los caminos de error —email sin match, email
   duplicado que hace fallar `maybeSingle()`, usuario con `email` NULL (la
   columna es nullable, baseline línea 532)— terminaban en el mismo
   `return []`. El usuario veía cero órdenes sin ningún mensaje.

4. **No era una restricción de acceso.** Solo filtraba el listado.
   `/ordenes/[id]/editar` no tiene guardia de rol —solo `notFound()` si el id
   no existe (`src/app/ordenes/[id]/editar/page.tsx:40-47`)— y en la base sigue
   viva la policy `mvp_open_access` sobre `ordenes_servicio` (baseline línea
   1012), así que con la anon key se lee la tabla entera sin sesión.

---

## 3. Tres decisiones que hay que cerrar antes de escribir código

No son detalles de implementación: cambian el diseño. Conviene resolverlas con
negocio antes de empezar.

### 3.1 Qué roles se restringen

Los roles existentes son seis, según el CHECK de la tabla (baseline línea 537)
y `RolUsuario` (`src/types/index.ts:97-103`): `administrador`, `programador`,
`profesional`, `lectura`, `financiero`, `talento`.

La lectura por defecto de este plan —y la que hay que confirmar— es que **solo
`profesional` se restringe**, y los otros cinco siguen viendo todo. Es lo
consistente con el resto del sistema: `financiero` y `talento` ya tienen
permisos transversales sobre secciones financieras
(`src/app/api/ordenes/excel/route.tsx:28-29`), y restringirlos por profesional
asignado no tiene sentido porque no ejecutan órdenes.

Si la respuesta fuera "también `lectura`" o "también `programador`", el diseño
cambia: haría falta una segunda dimensión de asignación, porque esos roles
tampoco tienen fila en `profesionales`.

### 3.2 Qué cuenta como "su" orden

Hoy la única relación orden→persona que sirve es
`info_orden_servicio.profesional_id` (FK en baseline línea 799). Pero desde
entonces entraron tres catálogos más de gente asociada a una orden:
`responsables_sec` (`20260816001045`), `participantes_arl` y `vobo` (ambos en
`detalle_entrega_profesional`, ver `da255d2`).

Hay que decidir si "sus órdenes" es solo `profesional_id` o si un responsable
SEC también debería ver las suyas. **Recomendación: empezar solo por
`profesional_id`** y dejar el resto para cuando se pida — pero escribir la
policy de forma que agregar un `OR` después no obligue a reescribirla.

### 3.3 Qué ve un `profesional` sin `profesional_id` asignado

Este es el caso que rompió el intento anterior. Un listado vacío sin
explicación es indistinguible de un bug. Las opciones:

- Listado vacío + un mensaje explícito del tipo "tu usuario todavía no está
  vinculado a un profesional, pedile a un administrador que lo configure".
- Bloquear el acceso a `/ordenes` con `redirect()` y el mismo mensaje.

**Recomendación: la primera**, y además loguear el caso en servidor para que se
note en observabilidad y no dependa de que la persona reporte.

---

## 4. Por qué esto va en RLS y no en el front

El intento anterior vivía entero en el front, y por eso no protegía nada. La
versión correcta va en la base. Pero hay un orden obligatorio:

**Mientras `mvp_open_access` exista sobre `ordenes_servicio`, cualquier policy
nueva es decorativa.** Postgres combina las policies permisivas con `OR`, así
que una rama que evalúa `true` gana siempre. Es exactamente el mismo motivo por
el que hoy `solo_admin_escribe_ordenes` (baseline línea 1036) no restringe nada.
Está explicado en detalle en `PLAN-fix-rls-mvp-open-access.md`, sección 1.

Entonces: **primero se ejecuta ese plan, después este.** Hacerlo al revés
produce una migración que pasa todos los tests y no cambia el comportamiento.

### Forma de la policy

El patrón a copiar es `es_administrador()` (baseline líneas 118-125): función
`STABLE SECURITY DEFINER` con `SET search_path TO 'public'`. El `SECURITY
DEFINER` no es opcional ni cosmético — sin él aparece *"infinite recursion
detected in policy for relation usuarios"*, porque la policy consulta
`usuarios` y esa consulta vuelve a disparar la policy de `usuarios`. Está
documentado en el encabezado del baseline, líneas 17-28.

```sql
-- Devuelve el profesional_id del usuario de la sesión, o NULL.
-- SECURITY DEFINER por lo mismo que es_administrador(): sin eso la consulta a
-- `usuarios` re-dispara la policy de `usuarios` y recursa. Ojo: eso deja de
-- valer si alguna vez se le pone FORCE ROW LEVEL SECURITY a esa tabla.
CREATE OR REPLACE FUNCTION public.profesional_de_la_sesion()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT profesional_id FROM usuarios WHERE id = auth.uid();
$$;

-- Y la policy de lectura, que reemplaza a `autenticados_leen_ordenes`
-- (baseline línea 906) en vez de sumarse a ella: si se deja la vieja, el OR
-- entre permisivas la vuelve inútil igual que mvp_open_access.
CREATE POLICY "lectura_ordenes_segun_rol" ON public.ordenes_servicio
  FOR SELECT USING (
    public.es_administrador()
    OR (SELECT rol FROM usuarios WHERE id = auth.uid()) <> 'profesional'
    OR EXISTS (
      SELECT 1 FROM info_orden_servicio i
      WHERE i.orden_id = ordenes_servicio.id
        AND i.profesional_id = public.profesional_de_la_sesion()
    )
  );
```

Dos cosas a verificar contra la DB local antes de dar esto por bueno:

- **`autenticados_leen_ordenes` hay que tirarla en la misma migración.** Si
  queda, el `OR` la hace ganar para cualquier sesión y la restricción no aplica.
- **El costo del `EXISTS` por fila.** El listado no pagina en servidor (ver la
  memoria del roadmap de paginación), así que la policy se evalúa sobre todas
  las órdenes en cada request. Medir con `EXPLAIN ANALYZE` sobre datos
  realistas y, si hace falta, agregar índice sobre
  `info_orden_servicio(profesional_id, orden_id)`.

---

## 5. Prerequisito de datos: poblar `usuarios.profesional_id`

La columna y su FK existen, pero **nada las llena en producción**. Hoy solo el
seed local la setea, y para un único usuario de prueba (`supabase/seed.sql:192-193`).
No hay UI: la única Server Action sobre `usuarios` es `actualizarRolUsuario`
(`src/app/usuarios/actions.ts:25`), que solo toca `rol`.

O sea que si se aplica la policy hoy, **todo usuario `profesional` ve cero
órdenes** — el mismo síntoma que se acaba de revertir, ahora sí imposible de
esquivar desde el front. Esto se resuelve antes, no después:

1. **Migración de backfill por email, una sola vez.** En SQL, donde se puede
   ver el resultado antes de commitear, no como un `.eq()` en runtime:

   ```sql
   UPDATE usuarios u SET profesional_id = p.id
   FROM profesionales p
   WHERE u.profesional_id IS NULL
     AND u.rol = 'profesional'
     AND lower(trim(u.email)) = lower(trim(p.email));
   ```

   Antes de escribirla, correr el diagnóstico contra dev y ver cuántos quedan
   sin match — y cuántos emails de `profesionales` están duplicados, que es lo
   que hacía fallar `maybeSingle()` en el intento anterior:

   ```sql
   SELECT u.id, u.nombre_completo, u.email
   FROM usuarios u
   WHERE u.rol = 'profesional' AND u.profesional_id IS NULL;

   SELECT lower(trim(email)) AS email, count(*)
   FROM profesionales WHERE email IS NOT NULL
   GROUP BY 1 HAVING count(*) > 1;
   ```

2. **UI en `/usuarios` para asignar el profesional a mano**, para los que el
   backfill no resuelva y para todo usuario nuevo. Un select de profesionales
   al lado del de rol, con su Server Action, en el mismo archivo que
   `actualizarRolUsuario`.

3. **Índice único parcial** sobre `usuarios(profesional_id) WHERE profesional_id
   IS NOT NULL`, para que dos usuarios no queden apuntando al mismo profesional.
   Confirmar antes que eso es efectivamente inválido para negocio.

---

## 6. Puntos de entrada que hay que cubrir

Con RLS puesta, todo lo que use el cliente de servidor con la sesión del usuario
queda cubierto solo. Lo que **no** queda cubierto es lo que usa `supabaseAdmin`
(service role, bypassa RLS). El inventario completo:

| Entrada | Cliente | Estado |
| --- | --- | --- |
| `/ordenes` (listado) | sesión | ✅ cubierto por RLS |
| `/ordenes/[id]/editar` | sesión | ✅ cubierto (la orden no se lee → `notFound()`) |
| Server Actions de `src/app/ordenes/actions.ts` (7) | sesión | ✅ cubierto |
| `POST /api/ordenes/excel` | **admin** | ⚠️ ver abajo |
| `GET /api/ordenes/[id]/pdf` | **admin** | ⚠️ ver abajo |

Las dos rutas de API usan service role a propósito y ya validan sesión y rol por
su cuenta (`excel/route.tsx:41-58`, `pdf/route.tsx:28`). Sus listas de roles
permitidos hoy son `administrador|financiero|talento` (Excel) y
`administrador|financiero` (PDF) — ninguna incluye `profesional`, así que **hoy
no hay fuga**. Pero si en algún momento se le habilita el export a
`profesional`, hay que filtrar los `ids` por asignación dentro de la ruta,
porque RLS no lo va a hacer. Dejar el comentario puesto ahí ahora, mientras el
contexto está fresco.

---

## 7. Orden de ejecución

1. Cerrar las tres decisiones de la sección 3 con negocio.
2. Ejecutar `PLAN-fix-rls-mvp-open-access.md` completo. **Bloqueante.**
3. Correr los diagnósticos de la sección 5 contra dev; ver cuántos usuarios
   quedan sin vincular.
4. Migración: backfill + índice único parcial.
5. UI de asignación en `/usuarios` (select + Server Action).
6. Migración: `profesional_de_la_sesion()` + `lectura_ordenes_segun_rol`, y
   `DROP POLICY autenticados_leen_ordenes` en la misma migración.
7. Front: el mensaje de "usuario sin profesional vinculado" de 3.3. Es lo único
   que va en el front, y es un mensaje, no un control de acceso.
8. Comentario en las dos rutas de API sobre por qué no filtran hoy.

Sobre timestamps de migración: revisar que el nombre quede **después** de la
última migración ya aplicada en dev y prod antes de mergear. Es lo que rompió
`20260805014311_cerrar_mvp_open_access_rls.sql` y dejó el workflow de
migraciones caído desde el 9 de agosto — ver el mensaje de `efad9e3`.

---

## 8. Cómo verificar

Todo contra la DB local (`pnpm db:start`), sin tocar producción.

**Que la policy realmente restringe** — la prueba que el intento anterior no
tenía. Con el seed puesto, `profesional@local.test` está vinculado al
profesional 1 (`seed.sql:192-193`):

```sql
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"00000000-0000-4000-8000-000000000005"}';
SELECT count(*) FROM ordenes_servicio;   -- solo las del profesional 1
```

**Que los otros roles no se rompieron** — el bug exacto que se revirtió. Repetir
lo de arriba con los `sub` de `financiero`, `talento`, `programador` y `lectura`
(`seed.sql:165-170`): los cuatro tienen que seguir viendo el total.

**Que no quedó nada abierto para `anon`:**

```bash
curl "http://127.0.0.1:54321/rest/v1/ordenes_servicio?select=id" \
  -H "apikey: <ANON_KEY local, ver .env.local.example>"
```

Tiene que devolver `[]`.

**Que la URL directa tampoco pasa:** logueado como `profesional@local.test`,
abrir `/ordenes/{id}/editar` con el id de una orden de otro profesional. Debe
dar 404, no el formulario.
