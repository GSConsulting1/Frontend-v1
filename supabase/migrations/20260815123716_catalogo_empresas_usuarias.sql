-- Catálogo de "empresas usuarias" + backfill desde las órdenes existentes.
--
-- CONTEXTO
-- Hasta acá la empresa usuaria vivía como dos columnas de texto libre en
-- ordenes_servicio (nombre_empresa_usuaria varchar(255), nit_empresa_usuaria
-- varchar(50)). No tenían CHECK ni tabla: cada orden repetía el nombre escrito
-- a mano, así que la misma empresa podía quedar como "ACME S.A.", "Acme SA" y
-- "  ACME  S.A. " en tres órdenes distintas. Esta migración le da tabla propia
-- y deja las órdenes apuntando a ella por FK.
--
-- CRITERIO DE DEDUPLICACIÓN (lo importante de este archivo)
-- Se agrupa por NOMBRE normalizado —trim, espacios internos colapsados,
-- mayúsculas— y NO por NIT. El nombre está en todas las filas que nos
-- interesan (es el filtro de entrada); el NIT es opcional y en muchas órdenes
-- viene vacío, así que usarlo como identidad partiría en dos la misma empresa
-- (una fila para las órdenes que sí lo cargaron y otra para las que no).
-- Para cada grupo:
--   * nombre  = la escritura MÁS FRECUENTE de ese nombre (no la primera ni una
--               versión "arreglada" a mano: la que más aparece en los datos
--               reales, con empates resueltos alfabéticamente para que el
--               resultado sea determinístico y db:reset sea reproducible).
--   * nit     = el NIT no nulo más frecuente de ese grupo, tal cual está
--               escrito (con puntos y guion si así se cargó). NULL si ninguna
--               orden del grupo trae NIT.
--
-- Lo que este criterio NO resuelve a propósito: dos escrituras que no colapsan
-- al normalizar ("ACME SA" vs "ACME S.A.") quedan como dos filas distintas, y
-- un mismo NIT repartido en dos nombres también. Unificar eso es una decisión
-- de negocio, no algo que deba adivinar una migración — se hace después desde
-- la pantalla /clientes (pestaña "Empresas usuarias"), que es justamente donde
-- se ven listadas y con cuántas órdenes cada una.
--
-- COLUMNAS VIEJAS
-- nombre_empresa_usuaria / nit_empresa_usuaria NO se borran acá. Siguen siendo
-- las que lee el front hoy (ordenes-table.tsx, orden-campos.tsx, el Excel y el
-- PDF), y dejarlas hace que esta migración sea segura de aplicar sin tocar una
-- sola línea de TypeScript. El DROP va en una migración posterior, recién
-- cuando esos consumidores lean empresa_usuaria_id.

-- 1. La tabla ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."empresas_usuarias" (
    "id" integer NOT NULL,
    "nombre" character varying(255) NOT NULL,
    "nit" character varying(50),
    "activo" boolean DEFAULT true,
    "fecha_creacion" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE "public"."empresas_usuarias" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."empresas_usuarias_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."empresas_usuarias_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."empresas_usuarias_id_seq"
    OWNED BY "public"."empresas_usuarias"."id";

ALTER TABLE ONLY "public"."empresas_usuarias"
    ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."empresas_usuarias_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."empresas_usuarias"
    ADD CONSTRAINT "empresas_usuarias_pkey" PRIMARY KEY ("id");

-- Misma normalización que usa el backfill de abajo. Como índice único, impide
-- que a futuro se creen dos empresas que solo se diferencian en espacios o
-- mayúsculas — el caso que esta migración está limpiando.
CREATE UNIQUE INDEX "empresas_usuarias_nombre_normalizado_key"
    ON "public"."empresas_usuarias"
    (upper(regexp_replace(btrim("nombre"), '\s+', ' ', 'g')));

-- 2. Backfill del catálogo desde las órdenes existentes -------------------

INSERT INTO "public"."empresas_usuarias" ("nombre", "nit")
WITH filas AS (
    SELECT
        upper(regexp_replace(btrim("nombre_empresa_usuaria"), '\s+', ' ', 'g')) AS nombre_norm,
        btrim("nombre_empresa_usuaria") AS nombre_raw,
        NULLIF(btrim(COALESCE("nit_empresa_usuaria", '')), '') AS nit_raw
    FROM "public"."ordenes_servicio"
    WHERE NULLIF(btrim(COALESCE("nombre_empresa_usuaria", '')), '') IS NOT NULL
),
nombre_canonico AS (
    SELECT nombre_norm, nombre_raw
    FROM (
        SELECT
            nombre_norm,
            nombre_raw,
            row_number() OVER (
                PARTITION BY nombre_norm
                ORDER BY count(*) DESC, nombre_raw
            ) AS rn
        FROM filas
        GROUP BY nombre_norm, nombre_raw
    ) t
    WHERE rn = 1
),
nit_canonico AS (
    SELECT nombre_norm, nit_raw
    FROM (
        SELECT
            nombre_norm,
            nit_raw,
            row_number() OVER (
                PARTITION BY nombre_norm
                ORDER BY count(*) DESC, nit_raw
            ) AS rn
        FROM filas
        WHERE nit_raw IS NOT NULL
        GROUP BY nombre_norm, nit_raw
    ) t
    WHERE rn = 1
)
SELECT n.nombre_raw, i.nit_raw
FROM nombre_canonico n
LEFT JOIN nit_canonico i USING (nombre_norm);

-- 3. La FK en ordenes_servicio + backfill del vínculo ---------------------

ALTER TABLE "public"."ordenes_servicio"
    ADD COLUMN IF NOT EXISTS "empresa_usuaria_id" integer;

ALTER TABLE ONLY "public"."ordenes_servicio"
    ADD CONSTRAINT "ordenes_servicio_empresa_usuaria_id_fkey"
    FOREIGN KEY ("empresa_usuaria_id")
    REFERENCES "public"."empresas_usuarias"("id");

-- Queda nullable a propósito: hay órdenes sin empresa usuaria cargada (el
-- campo nunca fue obligatorio) y esta migración no inventa una para ellas.
UPDATE "public"."ordenes_servicio" o
SET "empresa_usuaria_id" = e."id"
FROM "public"."empresas_usuarias" e
WHERE upper(regexp_replace(btrim(o."nombre_empresa_usuaria"), '\s+', ' ', 'g'))
    = upper(regexp_replace(btrim(e."nombre"), '\s+', ' ', 'g'));

CREATE INDEX IF NOT EXISTS "ordenes_servicio_empresa_usuaria_id_idx"
    ON "public"."ordenes_servicio" ("empresa_usuaria_id");

-- 4. Permisos y RLS -------------------------------------------------------

GRANT ALL ON TABLE "public"."empresas_usuarias" TO "anon";
GRANT ALL ON TABLE "public"."empresas_usuarias" TO "authenticated";
GRANT ALL ON TABLE "public"."empresas_usuarias" TO "service_role";

GRANT ALL ON SEQUENCE "public"."empresas_usuarias_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."empresas_usuarias_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."empresas_usuarias_id_seq" TO "service_role";

-- Misma política abierta que el resto de las tablas del MVP (ver "clientes" en
-- el baseline). NO es una decisión nueva: es no quedar desalineada con el
-- resto mientras se resuelve el RLS real de todo el esquema de una sola vez.
ALTER TABLE "public"."empresas_usuarias" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mvp_open_access" ON "public"."empresas_usuarias"
    USING (true) WITH CHECK (true);
