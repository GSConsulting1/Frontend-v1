// Exporta a Excel (.xlsx) la "matriz de órdenes" de las filas seleccionadas
// en /ordenes. Recibe los IDs por POST { ids: number[] } (no query string:
// la selección puede ser larga y no queremos toparnos con el límite de URL).
//
// Misma excepción documentada en structure.md que app/api/ordenes/[id]/pdf:
// no es CRUD, es la generación de un binario (Content-Type de xlsx) que un
// Server Action no puede devolver. También usa supabaseAdmin (service role,
// bypassa RLS) a propósito: la matriz incluye datos con RLS restringido
// (valor_hora_orden y la sección financiera) que deben salir completos para
// administrador y financiero.
//
// Como supabaseAdmin salta RLS, la protección real vive acá: solo continúa si
// hay sesión y el rol es administrador o financiero (el RoleGate del botón es
// solo UX). Igual que el PDF, esto NO tiene ruta mock: sin credenciales de
// Supabase el export no funciona, a propósito.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { construirMatrizExcel } from "@/lib/excel/construir-matriz-excel";
import type { MatrizOrdenRow } from "@/lib/excel/matriz-ordenes";
import type { RolUsuario } from "@/types";

const ROLES_PERMITIDOS: RolUsuario[] = ["administrador", "financiero"];

// Indexa filas 1-a-1 (una por orden) por orden_id.
function indexarPorOrden<T extends { orden_id: number }>(
  filas: T[] | null,
): Map<number, T> {
  const mapa = new Map<number, T>();
  for (const fila of filas ?? []) mapa.set(fila.orden_id, fila);
  return mapa;
}

export async function POST(request: Request) {
  // 1. Sesión + rol (protección real, porque abajo usamos service role).
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { data: perfil } = await supabaseAdmin
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil || !ROLES_PERMITIDOS.includes(perfil.rol as RolUsuario)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // 2. IDs seleccionados.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const idsRaw = (body as { ids?: unknown }).ids;
  const ids = Array.isArray(idsRaw)
    ? Array.from(new Set(idsRaw.map(Number).filter((n) => Number.isInteger(n))))
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "No se seleccionaron órdenes" },
      { status: 400 },
    );
  }

  // 3. Todas las tablas de la matriz, filtradas por los IDs. Un query por
  // tabla (~12 en total) sin importar cuántas órdenes se seleccionen.
  const [
    ordenes,
    infos,
    detalles,
    checklists,
    valores,
    entregables,
    actas,
    cuentas,
    facturaciones,
    radicaciones,
    liquidaciones,
  ] = await Promise.all([
    supabaseAdmin
      .from("ordenes_servicio")
      .select("*, cliente:clientes(id, nombre_cliente)")
      .in("id", ids),
    supabaseAdmin
      .from("info_orden_servicio")
      .select(
        "*, ciudad:ciudades(nombre), profesional:profesionales(nombre_completo, cedula, telefono)",
      )
      .in("orden_id", ids),
    supabaseAdmin
      .from("detalle_entrega_profesional")
      .select(
        "*, profesional_vobo:profesionales!detalle_entrega_profesional_profesional_vobo_id_fkey(nombre_completo), participante_arl:participantes_arl!detalle_entrega_profesional_participante_arl_id_fkey(nombre_completo)",
      )
      .in("orden_id", ids),
    supabaseAdmin
      .from("checklist_proceso")
      .select("*, estado_ejecucion:estados_ejecucion(nombre)")
      .in("orden_id", ids),
    supabaseAdmin
      .from("valor_hora_orden")
      .select("orden_id, valor_hora_profesional")
      .in("orden_id", ids),
    supabaseAdmin
      .from("orden_entregables_estandar")
      .select("orden_id, entregables_estandar(nombre)")
      .in("orden_id", ids),
    supabaseAdmin
      .from("acta_servicio")
      .select("*, profesional_acta:participantes_arl(nombre_completo)")
      .in("orden_id", ids),
    supabaseAdmin.from("cuenta_cobro").select("*").in("orden_id", ids),
    supabaseAdmin.from("facturacion").select("*").in("orden_id", ids),
    supabaseAdmin.from("radicacion_imagine").select("*").in("orden_id", ids),
    supabaseAdmin.from("liquidacion").select("*").in("orden_id", ids),
  ]);

  const resultados = [
    ordenes,
    infos,
    detalles,
    checklists,
    valores,
    entregables,
    actas,
    cuentas,
    facturaciones,
    radicaciones,
    liquidaciones,
  ];
  for (const resultado of resultados) {
    if (resultado.error) {
      return NextResponse.json(
        { error: resultado.error.message },
        { status: 500 },
      );
    }
  }

  if (!ordenes.data || ordenes.data.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron las órdenes seleccionadas" },
      { status: 404 },
    );
  }

  // 4. Índices por orden_id para unir en memoria.
  const infoMap = indexarPorOrden(
    infos.data as unknown as { orden_id: number }[],
  );
  const detalleMap = indexarPorOrden(
    detalles.data as unknown as { orden_id: number }[],
  );
  const checklistMap = indexarPorOrden(
    checklists.data as unknown as { orden_id: number }[],
  );
  const valorMap = indexarPorOrden(valores.data);
  const actaMap = indexarPorOrden(
    actas.data as unknown as { orden_id: number }[],
  );
  const cuentaMap = indexarPorOrden(cuentas.data);
  const facturacionMap = indexarPorOrden(facturaciones.data);
  const radicacionMap = indexarPorOrden(radicaciones.data);
  const liquidacionMap = indexarPorOrden(liquidaciones.data);

  const entregablesMap = new Map<number, string[]>();
  for (const fila of entregables.data ?? []) {
    const nombre = (fila.entregables_estandar as { nombre: string } | null)
      ?.nombre;
    if (!nombre) continue;
    const lista = entregablesMap.get(fila.orden_id) ?? [];
    lista.push(nombre);
    entregablesMap.set(fila.orden_id, lista);
  }

  // 5. Una fila por orden, ordenadas por id descendente (igual que la tabla).
  const filas: MatrizOrdenRow[] = [...ordenes.data]
    .sort((a, b) => b.id - a.id)
    .map((orden) => ({
      orden: orden as unknown as MatrizOrdenRow["orden"],
      info: (infoMap.get(orden.id) ?? null) as MatrizOrdenRow["info"],
      detalle: (detalleMap.get(orden.id) ?? null) as MatrizOrdenRow["detalle"],
      checklist: (checklistMap.get(orden.id) ??
        null) as MatrizOrdenRow["checklist"],
      acta: (actaMap.get(orden.id) ?? null) as MatrizOrdenRow["acta"],
      cuentaCobro: (cuentaMap.get(orden.id) ??
        null) as MatrizOrdenRow["cuentaCobro"],
      facturacion: (facturacionMap.get(orden.id) ??
        null) as MatrizOrdenRow["facturacion"],
      radicacion: (radicacionMap.get(orden.id) ??
        null) as MatrizOrdenRow["radicacion"],
      liquidacion: (liquidacionMap.get(orden.id) ??
        null) as MatrizOrdenRow["liquidacion"],
      valorHora: valorMap.get(orden.id)?.valor_hora_profesional ?? null,
      entregablesEstandar: (entregablesMap.get(orden.id) ?? []).join(", "),
    }));

  // 6. Generar el binario.
  const buffer = await construirMatrizExcel(filas);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="ordenes-servicio.xlsx"',
    },
  });
}
