-- "Tatiana Carillo" se agregó solo a RESPONSABLES_OS en el front
-- (src/lib/validations/orden.schema.ts) y nunca al CHECK de la DB. Resultado:
-- el <Select> del formulario y el filtro la ofrecen como opción válida, Zod la
-- acepta en cliente y servidor, y recién al llegar a Supabase el insert/update
-- revienta con 23514 (check_violation) contra chk_responsable_sec. Lo mismo
-- afecta a la carga por Excel (celdaResponsableOs en
-- src/lib/excel/leer-ordenes-excel.ts la reconoce como coincidencia válida).
--
-- Solo se ensancha el conjunto permitido, así que ninguna fila existente puede
-- quedar en violación. Se conserva el nombre legacy chk_responsable_sec (el
-- constraint es más viejo que el rename de la columna a responsable_os) para
-- no romper referencias ni el baseline.

ALTER TABLE "public"."ordenes_servicio"
  DROP CONSTRAINT IF EXISTS "chk_responsable_sec";

ALTER TABLE "public"."ordenes_servicio"
  ADD CONSTRAINT "chk_responsable_sec" CHECK ((("responsable_os")::"text" = ANY ((ARRAY[
    'Yulieth Amell'::character varying,
    'Bibiana Sarmiento'::character varying,
    'Daniela Rosso'::character varying,
    'Lucia Bejarano'::character varying,
    'Lina Amell'::character varying,
    'Tatiana Carrillo'::character varying
  ])::"text"[])));
