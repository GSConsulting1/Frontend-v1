// Server Action ("use server") para mutar el rol de un usuario — el único
// lugar que escribe en la tabla `usuarios` para esta entidad. No hace falta
// app/api/usuarios/route.ts: la tabla lo dispara directo desde el cliente
// (mismo patrón que app/ordenes/actions.ts).
//
// Vuelve a validar con Zod (nunca confiar solo en los valores del <Select>).
// Las dos reglas de abajo (no auto-cambio, no dejar el sistema sin
// administradores) también se reflejan en UsuariosTable para feedback
// inmediato, pero acá es donde de verdad importan: UsuariosTable solo
// deshabilita el <Select>, cualquiera con acceso a la Server Action
// directamente (devtools, curl) tiene que chocar con este mismo chequeo.

"use server";

import { revalidatePath } from "next/cache";
import { rolUsuarioSchema } from "@/lib/validations/usuario.schema";
import {
  contarAdministradores,
  getPerfilActual,
  updateUsuarioRol,
} from "@/lib/data/usuarios";

export type MutacionResult = { ok: true } | { ok: false; error: string };

export async function actualizarRolUsuario(
  id: string,
  rol: unknown,
): Promise<MutacionResult> {
  const parsed = rolUsuarioSchema.safeParse(rol);
  if (!parsed.success) {
    return { ok: false, error: "Rol inválido." };
  }

  const perfilActual = await getPerfilActual();
  if (perfilActual && perfilActual.id === id) {
    return { ok: false, error: "No puedes cambiar tu propio rol." };
  }

  if (parsed.data !== "administrador") {
    const otrosAdministradores = await contarAdministradores(id);
    if (otrosAdministradores === 0) {
      return {
        ok: false,
        error: "Debe quedar al menos un administrador: no puedes quitarle ese rol al último.",
      };
    }
  }

  try {
    await updateUsuarioRol(id, parsed.data);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido al actualizar el rol",
    };
  }

  revalidatePath("/usuarios");
  return { ok: true };
}
