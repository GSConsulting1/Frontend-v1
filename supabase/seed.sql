-- Datos de prueba para los entornos NO productivos: la base local (corre solo
-- al final de `pnpm db:reset`) y el proyecto dev, donde se aplicó una vez con
-- `supabase db push --include-seed` durante el bootstrap.
--
-- ⚠️ NUNCA se aplica a producción. Ahí los datos son reales y este archivo los
-- duplicaría con filas inventadas.
--
-- Qué va acá y qué no:
--
--   SÍ  → catálogos que en producción existen solo como filas (nadie los creó
--         en una migración), y sin los cuales el formulario de orden queda
--         inservible.
--
--   SÍ  → datos operativos de prueba (usuarios, clientes, profesionales,
--         órdenes y sus secciones). Sin ellos no hay con qué loguearse —RLS
--         deniega todo sin una fila en `usuarios`— ni nada que mirar en el
--         listado, así que probar cualquier cambio obliga a inventarlos otra
--         vez después de cada `db:reset`.
--
--   NO  → cualquier dato REAL, venga de donde venga. Ni un dump de producción
--         ni un copiar-pegar del dashboard. `profesionales` guarda cédulas y
--         `vobo` emails y celulares: son datos de personas y no van a git.
--
-- Regla práctica para distinguirlos: todo nombre de acá tiene que sonar
-- claramente inventado ('Mariana Prueba Gómez'), todo email termina en
-- `.test` o `.local` y toda cédula/NIT arranca en 1000 o 9001. Si alguna fila
-- podría confundirse con una real, está mal puesta.
--
-- La excepción son los `responsable_os`: tienen que existir en el catálogo
-- `responsables_sec`, que lo llenan solas las migraciones
-- 20260816001045_catalogo_responsables_sec.sql y
-- 20260819012529_responsables_sec_identidad_por_email.sql con las casillas
-- reales del equipo, así que ahí no se puede inventar. No son datos de
-- clientes: son casillas de rol de GS Group (gerencia@, consultoria@…), no
-- direcciones personales.
-- (Antes la lista cerrada la imponía el CHECK `chk_responsable_sec`, y hasta la
-- segunda de esas dos migraciones lo que se guardaba acá era el NOMBRE de la
-- persona en vez del email de la casilla.)
--
-- Para regenerar los catálogos desde el remoto (ojo: `--schema public` NO es
-- opcional — sin esa bandera el dump se trae el esquema `auth` entero, con
-- emails y contraseñas hasheadas):
--
--   pnpm exec supabase db dump --linked --data-only --schema public \
--     -x public.ordenes_servicio -x public.info_orden_servicio ... (etc.)
--
-- y copiar a mano solo los bloques de catálogo.

-- Las ciudades NO van acá: `departamentos` y los 1.104 municipios se siembran
-- desde 20260802163953_departamentos_y_municipios.sql, porque son datos que
-- deben existir también en producción (ver structure.md > `supabase/`).

-- ---------------------------------------------------------------------------
-- Entregables estándar
-- ---------------------------------------------------------------------------
INSERT INTO "public"."entregables_estandar" ("id", "nombre") VALUES
	(1, 'AT 031 Acta'),
	(2, 'AT 028 asistencia'),
	(3, 'Informe'),
	(4, 'Planilla de prestación de servicio'),
	(5, 'Ninguna')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Estados de ejecución
--
-- `orden_visual` no es correlativo a propósito: replica el remoto, donde
-- 'Enviado a Diana' se agregó después con 15 para que quedara al final.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."estados_ejecucion" ("id", "nombre", "orden_visual") VALUES
	(1, 'Programada', 1),
	(2, 'En ejecución', 2),
	(3, 'Ejecutada', 3),
	(4, 'Cancelada', 4),
	(5, 'Pendiente programar', 5),
	(6, 'Enviado a Diana', 15)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Participantes ARL y VoBo — NOMBRES INVENTADOS, no son los de producción.
-- Solo existen para que los selectores tengan opciones en local.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."participantes_arl" ("id", "nombre_completo", "cedula", "activo") VALUES
	(1, 'Ana Ejemplo Prueba', '10000001', true),
	(2, 'Carlos Muestra Demo', '10000002', true),
	(3, 'Lucía Ficticia Test', '10000003', true)
ON CONFLICT DO NOTHING;

INSERT INTO "public"."vobo" ("id", "nombre_completo", "email", "celular", "activo") VALUES
	(1, 'Diana Ejemplo Local', 'diana.local@example.test', '3000000001', true),
	(2, 'Jorge Prueba Local', 'jorge.local@example.test', '3000000002', true)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Usuarios de prueba — uno por cada rol que acepta el CHECK de `usuarios.rol`.
--
-- Por qué hacen falta: las policies resuelven el rol leyendo `public.usuarios`
-- por `auth.uid()`, así que sin fila acá una sesión válida igual queda sin
-- permisos y la app se ve vacía. Y como `usuarios.id` es FK a `auth.users`, el
-- usuario de auth tiene que existir primero.
--
-- Todos usan la misma contraseña: local123
--
-- Dos columnas que parecen opcionales y no lo son:
--
--   `email_confirmed_at` → sin fecha, GoTrue rechaza el login con "Email not
--   confirmed", y en local no hay forma de confirmarlo desde la UI.
--
--   la fila en `auth.identities` → sin ella el login por email/password no
--   encuentra con qué autenticar, aunque el usuario exista en `auth.users`.
--
--   los 4 tokens en '' → `confirmation_token`, `recovery_token`,
--   `email_change_token_new` y `email_change` aceptan NULL en la tabla pero
--   GoTrue los lee como `string` de Go, no como puntero, así que un NULL le
--   rompe el scan y el login falla con un genérico "Database error querying
--   schema" que no menciona ninguna columna. Las otras columnas de token del
--   esquema ya traen DEFAULT '' y por eso no hace falta listarlas.
-- ---------------------------------------------------------------------------
INSERT INTO "auth"."users" (
	"instance_id", "id", "aud", "role", "email", "encrypted_password",
	"email_confirmed_at", "created_at", "updated_at",
	"raw_app_meta_data", "raw_user_meta_data",
	"confirmation_token", "recovery_token", "email_change_token_new", "email_change"
)
SELECT
	'00000000-0000-0000-0000-000000000000'::uuid,
	u.id::uuid,
	'authenticated',
	'authenticated',
	u.email,
	"extensions"."crypt"('local123', "extensions"."gen_salt"('bf')),
	now(), now(), now(),
	'{"provider":"email","providers":["email"]}'::jsonb,
	jsonb_build_object('nombre_completo', u.nombre),
	'', '', '', ''
FROM (VALUES
	('00000000-0000-4000-8000-000000000001', 'admin@local.test',       'Admin Prueba'),
	('00000000-0000-4000-8000-000000000002', 'financiero@local.test',  'Fabiola Financiera Prueba'),
	('00000000-0000-4000-8000-000000000003', 'talento@local.test',     'Tomás Talento Prueba'),
	('00000000-0000-4000-8000-000000000004', 'programador@local.test', 'Paula Programadora Prueba'),
	('00000000-0000-4000-8000-000000000005', 'profesional@local.test', 'Mariana Prueba Gómez'),
	('00000000-0000-4000-8000-000000000006', 'lectura@local.test',     'Lorena Lectura Prueba')
) AS u(id, email, nombre)
ON CONFLICT DO NOTHING;

INSERT INTO "auth"."identities" (
	"provider_id", "user_id", "identity_data", "provider",
	"last_sign_in_at", "created_at", "updated_at"
)
SELECT
	u.id::text,
	u.id::uuid,
	jsonb_build_object('sub', u.id, 'email', u.email, 'email_verified', true),
	'email',
	now(), now(), now()
FROM (VALUES
	('00000000-0000-4000-8000-000000000001', 'admin@local.test'),
	('00000000-0000-4000-8000-000000000002', 'financiero@local.test'),
	('00000000-0000-4000-8000-000000000003', 'talento@local.test'),
	('00000000-0000-4000-8000-000000000004', 'programador@local.test'),
	('00000000-0000-4000-8000-000000000005', 'profesional@local.test'),
	('00000000-0000-4000-8000-000000000006', 'lectura@local.test')
) AS u(id, email)
ON CONFLICT DO NOTHING;

-- `profesional_id` se llena más abajo, después de sembrar `profesionales`:
-- es FK y el rol `profesional` la necesita para que la app lo asocie a su ficha.
INSERT INTO "public"."usuarios" ("id", "nombre_completo", "email", "rol", "activo") VALUES
	('00000000-0000-4000-8000-000000000001', 'Admin Prueba',              'admin@local.test',       'administrador', true),
	('00000000-0000-4000-8000-000000000002', 'Fabiola Financiera Prueba', 'financiero@local.test',  'financiero',    true),
	('00000000-0000-4000-8000-000000000003', 'Tomás Talento Prueba',      'talento@local.test',     'talento',       true),
	('00000000-0000-4000-8000-000000000004', 'Paula Programadora Prueba', 'programador@local.test', 'programador',   true),
	('00000000-0000-4000-8000-000000000005', 'Mariana Prueba Gómez',      'profesional@local.test', 'profesional',   true),
	('00000000-0000-4000-8000-000000000006', 'Lorena Lectura Prueba',     'lectura@local.test',     'lectura',       true)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Clientes y profesionales — TODOS INVENTADOS.
-- NITs en el rango 9001xxxxx y cédulas en 2000xxxx para que se distingan de un
-- vistazo de cualquier dato real.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."clientes" ("id", "nombre_cliente", "nit", "activo") VALUES
	(1, 'Comercializadora Andina S.A.S.', '900100001-1', true),
	(2, 'Transportes del Llano Ltda.',    '900100002-2', true),
	(3, 'Alimentos Ejemplo S.A.',         '900100003-3', true),
	(4, 'Constructora Ficticia S.A.S.',   '900100004-4', false)
ON CONFLICT DO NOTHING;

INSERT INTO "public"."profesionales" ("id", "nombre_completo", "cedula", "email", "telefono", "valor_hora", "activo") VALUES
	(1, 'Mariana Prueba Gómez',   '20000001', 'mariana.prueba@example.test',  '3010000001',  85000, true),
	(2, 'Andrés Demo Salazar',    '20000002', 'andres.demo@example.test',     '3010000002',  92000, true),
	(3, 'Valentina Test Ríos',    '20000003', 'valentina.test@example.test',  '3010000003',  78000, true),
	(4, 'Felipe Ficticio Ortiz',  '20000004', 'felipe.ficticio@example.test', '3010000004', 105000, false)
ON CONFLICT DO NOTHING;

UPDATE "public"."usuarios" SET "profesional_id" = 1
WHERE "id" = '00000000-0000-4000-8000-000000000005' AND "profesional_id" IS NULL;

-- ---------------------------------------------------------------------------
-- Empresas usuarias.
--
-- En el remoto estas filas las crea sola la migración
-- 20260815123716_catalogo_empresas_usuarias.sql, leyendo las órdenes que ya
-- existían. Acá eso no puede pasar: `db:reset` corre TODAS las migraciones
-- sobre una base vacía y recién después este seed, así que cuando el backfill
-- corre no hay ni una orden que leer. Por eso se cargan a mano, con los mismos
-- nombre/NIT que usan las tres órdenes de más abajo.
--
-- La cuarta no tiene órdenes y está inactiva a propósito: es el único caso que
-- se puede eliminar de verdad desde la pantalla (las otras tres las frena la
-- FK) y el que muestra el badge "Inactiva".
-- ---------------------------------------------------------------------------
INSERT INTO "public"."empresas_usuarias" ("id", "nombre", "nit", "activo") VALUES
	(1, 'Comercializadora Andina S.A.S.', '900100001-1', true),
	(2, 'Transportes del Llano Ltda.',    '900100002-2', true),
	(3, 'Alimentos Ejemplo S.A.',         '900100003-3', true),
	(4, 'Metalúrgica Ficticia S.A.S.',    '900100004-4', false)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Órdenes de servicio.
--
-- ⚠️ No pongas `fecha_creacion` a mano acá. El trigger
-- `trg_generar_id_unico_orden` arma el `id_unico` contando las órdenes creadas
-- HOY, y `id_unico` tiene índice único: si las órdenes se fechan en el pasado,
-- el contador se queda en cero y las tres colisionan en OS-<hoy>-0001.
-- Dejando el DEFAULT now() salen OS-<hoy>-0001, -0002 y -0003.
--
-- Los tres `estado` son valores distintos de `chk_estado` a propósito, para
-- que el listado y sus filtros tengan algo que mostrar.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."ordenes_servicio" (
	"id", "cliente_id", "estado", "numero_os_cliente", "fecha_recepcion_os",
	"nombre_empresa_usuaria", "nit_empresa_usuaria", "cronograma", "secuencia",
	"nombre_servicio", "horas_cargadas", "tipo_servicio", "fecha_sipab",
	"asesor_gestion_riesgos", "observaciones_iniciales", "tarifa_valor_transporte",
	"responsable_os"
) VALUES
	(1, 1, 'Pendiente revisión Bolívar', 'OS-CLI-0001', CURRENT_DATE - 20,
	 'Comercializadora Andina S.A.S.', '900100001-1', 1, 'A',
	 'Capacitación en trabajo seguro en alturas', 8, 'Capacitación', CURRENT_DATE - 18,
	 'Asesor Prueba Uno', 'Orden de prueba para el listado y la edición.', '120000',
	 'consultoria@gsgroupsas.com'),
	(2, 2, 'Facturada', 'OS-CLI-0002', CURRENT_DATE - 45,
	 'Transportes del Llano Ltda.', '900100002-2', 2, 'B',
	 'Asesoría en gestión de riesgo vial', 4, 'Asesoría', CURRENT_DATE - 40,
	 'Asesor Prueba Dos', 'Orden cerrada, sirve para probar la sección financiera.', '80000',
	 'talentogs@gsgroupsas.com'),
	(3, 3, 'Programar urgente', 'OS-CLI-0003', CURRENT_DATE - 5,
	 'Alimentos Ejemplo S.A.', '900100003-3', 3, 'C',
	 'Informe técnico de condiciones de seguridad', 12, 'Informe técnico', NULL,
	 -- La casilla fusionada (era Lina Amell + Lucia Bejarano + Tatiana Carrillo),
	 -- a propósito: es la fila que más fácil se rompe si alguien toca la fusión.
	 'Asesor Prueba Tres', 'Orden recién recibida, sin ejecutar.', '150000',
	 'administrativo@gsgroupsas.com')
ON CONFLICT DO NOTHING;

-- Vincula cada orden con su empresa usuaria por el nombre, exactamente con la
-- misma normalización que usa el backfill de la migración (trim, espacios
-- colapsados, mayúsculas) — así el estado local queda igual al que deja la
-- migración en el remoto, en vez de con `empresa_usuaria_id` en NULL.
UPDATE "public"."ordenes_servicio" o
SET "empresa_usuaria_id" = e."id"
FROM "public"."empresas_usuarias" e
WHERE upper(regexp_replace(btrim(o."nombre_empresa_usuaria"), '\s+', ' ', 'g'))
    = upper(regexp_replace(btrim(e."nombre"), '\s+', ' ', 'g'))
  AND o."empresa_usuaria_id" IS NULL;

-- Lo mismo con el responsable SEC. Acá no hace falta cargar el catálogo a mano
-- (a diferencia de `empresas_usuarias` arriba): las migraciones
-- 20260816001045_catalogo_responsables_sec.sql y
-- 20260819012529_responsables_sec_identidad_por_email.sql dejan las 7 casillas
-- creadas desde listas fijas, no leyendo las órdenes, así que sobre una base
-- vacía igual quedan. Lo único que falta es el vínculo de estas tres órdenes.
--
-- El join es por EMAIL normalizado, con el mismo criterio que el índice único
-- que dejó la segunda de esas migraciones (lower + btrim). Antes era por nombre;
-- si esto siguiera comparando nombres, la orden 3 quedaría sin vincular, porque
-- 'Tatiana Carrillo' dejó de existir como fila al fusionarse en administrativo@.
UPDATE "public"."ordenes_servicio" o
SET "responsable_sec_id" = r."id"
FROM "public"."responsables_sec" r
WHERE lower(btrim(o."responsable_os")) = lower(btrim(r."email"))
  AND o."responsable_sec_id" IS NULL;

-- ---------------------------------------------------------------------------
-- Secciones de cada orden.
--
-- `checklist_proceso` es la que hace que la columna Estado del listado no
-- salga vacía: `getOrdenes` la trae embebida para leer `estados_ejecucion`.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."checklist_proceso" (
	"orden_id", "envio_at031", "envio_at028", "formatos", "estado_ejecucion_id",
	"fecha_maxima_ejecucion", "entrega_soportes_profesional", "entrega_soportes_cliente",
	"fecha_maxima_entrega_soportes", "vobo_emitido", "cumplio_entrega_fecha", "informe_guardian"
) VALUES
	(1, true,  true,  true,  2, CURRENT_DATE + 10, false, false, CURRENT_DATE + 20, false, NULL, 'Pendiente de aprobación'),
	(2, true,  true,  true,  3, CURRENT_DATE - 30, true,  true,  CURRENT_DATE - 20, true,  true, 'Aprobado'),
	(3, false, false, false, 5, CURRENT_DATE + 25, false, false, CURRENT_DATE + 35, false, NULL, 'No aplica')
ON CONFLICT DO NOTHING;

-- `consecutivo_os_profesional` NO se lista acá a propósito, aunque sea NOT
-- NULL: tiene DEFAULT nextval('consecutivo_os_prof_seq') y un índice único
-- GLOBAL (no por orden ni por profesional, pese al nombre). La app tampoco lo
-- escribe — `guardarInfoOrdenCompleta` deja que lo asigne la secuencia.
--
-- Fijarlo a mano acá rompe dos cosas a la vez: si se repite entre filas, el
-- ON CONFLICT las descarta en silencio; y si no se repite pero la secuencia no
-- se mueve, la primera actividad que se guarde desde la app pide un valor ya
-- usado y falla con "No se pudo guardar la actividad". Dejándolo al DEFAULT,
-- la secuencia queda consistente sola.
INSERT INTO "public"."info_orden_servicio" (
	"orden_id", "fecha_emision_os", "ciudad_id",
	"actividad_reprogramada", "profesional_id", "empresa_a_visitar", "nombre_actividad",
	"descripcion_actividad", "horas_asignadas", "fecha_inicio_ejecucion", "fecha_fin_ejecucion",
	"direccion_empresa", "ubicacion_google_maps", "hora_inicio", "hora_fin",
	"contacto_nombre", "contacto_cargo", "contacto_celular", "contacto_email"
) VALUES
	(1, CURRENT_DATE - 19, (SELECT id FROM public.ciudades WHERE nombre = 'Bogotá, D.C.'),
	 false, 1, 'Comercializadora Andina S.A.S.', 'Capacitación alturas nivel avanzado',
	 'Jornada teórico-práctica de 8 horas para 15 participantes.', 8,
	 CURRENT_DATE + 3, CURRENT_DATE + 3, 'Calle Falsa 123, Bogotá', NULL, '08:00', '16:00',
	 'Contacto Prueba Uno', 'Jefe de SST', '3020000001', 'contacto1@example.test'),
	(2, CURRENT_DATE - 44, (SELECT id FROM public.ciudades WHERE nombre = 'Medellín'),
	 false, 2, 'Transportes del Llano Ltda.', 'Asesoría en PESV',
	 'Revisión documental y recomendaciones del plan estratégico de seguridad vial.', 4,
	 CURRENT_DATE - 35, CURRENT_DATE - 35, 'Carrera Demo 45-67, Medellín', NULL, '09:00', '13:00',
	 'Contacto Prueba Dos', 'Coordinadora HSEQ', '3020000002', 'contacto2@example.test'),
	(3, CURRENT_DATE - 4, (SELECT id FROM public.ciudades WHERE nombre = 'Barranquilla'),
	 false, 3, 'Alimentos Ejemplo S.A.', 'Informe técnico de seguridad',
	 'Levantamiento en planta y elaboración de informe.', 12,
	 NULL, NULL, 'Vía Ejemplo Km 4, Barranquilla', NULL, NULL, NULL,
	 'Contacto Prueba Tres', 'Gerente de Planta', '3020000003', 'contacto3@example.test')
ON CONFLICT DO NOTHING;

INSERT INTO "public"."detalle_entrega_profesional" (
	"orden_id", "entregables_especificos", "fecha_cierre_orden", "profesional_vobo_id",
	"comentarios_valor_acordado", "envio_os_profesional", "recepcion_orden_servicio",
	"participante_arl_id"
) VALUES
	(1, 'Acta de asistencia y registro fotográfico.', NULL,               1, 'Valor acordado según tarifa vigente.', true,  true,  1),
	(2, 'Informe final de asesoría PESV.',            CURRENT_DATE - 25,  2, 'Incluye desplazamiento.',              true,  true,  2),
	(3, NULL,                                          NULL,              NULL, NULL,                                 false, false, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO "public"."orden_entregables_estandar" ("orden_id", "entregable_id") VALUES
	(1, 1), (1, 2),
	(2, 3), (2, 4),
	(3, 5)
ON CONFLICT DO NOTHING;

INSERT INTO "public"."valor_hora_orden" ("orden_id", "valor_hora_profesional") VALUES
	(1, 85000),
	(2, 92000),
	(3, 78000)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Sección financiera, solo en la orden 2 (la que está 'Facturada').
--
-- Estas 5 tablas tienen RLS restringido a administrador y financiero, así que
-- sirven además para verificar que los otros 4 roles ven 0 filas y no un error.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."acta_servicio" ("orden_id", "fecha_acta", "hora_acta", "profesional_acta_id") VALUES
	(2, CURRENT_DATE - 35, '13:00', 2)
ON CONFLICT DO NOTHING;

INSERT INTO "public"."liquidacion" (
	"orden_id", "valor_total_cotizado", "valor_desplazamiento", "gasto_servicio",
	"iva", "valor_antes_iva", "retencion_fuente", "retencion_ica", "retencion_iva",
	"total", "ganancia"
) VALUES
	(2, 500000, 80000, 368000, 95000, 500000, 55000, 5000, 0, 515000, 132000)
ON CONFLICT DO NOTHING;

INSERT INTO "public"."facturacion" (
	"orden_id", "alerta_facturacion", "estado_facturacion", "numero_prefactura", "numero_factura"
) VALUES
	-- 'Facturado' y no 'Facturada', y alerta_facturacion como FECHA y no como
	-- 'Aprobado': la migración 20260815130000_alinear_estados_imagine_y_facturacion.sql
	-- cambió el CHECK de estado_facturacion y convirtió alerta_facturacion en
	-- la fecha máxima para facturar (fecha_sipab + 40). Esa migración renombra
	-- las filas existentes, pero el seed corre DESPUÉS, así que los valores
	-- viejos acá rompían db:reset con 23514.
	(2, to_char(CURRENT_DATE, 'YYYY-MM-DD'), 'Facturado', 'PRE-0001', 'FAC-0001')
ON CONFLICT DO NOTHING;

INSERT INTO "public"."cuenta_cobro" (
	"orden_id", "radicacion_cuenta", "fecha_radicacion", "valor_cuenta_cobro",
	"documento_soporte", "corte_pago", "fecha_pago", "fecha_corte", "numero_radicado"
) VALUES
	(2, true, CURRENT_DATE - 20, 368000, 'Cuenta de cobro PDF', CURRENT_DATE - 10,
	 CURRENT_DATE - 5, CURRENT_DATE - 15, 'RAD-0001')
ON CONFLICT DO NOTHING;

INSERT INTO "public"."radicacion_imagine" (
	"orden_id", "estado_imagine", "fecha_corte", "fecha_radicacion_1", "numero_radicado_1",
	"novedades_1", "actualizacion_sipab"
) VALUES
	-- Mismo caso: 'Pendiente por cargar' salió del CHECK de estado_imagine en
	-- esa misma migración y su mapeo acordado es 'Pendiente de radicar'.
	(2, 'Pendiente de radicar', CURRENT_DATE - 20, CURRENT_DATE - 18, 'IMG-0001',
	 'Sin novedades.', 'Actualizado')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Reposicionar las secuencias.
--
-- Los INSERT de arriba fijan el `id` a mano, lo que no mueve el contador de la
-- secuencia: sin esto, el primer registro que se cree desde la app en local
-- pediría id=1 y chocaría con una fila ya sembrada.
-- ---------------------------------------------------------------------------
-- `ciudades` no aparece acá: sus filas las inserta la migración de municipios
-- dejando que la secuencia asigne los ids, así que el contador ya queda bien.
SELECT setval('public.entregables_estandar_id_seq', (SELECT MAX(id) FROM public.entregables_estandar));
SELECT setval('public.estados_ejecucion_id_seq',    (SELECT MAX(id) FROM public.estados_ejecucion));
SELECT setval('public.participantes_arl_id_seq',    (SELECT MAX(id) FROM public.participantes_arl));
SELECT setval('public.vobo_id_seq',                 (SELECT MAX(id) FROM public.vobo));
SELECT setval('public.clientes_id_seq',             (SELECT MAX(id) FROM public.clientes));
SELECT setval('public.empresas_usuarias_id_seq',    (SELECT MAX(id) FROM public.empresas_usuarias));
SELECT setval('public.profesionales_id_seq',        (SELECT MAX(id) FROM public.profesionales));
SELECT setval('public.ordenes_servicio_id_seq',     (SELECT MAX(id) FROM public.ordenes_servicio));

-- Red de seguridad: si una corrida vieja del seed llegó a fijar
-- `consecutivo_os_profesional` a mano (lo hizo, antes de que se corrigiera),
-- la secuencia quedó atrás de las filas existentes y el próximo guardado desde
-- la app fallaría. Con el INSERT de arriba ya sin valores explícitos esto es un
-- no-op, pero deja la base consistente al re-correr el seed sobre dev.
SELECT setval('public.consecutivo_os_prof_seq',     (SELECT MAX(consecutivo_os_profesional) FROM public.info_orden_servicio));

-- ---------------------------------------------------------------------------
-- Verificación final.
--
-- Por qué existe: los INSERT de arriba llevan `ON CONFLICT DO NOTHING` para
-- que el seed se pueda volver a correr sobre dev sin chocar. El precio es que
-- una fila mal armada se descarta EN SILENCIO y el seed termina "bien".
--
-- Ya pasó: las 3 filas de `info_orden_servicio` se escribieron con
-- `consecutivo_os_profesional = 1` sin saber que esa columna tiene índice
-- único global, y solo entró una. El reset no se quejó; el faltante apareció
-- después, contando filas a mano. Este bloque convierte eso en un error.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
	faltantes text := '';
	esperado  record;
BEGIN
	FOR esperado IN
		SELECT * FROM (VALUES
			('auth.users',                          6, (SELECT count(*) FROM auth.users)),
			('auth.identities',                     6, (SELECT count(*) FROM auth.identities)),
			('public.usuarios',                     6, (SELECT count(*) FROM public.usuarios)),
			('public.clientes',                     4, (SELECT count(*) FROM public.clientes)),
			('public.profesionales',                4, (SELECT count(*) FROM public.profesionales)),
			('public.ordenes_servicio',             3, (SELECT count(*) FROM public.ordenes_servicio)),
			('public.checklist_proceso',            3, (SELECT count(*) FROM public.checklist_proceso)),
			('public.info_orden_servicio',          3, (SELECT count(*) FROM public.info_orden_servicio)),
			('public.detalle_entrega_profesional',  3, (SELECT count(*) FROM public.detalle_entrega_profesional)),
			('public.orden_entregables_estandar',   5, (SELECT count(*) FROM public.orden_entregables_estandar)),
			('public.valor_hora_orden',             3, (SELECT count(*) FROM public.valor_hora_orden)),
			('public.entregables_estandar',         5, (SELECT count(*) FROM public.entregables_estandar)),
			('public.estados_ejecucion',            6, (SELECT count(*) FROM public.estados_ejecucion)),
			('public.participantes_arl',            3, (SELECT count(*) FROM public.participantes_arl)),
			('public.vobo',                         2, (SELECT count(*) FROM public.vobo)),
			-- Las 7 casillas que dejan las dos migraciones de `responsables_sec`
			-- (8 nombres, menos 2 que se fusionan en administrativo@, más
			-- finanzas@). Si acá aparece 8, la fusión de
			-- 20260819012529 no corrió.
			('public.responsables_sec',             7, (SELECT count(*) FROM public.responsables_sec)),
			-- El que de verdad importa: que el join por email de más arriba haya
			-- enganchado las 3 órdenes. Sin esta línea, un email mal escrito en
			-- el seed deja `responsable_sec_id` en NULL y no se entera nadie
			-- hasta abrir el formulario.
			('ordenes con responsable vinculado',   3, (SELECT count(*) FROM public.ordenes_servicio WHERE responsable_sec_id IS NOT NULL))
		) AS t(tabla, minimo, actual)
		WHERE actual < minimo
	LOOP
		faltantes := faltantes || format(E'\n  - %s: se esperaban >= %s y hay %s',
			esperado.tabla, esperado.minimo, esperado.actual);
	END LOOP;

	IF faltantes <> '' THEN
		RAISE EXCEPTION E'El seed quedó incompleto — alguna fila fue descartada por ON CONFLICT:%', faltantes;
	END IF;
END $$;
