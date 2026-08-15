// Pestaña "Empresas usuarias" de la pantalla de clientes. Misma protección
// real en servidor que app/clientes/page.tsx (solo administrador): el gate va
// por página y no en un layout compartido porque no hay layout — ver
// components/clientes/clientes-tabs.tsx.

import { redirect } from "next/navigation";
import { EmpresasUsuariasListado } from "@/components/empresas-usuarias/empresas-usuarias-listado";
import { getEmpresasUsuarias } from "@/lib/data/empresas-usuarias";
import { getPerfilActual } from "@/lib/data/usuarios";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function EmpresasUsuariasPage() {
  if (isSupabaseConfigured) {
    const perfil = await getPerfilActual();
    if (!perfil || perfil.rol !== "administrador") redirect("/");
  }

  const empresas = await getEmpresasUsuarias();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <EmpresasUsuariasListado empresas={empresas} />
    </div>
  );
}
