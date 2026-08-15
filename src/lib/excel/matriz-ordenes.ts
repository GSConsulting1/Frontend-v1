// Especificación de la "matriz de órdenes" que se exporta a Excel desde
// /ordenes (botón "Exportar Excel"). Es la ÚNICA fuente de verdad del orden
// y el mapeo de columnas: la lista COLUMNAS_MATRIZ está en el orden EXACTO
// del documento de referencia (matriz desarrollo 2.0), con los mismos textos
// de encabezado. Si cambia el orden o el texto, se edita solo acá.
//
// Cada orden seleccionada se exporta como UNA fila. Los datos vienen de 12
// tablas (ordenes_servicio + sus tablas 1-a-1 extendidas + catálogos), ya
// unidas por orden_id en app/api/ordenes/excel/route.ts y entregadas acá como
// MatrizOrdenRow. El builder (construir-matriz-excel.ts) recorre esta lista.

import type {
  ActaServicio,
  ChecklistProceso,
  Cliente,
  CuentaCobro,
  DetalleEntregaProfesional,
  Facturacion,
  InfoOrdenServicio,
  Liquidacion,
  OrdenServicio,
  RadicacionImagine,
} from "@/types";
import { formatearFecha as fecha } from "@/lib/utils";

// Fila ya "aplanada": la orden con todas sus tablas relacionadas resueltas.
// Cada relación es null si la orden todavía no tiene fila en esa tabla.
export type MatrizOrdenRow = {
  orden: OrdenServicio & {
    cliente: Pick<Cliente, "id" | "nombre_cliente"> | null;
  };
  info:
    | (InfoOrdenServicio & {
        ciudad: { nombre: string } | null;
        profesional: {
          nombre_completo: string;
          cedula: string | null;
          telefono: string | null;
          email: string | null;
        } | null;
      })
    | null;
  detalle:
    | (DetalleEntregaProfesional & {
        profesional_vobo: { nombre_completo: string } | null;
        participante_arl: { nombre_completo: string } | null;
      })
    | null;
  checklist:
    | (ChecklistProceso & { estado_ejecucion: { nombre: string } | null })
    | null;
  acta: (ActaServicio & { profesional_acta: { nombre_completo: string } | null }) | null;
  cuentaCobro: CuentaCobro | null;
  facturacion: Facturacion | null;
  radicacion: RadicacionImagine | null;
  liquidacion: Liquidacion | null;
  valorHora: number | null;
  entregablesEstandar: string;
};

export type ColumnaMatriz = {
  header: string;
  value: (fila: MatrizOrdenRow) => string | number | null;
  // Formato numérico de moneda (miles) en la celda; el value devuelve number.
  money?: boolean;
  // Columna de la sección financiera (cuenta_cobro/acta_servicio/
  // facturacion/radicacion_imagine/liquidacion) — RLS restringe esas 5
  // tablas a administrador/financiero (talento sí puede leer valor_hora_orden,
  // por eso "Valor Hora Profesional" NO lleva este flag). construir-matriz-excel
  // filtra estas columnas cuando incluirFinanciera es false.
  financiera?: boolean;
};

// --- Formateadores locales de presentación (sin dominio) ---
// `fecha` (día/mes/año) vive en lib/utils.ts como formatearFecha — ya lo
// usaban este archivo y pdf/route.tsx, más ordenes-table.tsx/ordenes-filtros.tsx
// (ver el import de arriba). `hora`/`siNo` siguen acá porque solo esta
// exportación los necesita hoy.
function hora(valor: string | null | undefined): string {
  return valor ? valor.slice(0, 5) : "";
}

function siNo(valor: boolean | null | undefined): string {
  if (valor == null) return "";
  return valor ? "Sí" : "No";
}

// COLUMNAS_MATRIZ: orden y textos EXACTOS del documento de referencia.
// "Estado en Guardian" queda en blanco a propósito: no tiene respaldo en la
// base de datos todavía (pendiente confirmar mapeo).
export const COLUMNAS_MATRIZ: ColumnaMatriz[] = [
  // ---- Paso 1 (ordenes_servicio + clientes) ----
  { header: "COD Cliente", value: (f) => f.orden.cliente?.id ?? f.orden.cliente_id },
  { header: "Cliente", value: (f) => f.orden.cliente?.nombre_cliente ?? "" },
  { header: "Número de OS del cliente", value: (f) => f.orden.numero_os_cliente ?? "" },
  { header: "Fecha de recepción OS del cliente", value: (f) => fecha(f.orden.fecha_recepcion_os) },
  { header: "Nombre Empresa usuaria del cliente", value: (f) => f.orden.nombre_empresa_usuaria ?? "" },
  { header: "Nit Empresa usuaria del cliente", value: (f) => f.orden.nit_empresa_usuaria ?? "" },
  { header: "Cronograma (ARL Bolivar)", value: (f) => f.orden.cronograma ?? null },
  { header: "Secuencia (ARL Bolivar)", value: (f) => f.orden.secuencia ?? "" },
  { header: "Estado Gerencia", value: (f) => f.orden.estado ?? "" },
  {
    header: "Nombre del servicio (ARL Bolivar - Descripción de la actividad)",
    value: (f) => f.orden.nombre_servicio ?? "",
  },
  { header: "Horas cargadas", value: (f) => f.orden.horas_cargadas ?? null },
  { header: "Tipo Servicio (ARL Bolivar)", value: (f) => f.orden.tipo_servicio ?? "" },
  { header: "Fecha SIPAB (ARL Bolivar)", value: (f) => fecha(f.orden.fecha_sipab) },
  {
    header: "Asesor Gestion Riesgos / Responsable de la OS del cliente",
    value: (f) => f.orden.asesor_gestion_riesgos ?? "",
  },
  {
    header: "Observaciones iniciales del cliente (detalle registrada en OS del cliente)",
    value: (f) => f.orden.observaciones_iniciales ?? "",
  },
  // character varying en la base real (no numeric): se guarda tal cual la
  // escribe quien carga la orden, así que no se puede tratar como money
  // (ver mismo comentario en lib/validations/orden.schema.ts).
  { header: "Tiene Valor Transporte", value: (f) => f.orden.tarifa_valor_transporte ?? "" },
  { header: "Responsable SEC para GS", value: (f) => f.orden.responsable_os ?? "" },
  {
    header: "Observaciones del responsable SEC para GS",
    value: (f) => f.orden.observaciones_responsable_sec ?? "",
  },

  // ---- Asignación GS + Información OS (info_orden_servicio, detalle, valor_hora) ----
  {
    header: "Consecutivo orden de servicio para Profesional de GS asignado",
    value: (f) => f.orden.id_unico ?? null,
  },
  {
    header: "Fecha de emisión OS para el profesional de GS asignado",
    value: (f) => fecha(f.info?.fecha_emision_os),
  },
  { header: "Ciudad", value: (f) => f.info?.ciudad?.nombre ?? "" },
  { header: "Profesional de GS asignado", value: (f) => f.info?.profesional?.nombre_completo ?? "" },
  { header: "Identificación del Profesional de GS asignado", value: (f) => f.info?.profesional?.cedula ?? "" },
  { header: "Numero de contacto del profesional", value: (f) => f.info?.profesional?.telefono ?? "" },
  { header: "Correo del profesional", value: (f) => f.info?.profesional?.email ?? "" },
  { header: "Empresa a visitar", value: (f) => f.info?.empresa_a_visitar ?? "" },
  { header: "Nombre de la actividad a desarrollar", value: (f) => f.info?.nombre_actividad ?? "" },
  { header: "Descripción de la actividad", value: (f) => f.info?.descripcion_actividad ?? "" },
  { header: "N° de horas asignadas al profesional", value: (f) => f.info?.horas_asignadas ?? null },
  { header: "Fecha de inicio de la ejecución", value: (f) => fecha(f.info?.fecha_inicio_ejecucion) },
  { header: "Fecha de finalización de la ejecución", value: (f) => fecha(f.info?.fecha_fin_ejecucion) },
  { header: "Dirección de la Empresa a visitar", value: (f) => f.info?.direccion_empresa ?? "" },
  { header: "Ubicación en Google Maps", value: (f) => f.info?.ubicacion_google_maps ?? "" },
  { header: "Hora de inicio de la actividad", value: (f) => hora(f.info?.hora_inicio) },
  { header: "Hora de finalización de la actividad", value: (f) => hora(f.info?.hora_fin) },
  {
    header: "Nombre de la persona de contacto de la Empresa a visitar",
    value: (f) => f.info?.contacto_nombre ?? "",
  },
  {
    header: "Cargo de la persona de contacto de la Empresa a visitar",
    value: (f) => f.info?.contacto_cargo ?? "",
  },
  {
    header: "Celular de la persona de contacto de la Empresa a visitar",
    value: (f) => f.info?.contacto_celular ?? "",
  },
  {
    header: "Correo de la persona de contacto de la Empresa a visitar",
    value: (f) => f.info?.contacto_email ?? "",
  },
  { header: "Entregables estandar", value: (f) => f.entregablesEstandar },
  { header: "Entregables especificos", value: (f) => f.detalle?.entregables_especificos ?? "" },
  {
    header: "Fecha de cierre de la orden (Fecha máxima de entrega de soportes)",
    value: (f) => fecha(f.detalle?.fecha_cierre_orden),
  },
  {
    header: "Profesional que emite VoBo para facturación",
    value: (f) => f.detalle?.profesional_vobo?.nombre_completo ?? "",
  },
  {
    header: "Comentarios de valor acordado con el profesional",
    value: (f) => f.detalle?.comentarios_valor_acordado ?? "",
  },
  { header: "Valor Hora Profesional", value: (f) => f.valorHora ?? null, money: true },
  { header: "Envio de OS al profesional GS", value: (f) => siNo(f.detalle?.envio_os_profesional) },
  { header: "Recepción de la orden de servicio", value: (f) => siNo(f.detalle?.recepcion_orden_servicio) },

  // ---- Programadoras (detalle + checklist_proceso) ----
  {
    header: "Participante ARL (Profesional SISALUD)",
    value: (f) => f.detalle?.participante_arl?.nombre_completo ?? "",
  },
  { header: "Envio de AT 031", value: (f) => siNo(f.checklist?.envio_at031) },
  { header: "Envio de AT 028", value: (f) => siNo(f.checklist?.envio_at028) },
  { header: "Formatos", value: (f) => siNo(f.checklist?.formatos) },
  { header: "Estado de ejecución", value: (f) => f.checklist?.estado_ejecucion?.nombre ?? "" },
  { header: "Fecha maxima de ejecución", value: (f) => fecha(f.checklist?.fecha_maxima_ejecucion) },
  {
    header: "Entrega de soportes por parte del profesional a GS",
    value: (f) => siNo(f.checklist?.entrega_soportes_profesional),
  },
  {
    header: "Entrega de soportes por parte de la empresa cliente",
    value: (f) => siNo(f.checklist?.entrega_soportes_cliente),
  },
  {
    header: "Fecha máxima de entrega de soportes al cliente",
    value: (f) => fecha(f.checklist?.fecha_maxima_entrega_soportes),
  },
  { header: "VOBO Emitido", value: (f) => siNo(f.checklist?.vobo_emitido) },
  {
    header: "Se cumplio la entrega en la fecha establecida",
    value: (f) => siNo(f.checklist?.cumplio_entrega_fecha),
  },
  { header: "Informe Guardian", value: (f) => f.checklist?.informe_guardian ?? "" },

  // ---- Financiera (cuenta_cobro, acta_servicio, facturacion, radicacion_imagine, liquidacion) ----
  { header: "Radicación de cuenta de cobro", value: (f) => siNo(f.cuentaCobro?.radicacion_cuenta), financiera: true },
  { header: "Fecha de radicación", value: (f) => fecha(f.cuentaCobro?.fecha_radicacion), financiera: true },
  { header: "Valor Cuenta de cobro", value: (f) => f.cuentaCobro?.valor_cuenta_cobro ?? null, money: true, financiera: true },
  { header: "Documento Soporte", value: (f) => f.cuentaCobro?.documento_soporte ?? "", financiera: true },
  { header: "Corte pago", value: (f) => f.cuentaCobro?.corte_pago ?? "", financiera: true },
  { header: "Fecha de pago", value: (f) => fecha(f.cuentaCobro?.fecha_pago), financiera: true },
  // alerta_facturacion pasó a ser una fecha (fecha_sipab + 40 días, ver
  // supabase/migrations/20260815120000_alinear_estados_imagine_y_facturacion.sql
  // y facturacion.tsx) — antes era un estado de texto libre, por eso hasta
  // ahora salía sin pasar por fecha() como el resto de columnas de fecha.
  { header: "Alerta de Facturación", value: (f) => fecha(f.facturacion?.alerta_facturacion), financiera: true },
  // Sin columna en la DB — pendiente confirmar mapeo.
  { header: "Estado en Guardian", value: () => "", financiera: true },
  { header: "Estado en IMAGINE", value: (f) => f.radicacion?.estado_imagine ?? "", financiera: true },
  { header: "Fecha del acta", value: (f) => fecha(f.acta?.fecha_acta), financiera: true },
  { header: "Hora del acta", value: (f) => hora(f.acta?.hora_acta), financiera: true },
  { header: "Profesional del acta", value: (f) => f.acta?.profesional_acta?.nombre_completo ?? "", financiera: true },
  { header: "Fecha de corte", value: (f) => fecha(f.cuentaCobro?.fecha_corte), financiera: true },
  { header: "Fecha de radicación en imagine", value: (f) => fecha(f.radicacion?.fecha_radicacion_1), financiera: true },
  { header: "Número de radicado Imagine", value: (f) => f.radicacion?.numero_radicado_1 ?? "", financiera: true },
  { header: "Novedades Imagine", value: (f) => f.radicacion?.novedades_1 ?? "", financiera: true },
  {
    header: "Fecha de radicación en imagine por segunda vez",
    value: (f) => fecha(f.radicacion?.fecha_radicacion_2),
    financiera: true,
  },
  {
    header: "Número de radicado Imagine por segunda vez",
    value: (f) => f.radicacion?.numero_radicado_2 ?? "",
    financiera: true,
  },
  { header: "Novedades Imagine por segunda vez", value: (f) => f.radicacion?.novedades_2 ?? "", financiera: true },
  { header: "Actualización SIPAB", value: (f) => f.radicacion?.actualizacion_sipab ?? "", financiera: true },
  { header: "Estado de facturación", value: (f) => f.facturacion?.estado_facturacion ?? "", financiera: true },
  { header: "Número de prefactura", value: (f) => f.facturacion?.numero_prefactura ?? "", financiera: true },
  { header: "Número de factura", value: (f) => f.facturacion?.numero_factura ?? "", financiera: true },
  { header: "Valor total cotizado", value: (f) => f.liquidacion?.valor_total_cotizado ?? null, money: true, financiera: true },
  { header: "Valor desplazamiento", value: (f) => f.liquidacion?.valor_desplazamiento ?? null, money: true, financiera: true },
  { header: "Gasto de servicio", value: (f) => f.liquidacion?.gasto_servicio ?? null, money: true, financiera: true },
  { header: "IVA", value: (f) => f.liquidacion?.iva ?? null, money: true, financiera: true },
  { header: "Valor antes de IVA", value: (f) => f.liquidacion?.valor_antes_iva ?? null, money: true, financiera: true },
  { header: "Retención Fuente", value: (f) => f.liquidacion?.retencion_fuente ?? null, money: true, financiera: true },
  { header: "Retención IVA", value: (f) => f.liquidacion?.retencion_iva ?? null, money: true, financiera: true },
  { header: "Total", value: (f) => f.liquidacion?.total ?? null, money: true, financiera: true },
  { header: "Ganacia", value: (f) => f.liquidacion?.ganancia ?? null, money: true, financiera: true },
];
