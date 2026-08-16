// Pantalla 1: listado de órdenes de servicio, de solo lectura.
// Server Component (async function) — hace el fetch inicial (con filtros vía
// searchParams) y renderiza la tabla directamente. "Nueva orden" y "Editar"
// son links a /ordenes/nueva y /ordenes/{id}/editar (ver OrdenForm) — ya no
// hay estado de "guardar cambios" que gobernar en un Client Component
// intermedio, así que no hace falta OrdenesManager.

import { OrdenesListado } from "@/components/ordenes/ordenes-listado";
import {
  getOrdenes,
  getClientesParaSelect,
  type OrdenesFiltros,
} from "@/lib/data/ordenes";
import { getPerfilActual } from "@/lib/data/usuarios";
import { getResponsablesSecTodos } from "@/lib/data/responsables-sec";

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{
    clienteId?: string;
    desde?: string;
    hasta?: string;
    numeroOs?: string;
    nombreEmpresa?: string;
    asesorGestionRiesgos?: string;
    tipoServicio?: string;
    estado?: string;
    responsableOs?: string;
    secuencia?: string;
    cronograma?: string;
    fechaEjecucionDesde?: string;
    fechaEjecucionHasta?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const params = await searchParams;
  const cronograma = params.cronograma ? Number(params.cronograma) : undefined;
  const COLUMNAS_ORDENABLES = [
    "numero_os_cliente",
    "fecha_sipab",
    "secuencia",
  ] as const;
  const sortBy = COLUMNAS_ORDENABLES.find((c) => c === params.sort);
  const filtros: OrdenesFiltros = {
    clienteIds: params.clienteId?.split(",").filter(Boolean).map(Number),
    desde: params.desde || undefined,
    hasta: params.hasta || undefined,
    numeroOs: params.numeroOs || undefined,
    nombreEmpresa: params.nombreEmpresa || undefined,
    asesorGestionRiesgos: params.asesorGestionRiesgos || undefined,
    tiposServicio: params.tipoServicio?.split(",").filter(Boolean),
    estados: params.estado?.split(",").filter(Boolean),
    responsablesOs: params.responsableOs?.split(",").filter(Boolean),
    secuencia: params.secuencia || undefined,
    cronograma: cronograma != null && !Number.isNaN(cronograma) ? cronograma : undefined,
    fechaEjecucionDesde: params.fechaEjecucionDesde || undefined,
    fechaEjecucionHasta: params.fechaEjecucionHasta || undefined,
    sortBy,
    sortDir: params.dir === "asc" ? ("asc" as const) : ("desc" as const),
  };

  // No-administradores solo ven las órdenes de su propio profesional
  // (cruce por email contra profesionales.email vía
  // info_orden_servicio.profesional_id) — ver getOrdenes() en lib/data/ordenes.ts.
  // getPerfilActual() devuelve null sin sesión real (o en modo mock sin
  // Supabase configurado), así que ahí no se restringe nada.
  const perfil = await getPerfilActual();
  if (perfil && perfil.rol !== "administrador" && perfil.email) {
    filtros.profesionalEmail = perfil.email;
  }

  const [ordenes, clientes, responsablesSec] = await Promise.all([
    getOrdenes(filtros),
    getClientesParaSelect(),
    // Todos, no solo los activos: si alguien se marcó inactivo sus órdenes
    // siguen en el listado y hay que poder filtrarlas por su nombre.
    getResponsablesSecTodos(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <OrdenesListado
        ordenes={ordenes}
        clientes={clientes}
        responsablesSec={responsablesSec.map((r) => r.nombre_completo)}
      />
    </div>
  );
}
