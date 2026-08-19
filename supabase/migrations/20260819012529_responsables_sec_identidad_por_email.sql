-- "Responsables SEC para GS": la identidad pasa de ser el NOMBRE a ser el EMAIL.
--
-- CONTEXTO
-- 20260816001045_catalogo_responsables_sec.sql creó `responsables_sec` con el
-- nombre como identidad: índice único sobre el nombre normalizado, y
-- `ordenes_servicio.responsable_os` como copia denormalizada de ese nombre. El
-- email era opcional y se llenó de rebote desde `vobo`, para quien estuviera en
-- las dos tablas.
--
-- Eso ya no alcanza. El email es lo único que un responsable comparte con su
-- fila de `public.usuarios`, así que es lo único con lo que se puede resolver
-- "esta orden es de quien está logueado" sin volver a comparar nombres escritos
-- a mano (ver PLAN-permisos-por-rol.md). El nombre no sirve para eso: en
-- `usuarios` la misma casilla figura como "Administrativo GS" y acá como "Lina
-- Amell".
--
-- LO QUE ESTA MIGRACIÓN CAMBIA
--   * completa el email de todo el catálogo y lo normaliza a minúsculas;
--   * FUSIONA las filas que comparten email (ver el punto siguiente);
--   * reescribe `ordenes_servicio.responsable_os` con el email;
--   * mueve el índice único del nombre al email, y pone el email NOT NULL.
--
-- ⚠️ LA FUSIÓN ES IRREVERSIBLE Y PIERDE INFORMACIÓN
-- Tres personas comparten la casilla administrativo@gsgroupsas.com: Lina Amell,
-- Lucia Bejarano y Tatiana Carrillo. Con el email como identidad, esas tres
-- filas pasan a ser UNA, y las órdenes de las tres quedan a nombre de la
-- casilla. Después de esto ya no se puede saber cuál de las tres respondió por
-- una orden vieja. Está confirmado con negocio (2026-08-18) y es el efecto
-- buscado, no un daño colateral: lo que se sigue en el día a día es la casilla,
-- no la persona.
--
-- EL NOMBRE NO SE BORRA
-- `nombre_completo` queda en la tabla y sigue siendo NOT NULL, pero deja de ser
-- identidad y de leerse en cualquier pantalla salvo el ABM de
-- /profesionales/responsables-sec, donde es una etiqueta para quien administra.
-- Mismo tratamiento que se le dio a `responsable_os` en la migración anterior:
-- el DROP va aparte, cuando no quede ningún consumidor.

-- 1. El mapeo nombre -> casilla -------------------------------------------

-- NO se puede derivar de los datos: tres de estas filas tenían el email en NULL
-- y sólo el equipo sabe a qué casilla corresponde cada una. Va escrito acá, que
-- es lo único reproducible en local, dev y prod por igual — es la misma decisión
-- que tomó 20260816001045 con la lista de nombres.
--
-- Va a una tabla temporal en vez de inline en el UPDATE porque se usa DOS veces:
-- acá para completar los emails, y en el guard del paso 2 para saber, antes de
-- tocar nada, si alguna fila va a quedarse sin email. Escribir la lista dos
-- veces es pedir que se desincronicen.
CREATE TEMP TABLE "_mapeo_casillas" ("nombre" "text", "email" "text");

INSERT INTO "_mapeo_casillas" ("nombre", "email") VALUES
    ('Abigail Dorado',    'psicologia@gsgroupsas.com'),
    ('Bibiana Sarmiento', 'gerencia@gsgroupsas.com'),
    ('Daniela Rosso',     'talentogs@gsgroupsas.com'),
    ('Johanna Reyes',     'fisioterapia@gsgroupsas.com'),
    ('Lina Amell',        'administrativo@gsgroupsas.com'),
    ('Lucia Bejarano',    'administrativo@gsgroupsas.com'),
    ('Tatiana Carrillo',  'administrativo@gsgroupsas.com'),
    ('Yulieth Amell',     'consultoria@gsgroupsas.com');

-- 2. Guard: fallar ANTES de tocar nada ------------------------------------

-- El email pasa a ser NOT NULL al final. Si alguna fila no tiene email y su
-- nombre tampoco está en el mapeo de arriba, esta migración no la puede
-- resolver — y eso hay que saberlo ACÁ, no doce sentencias más abajo con las
-- filas duplicadas ya borradas.
--
-- Que el runner envuelva el archivo en una transacción NO alcanza como
-- respuesta: aunque el rollback salve los datos, el error llegaría después de
-- todo el trabajo destructivo, y basta con que alguien aplique el archivo con
-- `psql` suelto para quedarse con la base a medio migrar. Verificado: pasa
-- exactamente eso.
--
-- El caso es real y no teórico: el email era OPCIONAL hasta esta migración, así
-- que cualquier casilla dada de alta desde /profesionales/responsables-sec
-- puede estar sin él.
DO $$
DECLARE "sin_resolver" "text";
BEGIN
    SELECT string_agg(format('%s (id %s)', r."nombre_completo", r."id"), ', ')
    INTO "sin_resolver"
    FROM "public"."responsables_sec" r
    WHERE NULLIF(btrim(COALESCE(r."email", '')), '') IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM "_mapeo_casillas" m
          WHERE upper(regexp_replace(btrim(m."nombre"), '\s+', ' ', 'g'))
              = upper(regexp_replace(btrim(r."nombre_completo"), '\s+', ' ', 'g'))
      );

    IF "sin_resolver" IS NOT NULL THEN
        RAISE EXCEPTION
            'El email de un responsable SEC pasa a ser obligatorio y estos no lo tienen ni están en el mapeo de esta migración: %. Cargáselos desde /profesionales/responsables-sec y volvé a aplicar la migración.',
            "sin_resolver";
    END IF;
END $$;

-- 3. Email canónico de cada responsable -----------------------------------

-- Este UPDATE también arregla, sin caso especial, el único email que estaba
-- cargado con una mayúscula de más ("Fisioterapia@gsgroupsas.com" en la fila de
-- Johanna Reyes) — se pisa con el valor canónico en minúsculas.
UPDATE "public"."responsables_sec" r
SET "email" = m."email"
FROM "_mapeo_casillas" m
WHERE upper(regexp_replace(btrim(r."nombre_completo"), '\s+', ' ', 'g'))
    = upper(regexp_replace(btrim(m."nombre"), '\s+', ' ', 'g'));

-- Cualquier fila dada de alta desde el ABM después de 20260816001045 no está en
-- el mapeo de arriba, pero igual tiene que quedar normalizada: el índice único
-- del paso 5 es sobre lower(btrim(email)) y el matcheo contra `usuarios` también.
UPDATE "public"."responsables_sec"
SET "email" = lower(btrim("email"))
WHERE "email" IS DISTINCT FROM lower(btrim("email"));

-- 4. La casilla que todavía no tenía fila ---------------------------------

-- finanzas@gsgroupsas.com existe en `public.usuarios` pero nunca se cargó como
-- responsable SEC, así que no hay a quién actualizarle el email: es un INSERT.
-- El nombre es el de la casilla en `usuarios` ("Finanzas GS"), no el de una
-- persona — ver "EL NOMBRE NO SE BORRA" arriba.
INSERT INTO "public"."responsables_sec" ("nombre_completo", "email")
SELECT 'Finanzas GS', 'finanzas@gsgroupsas.com'
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."responsables_sec"
    WHERE lower(btrim("email")) = 'finanzas@gsgroupsas.com'
);

-- 5. Fusión de las filas que comparten email ------------------------------

-- Sobrevive el id más chico de cada email. La elección es arbitraria pero tiene
-- que ser determinista: es lo que hace que local y prod terminen con los mismos
-- ids, y min(id) es además el más viejo, o sea el que más órdenes suele tener
-- vinculadas (menos filas que reescribir).
--
-- El orden importa: PRIMERO se repuntan las órdenes y RECIÉN DESPUÉS se borran
-- las filas perdedoras. `ordenes_servicio_responsable_sec_id_fkey` no tiene
-- ON DELETE CASCADE a propósito (ver 20260816001045), así que borrar antes
-- fallaría con 23503 — y si tuviera CASCADE sería peor, porque se llevaría las
-- órdenes puestas.
WITH sobrevivientes AS (
    SELECT lower(btrim("email")) AS "email", min("id") AS "id"
    FROM "public"."responsables_sec"
    WHERE "email" IS NOT NULL
    GROUP BY 1
),
perdedoras AS (
    SELECT r."id" AS "id_viejo", s."id" AS "id_nuevo"
    FROM "public"."responsables_sec" r
    JOIN sobrevivientes s ON s."email" = lower(btrim(r."email"))
    WHERE r."id" <> s."id"
)
UPDATE "public"."ordenes_servicio" o
SET "responsable_sec_id" = p."id_nuevo"
FROM perdedoras p
WHERE o."responsable_sec_id" = p."id_viejo";

DELETE FROM "public"."responsables_sec" r
USING (
    SELECT lower(btrim("email")) AS "email", min("id") AS "id"
    FROM "public"."responsables_sec"
    WHERE "email" IS NOT NULL
    GROUP BY 1
) s
WHERE lower(btrim(r."email")) = s."email"
  AND r."id" <> s."id";

-- La fila que sobrevivió a la fusión de administrativo@ es la de Lina Amell,
-- pero ya no representa sólo a Lina: representa a la casilla, con las órdenes
-- de las tres. Dejarle su nombre haría que el ABM afirme algo falso, y es la
-- única pantalla donde ese campo se sigue viendo.
UPDATE "public"."responsables_sec"
SET "nombre_completo" = 'Administrativo GS'
WHERE lower(btrim("email")) = 'administrativo@gsgroupsas.com';

-- 6. Las órdenes existentes -----------------------------------------------

-- `responsable_os` pasa de guardar el nombre a guardar el email. No es un campo
-- muerto: es lo que leen el filtro del listado (`.in("responsable_os", …)` en
-- lib/data/ordenes.ts), la matriz de export a Excel y el PDF. Si no se
-- reescribiera acá, el filtro ofrecería emails y compararía contra nombres, y no
-- devolvería ninguna orden.
--
-- Sólo se tocan las órdenes YA VINCULADAS por FK. Una orden con
-- `responsable_os` en texto y `responsable_sec_id` en NULL es una que el
-- backfill de 20260816001045 no pudo resolver; conserva su texto original y la
-- pantalla de edición ya la señala para que alguien la vincule a mano (ver
-- `responsableSinVincular` en components/ordenes/orden-campos.tsx). Inventarle
-- un email acá sería adivinar.
UPDATE "public"."ordenes_servicio" o
SET "responsable_os" = r."email"
FROM "public"."responsables_sec" r
WHERE o."responsable_sec_id" = r."id"
  AND o."responsable_os" IS DISTINCT FROM r."email";

-- 7. El email pasa a ser la identidad -------------------------------------

-- El índice de nombre se va: dos personas distintas de la misma casilla son
-- ahora una sola fila, y al revés, nada impide que dos casillas compartan
-- nombre. Quien tiene que ser único es el email.
DROP INDEX IF EXISTS "public"."responsables_sec_nombre_normalizado_key";

-- Quien garantiza que no quede ninguna fila sin email es el guard del paso 2,
-- que corre antes de tocar nada. Este SET NOT NULL es la red de seguridad: si
-- algo se escapó, acá se cae.
ALTER TABLE "public"."responsables_sec"
    ALTER COLUMN "email" SET NOT NULL;

-- Misma forma que el índice de nombre que reemplaza (normalizar en el índice, no
-- en la columna): impide dar de alta dos veces la misma casilla por una
-- diferencia de mayúsculas o un espacio de más, que es exactamente lo que había
-- pasado con "Fisioterapia@gsgroupsas.com".
CREATE UNIQUE INDEX "responsables_sec_email_normalizado_key"
    ON "public"."responsables_sec" (lower(btrim("email")));

DROP TABLE "_mapeo_casillas";
