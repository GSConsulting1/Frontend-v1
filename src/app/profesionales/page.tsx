// Pantalla de administración de profesionales: solo administrador,
// financiero y talento entran — mismo criterio de protección real en
// servidor que app/usuarios/page.tsx (RoleGate/nav-config solo ocultan UI,
// acá es donde de verdad se bloquea con getPerfilActual() + redirect()
// antes de renderizar nada, ver structure.md).
//
// En modo mock (sin Supabase configurado) no hay sesión real que verificar,
// así que la página no bloquea nada mientras se desarrolla sin credenciales.
//
// Primera de las 3 pestañas de la pantalla (ver profesionales-tabs.tsx). Es la
// única que renderiza su PageHeader acá y no dentro del listado: no tiene
// selección de filas, así que su header no depende de ningún estado de cliente.

import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ProfesionalesListado } from "@/components/profesionales/profesionales-listado";
import { ProfesionalesTabs } from "@/components/profesionales/profesionales-tabs";
import { getProfesionales } from "@/lib/data/profesionales";
import { getPerfilActual } from "@/lib/data/usuarios";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { RolUsuario } from "@/types";

const ROLES_PERMITIDOS: RolUsuario[] = [
  "administrador",
  "financiero",
  "talento",
];

export default async function ProfesionalesPage() {
  if (isSupabaseConfigured) {
    const perfil = await getPerfilActual();
    if (!perfil || !ROLES_PERMITIDOS.includes(perfil.rol)) redirect("/");
  }

  const profesionales = await getProfesionales();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Profesionales"
        description="Equipo de profesionales que ejecuta las órdenes de servicio"
      />

      <ProfesionalesTabs />

      <ProfesionalesListado profesionales={profesionales} />
    </div>
  );
}
