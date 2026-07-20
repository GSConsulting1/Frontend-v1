// Server Actions ("use server") para mutar órdenes de servicio — el único
// lugar que escribe en Supabase para esta entidad. No hace falta crear
// app/api/ordenes/route.ts: los componentes llaman a estas funciones
// directamente desde el cliente, sin pasar por una API REST propia
// (coherente con la decisión del plan de no escribir backend CRUD manual).
//
// Todas vuelven a validar con el schema de Zod (nunca confiar solo en la
// validación que ya corrió en el cliente).
//
// createOrden es la única que redirige — la usa /ordenes/nueva al guardar
// los datos generales por primera vez, llevando al usuario a
// /ordenes/{id}/editar donde ya se pueden llenar las secciones extendidas.
// guardarInformacionOrden es la que usa /ordenes/[id]/editar: guarda, en una
// sola llamada, tanto los datos generales como las 6 secciones extendidas de
// "Información orden del servicio" (un solo botón "Guardar" en el form) y no
// redirige. eliminarOrden es la única mutación que todavía se dispara desde
// la tabla de /ordenes.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ordenServicioSchema,
  campoOrdenInlineSchema,
  type CampoOrdenInlinePatch,
} from "@/lib/validations/orden.schema";
import { ordenInfoExtendidaSchema } from "@/lib/validations/info-orden.schema";
import {
  createOrdenRecord,
  updateOrdenRecord,
  deleteOrdenRecord,
  actualizarCampoOrdenRecord,
} from "@/lib/data/ordenes";
import {
  eliminarInfoOrdenCompleta,
  guardarInfoOrdenCompleta,
} from "@/lib/data/info-orden";

export type OrdenActionState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | void;

export async function createOrden(input: unknown): Promise<OrdenActionState> {
  const parsed = ordenServicioSchema.safeParse(input);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  let id: number;
  try {
    id = await createOrdenRecord(parsed.data);
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Error desconocido al crear la orden",
    };
  }

  revalidatePath("/ordenes");
  redirect(`/ordenes/${id}/editar`);
}

export type MutacionResult = { ok: true } | { ok: false; error: string };

export async function guardarInformacionOrden(
  ordenId: number,
  // null cuando el usuario no es administrador (ver OrdenForm.onSubmit):
  // OrdenCampos ya está deshabilitado en pantalla para esos roles, así que
  // ni se intenta el update — RLS lo rechazaría igual (ver
  // supabase/004_ordenes_servicio_rls.sql), pero tumbaría el guardado de
  // las demás secciones también.
  datosBase: unknown | null,
  datosExtendidos: unknown,
): Promise<MutacionResult> {
  const parsedBase =
    datosBase === null ? null : ordenServicioSchema.safeParse(datosBase);
  if (parsedBase && !parsedBase.success) {
    return {
      ok: false,
      error: "Revisa los datos generales de la orden — hay campos inválidos.",
    };
  }
  const parsedExtendidos = ordenInfoExtendidaSchema.safeParse(datosExtendidos);
  if (!parsedExtendidos.success) {
    return {
      ok: false,
      error:
        "Revisa las secciones de información extendida — hay campos inválidos.",
    };
  }

  try {
    if (parsedBase) await updateOrdenRecord(ordenId, parsedBase.data);
    await guardarInfoOrdenCompleta(ordenId, parsedExtendidos.data);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error desconocido al guardar la información de la orden",
    };
  }

  revalidatePath("/ordenes");
  revalidatePath(`/ordenes/${ordenId}/editar`);
  return { ok: true };
}

export async function actualizarCampoOrden(
  id: number,
  patch: CampoOrdenInlinePatch,
): Promise<MutacionResult> {
  const parsed = campoOrdenInlineSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: "Valor inválido." };
  }

  try {
    await actualizarCampoOrdenRecord(id, parsed.data);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error desconocido al actualizar la orden",
    };
  }

  revalidatePath("/ordenes");
  return { ok: true };
}

export async function eliminarOrden(id: number): Promise<MutacionResult> {
  try {
    // Primero las 5 tablas extendidas (sin ON DELETE CASCADE hacia
    // ordenes_servicio en el esquema actual), después la orden misma.
    await eliminarInfoOrdenCompleta(id);
    await deleteOrdenRecord(id);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error desconocido al eliminar la orden",
    };
  }

  revalidatePath("/ordenes");
  return { ok: true };
}
