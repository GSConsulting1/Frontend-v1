// Server Actions ("use server") para mutar profesionales — el único lugar
// que escribe en la tabla `profesionales`. Mismo patrón que
// app/usuarios/actions.ts: vuelve a validar con Zod (nunca confiar solo en
// el <form> del cliente).

"use server";

import { revalidatePath } from "next/cache";
import { profesionalSchema } from "@/lib/validations/profesional.schema";
import {
  crearProfesionalRecord,
  actualizarProfesionalRecord,
  actualizarActivoProfesionalRecord,
} from "@/lib/data/profesionales";

export type ProfesionalActionState =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

export type MutacionResult = { ok: true } | { ok: false; error: string };

export async function crearProfesional(input: unknown): Promise<ProfesionalActionState> {
  const parsed = profesionalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await crearProfesionalRecord(parsed.data);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error desconocido al crear el profesional",
    };
  }

  revalidatePath("/profesionales");
  return { ok: true };
}

export async function actualizarProfesional(
  id: number,
  input: unknown,
): Promise<ProfesionalActionState> {
  const parsed = profesionalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await actualizarProfesionalRecord(id, parsed.data);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error desconocido al actualizar el profesional",
    };
  }

  revalidatePath("/profesionales");
  return { ok: true };
}

export async function actualizarActivoProfesional(
  id: number,
  activo: boolean,
): Promise<MutacionResult> {
  try {
    await actualizarActivoProfesionalRecord(id, activo);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error desconocido al actualizar el estado",
    };
  }

  revalidatePath("/profesionales");
  return { ok: true };
}
