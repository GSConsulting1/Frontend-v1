// Server Actions ("use server") para mutar participantes ARL — el único lugar
// que escribe en la tabla `participantes_arl`. Mismo patrón que
// app/clientes/actions.ts: vuelve a validar con Zod (nunca confiar solo en el
// <form> del cliente).
//
// Revalida además el subárbol de "/ordenes" (con "layout", no solo la página):
// los <Select> "Participante ARL" y "Quién firma el acta" del formulario de
// órdenes salen de getCatalogos() (lib/data/info-orden.ts, solo activos), y ese
// formulario vive en /ordenes/nueva y /ordenes/[id]/editar — un revalidatePath
// sin "layout" solo alcanzaría a /ordenes y esas dos seguirían con el catálogo
// viejo en caché.

"use server";

import { revalidatePath } from "next/cache";
import { participanteArlSchema } from "@/lib/validations/participante-arl.schema";
import {
  crearParticipanteArlRecord,
  actualizarParticipanteArlRecord,
  actualizarActivoParticipanteArlRecord,
  deleteParticipanteArlRecord,
} from "@/lib/data/participantes-arl";

export type ParticipanteArlActionState =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

export type MutacionResult = { ok: true } | { ok: false; error: string };

function revalidar() {
  revalidatePath("/profesionales/participantes-arl");
  revalidatePath("/ordenes", "layout");
}

function mensajeDeError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export async function crearParticipanteArl(
  input: unknown,
): Promise<ParticipanteArlActionState> {
  const parsed = participanteArlSchema.safeParse(input);
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
    await crearParticipanteArlRecord(parsed.data);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(
        err,
        "Error desconocido al crear el participante ARL",
      ),
    };
  }

  revalidar();
  return { ok: true };
}

export async function actualizarParticipanteArl(
  id: number,
  input: unknown,
): Promise<ParticipanteArlActionState> {
  const parsed = participanteArlSchema.safeParse(input);
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
    await actualizarParticipanteArlRecord(id, parsed.data);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(
        err,
        "Error desconocido al actualizar el participante ARL",
      ),
    };
  }

  revalidar();
  return { ok: true };
}

export async function actualizarActivoParticipanteArl(
  id: number,
  activo: boolean,
): Promise<MutacionResult> {
  try {
    await actualizarActivoParticipanteArlRecord(id, activo);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(err, "Error desconocido al actualizar el estado"),
    };
  }

  revalidar();
  return { ok: true };
}

export async function eliminarParticipanteArl(
  id: number,
): Promise<MutacionResult> {
  try {
    await deleteParticipanteArlRecord(id);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(
        err,
        "Error desconocido al eliminar el participante ARL",
      ),
    };
  }

  revalidar();
  return { ok: true };
}

// Borrado en lote — mismo contrato y espíritu resiliente que eliminarClientes
// (app/clientes/actions.ts): no aborta el lote si una fila falla y hace un solo
// revalidate al final. Acá fallar es lo esperable cuando el participante ya
// firmó una orden (FK 23503, ver lib/data/participantes-arl.ts), así que el
// detalle de las fallidas se devuelve para poder mostrarlo.
export async function eliminarParticipantesArl(
  ids: number[],
): Promise<{ eliminados: number; fallidos: { id: number; error: string }[] }> {
  let eliminados = 0;
  const fallidos: { id: number; error: string }[] = [];

  for (const id of ids) {
    try {
      await deleteParticipanteArlRecord(id);
      eliminados++;
    } catch (err) {
      fallidos.push({
        id,
        error: mensajeDeError(
          err,
          "Error desconocido al eliminar el participante ARL",
        ),
      });
    }
  }

  revalidar();
  return { eliminados, fallidos };
}
