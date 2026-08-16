// Pestaña "Responsables SEC" de la pantalla de profesionales: CRUD de la tabla
// `responsables_sec`, quién responde por una orden dentro de GS Group. Es el
// catálogo que alimenta el <Select> "Responsable SEC para GS" del formulario de
// órdenes (components/ordenes/orden-campos.tsx) y las opciones de ese filtro en
// el listado.
//
// Hasta la migración 20260816001045_catalogo_responsables_sec.sql esa lista
// vivía en un CHECK del esquema y sumar a alguien pedía una migración: esta
// pantalla existe justamente para que deje de pedirla.
//
// Mismos roles que app/profesionales/vobo/page.tsx: el gate va repetido por
// página y no en un layout compartido porque no hay layout — las pestañas se
// montan dentro de cada listado, debajo de su PageHeader (ver
// components/profesionales/profesionales-tabs.tsx). Si acá se olvidara el
// redirect, esta ruta quedaría abierta aunque /profesionales no lo esté.
//
// En modo mock (sin Supabase configurado) no hay sesión real que verificar, así
// que la página no bloquea nada mientras se desarrolla sin credenciales.
//
// No renderiza PageHeader: lo hace ResponsablesSecListado, porque los botones
// del header cambian según el estado de selección de filas.

import { redirect } from "next/navigation";
import { ResponsablesSecListado } from "@/components/responsables-sec/responsables-sec-listado";
import { getResponsablesSec } from "@/lib/data/responsables-sec";
import { getPerfilActual } from "@/lib/data/usuarios";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { RolUsuario } from "@/types";

const ROLES_PERMITIDOS: RolUsuario[] = [
  "administrador",
  "financiero",
  "talento",
];

export default async function ResponsablesSecPage() {
  if (isSupabaseConfigured) {
    const perfil = await getPerfilActual();
    if (!perfil || !ROLES_PERMITIDOS.includes(perfil.rol)) redirect("/");
  }

  const personas = await getResponsablesSec();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <ResponsablesSecListado personas={personas} />
    </div>
  );
}
