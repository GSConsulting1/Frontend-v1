// Alias de dominio sobre los tipos crudos de Supabase (src/types/database.types.ts).
//
// Por qué: si mañana cambia el nombre de una columna o se normaliza una tabla,
// el resto de la app (componentes, forms) sigue importando "OrdenServicio",
// "Cliente", etc. desde aquí — solo este archivo se entera del cambio real.

import type { Database } from "./database.types";

export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type Profesional = Database["public"]["Tables"]["profesionales"]["Row"];
export type EstadoOrden = Database["public"]["Tables"]["estados_orden"]["Row"];
export type OrdenServicio =
  Database["public"]["Tables"]["ordenes_servicio"]["Row"];

// Tipo "enriquecido" para el listado, con las relaciones ya resueltas
// (join con clientes y estados_orden vía la query de Supabase).
export type OrdenServicioConRelaciones = OrdenServicio & {
  cliente: Pick<Cliente, "id" | "nombre_cliente"> | null;
  estado: Pick<EstadoOrden, "id" | "nombre"> | null;
};

// Sección "Información orden del servicio" (Plan MVP semana 2): catálogos +
// tablas 1-a-1 con ordenes_servicio (PK = orden_id). Ver
// src/lib/data/info-orden.ts para las queries y src/components/ordenes/
// orden-info-secciones.tsx para dónde se usan.
export type Ciudad = Database["public"]["Tables"]["ciudades"]["Row"];
export type EstadoEjecucion =
  Database["public"]["Tables"]["estados_ejecucion"]["Row"];
export type EntregableEstandar =
  Database["public"]["Tables"]["entregables_estandar"]["Row"];
export type InfoOrdenServicio =
  Database["public"]["Tables"]["info_orden_servicio"]["Row"];
export type DetalleEntregaProfesional =
  Database["public"]["Tables"]["detalle_entrega_profesional"]["Row"];
export type ChecklistProceso =
  Database["public"]["Tables"]["checklist_proceso"]["Row"];
// Rol interino hasta que el login del Día 2 del plan MVP conecte con
// Supabase Auth — hoy `usuarios.rol` es un string sin enum en la BD.
export type RolUsuario = "admin" | "gestion_gs" | "profesional" | "lectura";

export type InfoOrdenServicioConRelaciones = InfoOrdenServicio & {
  ciudad: Pick<Ciudad, "id" | "nombre"> | null;
  profesional: Pick<Profesional, "id" | "nombre_completo" | "cedula" | "telefono"> | null;
};

export type DetalleEntregaProfesionalConRelaciones = DetalleEntregaProfesional & {
  profesional_vobo: Pick<Profesional, "id" | "nombre_completo"> | null;
  participante_arl: Pick<Profesional, "id" | "nombre_completo"> | null;
};

export type ChecklistProcesoConRelaciones = ChecklistProceso & {
  estado_ejecucion: Pick<EstadoEjecucion, "id" | "nombre"> | null;
};

// Lo que trae getInfoOrdenCompleta(ordenId): todas las tablas extendidas de
// una orden, null si todavía no tienen fila (orden recién creada).
export type OrdenInfoCompleta = {
  infoOrdenServicio: InfoOrdenServicioConRelaciones | null;
  detalleEntrega: DetalleEntregaProfesionalConRelaciones | null;
  checklist: ChecklistProcesoConRelaciones | null;
  entregablesSeleccionados: number[];
};
