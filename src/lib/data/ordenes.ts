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

import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import {
  mockClientes,
  mockEstados,
  mockOrdenes,
  mockProfesionales,
} from "@/lib/mock-data/ordenes";
import type { OrdenServicioFormValues } from "@/lib/validations/orden.schema";
import type { OrdenServicioConRelaciones } from "@/types";

export type OrdenesFiltros = {
  clienteId?: number;
  desde?: string;
  hasta?: string;
};

function orNull(v: string | undefined): string | null {
  return v && v.trim() !== "" ? v : null;
}

// Normaliza los campos opcionales de texto ("" -> null) del formulario antes
// de persistir, tanto en el mock en memoria como en Supabase real.
function normalizarInput(input: OrdenServicioFormValues) {
  return {
    cliente_id: input.cliente_id,
    estado_id: input.estado_id ?? null,
    numero_os_cliente: orNull(input.numero_os_cliente),
    fecha_recepcion_os: orNull(input.fecha_recepcion_os),
    nombre_empresa_usuaria: orNull(input.nombre_empresa_usuaria),
    nit_empresa_usuaria: orNull(input.nit_empresa_usuaria),
    cronograma: orNull(input.cronograma),
    secuencia: orNull(input.secuencia),
    nombre_servicio: input.nombre_servicio,
    horas_cargadas: input.horas_cargadas ?? null,
    tipo_servicio: orNull(input.tipo_servicio),
    fecha_sipab: orNull(input.fecha_sipab),
    asesor_gestion_riesgos_id: input.asesor_gestion_riesgos_id ?? null,
    observaciones_iniciales: orNull(input.observaciones_iniciales),
    tarifa_valor_transporte: input.tarifa_valor_transporte ?? null,
    responsable_sec_id: input.responsable_sec_id ?? null,
    link: orNull(input.link),
  };
}

function enriquecerMock(): OrdenServicioConRelaciones[] {
  return mockOrdenes.map((orden) => ({
    ...orden,
    cliente:
      mockClientes.find((c) => c.id === orden.cliente_id) ?? null,
    estado:
      mockEstados.find((e) => e.id === orden.estado_id) ?? null,
  }));
}

export async function getOrdenes(
  filtros: OrdenesFiltros = {},
): Promise<OrdenServicioConRelaciones[]> {
  if (!isSupabaseConfigured || !supabase) {
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

  let query = supabase
    .from("ordenes_servicio")
    .select(
      "*, cliente:clientes(id, nombre_cliente), estado:estados_orden(id, nombre)",
    )
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
  if (!isSupabaseConfigured || !supabase) {
    return enriquecerMock().find((o) => o.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from("ordenes_servicio")
    .select(
      "*, cliente:clientes(id, nombre_cliente), estado:estados_orden(id, nombre)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar la orden: ${error.message}`);
  return data as unknown as OrdenServicioConRelaciones | null;
}

export async function getClientesParaSelect() {
  if (!isSupabaseConfigured || !supabase) {
    return mockClientes
      .filter((c) => c.activo)
      .map((c) => ({ id: c.id, nombre_cliente: c.nombre_cliente }));
  }
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre_cliente")
    .eq("activo", true)
    .order("nombre_cliente");
  if (error) throw new Error(`No se pudieron cargar los clientes: ${error.message}`);
  return data ?? [];
}

export async function getEstadosParaSelect() {
  if (!isSupabaseConfigured || !supabase) {
    return mockEstados
      .filter((e) => e.activo)
      .sort((a, b) => (a.orden_visual ?? 0) - (b.orden_visual ?? 0))
      .map((e) => ({ id: e.id, nombre: e.nombre }));
  }
  const { data, error } = await supabase
    .from("estados_orden")
    .select("id, nombre")
    .eq("activo", true)
    .order("orden_visual");
  if (error) throw new Error(`No se pudieron cargar los estados: ${error.message}`);
  return data ?? [];
}

export async function getProfesionalesParaSelect() {
  if (!isSupabaseConfigured || !supabase) {
    return mockProfesionales
      .filter((p) => p.activo)
      .map((p) => ({ id: p.id, nombre_completo: p.nombre_completo }));
  }
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

  if (!isSupabaseConfigured || !supabase) {
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

  if (!isSupabaseConfigured || !supabase) {
    const index = mockOrdenes.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Orden no encontrada");
    mockOrdenes[index] = {
      ...mockOrdenes[index],
      ...normalizado,
      fecha_actualizacion: new Date().toISOString(),
    };
    return;
  }

  const { error } = await supabase
    .from("ordenes_servicio")
    .update({ ...normalizado, fecha_actualizacion: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`No se pudo actualizar la orden: ${error.message}`);
}

// Normaliza solo las claves presentes en el parche (a diferencia de
// normalizarInput, que espera el formulario completo) — así el editor
// inline de fila puede mandar únicamente los campos que el usuario tocó.
function normalizarCampos(input: Partial<OrdenServicioFormValues>) {
  const normalizado: Record<string, unknown> = {};
  if ("cliente_id" in input) normalizado.cliente_id = input.cliente_id;
  if ("nombre_servicio" in input) normalizado.nombre_servicio = input.nombre_servicio;
  if ("estado_id" in input) normalizado.estado_id = input.estado_id ?? null;
  if ("horas_cargadas" in input) normalizado.horas_cargadas = input.horas_cargadas ?? null;
  if ("asesor_gestion_riesgos_id" in input)
    normalizado.asesor_gestion_riesgos_id = input.asesor_gestion_riesgos_id ?? null;
  if ("tarifa_valor_transporte" in input)
    normalizado.tarifa_valor_transporte = input.tarifa_valor_transporte ?? null;
  if ("responsable_sec_id" in input)
    normalizado.responsable_sec_id = input.responsable_sec_id ?? null;
  if ("numero_os_cliente" in input) normalizado.numero_os_cliente = orNull(input.numero_os_cliente);
  if ("fecha_recepcion_os" in input) normalizado.fecha_recepcion_os = orNull(input.fecha_recepcion_os);
  if ("nombre_empresa_usuaria" in input)
    normalizado.nombre_empresa_usuaria = orNull(input.nombre_empresa_usuaria);
  if ("nit_empresa_usuaria" in input) normalizado.nit_empresa_usuaria = orNull(input.nit_empresa_usuaria);
  if ("cronograma" in input) normalizado.cronograma = orNull(input.cronograma);
  if ("secuencia" in input) normalizado.secuencia = orNull(input.secuencia);
  if ("tipo_servicio" in input) normalizado.tipo_servicio = orNull(input.tipo_servicio);
  if ("fecha_sipab" in input) normalizado.fecha_sipab = orNull(input.fecha_sipab);
  if ("observaciones_iniciales" in input)
    normalizado.observaciones_iniciales = orNull(input.observaciones_iniciales);
  if ("link" in input) normalizado.link = orNull(input.link);
  return normalizado;
}

export async function updateOrdenCampos(id: number, campos: Partial<OrdenServicioFormValues>) {
  const normalizado = normalizarCampos(campos);
  if (Object.keys(normalizado).length === 0) return;

  if (!isSupabaseConfigured || !supabase) {
    const index = mockOrdenes.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Orden no encontrada");
    mockOrdenes[index] = {
      ...mockOrdenes[index],
      ...normalizado,
      fecha_actualizacion: new Date().toISOString(),
    };
    return;
  }

  const { error } = await supabase
    .from("ordenes_servicio")
    .update({ ...normalizado, fecha_actualizacion: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`No se pudo actualizar la orden: ${error.message}`);
}

export async function deleteOrdenRecord(id: number) {
  if (!isSupabaseConfigured || !supabase) {
    const index = mockOrdenes.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Orden no encontrada");
    mockOrdenes.splice(index, 1);
    return;
  }

  const { error } = await supabase.from("ordenes_servicio").delete().eq("id", id);
  if (error) throw new Error(`No se pudo eliminar la orden: ${error.message}`);
}
