// Alias de dominio sobre los tipos crudos de Supabase (src/types/database.types.ts).
//
// Por qué: si mañana cambia el nombre de una columna o se normaliza una tabla,
// el resto de la app (componentes, forms) sigue importando "OrdenServicio",
// "Cliente", etc. desde aquí — solo este archivo se entera del cambio real.

import type { Database } from "./database.types";

export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
// La empresa donde se ejecuta el servicio, distinta del `Cliente` que lo
// contrata y paga (una aseguradora puede contratar una orden para decenas de
// empresas usuarias). Hasta la migración
// 20260815123716_catalogo_empresas_usuarias.sql esto vivía como dos varchar
// sueltos en cada orden; ahora es tabla propia y `ordenes_servicio` la
// referencia por `empresa_usuaria_id`.
export type EmpresaUsuaria =
  Database["public"]["Tables"]["empresas_usuarias"]["Row"];
// Para el listado: la empresa + cuántas órdenes la referencian. El conteo no
// es una columna, sale de un embedded aggregate de PostgREST — se normaliza a
// number en lib/data/empresas-usuarias.ts para que la UI no vea la forma
// `{ ordenes_servicio: [{ count }] }` que devuelve Supabase.
export type EmpresaUsuariaConConteo = EmpresaUsuaria & { ordenes: number };
export type Profesional = Database["public"]["Tables"]["profesionales"]["Row"];
// Catálogo fijo y separado de profesionales: equipo ARL/seguridad que firma
// el detalle de entrega y el acta de servicio (ver participante_arl_id /
// profesional_acta_id más abajo).
export type ParticipanteArl =
  Database["public"]["Tables"]["participantes_arl"]["Row"];
// Catálogo de personal interno de GS Group que firma el "VoBo" en Detalle de
// entrega (detalle_entrega_profesional.profesional_vobo_id) — antes esa FK
// apuntaba por error a `profesionales` (equipo de campo), se migró a esta
// tabla propia porque son personas distintas (staff administrativo, no
// quien ejecuta la orden).
export type Vobo = Database["public"]["Tables"]["vobo"]["Row"];
// Catálogo de quién responde por una orden dentro de GS Group ("Responsable SEC
// para GS"). Hasta la migración 20260816001045_catalogo_responsables_sec.sql
// esto era un varchar con un CHECK de 8 nombres escritos a mano en el esquema;
// ahora es tabla propia y `ordenes_servicio` la referencia por
// `responsable_sec_id`. Distinta de `Vobo` (quien da el visto bueno) aunque
// varias personas estén en las dos: son dos roles, no uno.
export type ResponsableSec =
  Database["public"]["Tables"]["responsables_sec"]["Row"];
// Para el listado: la persona + cuántas órdenes la referencian. Mismo embedded
// aggregate de PostgREST que EmpresaUsuariaConConteo, normalizado a number en
// lib/data/responsables-sec.ts.
export type ResponsableSecConConteo = ResponsableSec & { ordenes: number };
export type OrdenServicio =
  Database["public"]["Tables"]["ordenes_servicio"]["Row"];

// Tipo "enriquecido" para el listado, con las relaciones ya resueltas (join
// con clientes vía la query de Supabase). `ordenes_servicio.estado` es un
// string con CHECK (no hay tabla `estados_orden` — ver
// ESTADO_ORDEN_OPCIONES en lib/validations/orden.schema.ts), así que ya
// viene resuelto en OrdenServicio: acá solo se agrega el cliente, que sí es
// una FK real.
export type OrdenServicioConRelaciones = OrdenServicio & {
  cliente: Pick<Cliente, "id" | "nombre_cliente"> | null;
  // Solo lectura acá: la fuente de verdad es checklist_proceso.estado_ejecucion_id,
  // editable desde "Checklist del proceso" (ver checklist.tsx) — el listado
  // solo lo muestra para dar contexto, no permite editarlo.
  checklist: {
    estado_ejecucion: Pick<EstadoEjecucion, "id" | "nombre"> | null;
  } | null;
};

// Sección "Información orden del servicio" (Plan MVP semana 2): catálogos +
// tablas 1-a-1 con ordenes_servicio (PK = orden_id). Ver
// src/lib/data/info-orden.ts para las queries y src/components/ordenes/
// orden-info-secciones.tsx para dónde se usan.
// `ciudades` guarda los 1.104 municipios del país, no solo capitales, y
// `departamentos` los 33 (32 + Bogotá D.C.) con el código DANE como id. El
// nombre de la tabla sigue siendo "ciudades" —y el label de negocio, "Ciudad"—
// aunque el nombre de dominio correcto sería "municipios": renombrarla
// obligaría a tocar tipos, formularios, PDF, Excel y mocks a cambio de nada
// funcional, con un FK con órdenes reales colgando.
export type Departamento = Database["public"]["Tables"]["departamentos"]["Row"];
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
export type ValorHoraOrden =
  Database["public"]["Tables"]["valor_hora_orden"]["Row"];
// `usuarios.rol` es un string sin enum en la BD (solo tiene un CHECK), así
// que este union lo angosta a mano — valores tomados del CHECK real de
// supabase/002_usuarios_roles_rls.sql. Si se agrega/renombra un rol ahí, hay
// que reflejarlo acá también.
export type RolUsuario =
  | "administrador"
  | "programador"
  | "profesional"
  | "lectura"
  | "financiero"
  | "talento";

// Perfil de src/components/auth/auth-provider.tsx (tabla `usuarios`, PK =
// auth.users.id). No confundir con Profesional: un usuario con rol
// "profesional" tiene profesional_id apuntando a su fila en esa tabla.
export type Usuario = Omit<
  Database["public"]["Tables"]["usuarios"]["Row"],
  "rol"
> & { rol: RolUsuario };

export type InfoOrdenServicioConRelaciones = InfoOrdenServicio & {
  ciudad: Pick<Ciudad, "id" | "nombre"> | null;
  profesional: Pick<
    Profesional,
    "id" | "nombre_completo" | "cedula" | "telefono"
  > | null;
};

export type DetalleEntregaProfesionalConRelaciones =
  DetalleEntregaProfesional & {
    profesional_vobo: Pick<Vobo, "id" | "nombre_completo"> | null;
    participante_arl: Pick<ParticipanteArl, "id" | "nombre_completo"> | null;
  };

export type ChecklistProcesoConRelaciones = ChecklistProceso & {
  estado_ejecucion: Pick<EstadoEjecucion, "id" | "nombre"> | null;
};

// Sección financiera: 5 tablas más 1-a-1 con ordenes_servicio (PK =
// orden_id), agregadas por la migración que crea las policies
// "admin_fin_valor_hora" / "fin_all" — RLS ahí permite leer/escribir solo a
// administrador y financiero (ver RolUsuario arriba).
export type CuentaCobro = Database["public"]["Tables"]["cuenta_cobro"]["Row"];
export type ActaServicio = Database["public"]["Tables"]["acta_servicio"]["Row"];
export type RadicacionImagine =
  Database["public"]["Tables"]["radicacion_imagine"]["Row"];
export type Facturacion = Database["public"]["Tables"]["facturacion"]["Row"];
export type Liquidacion = Database["public"]["Tables"]["liquidacion"]["Row"];

export type ActaServicioConRelaciones = ActaServicio & {
  profesional_acta: Pick<ParticipanteArl, "id" | "nombre_completo"> | null;
};

// Lo que trae getInfoOrdenCompleta(ordenId): todas las tablas extendidas de
// una orden, null si todavía no tienen fila (orden recién creada).
export type OrdenInfoCompleta = {
  infoOrdenServicio: InfoOrdenServicioConRelaciones | null;
  detalleEntrega: DetalleEntregaProfesionalConRelaciones | null;
  checklist: ChecklistProcesoConRelaciones | null;
  entregablesSeleccionados: number[];
  // null tanto si la orden no tiene fila en valor_hora_orden como si el
  // usuario actual no es administrador ni financiero (RLS filtra la fila
  // entera).
  valorHora: number | null;
  // Mismo criterio que valorHora: null si no hay fila o si el usuario
  // actual no es administrador ni financiero.
  cuentaCobro: CuentaCobro | null;
  actaServicio: ActaServicioConRelaciones | null;
  radicacionImagine: RadicacionImagine | null;
  facturacion: Facturacion | null;
  liquidacion: Liquidacion | null;
};
