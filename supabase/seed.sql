-- Datos para la base de datos LOCAL. Corre al final de `pnpm db:reset`,
-- después de todas las migraciones. NUNCA se aplica al proyecto remoto.
--
-- Qué va acá y qué no:
--
--   SÍ  → catálogos que en producción existen solo como filas (nadie los creó
--         en una migración), y sin los cuales el formulario de orden queda
--         inservible en local.
--
--   NO  → cualquier dato real: `ordenes_servicio`, `info_orden_servicio`,
--         `clientes`, `usuarios`, `profesionales`. Son datos de clientes y de
--         personas; no van a git.
--
--   NO  → nombres de personas reales. `participantes_arl` y `vobo` guardan
--         nombres y cédulas de gente de verdad, así que acá van filas
--         inventadas, suficientes para que los selectores tengan opciones.
--
-- Para regenerar los catálogos desde el remoto (ojo: `--schema public` NO es
-- opcional — sin esa bandera el dump se trae el esquema `auth` entero, con
-- emails y contraseñas hasheadas):
--
--   pnpm exec supabase db dump --linked --data-only --schema public \
--     -x public.ordenes_servicio -x public.info_orden_servicio ... (etc.)
--
-- y copiar a mano solo los bloques de catálogo.

-- ---------------------------------------------------------------------------
-- Ciudades
--
-- ⚠️ Este bloque es temporal. Cuando entre la migración de departamentos y
-- municipios, las ciudades pasan a sembrarse desde la migración (son datos que
-- deben existir en producción, no solo en local) y este bloque se borra: la
-- columna `departamento` desaparece y este INSERT dejaría de compilar.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."ciudades" ("id", "nombre", "departamento") VALUES
	(1, 'Bogotá D.C.', 'Bogotá D.C.'),
	(2, 'Medellín', 'Antioquia'),
	(3, 'Cali', 'Valle del Cauca'),
	(4, 'Barranquilla', 'Atlántico'),
	(5, 'Cartagena', 'Bolívar'),
	(6, 'Cúcuta', 'Norte de Santander'),
	(7, 'Bucaramanga', 'Santander'),
	(8, 'Pereira', 'Risaralda'),
	(9, 'Santa Marta', 'Magdalena'),
	(10, 'Ibagué', 'Tolima'),
	(11, 'Manizales', 'Caldas'),
	(12, 'Villavicencio', 'Meta'),
	(13, 'Neiva', 'Huila'),
	(14, 'Pasto', 'Nariño'),
	(15, 'Armenia', 'Quindío'),
	(16, 'Montería', 'Córdoba'),
	(17, 'Valledupar', 'Cesar'),
	(18, 'Sincelejo', 'Sucre'),
	(19, 'Popayán', 'Cauca'),
	(20, 'Tunja', 'Boyacá'),
	(21, 'Riohacha', 'La Guajira'),
	(22, 'Florencia', 'Caquetá'),
	(23, 'Yopal', 'Casanare'),
	(24, 'Quibdó', 'Chocó'),
	(25, 'Leticia', 'Amazonas');

-- ---------------------------------------------------------------------------
-- Entregables estándar
-- ---------------------------------------------------------------------------
INSERT INTO "public"."entregables_estandar" ("id", "nombre") VALUES
	(1, 'AT 031 Acta'),
	(2, 'AT 028 asistencia'),
	(3, 'Informe'),
	(4, 'Planilla de prestación de servicio'),
	(5, 'Ninguna');

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
	(6, 'Enviado a Diana', 15);

-- ---------------------------------------------------------------------------
-- Participantes ARL y VoBo — NOMBRES INVENTADOS, no son los de producción.
-- Solo existen para que los selectores tengan opciones en local.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."participantes_arl" ("id", "nombre_completo", "cedula", "activo") VALUES
	(1, 'Ana Ejemplo Prueba', '10000001', true),
	(2, 'Carlos Muestra Demo', '10000002', true),
	(3, 'Lucía Ficticia Test', '10000003', true);

INSERT INTO "public"."vobo" ("id", "nombre_completo", "email", "celular", "activo") VALUES
	(1, 'Diana Ejemplo Local', 'diana.local@example.test', '3000000001', true),
	(2, 'Jorge Prueba Local', 'jorge.local@example.test', '3000000002', true);

-- ---------------------------------------------------------------------------
-- Reposicionar las secuencias.
--
-- Los INSERT de arriba fijan el `id` a mano, lo que no mueve el contador de la
-- secuencia: sin esto, el primer registro que se cree desde la app en local
-- pediría id=1 y chocaría con una fila ya sembrada.
-- ---------------------------------------------------------------------------
SELECT setval('public.ciudades_id_seq',             (SELECT MAX(id) FROM public.ciudades));
SELECT setval('public.entregables_estandar_id_seq', (SELECT MAX(id) FROM public.entregables_estandar));
SELECT setval('public.estados_ejecucion_id_seq',    (SELECT MAX(id) FROM public.estados_ejecucion));
SELECT setval('public.participantes_arl_id_seq',    (SELECT MAX(id) FROM public.participantes_arl));
SELECT setval('public.vobo_id_seq',                 (SELECT MAX(id) FROM public.vobo));
