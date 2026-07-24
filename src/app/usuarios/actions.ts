// Server Action ("use server") para mutar el rol de un usuario — el único
// lugar que escribe en la tabla `usuarios` para esta entidad. No hace falta
// app/api/usuarios/route.ts: la tabla lo dispara directo desde el cliente
// (mismo patrón que app/ordenes/actions.ts).
//
// Vuelve a validar con Zod (nunca confiar solo en los valores del <Select>).

"use server";

import { revalidatePath } from "next/cache";
import { rolUsuarioSchema } from "@/lib/validations/usuario.schema";
import { updateUsuarioRol } from "@/lib/data/usuarios";

export type MutacionResult = { ok: true } | { ok: false; error: string };

export async function actualizarRolUsuario(
  id: string,
  rol: unknown,
): Promise<MutacionResult> {
  const parsed = rolUsuarioSchema.safeParse(rol);
  if (!parsed.success) {
    return { ok: false, error: "Rol inválido." };
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
