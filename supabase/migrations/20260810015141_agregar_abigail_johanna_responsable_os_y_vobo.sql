-- Agrega a Abigail Dorado y Johanna Reyes como "Responsable de Sec"
-- (ordenes_servicio.responsable_os) y a las tres — Abigail Dorado, Johanna
-- Reyes y Tatiana Carrillo — como "Quien da el VoBo" (tabla vobo). Tatiana
-- Carrillo ya estaba en el CHECK de responsable_os desde
-- 20260805142744_responsable_os_agregar_tatiana_carillo.sql, así que acá solo
-- falta sumarla a vobo.
--
-- Igual que con Tatiana Carrillo: se ensancha el CHECK, ninguna fila
-- existente puede quedar en violación. RESPONSABLES_OS en
-- src/lib/validations/orden.schema.ts se actualiza en el mismo cambio de
-- front para que el <Select>/Zod y el CHECK no se desincronicen otra vez.
--
-- Email/celular de Tatiana Carrillo no se conocen todavía — queda esa fila
-- con esos campos en NULL hasta que se tengan los datos reales.

ALTER TABLE "public"."ordenes_servicio"
  DROP CONSTRAINT IF EXISTS "chk_responsable_sec";

ALTER TABLE "public"."ordenes_servicio"
  ADD CONSTRAINT "chk_responsable_sec" CHECK ((("responsable_os")::"text" = ANY ((ARRAY[
    'Yulieth Amell'::character varying,
    'Bibiana Sarmiento'::character varying,
    'Daniela Rosso'::character varying,
    'Lucia Bejarano'::character varying,
    'Lina Amell'::character varying,
    'Tatiana Carrillo'::character varying,
    'Abigail Dorado'::character varying,
    'Johanna Reyes'::character varying
  ])::"text"[])));

INSERT INTO "public"."vobo" ("nombre_completo", "email") VALUES
  ('Abigail Dorado', 'psicologia@gsgroupsas.com'),
  ('Johanna Reyes', 'fisioterapia@gsgroupsas.com'),
  ('Tatiana Carrillo', NULL);
