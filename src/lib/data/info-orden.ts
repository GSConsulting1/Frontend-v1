// Capa de acceso a datos para la sección "Información orden del servicio"
// (Plan MVP semana 2): los 3 catálogos + las 5 tablas 1-a-1 con
// ordenes_servicio. Mismo patrón mock/real que src/lib/data/ordenes.ts —
// único lugar que le pega a estas tablas en Supabase.

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mockProfesionales } from "@/lib/mock-data/ordenes";
import {
  mockChecklistProceso,
  mockCiudades,
  mockDetalleEntregaProfesional,
  mockEntregablesEstandar,
  mockEstadosEjecucion,
  mockInfoOrdenServicio,
  mockOrdenEntregablesEstandar,
  mockValorHoraOrden,
} from "@/lib/mock-data/info-orden";
import { orNull } from "@/lib/utils";
import type {
  ChecklistProcesoFormValues,
  DetalleEntregaProfesionalFormValues,
  InfoOrdenServicioFormValues,
  ValorHoraOrdenFormValues,
} from "@/lib/validations/info-orden.schema";
import type {
  ChecklistProcesoConRelaciones,
  DetalleEntregaProfesionalConRelaciones,
  InfoOrdenServicioConRelaciones,
  OrdenInfoCompleta,
} from "@/types";

export async function getCatalogosInfoOrden() {
  if (!isSupabaseConfigured) {
    return {
      ciudades: [...mockCiudades].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      estadosEjecucion: [...mockEstadosEjecucion].sort(
        (a, b) => (a.orden_visual ?? 0) - (b.orden_visual ?? 0),
      ),
      entregablesEstandar: [...mockEntregablesEstandar].sort((a, b) =>
        a.nombre.localeCompare(b.nombre),
      ),
    };
  }
  const supabase = await createSupabaseServerClient();

  const [ciudades, estadosEjecucion, entregablesEstandar] = await Promise.all([
    supabase.from("ciudades").select("id, nombre, departamento").order("nombre"),
    supabase
      .from("estados_ejecucion")
      .select("id, nombre, orden_visual")
      .order("orden_visual"),
    supabase.from("entregables_estandar").select("id, nombre").order("nombre"),
  ]);
  if (ciudades.error) throw new Error(`No se pudieron cargar las ciudades: ${ciudades.error.message}`);
  if (estadosEjecucion.error)
    throw new Error(`No se pudieron cargar los estados de ejecución: ${estadosEjecucion.error.message}`);
  if (entregablesEstandar.error)
    throw new Error(`No se pudieron cargar los entregables estándar: ${entregablesEstandar.error.message}`);

  return {
    ciudades: ciudades.data ?? [],
    estadosEjecucion: estadosEjecucion.data ?? [],
    entregablesEstandar: entregablesEstandar.data ?? [],
  };
}

function enriquecerInfoOrdenServicioMock(ordenId: number): InfoOrdenServicioConRelaciones | null {
  const fila = mockInfoOrdenServicio.find((i) => i.orden_id === ordenId);
  if (!fila) return null;
  return {
    ...fila,
    ciudad: mockCiudades.find((c) => c.id === fila.ciudad_id) ?? null,
    profesional:
      mockProfesionales.find((p) => p.id === fila.profesional_id) ?? null,
  };
}

function enriquecerDetalleEntregaMock(ordenId: number): DetalleEntregaProfesionalConRelaciones | null {
  const fila = mockDetalleEntregaProfesional.find((d) => d.orden_id === ordenId);
  if (!fila) return null;
  return {
    ...fila,
    profesional_vobo:
      mockProfesionales.find((p) => p.id === fila.profesional_vobo_id) ?? null,
    participante_arl:
      mockProfesionales.find((p) => p.id === fila.participante_arl_id) ?? null,
  };
}

function enriquecerChecklistMock(ordenId: number): ChecklistProcesoConRelaciones | null {
  const fila = mockChecklistProceso.find((c) => c.orden_id === ordenId);
  if (!fila) return null;
  return {
    ...fila,
    estado_ejecucion:
      mockEstadosEjecucion.find((e) => e.id === fila.estado_ejecucion_id) ?? null,
  };
}

export async function getInfoOrdenCompleta(ordenId: number): Promise<OrdenInfoCompleta> {
  if (!isSupabaseConfigured) {
    return {
      infoOrdenServicio: enriquecerInfoOrdenServicioMock(ordenId),
      detalleEntrega: enriquecerDetalleEntregaMock(ordenId),
      checklist: enriquecerChecklistMock(ordenId),
      entregablesSeleccionados: mockOrdenEntregablesEstandar
        .filter((e) => e.orden_id === ordenId)
        .map((e) => e.entregable_id),
      valorHora: mockValorHoraOrden.find((v) => v.orden_id === ordenId)?.valor_hora_profesional ?? null,
    };
  }
  const supabase = await createSupabaseServerClient();

  const [infoOrdenServicio, detalleEntrega, checklist, entregables, valorHora] = await Promise.all([
    supabase
      .from("info_orden_servicio")
      .select("*, ciudad:ciudades(id, nombre), profesional:profesionales(id, nombre_completo, cedula, telefono)")
      .eq("orden_id", ordenId)
      .maybeSingle(),
    supabase
      .from("detalle_entrega_profesional")
      .select(
        "*, profesional_vobo:profesionales!detalle_entrega_profesional_profesional_vobo_id_fkey(id, nombre_completo), participante_arl:profesionales!detalle_entrega_profesional_participante_arl_id_fkey(id, nombre_completo)",
      )
      .eq("orden_id", ordenId)
      .maybeSingle(),
    supabase
      .from("checklist_proceso")
      .select("*, estado_ejecucion:estados_ejecucion(id, nombre)")
      .eq("orden_id", ordenId)
      .maybeSingle(),
    supabase.from("orden_entregables_estandar").select("entregable_id").eq("orden_id", ordenId),
    // Si el usuario actual no es administrador, RLS hace que esto devuelva
    // 0 filas (no un error) — maybeSingle() lo resuelve como null, que es
    // exactamente el comportamiento que queremos (RoleGate ya oculta el
    // campo, pero aunque no lo hiciera, acá nunca llega el valor real).
    supabase.from("valor_hora_orden").select("valor_hora_profesional").eq("orden_id", ordenId).maybeSingle(),
  ]);

  if (infoOrdenServicio.error)
    throw new Error(`No se pudo cargar la información de la orden: ${infoOrdenServicio.error.message}`);
  if (detalleEntrega.error)
    throw new Error(`No se pudo cargar el detalle de entrega: ${detalleEntrega.error.message}`);
  if (checklist.error)
    throw new Error(`No se pudo cargar el checklist: ${checklist.error.message}`);
  if (entregables.error)
    throw new Error(`No se pudieron cargar los entregables estándar: ${entregables.error.message}`);
  if (valorHora.error)
    throw new Error(`No se pudo cargar el valor hora: ${valorHora.error.message}`);

  return {
    infoOrdenServicio: infoOrdenServicio.data as unknown as InfoOrdenServicioConRelaciones | null,
    detalleEntrega: detalleEntrega.data as unknown as DetalleEntregaProfesionalConRelaciones | null,
    checklist: checklist.data as unknown as ChecklistProcesoConRelaciones | null,
    entregablesSeleccionados: (entregables.data ?? []).map((e) => e.entregable_id),
    valorHora: valorHora.data?.valor_hora_profesional ?? null,
  };
}

function normalizarInfoOrdenServicio(ordenId: number, input: InfoOrdenServicioFormValues) {
  return {
    orden_id: ordenId,
    fecha_emision_os: orNull(input.fecha_emision_os),
    ciudad_id: input.ciudad_id ?? null,
    actividad_reprogramada: input.actividad_reprogramada ?? null,
    profesional_id: input.profesional_id ?? null,
    empresa_a_visitar: orNull(input.empresa_a_visitar),
    nombre_actividad: orNull(input.nombre_actividad),
    descripcion_actividad: orNull(input.descripcion_actividad),
    horas_asignadas: input.horas_asignadas ?? null,
    fecha_inicio_ejecucion: orNull(input.fecha_inicio_ejecucion),
    fecha_fin_ejecucion: orNull(input.fecha_fin_ejecucion),
    direccion_empresa: orNull(input.direccion_empresa),
    ubicacion_google_maps: orNull(input.ubicacion_google_maps),
    hora_inicio: orNull(input.hora_inicio),
    hora_fin: orNull(input.hora_fin),
    contacto_nombre: orNull(input.contacto_nombre),
    contacto_cargo: orNull(input.contacto_cargo),
    contacto_celular: orNull(input.contacto_celular),
    contacto_email: orNull(input.contacto_email),
  };
}

function normalizarDetalleEntrega(ordenId: number, input: DetalleEntregaProfesionalFormValues) {
  return {
    orden_id: ordenId,
    entregables_especificos: orNull(input.entregables_especificos),
    fecha_cierre_orden: orNull(input.fecha_cierre_orden),
    profesional_vobo_id: input.profesional_vobo_id ?? null,
    comentarios_valor_acordado: orNull(input.comentarios_valor_acordado),
    envio_os_profesional: input.envio_os_profesional ?? null,
    recepcion_orden_servicio: input.recepcion_orden_servicio ?? null,
    participante_arl_id: input.participante_arl_id ?? null,
  };
}

function normalizarValorHora(ordenId: number, input: ValorHoraOrdenFormValues) {
  return {
    orden_id: ordenId,
    valor_hora_profesional: input.valor_hora_profesional ?? null,
  };
}

function normalizarChecklist(ordenId: number, input: ChecklistProcesoFormValues) {
  return {
    orden_id: ordenId,
    envio_at031: input.envio_at031 ?? null,
    envio_at028: input.envio_at028 ?? null,
    formatos: input.formatos ?? null,
    estado_ejecucion_id: input.estado_ejecucion_id ?? null,
    fecha_maxima_ejecucion: orNull(input.fecha_maxima_ejecucion),
    entrega_soportes_profesional: input.entrega_soportes_profesional ?? null,
    entrega_soportes_cliente: input.entrega_soportes_cliente ?? null,
    fecha_maxima_entrega_soportes: orNull(input.fecha_maxima_entrega_soportes),
    vobo_emitido: input.vobo_emitido,
    cumplio_entrega_fecha: input.cumplio_entrega_fecha ?? null,
    informe_guardian: input.informe_guardian ?? null,
  };
}

export type GuardarInfoOrdenInput = {
  infoOrdenServicio?: InfoOrdenServicioFormValues;
  detalleEntrega?: DetalleEntregaProfesionalFormValues;
  checklist?: ChecklistProcesoFormValues;
  entregablesIds?: number[];
  // orden-form.tsx solo manda esta clave si el usuario es administrador
  // (ver su onSubmit) — cualquier otro rol nunca intenta el upsert acá.
  valorHora?: ValorHoraOrdenFormValues;
};

export async function guardarInfoOrdenCompleta(ordenId: number, datos: GuardarInfoOrdenInput) {
  if (!isSupabaseConfigured) {
    if (datos.infoOrdenServicio) {
      const normalizado = normalizarInfoOrdenServicio(ordenId, datos.infoOrdenServicio);
      const index = mockInfoOrdenServicio.findIndex((i) => i.orden_id === ordenId);
      const existente = index >= 0 ? mockInfoOrdenServicio[index] : undefined;
      const fila = {
        consecutivo_os_profesional:
          existente?.consecutivo_os_profesional ?? mockInfoOrdenServicio.length + 1000 + 1,
        ...normalizado,
      };
      if (index >= 0) mockInfoOrdenServicio[index] = fila;
      else mockInfoOrdenServicio.push(fila);
    }
    if (datos.detalleEntrega) {
      const normalizado = normalizarDetalleEntrega(ordenId, datos.detalleEntrega);
      const index = mockDetalleEntregaProfesional.findIndex((d) => d.orden_id === ordenId);
      if (index >= 0) mockDetalleEntregaProfesional[index] = normalizado;
      else mockDetalleEntregaProfesional.push(normalizado);
    }
    if (datos.checklist) {
      const normalizado = normalizarChecklist(ordenId, datos.checklist);
      const index = mockChecklistProceso.findIndex((c) => c.orden_id === ordenId);
      if (index >= 0) mockChecklistProceso[index] = normalizado;
      else mockChecklistProceso.push(normalizado);
    }
    if (datos.entregablesIds) {
      const restantes = mockOrdenEntregablesEstandar.filter((e) => e.orden_id !== ordenId);
      restantes.push(...datos.entregablesIds.map((entregable_id) => ({ orden_id: ordenId, entregable_id })));
      mockOrdenEntregablesEstandar.length = 0;
      mockOrdenEntregablesEstandar.push(...restantes);
    }
    if (datos.valorHora) {
      const normalizado = normalizarValorHora(ordenId, datos.valorHora);
      const index = mockValorHoraOrden.findIndex((v) => v.orden_id === ordenId);
      if (index >= 0) mockValorHoraOrden[index] = normalizado;
      else mockValorHoraOrden.push(normalizado);
    }
    return;
  }
  const supabase = await createSupabaseServerClient();

  if (datos.infoOrdenServicio) {
    const { error } = await supabase
      .from("info_orden_servicio")
      .upsert(normalizarInfoOrdenServicio(ordenId, datos.infoOrdenServicio), { onConflict: "orden_id" });
    if (error) throw new Error(`No se pudo guardar la actividad: ${error.message}`);
  }
  if (datos.detalleEntrega) {
    const { error } = await supabase
      .from("detalle_entrega_profesional")
      .upsert(normalizarDetalleEntrega(ordenId, datos.detalleEntrega), { onConflict: "orden_id" });
    if (error) throw new Error(`No se pudo guardar el detalle de entrega: ${error.message}`);
  }
  if (datos.checklist) {
    const { error } = await supabase
      .from("checklist_proceso")
      .upsert(normalizarChecklist(ordenId, datos.checklist), { onConflict: "orden_id" });
    if (error) throw new Error(`No se pudo guardar el checklist: ${error.message}`);
  }
  if (datos.entregablesIds) {
    const { error: deleteError } = await supabase
      .from("orden_entregables_estandar")
      .delete()
      .eq("orden_id", ordenId);
    if (deleteError)
      throw new Error(`No se pudieron actualizar los entregables estándar: ${deleteError.message}`);

    if (datos.entregablesIds.length > 0) {
      const { error: insertError } = await supabase
        .from("orden_entregables_estandar")
        .insert(datos.entregablesIds.map((entregable_id) => ({ orden_id: ordenId, entregable_id })));
      if (insertError)
        throw new Error(`No se pudieron actualizar los entregables estándar: ${insertError.message}`);
    }
  }
  if (datos.valorHora) {
    const { error } = await supabase
      .from("valor_hora_orden")
      .upsert(normalizarValorHora(ordenId, datos.valorHora), { onConflict: "orden_id" });
    if (error) throw new Error(`No se pudo guardar el valor hora: ${error.message}`);
  }
}

// Borra las 5 tablas extendidas de una orden. Necesario ANTES de borrar la
// orden misma: las FK de info_orden_servicio / detalle_entrega_profesional /
// checklist_proceso / orden_entregables_estandar hacia ordenes_servicio no
// tienen ON DELETE CASCADE en el esquema actual, así que un
// DELETE FROM ordenes_servicio directo falla con foreign key violation en
// cuanto la orden tiene alguna fila extendida. eliminarOrden
// (app/ordenes/actions.ts) llama a esto antes de deleteOrdenRecord.
export async function eliminarInfoOrdenCompleta(ordenId: number) {
  if (!isSupabaseConfigured) {
    for (const arr of [
      mockInfoOrdenServicio,
      mockDetalleEntregaProfesional,
      mockChecklistProceso,
      mockValorHoraOrden,
    ] as { orden_id: number }[][]) {
      const index = arr.findIndex((f) => f.orden_id === ordenId);
      if (index >= 0) arr.splice(index, 1);
    }
    const restantes = mockOrdenEntregablesEstandar.filter((e) => e.orden_id !== ordenId);
    mockOrdenEntregablesEstandar.length = 0;
    mockOrdenEntregablesEstandar.push(...restantes);
    return;
  }
  const supabase = await createSupabaseServerClient();

  for (const tabla of [
    "orden_entregables_estandar",
    "checklist_proceso",
    "detalle_entrega_profesional",
    "info_orden_servicio",
    "valor_hora_orden",
  ] as const) {
    const { error } = await supabase.from(tabla).delete().eq("orden_id", ordenId);
    // Si el usuario actual no es administrador, RLS bloquea el DELETE en
    // valor_hora_orden — eso es correcto (no debería poder borrar ese dato),
    // pero entonces eliminarOrden tampoco puede completarse: borrar una
    // orden completa queda reservado a quien además pueda limpiar esa tabla.
    if (error) throw new Error(`No se pudo borrar "${tabla}" de la orden: ${error.message}`);
  }
}
