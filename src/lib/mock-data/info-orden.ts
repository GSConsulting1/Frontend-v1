// Datos de prueba para la sección "Información orden del servicio" (Plan MVP
// semana 2), usados por src/lib/data/info-orden.ts mientras Supabase no está
// configurado. Mismo criterio que src/lib/mock-data/ordenes.ts: misma forma
// que las filas reales (ver database.types.ts).
//
// Las órdenes 1 y 4 (ver mockOrdenes) tienen información extendida completa;
// las órdenes 2 y 3 no tienen ninguna fila todavía, a propósito, para poder
// probar el estado "sin definir" del acordeón contra datos mock.

import type {
  ChecklistProceso,
  Ciudad,
  DetalleEntregaProfesional,
  EntregableEstandar,
  EstadoEjecucion,
  InfoOrdenServicio,
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
    valor_hora_profesional: 65000,
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
    valor_hora_profesional: 85000,
  },
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
