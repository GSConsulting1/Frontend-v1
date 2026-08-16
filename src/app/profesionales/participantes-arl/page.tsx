// Pestaña "Participantes ARL" de la pantalla de profesionales: CRUD de la tabla
// `participantes_arl`, el equipo de la ARL que firma el detalle de entrega y el
// acta de servicio.
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
// No renderiza PageHeader: lo hace ParticipantesArlListado, porque los botones
// del header cambian según el estado de selección de filas (mismo motivo que
// app/clientes/page.tsx).

import { redirect } from "next/navigation";
import { ParticipantesArlListado } from "@/components/participantes-arl/participantes-arl-listado";
import { getParticipantesArl } from "@/lib/data/participantes-arl";
import { getPerfilActual } from "@/lib/data/usuarios";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { RolUsuario } from "@/types";

const ROLES_PERMITIDOS: RolUsuario[] = [
  "administrador",
  "financiero",
  "talento",
];

export default async function ParticipantesArlPage() {
  if (isSupabaseConfigured) {
    const perfil = await getPerfilActual();
    if (!perfil || !ROLES_PERMITIDOS.includes(perfil.rol)) redirect("/");
  }

  const participantes = await getParticipantesArl();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <ParticipantesArlListado participantes={participantes} />
    </div>
  );
}
