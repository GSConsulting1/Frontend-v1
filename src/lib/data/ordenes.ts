// Capa de acceso a datos para "ordenes_servicio" — el único lugar del código
// que sabe cómo obtener/mutar órdenes. Ni app/ordenes/page.tsx ni los
// componentes deberían llamar a Supabase directamente: todos pasan por acá.
//
// Por qué: cuando llegue una fuente de datos nueva, un caché, o un cambio de
// esquema, se ajusta un solo archivo por entidad — no hay que perseguir
// llamadas a supabase.from(...) repartidas por toda la UI.
//
// Mientras isSupabaseConfigured es false (Día 1-2, sin credenciales todavía),
// todo cae a los mocks para que Persona B no dependa de Persona A.

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  mockClientes,
  mockOrdenes,
  mockProfesionales,
} from "@/lib/mock-data/ordenes";
import { orNull } from "@/lib/utils";
import type {
  CampoOrdenInlinePatch,
  OrdenServicioFormValues,
} from "@/lib/validations/orden.schema";
import type { OrdenServicioConRelaciones } from "@/types";

export type OrdenesFiltros = {
  clienteId?: number;
  desde?: string;
  hasta?: string;
};

// Normaliza los campos opcionales de texto ("" -> null) del formulario antes
// de persistir, tanto en el mock en memoria como en Supabase real.
function normalizarInput(input: OrdenServicioFormValues) {
  return {
    cliente_id: input.cliente_id,
    estado: orNull(input.estado),
    numero_os_cliente: orNull(input.numero_os_cliente),
    fecha_recepcion_os: orNull(input.fecha_recepcion_os),
    nombre_empresa_usuaria: orNull(input.nombre_empresa_usuaria),
    nit_empresa_usuaria: orNull(input.nit_empresa_usuaria),
    cronograma: input.cronograma ?? null,
    secuencia: orNull(input.secuencia),
    nombre_servicio: input.nombre_servicio,
    horas_cargadas: input.horas_cargadas ?? null,
    tipo_servicio: orNull(input.tipo_servicio),
    fecha_sipab: orNull(input.fecha_sipab),
    asesor_gestion_riesgos: orNull(input.asesor_gestion_riesgos),
    observaciones_iniciales: orNull(input.observaciones_iniciales),
    tarifa_valor_transporte: orNull(input.tarifa_valor_transporte),
    responsable_os: orNull(input.responsable_os),
    link_archivo_orden: orNull(input.link_archivo_orden),
  };
}

function enriquecerMock(): OrdenServicioConRelaciones[] {
  return mockOrdenes.map((orden) => ({
    ...orden,
    cliente:
      mockClientes.find((c) => c.id === orden.cliente_id) ?? null,
  }));
}

export async function getOrdenes(
  filtros: OrdenesFiltros = {},
): Promise<OrdenServicioConRelaciones[]> {
  if (!isSupabaseConfigured) {
    let ordenes = enriquecerMock();
    if (filtros.clienteId) {
      ordenes = ordenes.filter((o) => o.cliente_id === filtros.clienteId);
    }
    if (filtros.desde) {
      ordenes = ordenes.filter(
        (o) => (o.fecha_recepcion_os ?? "") >= filtros.desde!,
      );
    }
    if (filtros.hasta) {
      ordenes = ordenes.filter(
        (o) => (o.fecha_recepcion_os ?? "") <= filtros.hasta!,
      );
    }
    return ordenes.sort((a, b) => b.id - a.id);
  }
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("ordenes_servicio")
    .select("*, cliente:clientes(id, nombre_cliente)")
    .order("id", { ascending: false });

  if (filtros.clienteId) query = query.eq("cliente_id", filtros.clienteId);
  if (filtros.desde) query = query.gte("fecha_recepcion_os", filtros.desde);
  if (filtros.hasta) query = query.lte("fecha_recepcion_os", filtros.hasta);

  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron cargar las órdenes: ${error.message}`);
  return (data ?? []) as unknown as OrdenServicioConRelaciones[];
}

export async function getOrdenById(
  id: number,
): Promise<OrdenServicioConRelaciones | null> {
  if (!isSupabaseConfigured) {
    return enriquecerMock().find((o) => o.id === id) ?? null;
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ordenes_servicio")
    .select("*, cliente:clientes(id, nombre_cliente)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar la orden: ${error.message}`);
  return data as unknown as OrdenServicioConRelaciones | null;
}

export async function getClientesParaSelect() {
  if (!isSupabaseConfigured) {
    return mockClientes
      .filter((c) => c.activo)
      .map((c) => ({ id: c.id, nombre_cliente: c.nombre_cliente }));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre_cliente")
    .eq("activo", true)
    .order("nombre_cliente");
  if (error) throw new Error(`No se pudieron cargar los clientes: ${error.message}`);
  return data ?? [];
}

export async function getProfesionalesParaSelect() {
  if (!isSupabaseConfigured) {
    return mockProfesionales
      .filter((p) => p.activo)
      .map((p) => ({ id: p.id, nombre_completo: p.nombre_completo }));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profesionales")
    .select("id, nombre_completo")
    .eq("activo", true)
    .order("nombre_completo");
  if (error) throw new Error(`No se pudieron cargar los profesionales: ${error.message}`);
  return data ?? [];
}

export async function createOrdenRecord(input: OrdenServicioFormValues) {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const nextId = Math.max(0, ...mockOrdenes.map((o) => o.id)) + 1;
    const now = new Date().toISOString();
    mockOrdenes.push({
      ...normalizado,
      id: nextId,
      id_unico: `OS-MOCK-${nextId}`,
      fecha_creacion: now,
      fecha_actualizacion: now,
    });
    return nextId;
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ordenes_servicio")
    .insert(normalizado)
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo crear la orden: ${error.message}`);
  return data.id;
}

export async function updateOrdenRecord(
  id: number,
  input: OrdenServicioFormValues,
) {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const index = mockOrdenes.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Orden no encontrada");
    mockOrdenes[index] = {
      ...mockOrdenes[index],
      ...normalizado,
      fecha_actualizacion: new Date().toISOString(),
    };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("ordenes_servicio")
    .update({ ...normalizado, fecha_actualizacion: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`No se pudo actualizar la orden: ${error.message}`);
}

// Patch de un solo campo desde la edición inline de la tabla de listado —
// a diferencia de updateOrdenRecord, no pasa por normalizarInput (que exige
// el formulario completo válido). Restringido en la práctica a
// cronograma/estado_id/secuencia por campoOrdenInlineSchema (ver
// actualizarCampoOrden en app/ordenes/actions.ts) y, del lado de Supabase,
// por el trigger de supabase/005_ordenes_servicio_financiero_edicion.sql.
export async function actualizarCampoOrdenRecord(
  id: number,
  patch: CampoOrdenInlinePatch,
) {
  if (!isSupabaseConfigured) {
    const index = mockOrdenes.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Orden no encontrada");
    mockOrdenes[index] = {
      ...mockOrdenes[index],
      ...patch,
      fecha_actualizacion: new Date().toISOString(),
    };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("ordenes_servicio")
    .update({ ...patch, fecha_actualizacion: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`No se pudo actualizar la orden: ${error.message}`);
}

export async function deleteOrdenRecord(id: number) {
  if (!isSupabaseConfigured) {
    const index = mockOrdenes.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Orden no encontrada");
    mockOrdenes.splice(index, 1);
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("ordenes_servicio").delete().eq("id", id);
  if (error) throw new Error(`No se pudo eliminar la orden: ${error.message}`);
}
