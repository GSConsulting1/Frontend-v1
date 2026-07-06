// Server Actions ("use server") para mutar órdenes de servicio — el único
// lugar que escribe en Supabase para esta entidad. No hace falta crear
// app/api/ordenes/route.ts: los componentes llaman a estas funciones
// directamente desde el cliente, sin pasar por una API REST propia
// (coherente con la decisión del plan de no escribir backend CRUD manual).
//
// Todas vuelven a validar con el schema de Zod (nunca confiar solo en la
// validación que ya corrió en el cliente) y llaman a lib/data/ordenes.ts.
//
// updateOrden es la única que redirige (la usa el formulario de página
// completa en /ordenes/[id]/editar). guardarCambiosOrdenes, crearOrdenesNuevas
// y eliminarOrden son ediciones inline de la tabla en /ordenes: solo
// revalidatePath, el usuario nunca se mueve de la página.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ordenServicioSchema,
  ordenServicioPartialSchema,
  type OrdenServicioFormValues,
} from "@/lib/validations/orden.schema";
import {
  createOrdenRecord,
  updateOrdenRecord,
  updateOrdenCampos,
  deleteOrdenRecord,
} from "@/lib/data/ordenes";

export type OrdenActionState = { error: string } | { fieldErrors: Record<string, string[]> } | void;

export async function updateOrden(
  id: number,
  input: unknown,
): Promise<OrdenActionState> {
  const parsed = ordenServicioSchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await updateOrdenRecord(id, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error desconocido al actualizar la orden" };
  }

  revalidatePath("/ordenes");
  redirect("/ordenes");
}

export type MutacionResult = { ok: true } | { ok: false; error: string };

// Guarda los cambios inline de la tabla: a diferencia de create/updateOrden,
// no redirige — el usuario se queda en /ordenes viendo el listado editado.
export async function guardarCambiosOrdenes(
  cambios: { id: number; campos: Partial<OrdenServicioFormValues> }[],
): Promise<MutacionResult> {
  if (cambios.length === 0) return { ok: true };

  for (const { campos } of cambios) {
    if (!ordenServicioPartialSchema.safeParse(campos).success) {
      return {
        ok: false,
        error: "Alguno de los cambios no es válido. Revisa los campos marcados en rojo.",
      };
    }
  }

  try {
    await Promise.all(cambios.map(({ id, campos }) => updateOrdenCampos(id, campos)));
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido al guardar los cambios",
    };
  }

  revalidatePath("/ordenes");
  return { ok: true };
}

// Crea las filas nuevas agregadas inline en la tabla ("Nueva orden"). Igual
// que guardarCambiosOrdenes, no redirige: el usuario ya está en /ordenes.
export async function crearOrdenesNuevas(
  nuevas: OrdenServicioFormValues[],
): Promise<MutacionResult> {
  if (nuevas.length === 0) return { ok: true };

  for (const input of nuevas) {
    if (!ordenServicioSchema.safeParse(input).success) {
      return {
        ok: false,
        error: "Alguna de las órdenes nuevas no es válida. Revisa los campos marcados en rojo.",
      };
    }
  }

  try {
    await Promise.all(nuevas.map((input) => createOrdenRecord(input)));
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido al crear las órdenes nuevas",
    };
  }

  revalidatePath("/ordenes");
  return { ok: true };
}

export async function eliminarOrden(id: number): Promise<MutacionResult> {
  try {
    await deleteOrdenRecord(id);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido al eliminar la orden",
    };
  }

  revalidatePath("/ordenes");
  return { ok: true };
}
