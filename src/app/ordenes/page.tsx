// Pantalla 1: listado de órdenes de servicio, de solo lectura.
// Server Component (async function) — hace el fetch inicial (con filtros vía
// searchParams) y renderiza la tabla directamente. "Nueva orden" y "Editar"
// son links a /ordenes/nueva y /ordenes/{id}/editar (ver OrdenForm) — ya no
// hay estado de "guardar cambios" que gobernar en un Client Component
// intermedio, así que no hace falta OrdenesManager.

import { AlertTriangle } from "lucide-react";
import { OrdenesListado } from "@/components/ordenes/ordenes-listado";
import {
  getOrdenes,
  getClientesParaSelect,
  type OrdenesFiltros,
} from "@/lib/data/ordenes";
import {
  getResponsablesSecTodos,
  normalizarEmailResponsable,
} from "@/lib/data/responsables-sec";
import { getPerfilActual } from "@/lib/data/usuarios";

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

  const [ordenes, clientes, responsablesSec, perfil] = await Promise.all([
    getOrdenes(filtros),
    getClientesParaSelect(),
    // Todos, no solo los activos: si una casilla se marcó inactiva sus órdenes
    // siguen en el listado y hay que poder filtrarlas por su email.
    getResponsablesSecTodos(),
    getPerfilActual(),
  ]);

  // Un `programador` ve solo las órdenes de su casilla de responsable SEC — eso
  // lo impone RLS, no este archivo (ver
  // 20260819022820_visibilidad_ordenes_programador_por_casilla.sql). Pero si su
  // email no está en el catálogo, la policy no le deja ver NINGUNA, y un listado
  // vacío sin explicación es indistinguible de un bug: es el síntoma exacto que
  // hizo revertir el primer intento de esta feature (f859863).
  //
  // Así que lo único que hace el front acá es EXPLICAR el vacío. No filtra ni
  // decide nada: si esta condición se calculara mal, se mostraría un cartel de
  // más o de menos, nunca una orden de más.
  //
  // `perfil` es null en modo mock (sin Supabase) — ahí no hay sesión ni RLS, así
  // que no hay nada que avisar.
  const emailPerfil = perfil?.email
    ? normalizarEmailResponsable(perfil.email)
    : null;
  const programadorSinCasilla =
    perfil?.rol === "programador" &&
    !responsablesSec.some(
      (r) => normalizarEmailResponsable(r.email) === emailPerfil,
    );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      {programadorSinCasilla && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Tu cuenta ({perfil?.email ?? "sin email"}) no está registrada como
            responsable SEC, así que todavía no tenés órdenes asignadas. Pedile a
            un administrador que dé de alta tu correo en Profesionales →
            Responsables SEC.
          </span>
        </p>
      )}
      <OrdenesListado
        ordenes={ordenes}
        clientes={clientes}
        responsablesSec={responsablesSec.map((r) => r.email)}
      />
    </div>
  );
}
