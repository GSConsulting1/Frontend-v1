// Alias de dominio sobre los tipos crudos de Supabase (src/types/database.types.ts).
//
// Por qué: si mañana cambia el nombre de una columna o se normaliza una tabla,
// el resto de la app (componentes, forms) sigue importando "OrdenServicio",
// "Cliente", etc. desde aquí — solo este archivo se entera del cambio real.

import type { Database } from "./database.types";

export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type Profesional = Database["public"]["Tables"]["profesionales"]["Row"];
export type OrdenServicio =
  Database["public"]["Tables"]["ordenes_servicio"]["Row"];

// `ordenes_servicio.estado` es un string con CHECK (no hay tabla
// `estados_orden` — ver ESTADO_ORDEN_OPCIONES en
// lib/validations/orden.schema.ts), así que ya viene resuelto en
// OrdenServicio: acá solo se agrega el cliente, que sí es una FK real.
export type OrdenServicioConRelaciones = OrdenServicio & {
  cliente: Pick<Cliente, "id" | "nombre_cliente"> | null;
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
// Salió de detalle_entrega_profesional a su propia tabla en
// supabase/002_usuarios_roles_rls.sql (RLS: solo administrador lee/escribe)
// — no se puede proteger una columna suelta con RLS, solo filas completas.
export type ValorHoraOrden = Database["public"]["Tables"]["valor_hora_orden"]["Row"];
// `usuarios.rol` es un string sin enum en la BD (solo tiene un CHECK), así
// que este union lo angosta a mano — valores tomados del CHECK real de la
// tabla `usuarios` en Supabase. Si se agrega/renombra un rol ahí, hay que
// reflejarlo acá también.
export type RolUsuario =
  | "administrador"
  | "programador"
  | "profesional"
  | "lectura"
  | "financiero";

// Perfil de src/components/auth/auth-provider.tsx (tabla `usuarios`, PK =
// auth.users.id). No confundir con Profesional: un usuario con rol
// "profesional" tiene profesional_id apuntando a su fila en esa tabla.
export type Usuario = Omit<
  Database["public"]["Tables"]["usuarios"]["Row"],
  "rol"
> & { rol: RolUsuario };

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
  // null tanto si la orden no tiene fila en valor_hora_orden como si el
  // usuario actual no es administrador (RLS filtra la fila entera).
  valorHora: number | null;
};
