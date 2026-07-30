// Capa de acceso a datos para "profesionales" — administración completa
// (listado + alta), distinta de getProfesionalesParaSelect() en
// lib/data/ordenes.ts (esa es solo el catálogo id/nombre para el <Select>
// del formulario de órdenes, activos únicamente). Reusa el mismo mock
// (mockProfesionales de lib/mock-data/ordenes.ts) para no duplicar datos de
// prueba.

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
