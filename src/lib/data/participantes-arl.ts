// Capa de acceso a datos para "participantes ARL" — administración completa
// (listado + alta + edición + activo/inactivo + borrado) de la tabla
// `participantes_arl`, el equipo de la ARL que firma el detalle de entrega y el
// acta de servicio. Distinta del catálogo que arma getCatalogos() en
// lib/data/info-orden.ts (esa trae solo id/nombre_completo de los ACTIVOS para
// los <Select> del formulario de órdenes). Reusa el mismo mock
// (mockParticipantesArl de lib/mock-data/info-orden.ts) para no duplicar datos
// de prueba.
//
// Igual que clientes, acá SÍ hay borrado real: ninguna de las dos FKs que
// apuntan a esta tabla (detalle_entrega_profesional.participante_arl_id y
// acta_servicio.profesional_acta_id) tiene ON DELETE CASCADE, así que Postgres
// rechaza con 23503 el DELETE de alguien ya usado en una orden — el historial
// lo protege la base, no la UI. Lo único que hace este archivo es traducir ese
// código a un mensaje que se entienda en pantalla.
//
// Usa createSupabaseServerClient() aunque `participantes_arl` NO tenga RLS
// habilitado (solo GRANTs, ver el baseline): mismo criterio que el resto de
// lib/data/ — no mezclar dos clientes de Supabase distintos, y no tener que
// tocar este archivo el día que la tabla gane policies.

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mockParticipantesArl } from "@/lib/mock-data/info-orden";
import type { ParticipanteArl } from "@/types";
import type { ParticipanteArlFormValues } from "@/lib/validations/participante-arl.schema";

// Código de "foreign_key_violation" de Postgres — el que devuelve el DELETE de
// un participante referenciado por una orden.
const FK_VIOLATION = "23503";

function normalizarInput(input: ParticipanteArlFormValues) {
  return {
    nombre_completo: input.nombre_completo,
    cedula: input.cedula || null,
  };
}

export async function getParticipantesArl(): Promise<ParticipanteArl[]> {
  if (!isSupabaseConfigured) {
    return [...mockParticipantesArl].sort((a, b) =>
      a.nombre_completo.localeCompare(b.nombre_completo),
    );
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("participantes_arl")
    .select("*")
    .order("nombre_completo");

  if (error)
    throw new Error(
      `No se pudieron cargar los participantes ARL: ${error.message}`,
    );
  return (data ?? []) as unknown as ParticipanteArl[];
}

export async function crearParticipanteArlRecord(
  input: ParticipanteArlFormValues,
): Promise<ParticipanteArl> {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const nextId = Math.max(0, ...mockParticipantesArl.map((p) => p.id)) + 1;
    const nuevo: ParticipanteArl = {
      id: nextId,
      ...normalizado,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    };
    mockParticipantesArl.push(nuevo);
    return nuevo;
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("participantes_arl")
    .insert(normalizado)
    .select("*")
    .single();

  if (error)
    throw new Error(`No se pudo crear el participante ARL: ${error.message}`);
  return data as unknown as ParticipanteArl;
}

export async function actualizarParticipanteArlRecord(
  id: number,
  input: ParticipanteArlFormValues,
): Promise<void> {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const index = mockParticipantesArl.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Participante ARL no encontrado");
    mockParticipantesArl[index] = {
      ...mockParticipantesArl[index],
      ...normalizado,
    };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("participantes_arl")
    .update(normalizado)
    .eq("id", id);

  if (error)
    throw new Error(
      `No se pudo actualizar el participante ARL: ${error.message}`,
    );
}

export async function actualizarActivoParticipanteArlRecord(
  id: number,
  activo: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = mockParticipantesArl.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Participante ARL no encontrado");
    mockParticipantesArl[index] = { ...mockParticipantesArl[index], activo };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("participantes_arl")
    .update({ activo })
    .eq("id", id);

  if (error)
    throw new Error(`No se pudo actualizar el estado: ${error.message}`);
}

export async function deleteParticipanteArlRecord(id: number): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = mockParticipantesArl.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Participante ARL no encontrado");
    mockParticipantesArl.splice(index, 1);
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("participantes_arl")
    .delete()
    .eq("id", id);

  if (error) {
    // El caso frecuente: el participante ya está firmando una orden. El
    // mensaje crudo de Postgres nombra la constraint, que no le dice nada a
    // quien está en la pantalla — ver el encabezado de este archivo.
    if (error.code === FK_VIOLATION) {
      throw new Error(
        "No se puede eliminar: el participante ARL ya está asociado a órdenes de servicio. Marcalo como inactivo en su lugar.",
      );
    }
    throw new Error(
      `No se pudo eliminar el participante ARL: ${error.message}`,
    );
  }
}
