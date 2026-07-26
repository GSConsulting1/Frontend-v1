// Pantalla de administración de usuarios: única sección pensada para que
// solo un administrador pueda entrar. RoleGate (components/auth/) es UX, no
// seguridad, así que acá el chequeo se hace en servidor con
// getPerfilActual() y se redirige antes de renderizar nada — ver
// structure.md ("Las rutas de /ordenes/* siguen sin protección... para
// activarla: agregar el chequeo de sesión en cada page.tsx").
//
// En modo mock (sin Supabase configurado) no hay sesión real que verificar,
// así que la página no bloquea nada mientras se desarrolla sin credenciales.

import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { UsuariosTable } from "@/components/usuarios/usuarios-table";
import { getPerfilActual, getUsuarios } from "@/lib/data/usuarios";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function UsuariosPage() {
  let currentUserId: string | undefined;

  if (isSupabaseConfigured) {
    const perfil = await getPerfilActual();
    if (!perfil || perfil.rol !== "administrador") redirect("/");
    currentUserId = perfil.id;
  }

  const usuarios = await getUsuarios();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Usuarios"
        description="Asigna el rol de cada usuario del sistema"
      />

      <UsuariosTable usuarios={usuarios} currentUserId={currentUserId} />
    </div>
  );
}
