// Capa de acceso a datos para "usuarios" — el único lugar del código que
// sabe cómo leer la tabla o cambiar el rol de alguien. `usuarios` tiene RLS
// (ver supabase/002_usuarios_roles_rls.sql), así que toda query real usa
// createSupabaseServerClient() (no el singleton anon de lib/supabase/client.ts).
//
// getPerfilActual() es lo que usa app/usuarios/page.tsx para el chequeo de
// "solo administrador entra" — en modo mock (sin Supabase configurado)
// devuelve null porque no hay sesión real que verificar, así que la página
// no bloquea nada mientras se desarrolla sin credenciales.

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mockUsuarios } from "@/lib/mock-data/usuarios";
import type { RolUsuario, Usuario } from "@/types";

export async function getUsuarios(): Promise<Usuario[]> {
  if (!isSupabaseConfigured) {
    return [...mockUsuarios].sort((a, b) =>
      a.nombre_completo.localeCompare(b.nombre_completo),
    );
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("nombre_completo");

  if (error) throw new Error(`No se pudieron cargar los usuarios: ${error.message}`);
  return (data ?? []) as unknown as Usuario[];
}

// Cuenta administradores activos, excluyendo opcionalmente uno (el usuario
// que se está por cambiar) — usado por actualizarRolUsuario() en
// app/usuarios/actions.ts para no dejar el sistema sin ningún administrador.
export async function contarAdministradores(excludeId?: string): Promise<number> {
  if (!isSupabaseConfigured) {
    return mockUsuarios.filter(
      (u) => u.rol === "administrador" && u.id !== excludeId,
    ).length;
  }
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .eq("rol", "administrador");
  if (excludeId) query = query.neq("id", excludeId);

  const { count, error } = await query;
  if (error) throw new Error(`No se pudo verificar administradores: ${error.message}`);
  return count ?? 0;
}

export async function updateUsuarioRol(id: string, rol: RolUsuario): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = mockUsuarios.findIndex((u) => u.id === id);
    if (index === -1) throw new Error("Usuario no encontrado");
    mockUsuarios[index] = { ...mockUsuarios[index], rol };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("usuarios").update({ rol }).eq("id", id);
  if (error) throw new Error(`No se pudo actualizar el rol: ${error.message}`);
}

// Perfil (tabla `usuarios`) de la sesión actual, leído en servidor — a
// diferencia de useAuth().perfil (Client Component), esto es lo que hay que
// usar para proteger de verdad una page.tsx, porque RoleGate solo oculta UI.
export async function getPerfilActual(): Promise<Usuario | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Usuario | null) ?? null;
}
