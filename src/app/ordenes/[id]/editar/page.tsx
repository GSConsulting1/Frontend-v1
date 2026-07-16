// Pantalla 2b: edición de página completa de una orden — datos generales
// (OrdenCampos) + las 6 secciones extendidas de "Información orden del
// servicio" (OrdenInfoSecciones), todo dentro de OrdenForm mode="existente".
// Mismo formulario que /ordenes/nueva, pero precargado y apuntando a
// guardarInformacionOrden en vez de createOrden.

import { notFound } from "next/navigation";
import { OrdenForm, type OrdenInfoFormValues } from "@/components/ordenes/orden-form";
import {
  getClientesParaSelect,
  getEstadosParaSelect,
  getOrdenById,
  getProfesionalesParaSelect,
} from "@/lib/data/ordenes";
import { getCatalogosInfoOrden, getInfoOrdenCompleta } from "@/lib/data/info-orden";
import type { ChecklistProcesoFormValues } from "@/lib/validations/info-orden.schema";

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

  const [clientes, estados, profesionales, catalogos, infoCompleta] = await Promise.all([
    getClientesParaSelect(),
    getEstadosParaSelect(),
    getProfesionalesParaSelect(),
    getCatalogosInfoOrden(),
    getInfoOrdenCompleta(ordenId),
  ]);

  const { infoOrdenServicio, detalleEntrega, checklist, entregablesSeleccionados } = infoCompleta;

  const defaultValues: Partial<OrdenInfoFormValues> = {
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
    link_archivo_orden: orden.link_archivo_orden ?? undefined,
    infoOrdenServicio: infoOrdenServicio
      ? {
          fecha_emision_os: infoOrdenServicio.fecha_emision_os ?? undefined,
          ciudad_id: infoOrdenServicio.ciudad_id ?? undefined,
          actividad_reprogramada: infoOrdenServicio.actividad_reprogramada ?? undefined,
          profesional_id: infoOrdenServicio.profesional_id ?? undefined,
          empresa_a_visitar: infoOrdenServicio.empresa_a_visitar ?? undefined,
          nombre_actividad: infoOrdenServicio.nombre_actividad ?? undefined,
          descripcion_actividad: infoOrdenServicio.descripcion_actividad ?? undefined,
          horas_asignadas: infoOrdenServicio.horas_asignadas ?? undefined,
          fecha_inicio_ejecucion: infoOrdenServicio.fecha_inicio_ejecucion ?? undefined,
          fecha_fin_ejecucion: infoOrdenServicio.fecha_fin_ejecucion ?? undefined,
          direccion_empresa: infoOrdenServicio.direccion_empresa ?? undefined,
          ubicacion_google_maps: infoOrdenServicio.ubicacion_google_maps ?? undefined,
          hora_inicio: infoOrdenServicio.hora_inicio ?? undefined,
          hora_fin: infoOrdenServicio.hora_fin ?? undefined,
          contacto_nombre: infoOrdenServicio.contacto_nombre ?? undefined,
          contacto_cargo: infoOrdenServicio.contacto_cargo ?? undefined,
          contacto_celular: infoOrdenServicio.contacto_celular ?? undefined,
          contacto_email: infoOrdenServicio.contacto_email ?? undefined,
        }
      : undefined,
    detalleEntrega: detalleEntrega
      ? {
          entregables_especificos: detalleEntrega.entregables_especificos ?? undefined,
          fecha_cierre_orden: detalleEntrega.fecha_cierre_orden ?? undefined,
          profesional_vobo_id: detalleEntrega.profesional_vobo_id ?? undefined,
          comentarios_valor_acordado: detalleEntrega.comentarios_valor_acordado ?? undefined,
          envio_os_profesional: detalleEntrega.envio_os_profesional ?? undefined,
          recepcion_orden_servicio: detalleEntrega.recepcion_orden_servicio ?? undefined,
          participante_arl_id: detalleEntrega.participante_arl_id ?? undefined,
        }
      : undefined,
    valorHora: infoCompleta.valorHora != null ? { valor_hora_profesional: infoCompleta.valorHora } : undefined,
    checklist: {
      envio_at031: checklist?.envio_at031 ?? undefined,
      envio_at028: checklist?.envio_at028 ?? undefined,
      formatos: checklist?.formatos ?? undefined,
      estado_ejecucion_id: checklist?.estado_ejecucion_id ?? undefined,
      fecha_maxima_ejecucion: checklist?.fecha_maxima_ejecucion ?? undefined,
      entrega_soportes_profesional: checklist?.entrega_soportes_profesional ?? undefined,
      entrega_soportes_cliente: checklist?.entrega_soportes_cliente ?? undefined,
      fecha_maxima_entrega_soportes: checklist?.fecha_maxima_entrega_soportes ?? undefined,
      vobo_emitido: checklist?.vobo_emitido ?? false,
      cumplio_entrega_fecha: checklist?.cumplio_entrega_fecha ?? undefined,
      informe_guardian: (checklist?.informe_guardian ?? undefined) as
        ChecklistProcesoFormValues["informe_guardian"],
    },
    entregablesIds: entregablesSeleccionados,
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <OrdenForm
        mode="existente"
        titulo={`Editar orden ${orden.id_unico ?? `#${orden.id}`}`}
        ordenId={orden.id}
        defaultValues={defaultValues}
        clientes={clientes.map((c) => ({ id: c.id, label: c.nombre_cliente }))}
        estados={estados.map((e) => ({ id: e.id, label: e.nombre }))}
        profesionales={profesionales.map((p) => ({ id: p.id, label: p.nombre_completo }))}
        ciudades={catalogos.ciudades.map((c) => ({ id: c.id, label: c.nombre }))}
        estadosEjecucion={catalogos.estadosEjecucion.map((e) => ({ id: e.id, label: e.nombre }))}
        entregablesEstandar={catalogos.entregablesEstandar.map((e) => ({ id: e.id, label: e.nombre }))}
      />
    </div>
  );
}
