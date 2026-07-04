// Pantalla 2b: mismo formulario que /ordenes/nueva, pero precargado con la
// orden existente y apuntando a updateOrden en vez de createOrden (ambos
// vía OrdenForm, que ya sabe cuál Server Action llamar según `mode`).

import Link from "next/link";
import { notFound } from "next/navigation";
import { OrdenForm } from "@/components/ordenes/orden-form";
import {
  getClientesParaSelect,
  getEstadosParaSelect,
  getOrdenById,
  getProfesionalesParaSelect,
} from "@/lib/data/ordenes";
import type { OrdenServicioFormValues } from "@/lib/validations/orden.schema";

export default async function EditarOrdenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ordenId = Number(id);
  if (!Number.isInteger(ordenId)) notFound();

  const orden = await getOrdenById(ordenId);
  if (!orden) notFound();

  const [clientes, estados, profesionales] = await Promise.all([
    getClientesParaSelect(),
    getEstadosParaSelect(),
    getProfesionalesParaSelect(),
  ]);

  const defaultValues: Partial<OrdenServicioFormValues> = {
    cliente_id: orden.cliente_id,
    estado_id: orden.estado_id ?? undefined,
    numero_os_cliente: orden.numero_os_cliente ?? undefined,
    fecha_recepcion_os: orden.fecha_recepcion_os ?? undefined,
    nombre_empresa_usuaria: orden.nombre_empresa_usuaria ?? undefined,
    nit_empresa_usuaria: orden.nit_empresa_usuaria ?? undefined,
    cronograma: orden.cronograma ?? undefined,
    secuencia: orden.secuencia ?? undefined,
    nombre_servicio: orden.nombre_servicio ?? "",
    horas_cargadas: orden.horas_cargadas ?? undefined,
    tipo_servicio: orden.tipo_servicio ?? undefined,
    fecha_sipab: orden.fecha_sipab ?? undefined,
    asesor_gestion_riesgos_id: orden.asesor_gestion_riesgos_id ?? undefined,
    observaciones_iniciales: orden.observaciones_iniciales ?? undefined,
    tarifa_valor_transporte: orden.tarifa_valor_transporte ?? undefined,
    responsable_sec_id: orden.responsable_sec_id ?? undefined,
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/ordenes" className="text-sm text-muted-foreground hover:underline">
          ← Volver al listado
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Editar orden {orden.id_unico ?? `#${orden.id}`}
        </h1>
      </div>

      <OrdenForm
        mode="editar"
        ordenId={orden.id}
        defaultValues={defaultValues}
        clientes={clientes.map((c) => ({ id: c.id, label: c.nombre_cliente }))}
        estados={estados.map((e) => ({ id: e.id, label: e.nombre }))}
        profesionales={profesionales.map((p) => ({ id: p.id, label: p.nombre_completo }))}
      />
    </div>
  );
}
