// Datos de prueba para la sección "Información orden del servicio" (Plan MVP
// semana 2), usados por src/lib/data/info-orden.ts mientras Supabase no está
// configurado. Mismo criterio que src/lib/mock-data/ordenes.ts: misma forma
// que las filas reales (ver database.types.ts).
//
// Las órdenes 1 y 4 (ver mockOrdenes) tienen información extendida completa;
// las órdenes 2 y 3 no tienen ninguna fila todavía, a propósito, para poder
// probar el estado "sin definir" del acordeón contra datos mock.

import type {
  ActaServicio,
  ChecklistProceso,
  Ciudad,
  CuentaCobro,
  DetalleEntregaProfesional,
  EntregableEstandar,
  EstadoEjecucion,
  Facturacion,
  InfoOrdenServicio,
  Liquidacion,
  ParticipanteArl,
  RadicacionImagine,
  ValorHoraOrden,
  Vobo,
} from "@/types";

export const mockCiudades: Ciudad[] = [
  { id: 1, nombre: "Bogotá D.C.", departamento: "Cundinamarca" },
  { id: 2, nombre: "Medellín", departamento: "Antioquia" },
  { id: 3, nombre: "Cali", departamento: "Valle del Cauca" },
  { id: 4, nombre: "Barranquilla", departamento: "Atlántico" },
];

// Mismo seed del SQL en el Plan MVP.
export const mockEstadosEjecucion: EstadoEjecucion[] = [
  { id: 1, nombre: "Programada", orden_visual: 1 },
  { id: 2, nombre: "En ejecución", orden_visual: 2 },
  { id: 3, nombre: "Ejecutada", orden_visual: 3 },
  { id: 4, nombre: "Cancelada", orden_visual: 4 },
  { id: 5, nombre: "Pendiente programar", orden_visual: 5 },
];

export const mockEntregablesEstandar: EntregableEstandar[] = [
  { id: 1, nombre: "AT 031 Acta" },
  { id: 2, nombre: "AT 028 asistencia" },
  { id: 3, nombre: "Informe" },
  { id: 4, nombre: "Planilla de prestación de servicio" },
];

export const mockInfoOrdenServicio: InfoOrdenServicio[] = [
  {
    orden_id: 1,
    consecutivo_os_profesional: 1001,
    fecha_emision_os: "2026-06-14",
    ciudad_id: 1,
    actividad_reprogramada: false,
    profesional_id: 1,
    empresa_a_visitar: "Bolívar Seguros S.A. — Sede principal",
    nombre_actividad: "Examen médico ocupacional de ingreso",
    descripcion_actividad:
      "Valoración médica a personal nuevo antes de iniciar labores.",
    horas_asignadas: 2,
    fecha_inicio_ejecucion: "2026-06-15",
    fecha_fin_ejecucion: "2026-06-15",
    direccion_empresa: "Cra. 7 #26-20, Bogotá",
    ubicacion_google_maps: "https://maps.google.com/?q=4.617,-74.068",
    hora_inicio: "08:00",
    hora_fin: "10:00",
    contacto_nombre: "Diana Ramírez",
    contacto_cargo: "Coordinadora de Talento Humano",
    contacto_celular: "3105551234",
    contacto_email: "diana.ramirez@bolivarseguros.com",
  },
  {
    orden_id: 4,
    consecutivo_os_profesional: 1002,
    fecha_emision_os: "2026-06-19",
    ciudad_id: 1,
    actividad_reprogramada: false,
    profesional_id: 3,
    empresa_a_visitar: "Bolívar Seguros S.A. — Bodega Norte",
    nombre_actividad: "Visita de inspección de riesgos locativos",
    descripcion_actividad: null,
    horas_asignadas: 3,
    fecha_inicio_ejecucion: "2026-06-22",
    fecha_fin_ejecucion: null,
    direccion_empresa: "Autopista Norte #170-45, Bogotá",
    ubicacion_google_maps: null,
    hora_inicio: "09:00",
    hora_fin: null,
    contacto_nombre: "Julián Rojas",
    contacto_cargo: "Coordinador HSEQ",
    contacto_celular: "3005551234",
    contacto_email: "j.rojas@bolivarseguros.com",
  },
];

// Catálogo fijo y separado de mockProfesionales (equipo ARL/seguridad) —
// referenciado por detalleEntrega.participante_arl_id y
// actaServicio.profesional_acta_id.
export const mockParticipantesArl: ParticipanteArl[] = [
  {
    id: 1,
    nombre_completo: "Andrés Felipe Castro",
    cedula: "1012345678",
    activo: true,
    fecha_creacion: "2026-01-05T08:00:00Z",
  },
  {
    id: 3,
    nombre_completo: "Marcela Duarte",
    cedula: "1023456789",
    activo: true,
    fecha_creacion: "2026-01-10T08:00:00Z",
  },
];

// Catálogo de personal interno de GS Group que da el "VoBo" — distinto de
// mockProfesionales (equipo de campo) y de mockParticipantesArl (equipo
// ARL/seguridad). Referenciado por detalleEntrega.profesional_vobo_id.
export const mockVobo: Vobo[] = [
  {
    id: 1,
    nombre_completo: "Bibiana Sarmiento",
    email: "gerencia@gsgroupsas.com",
    celular: "3116262903",
    activo: true,
    fecha_creacion: "2026-01-05T08:00:00Z",
  },
  {
    id: 2,
    nombre_completo: "Johanna Reyes",
    email: "Fisioterapia@gsgroupsas.com",
    celular: "3214338961",
    activo: true,
    fecha_creacion: "2026-01-05T08:00:00Z",
  },
  {
    id: 3,
    nombre_completo: "Lucia Bejarano Moncada",
    email: "administrativo@gsgroupsas.com",
    celular: "3506283556",
    activo: true,
    fecha_creacion: "2026-01-05T08:00:00Z",
  },
  {
    id: 4,
    nombre_completo: "Yulieth Amell",
    email: "consultoria@gsgroupsas.com",
    celular: "3107220381",
    activo: true,
    fecha_creacion: "2026-01-05T08:00:00Z",
  },
  {
    id: 5,
    nombre_completo: "Abigail Dorado",
    email: "psicologia@gsgroupsas.com",
    celular: "3008825524",
    activo: true,
    fecha_creacion: "2026-01-05T08:00:00Z",
  },
  {
    id: 6,
    nombre_completo: "Rocio Velandia",
    email: "seguridadindustrial@gsgroupsas.com",
    celular: "3222707215",
    activo: true,
    fecha_creacion: "2026-01-05T08:00:00Z",
  },
  {
    id: 7,
    nombre_completo: "Lina Amell",
    email: "administrativo@gsgroupsas.com",
    celular: "3042583780",
    activo: true,
    fecha_creacion: "2026-01-05T08:00:00Z",
  },
];

export const mockDetalleEntregaProfesional: DetalleEntregaProfesional[] = [
  {
    orden_id: 1,
    entregables_especificos: "Certificado de aptitud médica ocupacional.",
    fecha_cierre_orden: "2026-06-16",
    profesional_vobo_id: 1,
    comentarios_valor_acordado: "Tarifa estándar, incluye transporte.",
    envio_os_profesional: true,
    recepcion_orden_servicio: true,
    participante_arl_id: null,
  },
  {
    orden_id: 4,
    entregables_especificos: null,
    fecha_cierre_orden: null,
    profesional_vobo_id: null,
    comentarios_valor_acordado: null,
    envio_os_profesional: true,
    recepcion_orden_servicio: false,
    participante_arl_id: 3,
  },
];

// Tabla aparte desde supabase/002_usuarios_roles_rls.sql (ver
// lib/validations/info-orden.schema.ts).
export const mockValorHoraOrden: ValorHoraOrden[] = [
  { orden_id: 1, valor_hora_profesional: 65000 },
  { orden_id: 4, valor_hora_profesional: 85000 },
];

export const mockChecklistProceso: ChecklistProceso[] = [
  {
    orden_id: 1,
    envio_at031: true,
    envio_at028: true,
    formatos: true,
    estado_ejecucion_id: 3,
    fecha_maxima_ejecucion: "2026-06-15",
    entrega_soportes_profesional: true,
    entrega_soportes_cliente: true,
    fecha_maxima_entrega_soportes: "2026-06-18",
    vobo_emitido: true,
    cumplio_entrega_fecha: true,
    informe_guardian: "Aprobado",
  },
  {
    orden_id: 4,
    envio_at031: false,
    envio_at028: false,
    formatos: true,
    estado_ejecucion_id: 2,
    fecha_maxima_ejecucion: "2026-06-24",
    entrega_soportes_profesional: false,
    entrega_soportes_cliente: false,
    fecha_maxima_entrega_soportes: null,
    vobo_emitido: false,
    cumplio_entrega_fecha: null,
    informe_guardian: "Pendiente de aprobación",
  },
];

export const mockOrdenEntregablesEstandar: { orden_id: number; entregable_id: number }[] = [
  { orden_id: 1, entregable_id: 1 },
  { orden_id: 1, entregable_id: 3 },
  { orden_id: 4, entregable_id: 3 },
];

// Sección financiera (5 tablas más, mismo criterio: orden 1 completa, orden
// 4 parcial, órdenes 2 y 3 sin fila) — ver lib/validations/info-orden.schema.ts.
export const mockCuentaCobro: CuentaCobro[] = [
  {
    orden_id: 1,
    radicacion_cuenta: true,
    fecha_radicacion: "2026-06-17",
    numero_radicado: "RAD-CC-2026-0117",
    fecha_corte: "2026-06-15",
    corte_pago: "1ra Quincena mes actual",
    fecha_pago: "2026-06-30",
    documento_soporte: "CC-1001.pdf",
    valor_cuenta_cobro: 130000,
  },
  {
    orden_id: 4,
    radicacion_cuenta: false,
    fecha_radicacion: null,
    numero_radicado: null,
    fecha_corte: null,
    corte_pago: null,
    fecha_pago: null,
    documento_soporte: null,
    valor_cuenta_cobro: null,
  },
];

export const mockActaServicio: ActaServicio[] = [
  { orden_id: 1, fecha_acta: "2026-06-15", hora_acta: "10:00", profesional_acta_id: 1 },
  { orden_id: 4, fecha_acta: null, hora_acta: null, profesional_acta_id: null },
];

export const mockRadicacionImagine: RadicacionImagine[] = [
  {
    orden_id: 1,
    numero_radicado_1: "RAD-2026-0456",
    fecha_radicacion_1: "2026-06-16",
    novedades_1: null,
    numero_radicado_2: null,
    fecha_radicacion_2: null,
    novedades_2: null,
    estado_imagine: "Aprobado",
    actualizacion_sipab: "2026-06-18",
  },
  {
    orden_id: 4,
    numero_radicado_1: null,
    fecha_radicacion_1: null,
    novedades_1: null,
    numero_radicado_2: null,
    fecha_radicacion_2: null,
    novedades_2: null,
    estado_imagine: null,
    actualizacion_sipab: null,
  },
];

export const mockFacturacion: Facturacion[] = [
  {
    orden_id: 1,
    numero_prefactura: "PRE-1001",
    numero_factura: "FAC-2026-0789",
    estado_facturacion: "Facturada",
    alerta_facturacion: null,
  },
  {
    orden_id: 4,
    numero_prefactura: null,
    numero_factura: null,
    estado_facturacion: "Pendiente prefactura",
    alerta_facturacion: null,
  },
];

export const mockLiquidacion: Liquidacion[] = [
  {
    orden_id: 1,
    valor_total_cotizado: 130000,
    valor_desplazamiento: 15000,
    gasto_servicio: 0,
    iva: 19000,
    valor_antes_iva: 100000,
    retencion_fuente: 4000,
    retencion_ica: 1160,
    retencion_iva: 0,
    total: 130000,
    ganancia: 35000,
  },
  {
    orden_id: 4,
    valor_total_cotizado: null,
    valor_desplazamiento: null,
    gasto_servicio: null,
    iva: null,
    valor_antes_iva: null,
    retencion_fuente: null,
    retencion_ica: null,
    retencion_iva: null,
    total: null,
    ganancia: null,
  },
];
