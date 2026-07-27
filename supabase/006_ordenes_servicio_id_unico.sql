-- Genera automáticamente ordenes_servicio.id_unico al crear una orden, con
-- formato OS-AAAAMMDD-NNNN donde NNNN es el consecutivo de órdenes creadas
-- ese mismo día calendario en hora de Bogotá (reinicia en 0001 cada día).
--
-- Ojo con la zona horaria: fecha_creacion se guarda como "timestamp without
-- time zone" con DEFAULT now(), y el server de Postgres/Supabase trabaja en
-- UTC por defecto — por eso hay que convertir explícitamente a
-- America/Bogota (UTC-5, sin horario de verano) antes de sacar la fecha; si
-- no, entre las 7pm y la medianoche hora Colombia el día en UTC ya es el
-- siguiente.

CREATE OR REPLACE FUNCTION public.generar_id_unico_orden()
RETURNS trigger AS $$
DECLARE
  dia_actual date := (now() AT TIME ZONE 'America/Bogota')::date;
  consecutivo integer;
BEGIN
  -- Serializa por día (clave = hash del texto de la fecha) para que dos
  -- inserts simultáneos no calculen el mismo consecutivo. El lock se libera
  -- solo al terminar la transacción del insert.
  PERFORM pg_advisory_xact_lock(hashtext(dia_actual::text));

  SELECT count(*) + 1 INTO consecutivo
  FROM public.ordenes_servicio
  WHERE (fecha_creacion AT TIME ZONE 'utc' AT TIME ZONE 'America/Bogota')::date = dia_actual;

  NEW.id_unico := 'OS-' || to_char(dia_actual, 'YYYYMMDD') || '-' || lpad(consecutivo::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_id_unico_orden ON public.ordenes_servicio;
CREATE TRIGGER trg_generar_id_unico_orden
BEFORE INSERT ON public.ordenes_servicio
FOR EACH ROW
WHEN (NEW.id_unico IS NULL)
EXECUTE FUNCTION public.generar_id_unico_orden();

-- Repara filas que ya hubieran quedado numeradas con el día en UTC (versión
-- anterior de este archivo): las deja en NULL para que el backfill de abajo
-- las vuelva a calcular con el día correcto en hora de Bogotá.
UPDATE public.ordenes_servicio
SET id_unico = NULL
WHERE id_unico IS NOT NULL
  AND id_unico LIKE 'OS-________-____'
  AND substring(id_unico from 4 for 8) <> to_char(
    (fecha_creacion AT TIME ZONE 'utc' AT TIME ZONE 'America/Bogota')::date,
    'YYYYMMDD'
  );

-- Backfill: las órdenes sin id_unico (nuevas o recién reparadas arriba)
-- quedan numeradas con el mismo criterio, respetando el orden real de
-- creación dentro de cada día en hora de Bogotá.
WITH numerado AS (
  SELECT
    id,
    (fecha_creacion AT TIME ZONE 'utc' AT TIME ZONE 'America/Bogota')::date AS dia,
    row_number() OVER (
      PARTITION BY (fecha_creacion AT TIME ZONE 'utc' AT TIME ZONE 'America/Bogota')::date
      ORDER BY fecha_creacion, id
    ) AS consecutivo
  FROM public.ordenes_servicio
  WHERE id_unico IS NULL
)
UPDATE public.ordenes_servicio o
SET id_unico = 'OS-' || to_char(n.dia, 'YYYYMMDD') || '-' || lpad(n.consecutivo::text, 4, '0')
FROM numerado n
WHERE o.id = n.id;
