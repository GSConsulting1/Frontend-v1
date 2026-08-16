// Pestaña "VoBo" de la pantalla de profesionales: CRUD de la tabla `vobo`, el
// personal interno de GS Group que aparece en el <Select> "Quién da el VoBo"
// del detalle de entrega (components/ordenes/secciones/detalle-entrega.tsx).
//
// Mismos roles que app/profesionales/page.tsx: el gate va repetido por página y
// no en un layout compartido porque no hay layout — las pestañas se montan
// dentro de cada listado, debajo de su PageHeader (ver
// components/profesionales/profesionales-tabs.tsx). Si acá se olvidara el
// redirect, esta ruta quedaría abierta aunque /profesionales no lo esté.
//
// En modo mock (sin Supabase configurado) no hay sesión real que verificar, así
// que la página no bloquea nada mientras se desarrolla sin credenciales.
//
// No renderiza PageHeader: lo hace VoboListado, porque los botones del header
// cambian según el estado de selección de filas (mismo motivo que
// app/clientes/page.tsx).

import { redirect } from "next/navigation";
import { VoboListado } from "@/components/vobo/vobo-listado";
import { getVobo } from "@/lib/data/vobo";
import { getPerfilActual } from "@/lib/data/usuarios";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { RolUsuario } from "@/types";

const ROLES_PERMITIDOS: RolUsuario[] = [
  "administrador",
  "financiero",
  "talento",
];

export default async function VoboPage() {
  if (isSupabaseConfigured) {
    const perfil = await getPerfilActual();
    if (!perfil || !ROLES_PERMITIDOS.includes(perfil.rol)) redirect("/");
  }

  const personas = await getVobo();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <VoboListado personas={personas} />
    </div>
  );
}
