-- Genera automáticamente ordenes_servicio.id_unico al crear una orden, con
-- formato OS-AAAAMMDD-NNNN donde NNNN es el consecutivo de órdenes creadas
-- ese mismo día calendario (reinicia en 0001 cada día). Antes id_unico se
-- dejaba en NULL porque nada lo asignaba (createOrdenRecord en
-- src/lib/data/ordenes.ts nunca lo incluye en el insert) — de ahí que
-- siempre saliera vacío en el PDF (ver OrdenServicioDocument.tsx).
--
-- Solo usa columnas que ya existen en ordenes_servicio (id, fecha_creacion,
-- id_unico); no requiere tabla ni columna nueva.

CREATE OR REPLACE FUNCTION public.generar_id_unico_orden()
RETURNS trigger AS $$
DECLARE
  dia_actual date := (now() AT TIME ZONE 'utc')::date;
  consecutivo integer;
BEGIN
  -- Serializa por día (clave = hash del texto de la fecha) para que dos
  -- inserts simultáneos no calculen el mismo consecutivo. El lock se libera
  -- solo al terminar la transacción del insert.
  PERFORM pg_advisory_xact_lock(hashtext(dia_actual::text));

  SELECT count(*) + 1 INTO consecutivo
  FROM public.ordenes_servicio
  WHERE (fecha_creacion AT TIME ZONE 'utc')::date = dia_actual;

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

-- Backfill: las órdenes que ya existen y tienen id_unico vacío quedan
-- numeradas con el mismo criterio, respetando el orden real de creación
-- dentro de cada día. No toca filas que ya tengan un id_unico asignado.
WITH numerado AS (
  SELECT
    id,
    (fecha_creacion AT TIME ZONE 'utc')::date AS dia,
    row_number() OVER (
      PARTITION BY (fecha_creacion AT TIME ZONE 'utc')::date
      ORDER BY fecha_creacion, id
    ) AS consecutivo
  FROM public.ordenes_servicio
  WHERE id_unico IS NULL
)
UPDATE public.ordenes_servicio o
SET id_unico = 'OS-' || to_char(n.dia, 'YYYYMMDD') || '-' || lpad(n.consecutivo::text, 4, '0')
FROM numerado n
WHERE o.id = n.id;
