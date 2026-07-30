// Capa de acceso a datos para "profesionales" — administración completa
// (listado + alta + edición + activo/inactivo), distinta de
// getProfesionalesParaSelect() en lib/data/ordenes.ts (esa es solo el
// catálogo id/nombre para el <Select> del formulario de órdenes, activos
// únicamente). Reusa el mismo mock (mockProfesionales de
// lib/mock-data/ordenes.ts) para no duplicar datos de prueba.
//
// A propósito sin eliminarProfesionalRecord: un profesional puede tener
// órdenes asociadas (info_orden_servicio, detalle_entrega_profesional) por
// FK, así que borrar rompería ese historial. "Marcar inactivo"
// (activo/actualizarActivoProfesionalRecord) es la única baja — reversible,
// sin ese riesgo.

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mockProfesionales } from "@/lib/mock-data/ordenes";
import type { Profesional } from "@/types";
import type { ProfesionalFormValues } from "@/lib/validations/profesional.schema";

export async function getProfesionales(): Promise<Profesional[]> {
  if (!isSupabaseConfigured) {
    return [...mockProfesionales].sort((a, b) =>
      a.nombre_completo.localeCompare(b.nombre_completo),
    );
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profesionales")
    .select("*")
    .order("nombre_completo");

  if (error)
    throw new Error(`No se pudieron cargar los profesionales: ${error.message}`);
  return (data ?? []) as unknown as Profesional[];
}

export async function crearProfesionalRecord(
  input: ProfesionalFormValues,
): Promise<Profesional> {
  const normalizado = {
    nombre_completo: input.nombre_completo,
    cedula: input.cedula || null,
    email: input.email || null,
    telefono: input.telefono || null,
    valor_hora: input.valor_hora ?? null,
  };

  if (!isSupabaseConfigured) {
    const nextId = Math.max(0, ...mockProfesionales.map((p) => p.id)) + 1;
    const nuevo: Profesional = {
      id: nextId,
      ...normalizado,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    };
    mockProfesionales.push(nuevo);
    return nuevo;
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profesionales")
    .insert(normalizado)
    .select("*")
    .single();

  if (error)
    throw new Error(`No se pudo crear el profesional: ${error.message}`);
  return data as unknown as Profesional;
}

export async function actualizarProfesionalRecord(
  id: number,
  input: ProfesionalFormValues,
): Promise<void> {
  const normalizado = {
    nombre_completo: input.nombre_completo,
    cedula: input.cedula || null,
    email: input.email || null,
    telefono: input.telefono || null,
    valor_hora: input.valor_hora ?? null,
  };

  if (!isSupabaseConfigured) {
    const index = mockProfesionales.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Profesional no encontrado");
    mockProfesionales[index] = { ...mockProfesionales[index], ...normalizado };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("profesionales")
    .update(normalizado)
    .eq("id", id);

  if (error)
    throw new Error(`No se pudo actualizar el profesional: ${error.message}`);
}

export async function actualizarActivoProfesionalRecord(
  id: number,
  activo: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = mockProfesionales.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Profesional no encontrado");
    mockProfesionales[index] = { ...mockProfesionales[index], activo };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("profesionales")
    .update({ activo })
    .eq("id", id);

  if (error)
    throw new Error(`No se pudo actualizar el estado: ${error.message}`);
}
