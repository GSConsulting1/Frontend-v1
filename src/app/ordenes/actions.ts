// Server Actions ("use server") para mutar órdenes de servicio — el único
// lugar que escribe en Supabase para esta entidad. No hace falta crear
// app/api/ordenes/route.ts: OrdenForm llama a estas funciones directamente
// desde el cliente (vía handleSubmit de React Hook Form), sin pasar por una
// API REST propia (coherente con la decisión del plan de no escribir backend
// CRUD manual).
//
// Cada action:
//   1. vuelve a validar con ordenServicioSchema (Zod) — nunca confiar en la
//      validación que ya corrió en el cliente vía zodResolver.
//   2. llama a la capa de datos (lib/data/ordenes.ts), que decide mock vs
//      Supabase real según isSupabaseConfigured.
//   3. revalidatePath("/ordenes") para que el listado refleje el cambio.
//   4. redirect a /ordenes.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ordenServicioSchema } from "@/lib/validations/orden.schema";
import { createOrdenRecord, updateOrdenRecord } from "@/lib/data/ordenes";

export type OrdenActionState = { error: string } | { fieldErrors: Record<string, string[]> } | void;

export async function createOrden(input: unknown): Promise<OrdenActionState> {
  const parsed = ordenServicioSchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await createOrdenRecord(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error desconocido al crear la orden" };
  }

  revalidatePath("/ordenes");
  redirect("/ordenes");
}

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
