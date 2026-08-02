-- ============================================================================
-- BASELINE — el esquema tal como existía el 2026-08-02, cuando el proyecto
-- adoptó migraciones versionadas.
--
-- Generado con `supabase db dump --linked` (pg_dump del proyecto remoto) y
-- marcado como ya aplicado allá con `supabase migration repair`. En el remoto
-- NO se vuelve a correr; en local corre en cada `pnpm db:reset`.
--
-- Antes de esto, los cambios de esquema se aplicaban a mano en el SQL editor
-- del dashboard, con scripts sueltos (`003_fix_rls_recursion.sql`,
-- `004_ordenes_servicio_rls.sql`, `006_ordenes_servicio_id_unico.sql`). Esos
-- archivos ya no están: su SQL es exactamente lo que hay acá abajo. Pero
-- pg_dump borra los comentarios, y con ellos se perdía el razonamiento. Esto
-- es lo que valía la pena conservar:
--
-- ---------------------------------------------------------------------------
-- 1. `es_administrador()` es SECURITY DEFINER por una razón concreta
--
--    Sin eso: "infinite recursion detected in policy for relation usuarios".
--    La policy de `usuarios` hacía EXISTS (SELECT 1 FROM usuarios ...) para
--    averiguar el rol, y esa subconsulta volvía a disparar la misma policy,
--    que se evaluaba a sí misma. Toda policy que consultara `usuarios`
--    heredaba el problema (por ejemplo las de `valor_hora_orden`).
--
--    SECURITY DEFINER corre con los privilegios de quien creó la función, y
--    el dueño bypassea RLS por defecto — así la consulta interna a `usuarios`
--    no vuelve a disparar la policy. Ojo: eso deja de valer si alguna vez se
--    le pone FORCE ROW LEVEL SECURITY a la tabla.
--
-- ---------------------------------------------------------------------------
-- 2. `generar_id_unico_orden()`: por qué tanta vuelta con la zona horaria
--
--    El consecutivo es OS-AAAAMMDD-NNNN y reinicia en 0001 cada día
--    calendario en Colombia. `fecha_creacion` es "timestamp without time
--    zone" con DEFAULT now(), y el servidor de Postgres trabaja en UTC — sin
--    convertir explícitamente a America/Bogota (UTC-5, sin horario de
--    verano), entre las 7pm y la medianoche hora Colombia el día en UTC ya
--    es el siguiente y el consecutivo se reiniciaría a destiempo.
--
--    El `pg_advisory_xact_lock(hashtext(dia_actual::text))` serializa por
--    día: sin él, dos inserts simultáneos leen el mismo count() y calculan
--    el mismo número. El lock se libera al terminar la transacción.
--
-- ---------------------------------------------------------------------------
-- 3. ⚠️ `mvp_open_access` deja la base completamente abierta
--
--    Hay una policy `mvp_open_access` (FOR ALL, TO public, USING true, WITH
--    CHECK true) en 11 tablas: usuarios, ordenes_servicio, clientes,
--    info_orden_servicio, profesionales, checklist_proceso,
--    detalle_entrega_profesional, orden_entregables_estandar, ciudades,
--    entregables_estandar, estados_ejecucion.
--
--    Postgres combina las policies permisivas con OR, así que mientras esa
--    exista, las demás (`solo_admin_escribe_ordenes`, `admin_gestiona_usuarios`,
--    `autenticados_leen_ordenes`…) no restringen nada. Y `public` incluye a
--    `anon`, que además tiene GRANT de SELECT/INSERT/UPDATE/DELETE.
--
--    Consecuencia real: con la anon key —que es pública, va en el bundle del
--    navegador— se puede leer y escribir esas tablas sin sesión, incluido un
--    UPDATE de `usuarios.rol`. Hoy lo único que restringe por rol es el
--    front. Ver PLAN-migraciones-y-municipios.md.
--
--    `participantes_arl` y `vobo` están peor: no tienen RLS activado.
-- ============================================================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."es_administrador"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'administrador'
  );
$$;


ALTER FUNCTION "public"."es_administrador"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generar_id_unico_orden"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  dia_actual date := (now() AT TIME ZONE 'America/Bogota')::date;
  consecutivo integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(dia_actual::text));

  SELECT count(*) + 1 INTO consecutivo
  FROM public.ordenes_servicio
  WHERE (fecha_creacion AT TIME ZONE 'utc' AT TIME ZONE 'America/Bogota')::date = dia_actual;

  NEW.id_unico := 'OS-' || to_char(dia_actual, 'YYYYMMDD') || '-' || lpad(consecutivo::text, 4, '0');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generar_id_unico_orden"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."acta_servicio" (
    "orden_id" integer NOT NULL,
    "fecha_acta" "date",
    "hora_acta" time without time zone,
    "profesional_acta_id" integer
);


ALTER TABLE "public"."acta_servicio" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_proceso" (
    "orden_id" integer NOT NULL,
    "envio_at031" boolean,
    "envio_at028" boolean,
    "formatos" boolean,
    "estado_ejecucion_id" integer,
    "fecha_maxima_ejecucion" "date",
    "entrega_soportes_profesional" boolean,
    "entrega_soportes_cliente" boolean,
    "fecha_maxima_entrega_soportes" "date",
    "vobo_emitido" boolean NOT NULL,
    "cumplio_entrega_fecha" boolean,
    "informe_guardian" character varying(30),
    CONSTRAINT "checklist_proceso_informe_guardian_check" CHECK ((("informe_guardian")::"text" = ANY ((ARRAY['No aplica'::character varying, 'Aprobado'::character varying, 'Cancelada'::character varying, 'No se ha subido el archivo'::character varying, 'Pendiente de aprobación'::character varying, 'Rechazado'::character varying])::"text"[])))
);


ALTER TABLE "public"."checklist_proceso" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ciudades" (
    "id" integer NOT NULL,
    "nombre" character varying(150) NOT NULL,
    "departamento" character varying(150)
);


ALTER TABLE "public"."ciudades" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ciudades_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ciudades_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ciudades_id_seq" OWNED BY "public"."ciudades"."id";



CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" integer NOT NULL,
    "nombre_cliente" character varying(255) NOT NULL,
    "nit" character varying(50),
    "activo" boolean DEFAULT true,
    "fecha_creacion" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."clientes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."clientes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."clientes_id_seq" OWNED BY "public"."clientes"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."consecutivo_os_prof_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."consecutivo_os_prof_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cuenta_cobro" (
    "orden_id" integer NOT NULL,
    "radicacion_cuenta" boolean,
    "fecha_radicacion" "date",
    "valor_cuenta_cobro" numeric(14,2),
    "documento_soporte" "text",
    "corte_pago" "date",
    "fecha_pago" "date",
    "fecha_corte" "date",
    "numero_radicado" character varying
);


ALTER TABLE "public"."cuenta_cobro" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."detalle_entrega_profesional" (
    "orden_id" integer NOT NULL,
    "entregables_especificos" "text",
    "fecha_cierre_orden" "date",
    "profesional_vobo_id" integer,
    "comentarios_valor_acordado" "text",
    "envio_os_profesional" boolean,
    "recepcion_orden_servicio" boolean,
    "participante_arl_id" integer
);


ALTER TABLE "public"."detalle_entrega_profesional" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entregables_estandar" (
    "id" integer NOT NULL,
    "nombre" character varying(100) NOT NULL
);


ALTER TABLE "public"."entregables_estandar" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."entregables_estandar_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."entregables_estandar_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."entregables_estandar_id_seq" OWNED BY "public"."entregables_estandar"."id";



CREATE TABLE IF NOT EXISTS "public"."estados_ejecucion" (
    "id" integer NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "orden_visual" integer
);


ALTER TABLE "public"."estados_ejecucion" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."estados_ejecucion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."estados_ejecucion_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."estados_ejecucion_id_seq" OWNED BY "public"."estados_ejecucion"."id";



CREATE TABLE IF NOT EXISTS "public"."facturacion" (
    "orden_id" integer NOT NULL,
    "alerta_facturacion" character varying(30),
    "estado_facturacion" character varying(30),
    "numero_prefactura" character varying(100),
    "numero_factura" character varying(100),
    CONSTRAINT "chk_estado_facturacion" CHECK ((("estado_facturacion")::"text" = ANY ((ARRAY['Facturada'::character varying, 'Pendiente facturar'::character varying])::"text"[]))),
    CONSTRAINT "facturacion_alerta_facturacion_check" CHECK ((("alerta_facturacion")::"text" = ANY ((ARRAY['Aprobado'::character varying, 'Cancelado'::character varying, 'No aplica'::character varying, 'No se ha subido archivo'::character varying, 'Pendiente de aprobación'::character varying, 'Rechazado'::character varying])::"text"[])))
);


ALTER TABLE "public"."facturacion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."info_orden_servicio" (
    "orden_id" integer NOT NULL,
    "consecutivo_os_profesional" integer DEFAULT "nextval"('"public"."consecutivo_os_prof_seq"'::"regclass") NOT NULL,
    "fecha_emision_os" "date",
    "ciudad_id" integer,
    "actividad_reprogramada" boolean,
    "profesional_id" integer,
    "empresa_a_visitar" character varying(255),
    "nombre_actividad" "text",
    "descripcion_actividad" "text",
    "horas_asignadas" numeric(6,2),
    "fecha_inicio_ejecucion" "date",
    "fecha_fin_ejecucion" "date",
    "direccion_empresa" character varying(255),
    "ubicacion_google_maps" "text",
    "hora_inicio" time without time zone,
    "hora_fin" time without time zone,
    "contacto_nombre" character varying(255),
    "contacto_cargo" character varying(150),
    "contacto_celular" character varying(50),
    "contacto_email" character varying(255),
    CONSTRAINT "chk_fechas_ejec" CHECK (("fecha_fin_ejecucion" >= "fecha_inicio_ejecucion")),
    CONSTRAINT "chk_horas_ejec" CHECK (("hora_fin" >= "hora_inicio"))
);


ALTER TABLE "public"."info_orden_servicio" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."liquidacion" (
    "orden_id" integer NOT NULL,
    "valor_total_cotizado" numeric(14,2),
    "valor_desplazamiento" numeric(14,2),
    "gasto_servicio" numeric(14,2),
    "iva" numeric(14,2),
    "valor_antes_iva" numeric(14,2),
    "retencion_fuente" numeric(14,2),
    "retencion_ica" numeric(14,2),
    "retencion_iva" numeric(14,2),
    "total" numeric(14,2),
    "ganancia" numeric(14,2)
);


ALTER TABLE "public"."liquidacion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orden_entregables_estandar" (
    "orden_id" integer NOT NULL,
    "entregable_id" integer NOT NULL
);


ALTER TABLE "public"."orden_entregables_estandar" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ordenes_servicio" (
    "id" integer NOT NULL,
    "cliente_id" integer NOT NULL,
    "id_unico" character varying(50),
    "estado" character varying(40),
    "numero_os_cliente" character varying(100),
    "fecha_recepcion_os" "date",
    "nombre_empresa_usuaria" character varying(255),
    "nit_empresa_usuaria" character varying(50),
    "cronograma" numeric(10,0),
    "secuencia" character varying(50),
    "nombre_servicio" "text",
    "horas_cargadas" numeric,
    "tipo_servicio" character varying(100),
    "fecha_sipab" "date",
    "asesor_gestion_riesgos" character varying(255),
    "observaciones_iniciales" "text",
    "tarifa_valor_transporte" character varying(20),
    "responsable_os" character varying(100),
    "fecha_creacion" timestamp without time zone DEFAULT "now"(),
    "fecha_actualizacion" timestamp without time zone DEFAULT "now"(),
    "link_archivo_orden" "text",
    "observaciones_responsable_sec" "text",
    CONSTRAINT "chk_estado" CHECK ((("estado")::"text" = ANY ((ARRAY['Pendiente revisión Bolívar'::character varying, 'Enviado a facturación'::character varying, 'Cancelada'::character varying, 'Programar urgente'::character varying, 'Facturar urgente'::character varying, 'Pendiente cobro hora fallida'::character varying, 'Pendiente por cancelar'::character varying, 'Programar mes siguiente'::character varying, 'Facturada'::character varying])::"text"[]))),
    CONSTRAINT "chk_responsable_sec" CHECK ((("responsable_os")::"text" = ANY ((ARRAY['Yulieth Amell'::character varying, 'Bibiana Sarmiento'::character varying, 'Daniela Rosso'::character varying, 'Lucia Bejarano'::character varying, 'Lina Amell'::character varying])::"text"[]))),
    CONSTRAINT "chk_tipo_servicio" CHECK ((("tipo_servicio")::"text" = ANY ((ARRAY['Asesoría'::character varying, 'Informe técnico'::character varying, 'Capacitación'::character varying, 'N/A'::character varying])::"text"[])))
);


ALTER TABLE "public"."ordenes_servicio" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ordenes_servicio_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ordenes_servicio_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ordenes_servicio_id_seq" OWNED BY "public"."ordenes_servicio"."id";



CREATE TABLE IF NOT EXISTS "public"."participantes_arl" (
    "id" integer NOT NULL,
    "nombre_completo" character varying NOT NULL,
    "cedula" character varying,
    "activo" boolean DEFAULT true,
    "fecha_creacion" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."participantes_arl" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."participantes_arl_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."participantes_arl_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."participantes_arl_id_seq" OWNED BY "public"."participantes_arl"."id";



CREATE TABLE IF NOT EXISTS "public"."profesionales" (
    "id" integer NOT NULL,
    "nombre_completo" character varying(255) NOT NULL,
    "cedula" character varying(50),
    "email" character varying(255),
    "telefono" character varying(50),
    "activo" boolean DEFAULT true,
    "fecha_creacion" timestamp without time zone DEFAULT "now"(),
    "valor_hora" numeric
);


ALTER TABLE "public"."profesionales" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."profesionales_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."profesionales_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."profesionales_id_seq" OWNED BY "public"."profesionales"."id";



CREATE TABLE IF NOT EXISTS "public"."radicacion_imagine" (
    "orden_id" integer NOT NULL,
    "estado_imagine" "text",
    "fecha_radicacion_1" "date",
    "numero_radicado_1" character varying(100),
    "novedades_1" "text",
    "fecha_radicacion_2" "date",
    "numero_radicado_2" character varying(100),
    "novedades_2" "text",
    "actualizacion_sipab" "text",
    CONSTRAINT "chk_estado_imagine" CHECK (("estado_imagine" = ANY (ARRAY['Pendiente Revisión Bolívar'::"text", 'Devuelto'::"text", 'Pendiente por cargar'::"text"])))
);


ALTER TABLE "public"."radicacion_imagine" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" NOT NULL,
    "nombre_completo" character varying(255) NOT NULL,
    "email" character varying(255),
    "rol" character varying(20) NOT NULL,
    "profesional_id" integer,
    "activo" boolean DEFAULT true,
    "fecha_creacion" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "usuarios_rol_check" CHECK ((("rol")::"text" = ANY (ARRAY[('administrador'::character varying)::"text", ('programador'::character varying)::"text", ('profesional'::character varying)::"text", ('lectura'::character varying)::"text", ('financiero'::character varying)::"text", ('talento'::character varying)::"text"])))
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."valor_hora_orden" (
    "orden_id" integer NOT NULL,
    "valor_hora_profesional" numeric(12,2)
);


ALTER TABLE "public"."valor_hora_orden" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vobo" (
    "id" integer NOT NULL,
    "nombre_completo" character varying NOT NULL,
    "email" character varying,
    "celular" character varying,
    "activo" boolean DEFAULT true,
    "fecha_creacion" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."vobo" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."vobo_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."vobo_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."vobo_id_seq" OWNED BY "public"."vobo"."id";



ALTER TABLE ONLY "public"."ciudades" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ciudades_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."clientes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."clientes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."entregables_estandar" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."entregables_estandar_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."estados_ejecucion" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."estados_ejecucion_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ordenes_servicio" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ordenes_servicio_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."participantes_arl" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."participantes_arl_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."profesionales" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."profesionales_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."vobo" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."vobo_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."acta_servicio"
    ADD CONSTRAINT "acta_servicio_pkey" PRIMARY KEY ("orden_id");



ALTER TABLE ONLY "public"."checklist_proceso"
    ADD CONSTRAINT "checklist_proceso_pkey" PRIMARY KEY ("orden_id");



ALTER TABLE ONLY "public"."ciudades"
    ADD CONSTRAINT "ciudades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cuenta_cobro"
    ADD CONSTRAINT "cuenta_cobro_pkey" PRIMARY KEY ("orden_id");



ALTER TABLE ONLY "public"."detalle_entrega_profesional"
    ADD CONSTRAINT "detalle_entrega_profesional_pkey" PRIMARY KEY ("orden_id");



ALTER TABLE ONLY "public"."entregables_estandar"
    ADD CONSTRAINT "entregables_estandar_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."entregables_estandar"
    ADD CONSTRAINT "entregables_estandar_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."estados_ejecucion"
    ADD CONSTRAINT "estados_ejecucion_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."estados_ejecucion"
    ADD CONSTRAINT "estados_ejecucion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facturacion"
    ADD CONSTRAINT "facturacion_pkey" PRIMARY KEY ("orden_id");



ALTER TABLE ONLY "public"."info_orden_servicio"
    ADD CONSTRAINT "info_orden_servicio_consecutivo_os_profesional_key" UNIQUE ("consecutivo_os_profesional");



ALTER TABLE ONLY "public"."info_orden_servicio"
    ADD CONSTRAINT "info_orden_servicio_pkey" PRIMARY KEY ("orden_id");



ALTER TABLE ONLY "public"."liquidacion"
    ADD CONSTRAINT "liquidacion_pkey" PRIMARY KEY ("orden_id");



ALTER TABLE ONLY "public"."orden_entregables_estandar"
    ADD CONSTRAINT "orden_entregables_estandar_pkey" PRIMARY KEY ("orden_id", "entregable_id");



ALTER TABLE ONLY "public"."ordenes_servicio"
    ADD CONSTRAINT "ordenes_servicio_id_unico_key" UNIQUE ("id_unico");



ALTER TABLE ONLY "public"."ordenes_servicio"
    ADD CONSTRAINT "ordenes_servicio_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participantes_arl"
    ADD CONSTRAINT "participantes_arl_cedula_key" UNIQUE ("cedula");



ALTER TABLE ONLY "public"."participantes_arl"
    ADD CONSTRAINT "participantes_arl_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profesionales"
    ADD CONSTRAINT "profesionales_cedula_key" UNIQUE ("cedula");



ALTER TABLE ONLY "public"."profesionales"
    ADD CONSTRAINT "profesionales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."radicacion_imagine"
    ADD CONSTRAINT "radicacion_imagine_pkey" PRIMARY KEY ("orden_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."valor_hora_orden"
    ADD CONSTRAINT "valor_hora_orden_pkey" PRIMARY KEY ("orden_id");



ALTER TABLE ONLY "public"."vobo"
    ADD CONSTRAINT "vobo_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "trg_generar_id_unico_orden" BEFORE INSERT ON "public"."ordenes_servicio" FOR EACH ROW WHEN (("new"."id_unico" IS NULL)) EXECUTE FUNCTION "public"."generar_id_unico_orden"();



ALTER TABLE ONLY "public"."acta_servicio"
    ADD CONSTRAINT "acta_servicio_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes_servicio"("id");



ALTER TABLE ONLY "public"."acta_servicio"
    ADD CONSTRAINT "acta_servicio_profesional_acta_id_fkey" FOREIGN KEY ("profesional_acta_id") REFERENCES "public"."participantes_arl"("id");



ALTER TABLE ONLY "public"."checklist_proceso"
    ADD CONSTRAINT "checklist_proceso_estado_ejecucion_id_fkey" FOREIGN KEY ("estado_ejecucion_id") REFERENCES "public"."estados_ejecucion"("id");



ALTER TABLE ONLY "public"."checklist_proceso"
    ADD CONSTRAINT "checklist_proceso_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes_servicio"("id");



ALTER TABLE ONLY "public"."cuenta_cobro"
    ADD CONSTRAINT "cuenta_cobro_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes_servicio"("id");



ALTER TABLE ONLY "public"."detalle_entrega_profesional"
    ADD CONSTRAINT "detalle_entrega_profesional_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes_servicio"("id");



ALTER TABLE ONLY "public"."detalle_entrega_profesional"
    ADD CONSTRAINT "detalle_entrega_profesional_participante_arl_id_fkey" FOREIGN KEY ("participante_arl_id") REFERENCES "public"."participantes_arl"("id");



ALTER TABLE ONLY "public"."detalle_entrega_profesional"
    ADD CONSTRAINT "detalle_entrega_profesional_profesional_vobo_id_fkey" FOREIGN KEY ("profesional_vobo_id") REFERENCES "public"."vobo"("id");



ALTER TABLE ONLY "public"."facturacion"
    ADD CONSTRAINT "facturacion_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes_servicio"("id");



ALTER TABLE ONLY "public"."info_orden_servicio"
    ADD CONSTRAINT "info_orden_servicio_ciudad_id_fkey" FOREIGN KEY ("ciudad_id") REFERENCES "public"."ciudades"("id");



ALTER TABLE ONLY "public"."info_orden_servicio"
    ADD CONSTRAINT "info_orden_servicio_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes_servicio"("id");



ALTER TABLE ONLY "public"."info_orden_servicio"
    ADD CONSTRAINT "info_orden_servicio_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "public"."profesionales"("id");



ALTER TABLE ONLY "public"."liquidacion"
    ADD CONSTRAINT "liquidacion_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes_servicio"("id");



ALTER TABLE ONLY "public"."orden_entregables_estandar"
    ADD CONSTRAINT "orden_entregables_estandar_entregable_id_fkey" FOREIGN KEY ("entregable_id") REFERENCES "public"."entregables_estandar"("id");



ALTER TABLE ONLY "public"."orden_entregables_estandar"
    ADD CONSTRAINT "orden_entregables_estandar_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes_servicio"("id");



ALTER TABLE ONLY "public"."ordenes_servicio"
    ADD CONSTRAINT "ordenes_servicio_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id");



ALTER TABLE ONLY "public"."radicacion_imagine"
    ADD CONSTRAINT "radicacion_imagine_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes_servicio"("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "public"."profesionales"("id");



ALTER TABLE ONLY "public"."valor_hora_orden"
    ADD CONSTRAINT "valor_hora_orden_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes_servicio"("id");



ALTER TABLE "public"."acta_servicio" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_fin_valor_hora" ON "public"."valor_hora_orden" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[]))))));



CREATE POLICY "admin_gestiona_usuarios" ON "public"."usuarios" USING ("public"."es_administrador"()) WITH CHECK ("public"."es_administrador"());



CREATE POLICY "admin_y_financiero_editan_acta_servicio" ON "public"."info_orden_servicio" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[]))))));



CREATE POLICY "admin_y_financiero_editan_checklist_proceso" ON "public"."info_orden_servicio" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[]))))));



CREATE POLICY "admin_y_financiero_editan_detalle_entrega_profesional" ON "public"."info_orden_servicio" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[]))))));



CREATE POLICY "admin_y_financiero_editan_info_orden" ON "public"."info_orden_servicio" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[]))))));



CREATE POLICY "admin_y_financiero_editan_ordenes_servicio" ON "public"."info_orden_servicio" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[]))))));



CREATE POLICY "admin_y_financiero_valor_hora" ON "public"."valor_hora_orden" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[]))))));



CREATE POLICY "autenticados_leen_ordenes" ON "public"."ordenes_servicio" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."checklist_proceso" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ciudades" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cuenta_cobro" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."detalle_entrega_profesional" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entregables_estandar" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."estados_ejecucion" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facturacion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fin_all" ON "public"."acta_servicio" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[]))))));



CREATE POLICY "fin_all" ON "public"."cuenta_cobro" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[]))))));



CREATE POLICY "fin_all" ON "public"."facturacion" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[]))))));



CREATE POLICY "fin_all" ON "public"."liquidacion" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[]))))));



CREATE POLICY "fin_all" ON "public"."radicacion_imagine" USING ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying])::"text"[]))))));



ALTER TABLE "public"."info_orden_servicio" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."liquidacion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mvp_open_access" ON "public"."checklist_proceso" USING (true) WITH CHECK (true);



CREATE POLICY "mvp_open_access" ON "public"."ciudades" USING (true) WITH CHECK (true);



CREATE POLICY "mvp_open_access" ON "public"."clientes" USING (true) WITH CHECK (true);



CREATE POLICY "mvp_open_access" ON "public"."detalle_entrega_profesional" USING (true) WITH CHECK (true);



CREATE POLICY "mvp_open_access" ON "public"."entregables_estandar" USING (true) WITH CHECK (true);



CREATE POLICY "mvp_open_access" ON "public"."estados_ejecucion" USING (true) WITH CHECK (true);



CREATE POLICY "mvp_open_access" ON "public"."info_orden_servicio" USING (true) WITH CHECK (true);



CREATE POLICY "mvp_open_access" ON "public"."orden_entregables_estandar" USING (true) WITH CHECK (true);



CREATE POLICY "mvp_open_access" ON "public"."ordenes_servicio" USING (true) WITH CHECK (true);



CREATE POLICY "mvp_open_access" ON "public"."profesionales" USING (true) WITH CHECK (true);



CREATE POLICY "mvp_open_access" ON "public"."usuarios" USING (true) WITH CHECK (true);



ALTER TABLE "public"."orden_entregables_estandar" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ordenes_servicio" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profesionales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."radicacion_imagine" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "solo_admin_escribe_ordenes" ON "public"."ordenes_servicio" USING ("public"."es_administrador"()) WITH CHECK ("public"."es_administrador"());



CREATE POLICY "usuario_lee_su_fila" ON "public"."usuarios" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "usuario_lee_su_propia_fila" ON "public"."usuarios" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."valor_hora_orden" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."es_administrador"() TO "anon";
GRANT ALL ON FUNCTION "public"."es_administrador"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."es_administrador"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generar_id_unico_orden"() TO "anon";
GRANT ALL ON FUNCTION "public"."generar_id_unico_orden"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generar_id_unico_orden"() TO "service_role";


















GRANT ALL ON TABLE "public"."acta_servicio" TO "anon";
GRANT ALL ON TABLE "public"."acta_servicio" TO "authenticated";
GRANT ALL ON TABLE "public"."acta_servicio" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_proceso" TO "anon";
GRANT ALL ON TABLE "public"."checklist_proceso" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_proceso" TO "service_role";



GRANT ALL ON TABLE "public"."ciudades" TO "anon";
GRANT ALL ON TABLE "public"."ciudades" TO "authenticated";
GRANT ALL ON TABLE "public"."ciudades" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ciudades_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ciudades_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ciudades_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clientes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clientes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clientes_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."consecutivo_os_prof_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."consecutivo_os_prof_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."consecutivo_os_prof_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cuenta_cobro" TO "anon";
GRANT ALL ON TABLE "public"."cuenta_cobro" TO "authenticated";
GRANT ALL ON TABLE "public"."cuenta_cobro" TO "service_role";



GRANT ALL ON TABLE "public"."detalle_entrega_profesional" TO "anon";
GRANT ALL ON TABLE "public"."detalle_entrega_profesional" TO "authenticated";
GRANT ALL ON TABLE "public"."detalle_entrega_profesional" TO "service_role";



GRANT ALL ON TABLE "public"."entregables_estandar" TO "anon";
GRANT ALL ON TABLE "public"."entregables_estandar" TO "authenticated";
GRANT ALL ON TABLE "public"."entregables_estandar" TO "service_role";



GRANT ALL ON SEQUENCE "public"."entregables_estandar_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."entregables_estandar_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."entregables_estandar_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."estados_ejecucion" TO "anon";
GRANT ALL ON TABLE "public"."estados_ejecucion" TO "authenticated";
GRANT ALL ON TABLE "public"."estados_ejecucion" TO "service_role";



GRANT ALL ON SEQUENCE "public"."estados_ejecucion_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."estados_ejecucion_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."estados_ejecucion_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."facturacion" TO "anon";
GRANT ALL ON TABLE "public"."facturacion" TO "authenticated";
GRANT ALL ON TABLE "public"."facturacion" TO "service_role";



GRANT ALL ON TABLE "public"."info_orden_servicio" TO "anon";
GRANT ALL ON TABLE "public"."info_orden_servicio" TO "authenticated";
GRANT ALL ON TABLE "public"."info_orden_servicio" TO "service_role";



GRANT ALL ON TABLE "public"."liquidacion" TO "anon";
GRANT ALL ON TABLE "public"."liquidacion" TO "authenticated";
GRANT ALL ON TABLE "public"."liquidacion" TO "service_role";



GRANT ALL ON TABLE "public"."orden_entregables_estandar" TO "anon";
GRANT ALL ON TABLE "public"."orden_entregables_estandar" TO "authenticated";
GRANT ALL ON TABLE "public"."orden_entregables_estandar" TO "service_role";



GRANT ALL ON TABLE "public"."ordenes_servicio" TO "anon";
GRANT ALL ON TABLE "public"."ordenes_servicio" TO "authenticated";
GRANT ALL ON TABLE "public"."ordenes_servicio" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ordenes_servicio_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ordenes_servicio_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ordenes_servicio_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."participantes_arl" TO "anon";
GRANT ALL ON TABLE "public"."participantes_arl" TO "authenticated";
GRANT ALL ON TABLE "public"."participantes_arl" TO "service_role";



GRANT ALL ON SEQUENCE "public"."participantes_arl_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."participantes_arl_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."participantes_arl_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profesionales" TO "anon";
GRANT ALL ON TABLE "public"."profesionales" TO "authenticated";
GRANT ALL ON TABLE "public"."profesionales" TO "service_role";



GRANT ALL ON SEQUENCE "public"."profesionales_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."profesionales_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."profesionales_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."radicacion_imagine" TO "anon";
GRANT ALL ON TABLE "public"."radicacion_imagine" TO "authenticated";
GRANT ALL ON TABLE "public"."radicacion_imagine" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



GRANT ALL ON TABLE "public"."valor_hora_orden" TO "anon";
GRANT ALL ON TABLE "public"."valor_hora_orden" TO "authenticated";
GRANT ALL ON TABLE "public"."valor_hora_orden" TO "service_role";



GRANT ALL ON TABLE "public"."vobo" TO "anon";
GRANT ALL ON TABLE "public"."vobo" TO "authenticated";
GRANT ALL ON TABLE "public"."vobo" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vobo_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."vobo_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vobo_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































