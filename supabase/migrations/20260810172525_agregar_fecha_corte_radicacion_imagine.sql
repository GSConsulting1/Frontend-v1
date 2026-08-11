-- Agrega `fecha_corte` a radicacion_imagine: la fecha de corte con la que se
-- radica en Imagine, que el área financiera venía llevando por fuera del
-- sistema.
--
-- OJO, no confundir con `cuenta_cobro.fecha_corte`, que ya existía desde el
-- baseline: esa es la fecha de corte de la cuenta de cobro (sección "Cuenta de
-- cobro"). Son dos fechas distintas de dos procesos distintos y por eso viven
-- cada una en su tabla 1-a-1; el nombre repetido es a propósito, no un
-- duplicado que haya que unificar.
--
-- Columna nullable y sin default: las órdenes que ya tienen fila en
-- radicacion_imagine quedan con NULL, igual que el resto de campos opcionales
-- de la tabla. No hace falta tocar RLS — la política `fin_all` es a nivel de
-- tabla (administrador/financiero) y una columna nueva la hereda.

ALTER TABLE "public"."radicacion_imagine"
  ADD COLUMN IF NOT EXISTS "fecha_corte" "date";
