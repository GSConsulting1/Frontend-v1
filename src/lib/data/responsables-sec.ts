// Capa de acceso a datos para "Responsables SEC para GS" — el catálogo de quién
// responde por una orden dentro de GS Group (`responsables_sec`). CRUD completo:
// listado con conteo de órdenes, alta, edición, activo/inactivo y borrado.
//
// Es el reemplazo del CHECK `chk_responsable_sec`, que hasta la migración
// 20260816001045_catalogo_responsables_sec.sql tenía la lista de nombres
// escrita a mano en el esquema — ver esa migración para el porqué.
//
// Dos errores de Postgres se traducen acá a mensajes que se entiendan en
// pantalla, porque los dos son casos ESPERABLES de esta pantalla y no bugs:
//
//   23505 (unique_violation) — el índice único es sobre el nombre NORMALIZADO
//     (trim + espacios colapsados + mayúsculas, ver la migración), así que dar
//     de alta "lucia  bejarano" cuando ya existe "Lucia Bejarano" choca aunque
//     el texto no sea idéntico. Sin traducir, el mensaje habla de un índice por
//     expresión y no dice nada.
//   23503 (foreign_key_violation) — ordenes_servicio.responsable_sec_id no
//     tiene ON DELETE CASCADE: alguien con órdenes a cargo no se puede borrar.
//     Mismo criterio y mismo mensaje que lib/data/vobo.ts.
//
// El conteo de órdenes del listado sale de un embedded aggregate de PostgREST
// (`ordenes_servicio(count)`), no de una columna: se normaliza acá a un number
// para que la UI no vea la forma `[{ count }]` que devuelve Supabase.

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mockResponsablesSec } from "@/lib/mock-data/responsables-sec";
import { mockOrdenes } from "@/lib/mock-data/ordenes";
import type { ResponsableSec, ResponsableSecConConteo } from "@/types";
import type { ResponsableSecFormValues } from "@/lib/validations/responsable-sec.schema";

const UNIQUE_VIOLATION = "23505";
const FK_VIOLATION = "23503";

const MSG_DUPLICADO =
  "Ya existe un responsable con ese nombre (se comparan sin distinguir mayúsculas ni espacios de más).";
const MSG_CON_ORDENES =
  "No se puede eliminar: la persona tiene órdenes de servicio a cargo. Marcala como inactiva en su lugar.";

// La misma normalización que usa el índice único de la migración
// (btrim + espacios colapsados + upper). Se exporta porque la importación de
// órdenes desde Excel resuelve el nombre del archivo contra el catálogo con el
// mismo criterio con el que la base decide si dos nombres son "el mismo".
export function normalizarNombreResponsable(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").toUpperCase();
}

const normalizar = normalizarNombreResponsable;

function normalizarInput(input: ResponsableSecFormValues) {
  return {
    nombre_completo: input.nombre_completo,
    email: input.email || null,
    celular: input.celular || null,
  };
}

function contarOrdenesMock(persona: ResponsableSec): number {
  return mockOrdenes.filter(
    (o) =>
      o.responsable_os != null &&
      normalizar(o.responsable_os) === normalizar(persona.nombre_completo),
  ).length;
}

export async function getResponsablesSec(): Promise<ResponsableSecConConteo[]> {
  if (!isSupabaseConfigured) {
    return [...mockResponsablesSec]
      .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))
      .map((p) => ({ ...p, ordenes: contarOrdenesMock(p) }));
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("responsables_sec")
    .select("*, ordenes_servicio(count)")
    .order("nombre_completo");

  if (error)
    throw new Error(
      `No se pudieron cargar los responsables SEC: ${error.message}`,
    );

  return (data ?? []).map((fila) => {
    const { ordenes_servicio, ...persona } = fila as ResponsableSec & {
      ordenes_servicio: { count: number }[] | null;
    };
    return { ...persona, ordenes: ordenes_servicio?.[0]?.count ?? 0 };
  });
}

export type ResponsableSecOpcion = { id: number; nombre_completo: string };

// Catálogo para el <Select> "Responsable SEC para GS" del formulario de órdenes
// (ver components/ordenes/orden-campos.tsx) y para las opciones del filtro del
// listado.
//
// `incluirId` es para la pantalla de edición: la lista son los ACTIVOS, pero si
// la orden que se está editando apunta a alguien que se marcó inactivo después,
// hay que incluirlo igual o el campo aparecería vacío y guardar la orden le
// borraría el vínculo sin que nadie lo pidiera.
export async function getResponsablesSecParaSelect(
  incluirId?: number | null,
): Promise<ResponsableSecOpcion[]> {
  if (!isSupabaseConfigured) {
    return mockResponsablesSec
      .filter((p) => p.activo || p.id === incluirId)
      .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))
      .map((p) => ({ id: p.id, nombre_completo: p.nombre_completo }));
  }
  const supabase = await createSupabaseServerClient();

  const query = supabase
    .from("responsables_sec")
    .select("id, nombre_completo");

  const { data, error } = await (
    incluirId != null
      ? query.or(`activo.eq.true,id.eq.${incluirId}`)
      : query.eq("activo", true)
  ).order("nombre_completo");

  if (error)
    throw new Error(
      `No se pudieron cargar los responsables SEC: ${error.message}`,
    );
  return data ?? [];
}

// Catálogo COMPLETO —inactivos incluidos—, para los dos lugares donde no
// alcanza con los activos:
//
//   * las opciones del filtro "Responsable SEC" del listado de órdenes: si
//     alguien se marcó inactivo, sus órdenes siguen existiendo y hay que poder
//     filtrarlas;
//   * resolver los nombres sueltos que trae un Excel de importación, donde un
//     archivo de órdenes viejas puede nombrar a alguien que ya no está en el
//     equipo.
//
// A diferencia de empresas usuarias, la importación NO da de alta a nadie: si
// el nombre del archivo no resuelve contra este catálogo, la fila queda marcada
// como inválida en la previsualización (ver app/ordenes/actions.ts). Las
// personas se dan de alta solo desde /profesionales/responsables-sec — un typo
// del Excel no debería crear un empleado fantasma.
export async function getResponsablesSecTodos(): Promise<
  ResponsableSecOpcion[]
> {
  if (!isSupabaseConfigured) {
    return mockResponsablesSec.map((p) => ({
      id: p.id,
      nombre_completo: p.nombre_completo,
    }));
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("responsables_sec")
    .select("id, nombre_completo")
    .order("nombre_completo");

  if (error)
    throw new Error(
      `No se pudieron cargar los responsables SEC: ${error.message}`,
    );
  return data ?? [];
}

export async function crearResponsableSecRecord(
  input: ResponsableSecFormValues,
): Promise<ResponsableSec> {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const yaExiste = mockResponsablesSec.some(
      (p) =>
        normalizar(p.nombre_completo) ===
        normalizar(normalizado.nombre_completo),
    );
    if (yaExiste) throw new Error(MSG_DUPLICADO);

    const nextId = Math.max(0, ...mockResponsablesSec.map((p) => p.id)) + 1;
    const nuevo: ResponsableSec = {
      id: nextId,
      ...normalizado,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    };
    mockResponsablesSec.push(nuevo);
    return nuevo;
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("responsables_sec")
    .insert(normalizado)
    .select("*")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(MSG_DUPLICADO);
    throw new Error(`No se pudo crear el responsable SEC: ${error.message}`);
  }
  return data as unknown as ResponsableSec;
}

export async function actualizarResponsableSecRecord(
  id: number,
  input: ResponsableSecFormValues,
): Promise<void> {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const index = mockResponsablesSec.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Responsable SEC no encontrado");
    const chocaConOtro = mockResponsablesSec.some(
      (p) =>
        p.id !== id &&
        normalizar(p.nombre_completo) ===
          normalizar(normalizado.nombre_completo),
    );
    if (chocaConOtro) throw new Error(MSG_DUPLICADO);

    const anterior = mockResponsablesSec[index];
    mockResponsablesSec[index] = { ...anterior, ...normalizado };
    for (const orden of mockOrdenes) {
      if (
        orden.responsable_os != null &&
        normalizar(orden.responsable_os) === normalizar(anterior.nombre_completo)
      ) {
        orden.responsable_os = normalizado.nombre_completo;
      }
    }
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("responsables_sec")
    .update(normalizado)
    .eq("id", id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(MSG_DUPLICADO);
    throw new Error(
      `No se pudo actualizar el responsable SEC: ${error.message}`,
    );
  }

  // ordenes_servicio.responsable_os es una copia denormalizada del nombre (la
  // siguen leyendo el filtro del listado, el Excel de export y el PDF), así que
  // un rename que no la actualice deja al equipo con dos nombres para la misma
  // persona y las órdenes viejas fuera del filtro. Va después del UPDATE de la
  // tabla y no antes para no reescribir órdenes si el nombre chocó con el
  // índice único.
  const { error: errorOrdenes } = await supabase
    .from("ordenes_servicio")
    .update({ responsable_os: normalizado.nombre_completo })
    .eq("responsable_sec_id", id);

  if (errorOrdenes)
    throw new Error(
      `Se guardó el responsable, pero no se pudo actualizar su nombre en las órdenes: ${errorOrdenes.message}`,
    );
}

export async function actualizarActivoResponsableSecRecord(
  id: number,
  activo: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = mockResponsablesSec.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Responsable SEC no encontrado");
    mockResponsablesSec[index] = { ...mockResponsablesSec[index], activo };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("responsables_sec")
    .update({ activo })
    .eq("id", id);

  if (error)
    throw new Error(`No se pudo actualizar el estado: ${error.message}`);
}

export async function deleteResponsableSecRecord(id: number): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = mockResponsablesSec.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Responsable SEC no encontrado");
    if (contarOrdenesMock(mockResponsablesSec[index]) > 0)
      throw new Error(MSG_CON_ORDENES);
    mockResponsablesSec.splice(index, 1);
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("responsables_sec")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === FK_VIOLATION) throw new Error(MSG_CON_ORDENES);
    throw new Error(`No se pudo eliminar el responsable SEC: ${error.message}`);
  }
}
