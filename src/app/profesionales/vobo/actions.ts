// Server Actions ("use server") para mutar las personas de VoBo — el único
// lugar que escribe en la tabla `vobo`. Mismo patrón que app/clientes/actions.ts:
// vuelve a validar con Zod (nunca confiar solo en el <form> del cliente).
//
// Revalida además el subárbol de "/ordenes" (con "layout", no solo la página):
// el <Select> "Quién da el VoBo" del formulario de órdenes sale de
// getCatalogos() (lib/data/info-orden.ts, solo activos), y ese formulario vive
// en /ordenes/nueva y /ordenes/[id]/editar — un revalidatePath sin "layout"
// solo alcanzaría a /ordenes y esas dos seguirían con el catálogo viejo en
// caché.

"use server";

import { revalidatePath } from "next/cache";
import { voboSchema } from "@/lib/validations/vobo.schema";
import {
  crearVoboRecord,
  actualizarVoboRecord,
  actualizarActivoVoboRecord,
  deleteVoboRecord,
} from "@/lib/data/vobo";

export type VoboActionState =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

export type MutacionResult = { ok: true } | { ok: false; error: string };

function revalidar() {
  revalidatePath("/profesionales/vobo");
  revalidatePath("/ordenes", "layout");
}

function mensajeDeError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export async function crearVobo(input: unknown): Promise<VoboActionState> {
  const parsed = voboSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    await crearVoboRecord(parsed.data);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(
        err,
        "Error desconocido al crear la persona de VoBo",
      ),
    };
  }

  revalidar();
  return { ok: true };
}

export async function actualizarVobo(
  id: number,
  input: unknown,
): Promise<VoboActionState> {
  const parsed = voboSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    await actualizarVoboRecord(id, parsed.data);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(
        err,
        "Error desconocido al actualizar la persona de VoBo",
      ),
    };
  }

  revalidar();
  return { ok: true };
}

export async function actualizarActivoVobo(
  id: number,
  activo: boolean,
): Promise<MutacionResult> {
  try {
    await actualizarActivoVoboRecord(id, activo);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(err, "Error desconocido al actualizar el estado"),
    };
  }

  revalidar();
  return { ok: true };
}

export async function eliminarVobo(id: number): Promise<MutacionResult> {
  try {
    await deleteVoboRecord(id);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(
        err,
        "Error desconocido al eliminar la persona de VoBo",
      ),
    };
  }

  revalidar();
  return { ok: true };
}

// Borrado en lote — mismo contrato y espíritu resiliente que eliminarClientes
// (app/clientes/actions.ts): no aborta el lote si una fila falla y hace un solo
// revalidate al final. Acá fallar es lo esperable cuando la persona ya dio el
// VoBo en alguna orden (FK 23503, ver lib/data/vobo.ts), así que el detalle de
// las fallidas se devuelve para poder mostrarlo.
export async function eliminarVobos(
  ids: number[],
): Promise<{ eliminados: number; fallidos: { id: number; error: string }[] }> {
  let eliminados = 0;
  const fallidos: { id: number; error: string }[] = [];

  for (const id of ids) {
    try {
      await deleteVoboRecord(id);
      eliminados++;
    } catch (err) {
      fallidos.push({
        id,
        error: mensajeDeError(
          err,
          "Error desconocido al eliminar la persona de VoBo",
        ),
      });
    }
  }

  revalidar();
  return { eliminados, fallidos };
}
