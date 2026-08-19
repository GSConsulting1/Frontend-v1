-- Dos estados nuevos para "Estado Gerencia": 'Programada' y 'En ejecución'.
--
-- QUÉ COLUMNA ES ESTA
-- `ordenes_servicio.estado` es la que el listado muestra como "Estado
-- Gerencia" y la que se edita inline desde la tabla. NO confundir con
-- `estados_ejecucion`, la tabla catálogo que alimenta la columna de al lado,
-- "Estado de ejecución" (vía `checklist_proceso.estado_ejecucion_id`).
--
-- ⚠️ Los dos valores que agrega esta migración YA EXISTEN, con el mismo texto,
-- en `estados_ejecucion` (ids 1 y 2). Es deliberado y está confirmado
-- (2026-08-18): son dos campos distintos que el equipo lleva en paralelo, y ya
-- había precedente — 'Cancelada' está en las dos listas desde el baseline. Si
-- en algún momento se vuelve confuso en pantalla, lo que hay que cambiar son
-- las ETIQUETAS de las columnas, no fusionar los dos campos: responden a
-- preguntas distintas.
--
-- ORDEN DE LAS SENTENCIAS
-- Acá alcanza con DROP + ADD, sin UPDATE en el medio: esta migración solo
-- AGRANDA la lista de valores permitidos, no reescribe ninguna fila. Es el
-- caso fácil de 20260815130000_alinear_estados_imagine_y_facturacion.sql —
-- que sí tenía que corregir filas y por eso necesitaba tirar el CHECK primero
-- (ver el comentario largo de esa migración). Toda fila que hoy pasa el CHECK
-- viejo pasa también el nuevo, así que el ADD no puede fallar por datos
-- preexistentes.
--
-- Quedarse sin CHECK entre el DROP y el ADD no abre ninguna ventana: la
-- migración corre dentro de una transacción y el ADD valida la tabla entera
-- antes de confirmar.
--
-- La lista tiene que quedar igual —mismos valores, aunque el orden no le
-- importe a Postgres— que la constante ESTADOS_ORDEN de
-- src/lib/validations/orden.schema.ts, que es la fuente de verdad del front.
-- Si las dos se desincronizan, el <Select> ofrece un estado que la base
-- rechaza al guardar con 23514 (check_violation).

ALTER TABLE "public"."ordenes_servicio"
  DROP CONSTRAINT IF EXISTS "chk_estado";

ALTER TABLE "public"."ordenes_servicio"
  ADD CONSTRAINT "chk_estado" CHECK ((("estado")::"text" = ANY ((ARRAY[
    'Pendiente revisión Bolívar'::character varying,
    'Enviado a facturación'::character varying,
    'Cancelada'::character varying,
    'Programar urgente'::character varying,
    'Facturar urgente'::character varying,
    'Pendiente cobro hora fallida'::character varying,
    'Pendiente por cancelar'::character varying,
    'Programar mes siguiente'::character varying,
    'Facturada'::character varying,
    -- Los dos nuevos.
    'Programada'::character varying,
    'En ejecución'::character varying
  ])::"text"[])));
