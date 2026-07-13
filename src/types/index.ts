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
