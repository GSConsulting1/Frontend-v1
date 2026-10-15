// Exporta a Excel (.xlsx) la "matriz de órdenes". Dos modos por POST:
// { ids: number[] } exporta las filas seleccionadas en /ordenes (no query
// string: la selección puede ser larga y no queremos toparnos con el límite
// de URL); { todas: true } exporta todas las órdenes que el usuario ve en
// la tabla según la RLS — un administrador incluye las ocultas, los demás
// roles no ("Exportar todo" del menú ⋮). Ambos paginan cada tabla, porque
// PostgREST corta en 1.000 filas sin avisar.
//
// Misma excepción documentada en structure.md que app/api/ordenes/[id]/pdf:
// no es CRUD, es la generación de un binario (Content-Type de xlsx) que un
// Server Action no puede devolver. También usa supabaseAdmin (service role,
// bypassa RLS) a propósito: la matriz incluye datos con RLS restringido
// (valor_hora_orden y la sección financiera) que deben salir completos para
// administrador y financiero.
//
// Como supabaseAdmin salta RLS, la protección real vive acá: solo continúa si
// hay sesión y el rol es administrador, financiero o talento (el RoleGate del
// botón es solo UX). talento exporta la matriz sin la sección financiera
// (cuenta_cobro/acta_servicio/facturacion/radicacion_imagine/liquidacion,
// columnas financiera: true en lib/excel/matriz-ordenes.ts) — RLS solo le da
// acceso a valor_hora_orden, no a esas 5 tablas. Igual que el PDF, esto NO
// tiene ruta mock: sin credenciales de Supabase el export no funciona, a
// propósito.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { construirMatrizExcel } from "@/lib/excel/construir-matriz-excel";
import type { MatrizOrdenRow } from "@/lib/excel/matriz-ordenes";
import type { RolUsuario } from "@/types";

const ROLES_PERMITIDOS: RolUsuario[] = ["administrador", "financiero", "talento"];
const ROLES_CON_FINANCIERA: RolUsuario[] = ["administrador", "financiero"];

// Indexa filas 1-a-1 (una por orden) por orden_id.
function indexarPorOrden<T extends { orden_id: number }>(
  filas: T[] | null,
): Map<number, T> {
  const mapa = new Map<number, T>();
  for (const fila of filas ?? []) mapa.set(fila.orden_id, fila);
  return mapa;
}

// PostgREST corta toda respuesta en `max_rows` (1.000) EN SILENCIO — ver
// el comentario de getTodasLasCiudades en lib/data/info-orden.ts. Así que
// cada tabla se pide por páginas hasta que una vuelve incompleta.
//
// Con `ids`, además se parten en lotes: un .in(...) con miles de IDs arma
// una URL que el gateway rechaza. Con `ids` null se recorre la tabla entera.
const TAMANO_PAGINA = 1000;
const TAMANO_LOTE_IDS = 200;

type Pagina<T> = PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>;

async function traerTodasLasPaginas<T>(
  ids: number[] | null,
  pedirPagina: (lote: number[] | null, desde: number, hasta: number) => Pagina<T>,
): Promise<T[]> {
  const lotes: (number[] | null)[] = [];
  if (ids === null) lotes.push(null);
  else
    for (let i = 0; i < ids.length; i += TAMANO_LOTE_IDS)
      lotes.push(ids.slice(i, i + TAMANO_LOTE_IDS));

  const filas: T[] = [];
  for (const lote of lotes) {
    for (let desde = 0; ; desde += TAMANO_PAGINA) {
      const { data, error } = await pedirPagina(
        lote,
        desde,
        desde + TAMANO_PAGINA - 1,
      );
      if (error) throw new Error(error.message);
      filas.push(...(data ?? []));
      if ((data?.length ?? 0) < TAMANO_PAGINA) break;
    }
  }
  return filas;
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
  const incluirFinanciera = ROLES_CON_FINANCIERA.includes(
    perfil.rol as RolUsuario,
  );

  // 2. Qué exportar: { todas: true } = todas las órdenes que este usuario
  // ve en la tabla ("Exportar todo" del menú ⋮); { ids } = la selección.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const todas = (body as { todas?: unknown }).todas === true;
  const idsRaw = (body as { ids?: unknown }).ids;
  const ids = Array.isArray(idsRaw)
    ? Array.from(new Set(idsRaw.map(Number).filter((n) => Number.isInteger(n))))
    : [];
  if (!todas && ids.length === 0) {
    return NextResponse.json(
      { error: "No se seleccionaron órdenes" },
      { status: 400 },
    );
  }

  // "Exportar todo" = exactamente las órdenes que el usuario ve en la tabla.
  // Por eso los IDs se piden con SU sesión (`supabase`, no supabaseAdmin):
  // la RLS de ordenes_servicio (puede_ver_orden()) ya decide qué ve cada
  // rol — las ocultas solo para administrador, la visibilidad por casilla
  // del programador, etc. Repetir esas reglas acá a mano las dejaría
  // desincronizadas apenas cambie la función en la base.
  let idsOrdenes = ids;
  if (todas) {
    try {
      const visibles = await traerTodasLasPaginas(null, (_lote, desde, hasta) =>
        supabase
          .from("ordenes_servicio")
          .select("id")
          .order("id")
          .range(desde, hasta),
      );
      idsOrdenes = visibles.map((o) => o.id);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Error al consultar" },
        { status: 500 },
      );
    }
  }
  // null = sin filtro por orden: en "Exportar todo" las tablas 1-a-1 se
  // traen completas y las filas de órdenes que el usuario no ve se
  // descartan al unir en memoria (paso 5, que recorre solo `ordenes`), en
  // vez de mandar más de mil IDs en un .in(...) por cada tabla.
  const filtroIds = todas ? null : ids;

  // 3. Todas las tablas de la matriz, cada una paginada (ver
  // traerTodasLasPaginas). El orden por la PK es el desempate estable que la
  // paginación necesita para no saltar ni repetir filas entre páginas.
  let resultados;
  try {
    resultados = await Promise.all([
      traerTodasLasPaginas(idsOrdenes, (lote, desde, hasta) =>
        supabaseAdmin
          .from("ordenes_servicio")
          .select("*, cliente:clientes(id, nombre_cliente)")
          .in("id", lote ?? [])
          .order("id")
          .range(desde, hasta),
      ),
      traerTodasLasPaginas(filtroIds, (lote, desde, hasta) => {
        let q = supabaseAdmin
          .from("info_orden_servicio")
          .select(
            "*, ciudad:ciudades(nombre), profesional:profesionales(nombre_completo, cedula, telefono, email)",
          );
        if (lote) q = q.in("orden_id", lote);
        return q.order("orden_id").range(desde, hasta);
      }),
      traerTodasLasPaginas(filtroIds, (lote, desde, hasta) => {
        let q = supabaseAdmin
          .from("detalle_entrega_profesional")
          .select(
            "*, profesional_vobo:vobo!detalle_entrega_profesional_profesional_vobo_id_fkey(nombre_completo), participante_arl:participantes_arl!detalle_entrega_profesional_participante_arl_id_fkey(nombre_completo)",
          );
        if (lote) q = q.in("orden_id", lote);
        return q.order("orden_id").range(desde, hasta);
      }),
      traerTodasLasPaginas(filtroIds, (lote, desde, hasta) => {
        let q = supabaseAdmin
          .from("checklist_proceso")
          .select("*, estado_ejecucion:estados_ejecucion(nombre)");
        if (lote) q = q.in("orden_id", lote);
        return q.order("orden_id").range(desde, hasta);
      }),
      traerTodasLasPaginas(filtroIds, (lote, desde, hasta) => {
        let q = supabaseAdmin
          .from("valor_hora_orden")
          .select("orden_id, valor_hora_profesional");
        if (lote) q = q.in("orden_id", lote);
        return q.order("orden_id").range(desde, hasta);
      }),
      // Varias filas por orden: es la tabla que más rápido pasa de 1.000.
      traerTodasLasPaginas(filtroIds, (lote, desde, hasta) => {
        let q = supabaseAdmin
          .from("orden_entregables_estandar")
          .select("orden_id, entregable_id, entregables_estandar(nombre)");
        if (lote) q = q.in("orden_id", lote);
        return q
          .order("orden_id")
          .order("entregable_id")
          .range(desde, hasta);
      }),
      traerTodasLasPaginas(filtroIds, (lote, desde, hasta) => {
        let q = supabaseAdmin
          .from("acta_servicio")
          .select("*, profesional_acta:participantes_arl(nombre_completo)");
        if (lote) q = q.in("orden_id", lote);
        return q.order("orden_id").range(desde, hasta);
      }),
      traerTodasLasPaginas(filtroIds, (lote, desde, hasta) => {
        let q = supabaseAdmin.from("cuenta_cobro").select("*");
        if (lote) q = q.in("orden_id", lote);
        return q.order("orden_id").range(desde, hasta);
      }),
      traerTodasLasPaginas(filtroIds, (lote, desde, hasta) => {
        let q = supabaseAdmin.from("facturacion").select("*");
        if (lote) q = q.in("orden_id", lote);
        return q.order("orden_id").range(desde, hasta);
      }),
      traerTodasLasPaginas(filtroIds, (lote, desde, hasta) => {
        let q = supabaseAdmin.from("radicacion_imagine").select("*");
        if (lote) q = q.in("orden_id", lote);
        return q.order("orden_id").range(desde, hasta);
      }),
      traerTodasLasPaginas(filtroIds, (lote, desde, hasta) => {
        let q = supabaseAdmin.from("liquidacion").select("*");
        if (lote) q = q.in("orden_id", lote);
        return q.order("orden_id").range(desde, hasta);
      }),
    ]);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al consultar" },
      { status: 500 },
    );
  }
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
  ] = resultados;
  if (ordenes.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron órdenes para exportar" },
      { status: 404 },
    );
  }

  // 4. Índices por orden_id para unir en memoria.
  const infoMap = indexarPorOrden(
    infos as unknown as { orden_id: number }[],
  );
  const detalleMap = indexarPorOrden(
    detalles as unknown as { orden_id: number }[],
  );
  const checklistMap = indexarPorOrden(
    checklists as unknown as { orden_id: number }[],
  );
  const valorMap = indexarPorOrden(valores);
  const actaMap = indexarPorOrden(
    actas as unknown as { orden_id: number }[],
  );
  const cuentaMap = indexarPorOrden(cuentas);
  const facturacionMap = indexarPorOrden(facturaciones);
  const radicacionMap = indexarPorOrden(radicaciones);
  const liquidacionMap = indexarPorOrden(liquidaciones);

  const entregablesMap = new Map<number, string[]>();
  for (const fila of entregables) {
    const nombre = (fila.entregables_estandar as { nombre: string } | null)
      ?.nombre;
    if (!nombre) continue;
    const lista = entregablesMap.get(fila.orden_id) ?? [];
    lista.push(nombre);
    entregablesMap.set(fila.orden_id, lista);
  }

  // 5. Una fila por orden, ordenadas por id descendente (igual que la tabla).
  const filas: MatrizOrdenRow[] = [...ordenes]
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
  const buffer = await construirMatrizExcel(filas, { incluirFinanciera });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="ordenes-servicio.xlsx"',
    },
  });
}
