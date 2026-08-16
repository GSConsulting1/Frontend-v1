// Server Actions ("use server") para mutar el catálogo de responsables SEC — el
// único lugar que escribe en la tabla `responsables_sec`. Mismo patrón que
// app/profesionales/vobo/actions.ts: vuelve a validar con Zod (nunca confiar
// solo en el <form> del cliente).
//
// Revalida además el subárbol de "/ordenes" (con "layout", no solo la página):
// el <Select> "Responsable SEC para GS" del formulario de órdenes sale de
// getResponsablesSecParaSelect(), y ese formulario vive en /ordenes/nueva y
// /ordenes/[id]/editar — un revalidatePath sin "layout" solo alcanzaría a
// /ordenes y esas dos seguirían con el catálogo viejo en caché. El listado de
// /ordenes también lo necesita: renombrar a alguien reescribe el
// `responsable_os` de sus órdenes (ver lib/data/responsables-sec.ts) y esa
// columna se ve en la tabla y en el filtro.

"use server";

import { revalidatePath } from "next/cache";
import { responsableSecSchema } from "@/lib/validations/responsable-sec.schema";
import {
  crearResponsableSecRecord,
  actualizarResponsableSecRecord,
  actualizarActivoResponsableSecRecord,
  deleteResponsableSecRecord,
} from "@/lib/data/responsables-sec";

export type ResponsableSecActionState =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

export type MutacionResult = { ok: true } | { ok: false; error: string };

function revalidar() {
  revalidatePath("/profesionales/responsables-sec");
  revalidatePath("/ordenes", "layout");
}

function mensajeDeError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export async function crearResponsableSec(
  input: unknown,
): Promise<ResponsableSecActionState> {
  const parsed = responsableSecSchema.safeParse(input);
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
    await crearResponsableSecRecord(parsed.data);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(
        err,
        "Error desconocido al crear el responsable SEC",
      ),
    };
  }

  revalidar();
  return { ok: true };
}

export async function actualizarResponsableSec(
  id: number,
  input: unknown,
): Promise<ResponsableSecActionState> {
  const parsed = responsableSecSchema.safeParse(input);
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
    await actualizarResponsableSecRecord(id, parsed.data);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(
        err,
        "Error desconocido al actualizar el responsable SEC",
      ),
    };
  }

  revalidar();
  return { ok: true };
}

export async function actualizarActivoResponsableSec(
  id: number,
  activo: boolean,
): Promise<MutacionResult> {
  try {
    await actualizarActivoResponsableSecRecord(id, activo);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(err, "Error desconocido al actualizar el estado"),
    };
  }

  revalidar();
  return { ok: true };
}

export async function eliminarResponsableSec(
  id: number,
): Promise<MutacionResult> {
  try {
    await deleteResponsableSecRecord(id);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(
        err,
        "Error desconocido al eliminar el responsable SEC",
      ),
    };
  }

  revalidar();
  return { ok: true };
}

// Borrado en lote — mismo contrato y espíritu resiliente que eliminarVobos
// (app/profesionales/vobo/actions.ts): no aborta el lote si una fila falla y
// hace un solo revalidate al final. Acá fallar es lo esperable cuando la
// persona ya tiene órdenes a cargo (FK 23503, ver lib/data/responsables-sec.ts),
// así que el detalle de las fallidas se devuelve para poder mostrarlo.
export async function eliminarResponsablesSec(
  ids: number[],
): Promise<{ eliminados: number; fallidos: { id: number; error: string }[] }> {
  let eliminados = 0;
  const fallidos: { id: number; error: string }[] = [];

  for (const id of ids) {
    try {
      await deleteResponsableSecRecord(id);
      eliminados++;
    } catch (err) {
      fallidos.push({
        id,
        error: mensajeDeError(
          err,
          "Error desconocido al eliminar el responsable SEC",
        ),
      });
    }
  }

  revalidar();
  return { eliminados, fallidos };
}
