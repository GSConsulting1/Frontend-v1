-- Catálogo de "Responsables SEC para GS" + backfill desde las órdenes
-- existentes. Mismo movimiento que 20260815123716_catalogo_empresas_usuarias.sql,
-- con una diferencia importante: acá SÍ había un CHECK, y hay que sacarlo.
--
-- CONTEXTO
-- ordenes_servicio.responsable_os es un varchar con el constraint
-- chk_responsable_sec, una lista cerrada de 8 nombres escrita a mano en el
-- CHECK. Cada vez que entra alguien nuevo al equipo hace falta una migración
-- (ya van dos: 20260805142744 por Tatiana Carrillo y 20260810015141 por Abigail
-- Dorado y Johanna Reyes) Y un cambio de front en RESPONSABLES_OS, y si una de
-- las dos se olvida, el <Select> ofrece a alguien que la base rechaza con 23514
-- al guardar. Esta migración reemplaza esa lista por una tabla que se
-- administra desde /profesionales/responsables-sec.
--
-- POR QUÉ SE TIRA EL CHECK
-- No es un relajamiento de la validación: es moverla. Con el CHECK puesto, dar
-- de alta a una persona desde la pantalla nueva no serviría de nada — el
-- <Select> la ofrecería y el INSERT de la orden explotaría igual, porque el
-- CHECK no la conoce. Quien valida ahora es la FK responsable_sec_id contra
-- responsables_sec (y Zod del lado del front, contra el mismo catálogo).
--
-- COLUMNA VIEJA
-- responsable_os NO se borra. La siguen leyendo el filtro del listado
-- (ordenes-filtros.tsx), el Excel de export (matriz-ordenes.ts) y el PDF, igual
-- que nombre_empresa_usuaria. Pasa a ser una copia denormalizada del nombre: la
-- escribe el formulario al elegir del catálogo, y renombrar a una persona la
-- actualiza en sus órdenes (ver actualizarResponsableSecRecord en
-- lib/data/responsables-sec.ts). El DROP va en una migración posterior, cuando
-- esos tres consumidores lean la FK.

-- 1. La tabla ------------------------------------------------------------

-- Mismas columnas que "vobo" (ver el baseline): son dos catálogos de personal
-- interno de GS Group, con las mismas tres personas en ambos en varios casos.
-- Se mantienen separados porque son dos ROLES distintos —quien responde por la
-- OS y quien da el visto bueno— y una persona puede estar en uno y no en el
-- otro; unificarlos en una tabla "personal" con flags es un refactor aparte.
CREATE TABLE IF NOT EXISTS "public"."responsables_sec" (
    "id" integer NOT NULL,
    "nombre_completo" character varying NOT NULL,
    "email" character varying,
    "celular" character varying,
    "activo" boolean DEFAULT true,
    "fecha_creacion" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE "public"."responsables_sec" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."responsables_sec_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."responsables_sec_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."responsables_sec_id_seq"
    OWNED BY "public"."responsables_sec"."id";

ALTER TABLE ONLY "public"."responsables_sec"
    ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."responsables_sec_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."responsables_sec"
    ADD CONSTRAINT "responsables_sec_pkey" PRIMARY KEY ("id");

-- Misma normalización que el índice de empresas_usuarias (btrim + espacios
-- colapsados + upper): impide dar de alta dos veces a la misma persona por una
-- diferencia de mayúsculas o un espacio de más.
CREATE UNIQUE INDEX "responsables_sec_nombre_normalizado_key"
    ON "public"."responsables_sec"
    (upper(regexp_replace(btrim("nombre_completo"), '\s+', ' ', 'g')));

-- 2. Backfill del catálogo ------------------------------------------------

-- Dos fuentes unidas:
--   * la lista del CHECK que se está por tirar — es el catálogo real de hoy, e
--     incluye a gente sin órdenes todavía (Abigail Dorado y Johanna Reyes
--     entraron hace poco), que un SELECT DISTINCT sobre las órdenes perdería;
--   * los valores realmente presentes en ordenes_servicio, por si alguna fila
--     quedó con un nombre fuera del CHECK (no debería poder: el constraint está
--     activo. Va igual para que la FK del paso 3 no deje ninguna orden sin
--     vincular si esa suposición falla en algún entorno).
INSERT INTO "public"."responsables_sec" ("nombre_completo")
SELECT DISTINCT ON (upper(regexp_replace(btrim(nombre), '\s+', ' ', 'g')))
    btrim(nombre)
FROM (
    SELECT unnest(ARRAY[
        'Yulieth Amell',
        'Bibiana Sarmiento',
        'Daniela Rosso',
        'Lucia Bejarano',
        'Lina Amell',
        'Tatiana Carrillo',
        'Abigail Dorado',
        'Johanna Reyes'
    ]) AS nombre
    UNION ALL
    SELECT "responsable_os"
    FROM "public"."ordenes_servicio"
    WHERE NULLIF(btrim(COALESCE("responsable_os", '')), '') IS NOT NULL
) fuentes
ORDER BY
    upper(regexp_replace(btrim(nombre), '\s+', ' ', 'g')),
    btrim(nombre);

-- Email y celular de quienes ya están cargados en `vobo` — son las mismas
-- personas y esos datos ya existen, no hay por qué volver a pedirlos. Quien no
-- esté en vobo queda con los dos campos en NULL y se completan desde la
-- pantalla.
UPDATE "public"."responsables_sec" r
SET "email" = v."email",
    "celular" = v."celular"
FROM "public"."vobo" v
WHERE upper(regexp_replace(btrim(r."nombre_completo"), '\s+', ' ', 'g'))
    = upper(regexp_replace(btrim(v."nombre_completo"), '\s+', ' ', 'g'));

-- 3. La FK en ordenes_servicio + backfill del vínculo ---------------------

ALTER TABLE "public"."ordenes_servicio"
    ADD COLUMN IF NOT EXISTS "responsable_sec_id" integer;

-- Sin ON DELETE CASCADE, igual que empresa_usuaria_id: borrar a una persona que
-- ya respondió por órdenes lo rechaza Postgres con 23503, y ese error se
-- traduce a "marcala como inactiva en su lugar" en lib/data/responsables-sec.ts.
ALTER TABLE ONLY "public"."ordenes_servicio"
    ADD CONSTRAINT "ordenes_servicio_responsable_sec_id_fkey"
    FOREIGN KEY ("responsable_sec_id")
    REFERENCES "public"."responsables_sec"("id");

-- Nullable a propósito: responsable_os nunca fue obligatorio, hay órdenes sin
-- responsable cargado y esta migración no inventa uno.
UPDATE "public"."ordenes_servicio" o
SET "responsable_sec_id" = r."id"
FROM "public"."responsables_sec" r
WHERE upper(regexp_replace(btrim(o."responsable_os"), '\s+', ' ', 'g'))
    = upper(regexp_replace(btrim(r."nombre_completo"), '\s+', ' ', 'g'));

CREATE INDEX IF NOT EXISTS "ordenes_servicio_responsable_sec_id_idx"
    ON "public"."ordenes_servicio" ("responsable_sec_id");

-- 4. Fuera el CHECK -------------------------------------------------------

-- Ver "POR QUÉ SE TIRA EL CHECK" arriba. El nombre es el legacy
-- chk_responsable_sec (más viejo que el rename de la columna a responsable_os).
ALTER TABLE "public"."ordenes_servicio"
    DROP CONSTRAINT IF EXISTS "chk_responsable_sec";

-- 5. Permisos y RLS -------------------------------------------------------

GRANT ALL ON TABLE "public"."responsables_sec" TO "anon";
GRANT ALL ON TABLE "public"."responsables_sec" TO "authenticated";
GRANT ALL ON TABLE "public"."responsables_sec" TO "service_role";

GRANT ALL ON SEQUENCE "public"."responsables_sec_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."responsables_sec_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."responsables_sec_id_seq" TO "service_role";

-- Misma política abierta que el resto de las tablas del MVP (ver "clientes" en
-- el baseline y "empresas_usuarias"). NO es una decisión nueva: es no quedar
-- desalineada mientras se resuelve el RLS real de todo el esquema de una vez.
ALTER TABLE "public"."responsables_sec" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mvp_open_access" ON "public"."responsables_sec"
    USING (true) WITH CHECK (true);
