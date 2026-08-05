-- El frontend ya permite al rol "talento" ver/editar "Valor hora profesional"
-- (ver structure.md, sección de OrdenInfoSecciones / SeccionValorHora), pero
-- las policies de RLS de valor_hora_orden se quedaron solo en
-- administrador/financiero. Resultado: un usuario "talento" guarda el valor
-- hora desde el formulario, RLS rechaza el upsert, la fila nunca se crea, y
-- el PDF de la orden de servicio sale con "Costo de la hora" y "Costo total
-- del servicio" vacíos aunque el resto del pipeline (schema, form, query del
-- PDF) esté correcto.

ALTER POLICY "admin_fin_valor_hora" ON "public"."valor_hora_orden"
  USING ((EXISTS ( SELECT 1
     FROM "public"."usuarios"
    WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying, 'talento'::character varying])::"text"[]))))))
  WITH CHECK ((EXISTS ( SELECT 1
     FROM "public"."usuarios"
    WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying, 'talento'::character varying])::"text"[]))))));

ALTER POLICY "admin_y_financiero_valor_hora" ON "public"."valor_hora_orden"
  USING ((EXISTS ( SELECT 1
     FROM "public"."usuarios"
    WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying, 'talento'::character varying])::"text"[]))))))
  WITH CHECK ((EXISTS ( SELECT 1
     FROM "public"."usuarios"
    WHERE (("usuarios"."id" = "auth"."uid"()) AND (("usuarios"."rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'financiero'::character varying, 'talento'::character varying])::"text"[]))))));
