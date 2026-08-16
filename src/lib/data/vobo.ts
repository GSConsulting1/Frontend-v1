// Capa de acceso a datos para "VoBo" — administración completa (listado + alta
// + edición + activo/inactivo + borrado) de la tabla `vobo`, el personal
// interno de GS Group que da el visto bueno en "Detalle de entrega". Distinta
// del catálogo que arma getCatalogos() en lib/data/info-orden.ts (esa trae solo
// id/nombre_completo de los ACTIVOS para el <Select> "Quién da el VoBo"). Reusa
// el mismo mock (mockVobo de lib/mock-data/info-orden.ts) para no duplicar
// datos de prueba.
//
// Igual que clientes, acá SÍ hay borrado real: la FK
// detalle_entrega_profesional_profesional_vobo_id_fkey no tiene ON DELETE
// CASCADE, así que Postgres rechaza con 23503 el DELETE de alguien que ya dio
// el VoBo en una orden — el historial lo protege la base, no la UI. Lo único
// que hace este archivo es traducir ese código a un mensaje que se entienda en
// pantalla.
//
// Usa createSupabaseServerClient() aunque `vobo` NO tenga RLS habilitado (solo
// GRANTs, ver el baseline): mismo criterio que el resto de lib/data/ — no
// mezclar dos clientes de Supabase distintos, y no tener que tocar este archivo
// el día que la tabla gane policies.

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mockVobo } from "@/lib/mock-data/info-orden";
import type { Vobo } from "@/types";
import type { VoboFormValues } from "@/lib/validations/vobo.schema";

// Código de "foreign_key_violation" de Postgres — el que devuelve el DELETE de
// una persona referenciada por detalle_entrega_profesional.profesional_vobo_id.
const FK_VIOLATION = "23503";

function normalizarInput(input: VoboFormValues) {
  return {
    nombre_completo: input.nombre_completo,
    email: input.email || null,
    celular: input.celular || null,
  };
}

export async function getVobo(): Promise<Vobo[]> {
  if (!isSupabaseConfigured) {
    return [...mockVobo].sort((a, b) =>
      a.nombre_completo.localeCompare(b.nombre_completo),
    );
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vobo")
    .select("*")
    .order("nombre_completo");

  if (error)
    throw new Error(
      `No se pudieron cargar las personas de VoBo: ${error.message}`,
    );
  return (data ?? []) as unknown as Vobo[];
}

export async function crearVoboRecord(input: VoboFormValues): Promise<Vobo> {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const nextId = Math.max(0, ...mockVobo.map((v) => v.id)) + 1;
    const nuevo: Vobo = {
      id: nextId,
      ...normalizado,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    };
    mockVobo.push(nuevo);
    return nuevo;
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vobo")
    .insert(normalizado)
    .select("*")
    .single();

  if (error)
    throw new Error(`No se pudo crear la persona de VoBo: ${error.message}`);
  return data as unknown as Vobo;
}

export async function actualizarVoboRecord(
  id: number,
  input: VoboFormValues,
): Promise<void> {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const index = mockVobo.findIndex((v) => v.id === id);
    if (index === -1) throw new Error("Persona de VoBo no encontrada");
    mockVobo[index] = { ...mockVobo[index], ...normalizado };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("vobo")
    .update(normalizado)
    .eq("id", id);

  if (error)
    throw new Error(
      `No se pudo actualizar la persona de VoBo: ${error.message}`,
    );
}

export async function actualizarActivoVoboRecord(
  id: number,
  activo: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = mockVobo.findIndex((v) => v.id === id);
    if (index === -1) throw new Error("Persona de VoBo no encontrada");
    mockVobo[index] = { ...mockVobo[index], activo };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("vobo").update({ activo }).eq("id", id);

  if (error)
    throw new Error(`No se pudo actualizar el estado: ${error.message}`);
}

export async function deleteVoboRecord(id: number): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = mockVobo.findIndex((v) => v.id === id);
    if (index === -1) throw new Error("Persona de VoBo no encontrada");
    mockVobo.splice(index, 1);
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("vobo").delete().eq("id", id);

  if (error) {
    // El caso frecuente: la persona ya dio el VoBo en alguna orden. El mensaje
    // crudo de Postgres nombra la constraint, que no le dice nada a quien está
    // en la pantalla — ver el encabezado de este archivo.
    if (error.code === FK_VIOLATION) {
      throw new Error(
        "No se puede eliminar: la persona ya dio el VoBo en órdenes de servicio. Marcala como inactiva en su lugar.",
      );
    }
    throw new Error(`No se pudo eliminar la persona de VoBo: ${error.message}`);
  }
}
