// Descarga/preview del PDF de "Orden de Servicio" de una orden puntual.
//
// Excepción documentada en structure.md a la regla "no app/api/*/route.ts
// para CRUD propio": esto no es CRUD, es generación de un documento binario
// (Content-Type: application/pdf) que un Server Action no puede devolver —
// necesita una URL directa para abrir/descargar desde el navegador.
//
// Usa supabaseAdmin (service role, bypassa RLS) a propósito: el documento
// debe incluir el valor hora del profesional sin importar el rol de quien
// dispara la descarga — lib/supabase/server.ts respetaría el RLS de
// valor_hora_orden y devolvería 0 filas para roles no-administrador.

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  OrdenServicioDocument,
  type OrdenServicioData,
} from "@/lib/pdf/OrdenServicioDocument";

function formatFecha(iso: string | null): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function formatFechaHoy(): string {
  const hoy = new Date();
  const day = String(hoy.getDate()).padStart(2, "0");
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${hoy.getFullYear()}`;
}

function formatHora(hora: string | null): string {
  if (!hora) return "";
  return hora.slice(0, 5);
}

function formatMoneda(valor: number | null): string {
  if (valor == null) return "";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ordenId = Number(id);
  if (!Number.isInteger(ordenId)) {
    return NextResponse.json({ error: "Id de orden inválido" }, { status: 404 });
  }

  const ordenQuery = supabaseAdmin
    .from("ordenes_servicio")
    .select("*, cliente:clientes(nombre_cliente)")
    .eq("id", ordenId)
    .maybeSingle();

  const infoQuery = supabaseAdmin
    .from("info_orden_servicio")
    .select(
      "*, ciudad:ciudades(nombre), profesional:profesionales(nombre_completo, cedula)",
    )
    .eq("orden_id", ordenId)
    .maybeSingle();

  const detalleQuery = supabaseAdmin
    .from("detalle_entrega_profesional")
    .select(
      "*, profesional_vobo:profesionales!detalle_entrega_profesional_profesional_vobo_id_fkey(nombre_completo)",
    )
    .eq("orden_id", ordenId)
    .maybeSingle();

  const valorHoraQuery = supabaseAdmin
    .from("valor_hora_orden")
    .select("valor_hora_profesional")
    .eq("orden_id", ordenId)
    .maybeSingle();

  const entregablesQuery = supabaseAdmin
    .from("orden_entregables_estandar")
    .select("entregables_estandar(nombre)")
    .eq("orden_id", ordenId);

  const [orden, info, detalle, valorHora, entregables] = await Promise.all([
    ordenQuery,
    infoQuery,
    detalleQuery,
    valorHoraQuery,
    entregablesQuery,
  ]);

  if (orden.error) {
    return NextResponse.json({ error: orden.error.message }, { status: 500 });
  }
  if (!orden.data) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }
  if (info.error) {
    return NextResponse.json({ error: info.error.message }, { status: 500 });
  }
  if (detalle.error) {
    return NextResponse.json({ error: detalle.error.message }, { status: 500 });
  }
  if (valorHora.error) {
    return NextResponse.json({ error: valorHora.error.message }, { status: 500 });
  }
  if (entregables.error) {
    return NextResponse.json({ error: entregables.error.message }, { status: 500 });
  }

  // horas_cargadas (Datos generales / ordenes_servicio) y no
  // horas_asignadas (Datos de la actividad / info_orden_servicio): son las
  // horas reales a cobrar, no el estimado inicial de la actividad.
  const horasCargadas = orden.data.horas_cargadas ?? null;
  const valorHoraProfesional = valorHora.data?.valor_hora_profesional ?? null;
  const costoTotal =
    valorHoraProfesional != null && horasCargadas != null
      ? valorHoraProfesional * horasCargadas
      : null;

  const contacto = info.data
    ? [
        info.data.contacto_nombre,
        info.data.contacto_cargo,
        info.data.contacto_celular,
        info.data.contacto_email,
      ]
        .filter(Boolean)
        .join(" — ")
    : "";

  const direccionEmpresaAVisitar = info.data
    ? [info.data.empresa_a_visitar, info.data.direccion_empresa]
        .filter(Boolean)
        .join(" — ")
    : "";

  const entregableEstandar =
    entregables.data
      ?.map((e) => e.entregables_estandar?.nombre)
      .filter(Boolean)
      .join(", ") ?? "";

  const data: OrdenServicioData = {
    encabezadoFecha: formatFechaHoy(),
    encabezadoCodigo: "GS-FIN-FT-001",
    encabezadoVersion: "2",
    fechaEmision: formatFecha(info.data?.fecha_emision_os ?? null),
    profesionalNombre: info.data?.profesional?.nombre_completo ?? "",
    profesionalCedula: info.data?.profesional?.cedula ?? "",
    ciudad: info.data?.ciudad?.nombre ?? "",
    numeroOrden: orden.data.id_unico ?? "",
    nombreEmpresaCliente: orden.data.cliente?.nombre_cliente ?? "",
    nombreActividad: info.data?.nombre_actividad ?? "",
    descripcionActividad: info.data?.descripcion_actividad ?? "",
    numeroHoras: horasCargadas,
    fechaEjecucionInicio: formatFecha(info.data?.fecha_inicio_ejecucion ?? null),
    fechaFinalizacionEjecucion: formatFecha(info.data?.fecha_fin_ejecucion ?? null),
    direccionEmpresaAVisitar,
    horaInicioActividad: formatHora(info.data?.hora_inicio ?? null),
    finalizacionActividad: formatHora(info.data?.hora_fin ?? null),
    personaContacto: contacto,
    entregableEstandar,
    entregablesEspecificos: detalle.data?.entregables_especificos ?? "",
    fechaCierreOrden: formatFecha(detalle.data?.fecha_cierre_orden ?? null),
    profesionalVoBo: detalle.data?.profesional_vobo?.nombre_completo ?? "",
    costoHora: formatMoneda(valorHoraProfesional),
    costoTotal: formatMoneda(costoTotal),
  };

  const buffer = await renderToBuffer(<OrdenServicioDocument data={data} />);

  const nombreArchivo = orden.data.id_unico ?? `${orden.data.id}`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="orden-servicio-${nombreArchivo}.pdf"`,
    },
  });
}
