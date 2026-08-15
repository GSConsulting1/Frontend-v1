// Pantalla de administración de clientes: solo administrador entra — mismo
// criterio de protección real en servidor que app/usuarios/page.tsx y
// app/profesionales/page.tsx (RoleGate/nav-config solo ocultan UI, acá es
// donde de verdad se bloquea con getPerfilActual() + redirect() antes de
// renderizar nada, ver structure.md).
//
// En modo mock (sin Supabase configurado) no hay sesión real que verificar,
// así que la página no bloquea nada mientras se desarrolla sin credenciales.
//
// No renderiza PageHeader: lo hace ClientesListado, porque los botones del
// header cambian según el estado de selección de filas (mismo motivo que
// app/ordenes/page.tsx).

import { redirect } from "next/navigation";
import { ClientesListado } from "@/components/clientes/clientes-listado";
import { getClientes } from "@/lib/data/clientes";
import { getPerfilActual } from "@/lib/data/usuarios";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function ClientesPage() {
  if (isSupabaseConfigured) {
    const perfil = await getPerfilActual();
    if (!perfil || perfil.rol !== "administrador") redirect("/");
  }

  const clientes = await getClientes();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <ClientesListado clientes={clientes} />
    </div>
  );
}
