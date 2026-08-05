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
import {
  mockChecklistProceso,
  mockEstadosEjecucion,
  mockInfoOrdenServicio,
} from "@/lib/mock-data/info-orden";
import { orNull } from "@/lib/utils";
import type {
  CampoOrdenInlinePatch,
  OrdenServicioFormValues,
} from "@/lib/validations/orden.schema";
import type { OrdenServicioConRelaciones } from "@/types";

export type OrdenesFiltros = {
  clienteIds?: number[];
  desde?: string;
  hasta?: string;
  numeroOs?: string;
  nombreEmpresa?: string;
  asesorGestionRiesgos?: string;
  tiposServicio?: string[];
  estados?: string[];
  responsablesOs?: string[];
  secuencia?: string;
  cronograma?: number;
  // Filtran por solape: cualquier orden cuya ejecución (fecha_inicio_ejecucion
  // a fecha_fin_ejecucion, en info_orden_servicio) toque el rango pedido, no
  // solo las que empiecen/terminen exactamente dentro de él.
  fechaEjecucionDesde?: string;
  fechaEjecucionHasta?: string;
};

// Mismo criterio de zona horaria que supabase/006_ordenes_servicio_id_unico.sql:
// Colombia no tiene horario de verano, así que un offset fijo alcanza, pero
// se usa Intl para no hardcodear "-5" dos veces.
const ZONA_HORARIA_NEGOCIO = "America/Bogota";

function diaEnZonaHoraria(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA_NEGOCIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const map = Object.fromEntries(partes.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

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
    observaciones_responsable_sec: orNull(input.observaciones_responsable_sec),
    link_archivo_orden: orNull(input.link_archivo_orden),
  };
}

function enriquecerMock(): OrdenServicioConRelaciones[] {
  return mockOrdenes.map((orden) => {
    const checklist = mockChecklistProceso.find(
      (c) => c.orden_id === orden.id,
    );
    const estadoEjecucion = checklist
      ? (mockEstadosEjecucion.find(
          (e) => e.id === checklist.estado_ejecucion_id,
        ) ?? null)
      : null;
    return {
      ...orden,
      cliente: mockClientes.find((c) => c.id === orden.cliente_id) ?? null,
      checklist: checklist
        ? { estado_ejecucion: estadoEjecucion }
        : null,
    };
  });
}

export async function getOrdenes(
  filtros: OrdenesFiltros = {},
): Promise<OrdenServicioConRelaciones[]> {
  if (!isSupabaseConfigured) {
    let ordenes = enriquecerMock();
    if (filtros.clienteIds?.length) {
      ordenes = ordenes.filter((o) =>
        filtros.clienteIds!.includes(o.cliente_id),
      );
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
    if (filtros.numeroOs) {
      const needle = filtros.numeroOs.toLowerCase();
      ordenes = ordenes.filter((o) =>
        (o.numero_os_cliente ?? "").toLowerCase().includes(needle),
      );
    }
    if (filtros.nombreEmpresa) {
      const needle = filtros.nombreEmpresa.toLowerCase();
      ordenes = ordenes.filter((o) =>
        (o.nombre_empresa_usuaria ?? "").toLowerCase().includes(needle),
      );
    }
    if (filtros.asesorGestionRiesgos) {
      const needle = filtros.asesorGestionRiesgos.toLowerCase();
      ordenes = ordenes.filter((o) =>
        (o.asesor_gestion_riesgos ?? "").toLowerCase().includes(needle),
      );
    }
    if (filtros.tiposServicio?.length) {
      ordenes = ordenes.filter(
        (o) =>
          o.tipo_servicio && filtros.tiposServicio!.includes(o.tipo_servicio),
      );
    }
    if (filtros.estados?.length) {
      ordenes = ordenes.filter(
        (o) => o.estado && filtros.estados!.includes(o.estado),
      );
    }
    if (filtros.responsablesOs?.length) {
      ordenes = ordenes.filter(
        (o) =>
          o.responsable_os && filtros.responsablesOs!.includes(o.responsable_os),
      );
    }
    if (filtros.secuencia) {
      const needle = filtros.secuencia.toLowerCase();
      ordenes = ordenes.filter((o) =>
        (o.secuencia ?? "").toLowerCase().includes(needle),
      );
    }
    if (filtros.cronograma != null) {
      ordenes = ordenes.filter((o) => o.cronograma === filtros.cronograma);
    }
    if (filtros.fechaEjecucionDesde || filtros.fechaEjecucionHasta) {
      ordenes = ordenes.filter((o) => {
        const info = mockInfoOrdenServicio.find((i) => i.orden_id === o.id);
        if (!info?.fecha_inicio_ejecucion || !info?.fecha_fin_ejecucion)
          return false;
        if (
          filtros.fechaEjecucionHasta &&
          info.fecha_inicio_ejecucion > filtros.fechaEjecucionHasta
        )
          return false;
        if (
          filtros.fechaEjecucionDesde &&
          info.fecha_fin_ejecucion < filtros.fechaEjecucionDesde
        )
          return false;
        return true;
      });
    }
    return ordenes.sort((a, b) => b.id - a.id);
  }
  const supabase = await createSupabaseServerClient();

  // info_orden_servicio solo se joinea (y con !inner) cuando de verdad se
  // filtra por fecha de ejecución: un !inner incondicional excluiría del
  // listado cualquier orden que todavía no tenga esa info cargada.
  const filtraPorEjecucion = Boolean(
    filtros.fechaEjecucionDesde || filtros.fechaEjecucionHasta,
  );
  const select = filtraPorEjecucion
    ? "*, cliente:clientes(id, nombre_cliente), checklist:checklist_proceso(estado_ejecucion:estados_ejecucion(id, nombre)), info_orden_servicio!inner(fecha_inicio_ejecucion, fecha_fin_ejecucion)"
    : "*, cliente:clientes(id, nombre_cliente), checklist:checklist_proceso(estado_ejecucion:estados_ejecucion(id, nombre))";

  let query = supabase
    .from("ordenes_servicio")
    .select(select)
    .order("id", { ascending: false });

  if (filtros.clienteIds?.length)
    query = query.in("cliente_id", filtros.clienteIds);
  if (filtros.desde) query = query.gte("fecha_recepcion_os", filtros.desde);
  if (filtros.hasta) query = query.lte("fecha_recepcion_os", filtros.hasta);
  if (filtros.cronograma != null)
    query = query.eq("cronograma", filtros.cronograma);
  if (filtros.fechaEjecucionHasta) {
    query = query.lte(
      "info_orden_servicio.fecha_inicio_ejecucion",
      filtros.fechaEjecucionHasta,
    );
  }
  if (filtros.fechaEjecucionDesde) {
    query = query.gte(
      "info_orden_servicio.fecha_fin_ejecucion",
      filtros.fechaEjecucionDesde,
    );
  }
  if (filtros.numeroOs) {
    query = query.ilike("numero_os_cliente", `%${filtros.numeroOs}%`);
  }
  if (filtros.nombreEmpresa) {
    query = query.ilike("nombre_empresa_usuaria", `%${filtros.nombreEmpresa}%`);
  }
  if (filtros.asesorGestionRiesgos) {
    query = query.ilike(
      "asesor_gestion_riesgos",
      `%${filtros.asesorGestionRiesgos}%`,
    );
  }
  if (filtros.tiposServicio?.length) {
    query = query.in("tipo_servicio", filtros.tiposServicio);
  }
  if (filtros.estados?.length) query = query.in("estado", filtros.estados);
  if (filtros.responsablesOs?.length) {
    query = query.in("responsable_os", filtros.responsablesOs);
  }
  if (filtros.secuencia) {
    query = query.ilike("secuencia", `%${filtros.secuencia}%`);
  }

  const { data, error } = await query;
  if (error)
    throw new Error(`No se pudieron cargar las órdenes: ${error.message}`);
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
    .select(
      "*, cliente:clientes(id, nombre_cliente), checklist:checklist_proceso(estado_ejecucion:estados_ejecucion(id, nombre))",
    )
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
  if (error)
    throw new Error(`No se pudieron cargar los clientes: ${error.message}`);
  return data ?? [];
}

// valor_hora/cedula/telefono viajan acá además de id/nombre_completo para
// mostrar el detalle del profesional elegido en "Profesional y contacto en
// sitio" (cédula/celular, de solo lectura) y precargar "Valor hora
// profesional" (ver SeccionValorHora) con su tarifa base — ninguno se
// edita desde acá, son datos del profesional (se gestionan en
// /profesionales), solo se muestran/copian.
export async function getProfesionalesParaSelect() {
  if (!isSupabaseConfigured) {
    return mockProfesionales
      .filter((p) => p.activo)
      .map((p) => ({
        id: p.id,
        nombre_completo: p.nombre_completo,
        valor_hora: p.valor_hora,
        cedula: p.cedula,
        telefono: p.telefono,
      }));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profesionales")
    .select("id, nombre_completo, valor_hora, cedula, telefono")
    .eq("activo", true)
    .order("nombre_completo");
  if (error)
    throw new Error(
      `No se pudieron cargar los profesionales: ${error.message}`,
    );
  return data ?? [];
}

export async function createOrdenRecord(input: OrdenServicioFormValues) {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const nextId = Math.max(0, ...mockOrdenes.map((o) => o.id)) + 1;
    const now = new Date();
    const dia = diaEnZonaHoraria(now);
    // Mismo formato y criterio (consecutivo diario en hora de Bogotá) que el
    // trigger real — ver supabase/006_ordenes_servicio_id_unico.sql.
    const consecutivoHoy =
      mockOrdenes.filter(
        (o) => o.fecha_creacion && diaEnZonaHoraria(new Date(o.fecha_creacion)) === dia,
      ).length + 1;
    mockOrdenes.push({
      ...normalizado,
      id: nextId,
      id_unico: `OS-${dia.replace(/-/g, "")}-${String(consecutivoHoy).padStart(4, "0")}`,
      fecha_creacion: now.toISOString(),
      fecha_actualizacion: now.toISOString(),
    });
    return nextId;
  }
  const supabase = await createSupabaseServerClient();

  // id_unico no va en el insert: lo asigna el trigger
  // generar_id_unico_orden (supabase/006_ordenes_servicio_id_unico.sql) con
  // formato OS-AAAAMMDD-NNNN, consecutivo por día.
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
  if (error)
    throw new Error(`No se pudo actualizar la orden: ${error.message}`);
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
  if (error)
    throw new Error(`No se pudo actualizar la orden: ${error.message}`);
}

export async function deleteOrdenRecord(id: number) {
  if (!isSupabaseConfigured) {
    const index = mockOrdenes.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Orden no encontrada");
    mockOrdenes.splice(index, 1);
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("ordenes_servicio")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`No se pudo eliminar la orden: ${error.message}`);
}
