// Pantalla 2b: edición de página completa de una orden — datos generales
// (OrdenCampos) + las 11 secciones extendidas de "Información orden del
// servicio" (OrdenInfoSecciones), todo dentro de OrdenForm mode="existente".
// Mismo formulario que /ordenes/nueva, pero precargado y apuntando a
// guardarInformacionOrden en vez de createOrden.

import { notFound } from "next/navigation";
import { OrdenForm, type OrdenInfoFormValues } from "@/components/ordenes/orden-form";
import {
  getClientesParaSelect,
  getOrdenById,
  getProfesionalesParaSelect,
} from "@/lib/data/ordenes";
import { getCatalogosInfoOrden, getInfoOrdenCompleta } from "@/lib/data/info-orden";
import { getEmpresasUsuariasParaSelect } from "@/lib/data/empresas-usuarias";
import { getResponsablesSecParaSelect } from "@/lib/data/responsables-sec";
import type { ChecklistProcesoFormValues } from "@/lib/validations/info-orden.schema";
import type { EstadoOrden } from "@/lib/validations/orden.schema";

export default async function EditarOrdenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volver?: string }>;
}) {
  const { id } = await params;
  const { volver } = await searchParams;
  const ordenId = Number(id);
  if (!Number.isInteger(ordenId)) notFound();
  // "volver" trae los filtros/orden de /ordenes que ya estaban aplicados
  // cuando se entró a editar (ver hrefEditar en ordenes-table.tsx), para
  // que "Volver al listado" no los pierda.
  const backHref = volver ? `/ordenes?${volver}` : "/ordenes";

  const orden = await getOrdenById(ordenId);
  if (!orden) notFound();

  const [
    clientes,
    empresasUsuarias,
    responsablesSec,
    profesionales,
    catalogos,
    infoCompleta,
  ] = await Promise.all([
      getClientesParaSelect(),
      // incluirId: si la empresa de ESTA orden se marcó inactiva después, la
      // lista igual tiene que traerla — si no, el campo saldría vacío y
      // guardar le borraría el vínculo (ver lib/data/empresas-usuarias.ts).
      getEmpresasUsuariasParaSelect(orden.empresa_usuaria_id),
      // Mismo motivo con el responsable SEC de ESTA orden si se marcó inactivo
      // después (ver lib/data/responsables-sec.ts).
      getResponsablesSecParaSelect(orden.responsable_sec_id),
      getProfesionalesParaSelect(),
      getCatalogosInfoOrden(),
      getInfoOrdenCompleta(ordenId),
    ]);

  const {
    infoOrdenServicio,
    detalleEntrega,
    checklist,
    entregablesSeleccionados,
    cuentaCobro,
    actaServicio,
    radicacionImagine,
    facturacion,
    liquidacion,
  } = infoCompleta;

  const defaultValues: Partial<OrdenInfoFormValues> = {
    cliente_id: orden.cliente_id,
    estado: (orden.estado as EstadoOrden) ?? undefined,
    numero_os_cliente: orden.numero_os_cliente ?? undefined,
    fecha_recepcion_os: orden.fecha_recepcion_os ?? undefined,
    empresa_usuaria_id: orden.empresa_usuaria_id ?? undefined,
    nombre_empresa_usuaria: orden.nombre_empresa_usuaria ?? undefined,
    nit_empresa_usuaria: orden.nit_empresa_usuaria ?? undefined,
    cronograma: orden.cronograma ?? undefined,
    secuencia: orden.secuencia ?? undefined,
    nombre_servicio: orden.nombre_servicio ?? "",
    horas_cargadas: orden.horas_cargadas ?? undefined,
    tipo_servicio: (orden.tipo_servicio ?? undefined) as OrdenInfoFormValues["tipo_servicio"],
    fecha_sipab: orden.fecha_sipab ?? undefined,
    asesor_gestion_riesgos: orden.asesor_gestion_riesgos ?? undefined,
    observaciones_iniciales: orden.observaciones_iniciales ?? undefined,
    tarifa_valor_transporte: orden.tarifa_valor_transporte ?? undefined,
    responsable_sec_id: orden.responsable_sec_id ?? undefined,
    responsable_os: orden.responsable_os ?? undefined,
    observaciones_responsable_sec:
      orden.observaciones_responsable_sec ?? undefined,
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
    cuentaCobro: cuentaCobro
      ? {
          radicacion_cuenta: cuentaCobro.radicacion_cuenta ?? undefined,
          fecha_radicacion: cuentaCobro.fecha_radicacion ?? undefined,
          numero_radicado: cuentaCobro.numero_radicado ?? undefined,
          fecha_corte: cuentaCobro.fecha_corte ?? undefined,
          fecha_pago: cuentaCobro.fecha_pago ?? undefined,
          documento_soporte: cuentaCobro.documento_soporte ?? undefined,
          valor_cuenta_cobro: cuentaCobro.valor_cuenta_cobro ?? undefined,
        }
      : undefined,
    actaServicio: actaServicio
      ? {
          fecha_acta: actaServicio.fecha_acta ?? undefined,
          hora_acta: actaServicio.hora_acta ?? undefined,
          profesional_acta_id: actaServicio.profesional_acta_id ?? undefined,
        }
      : undefined,
    radicacionImagine: radicacionImagine
      ? {
          fecha_corte: radicacionImagine.fecha_corte ?? undefined,
          numero_radicado_1: radicacionImagine.numero_radicado_1 ?? undefined,
          fecha_radicacion_1: radicacionImagine.fecha_radicacion_1 ?? undefined,
          novedades_1: radicacionImagine.novedades_1 ?? undefined,
          numero_radicado_2: radicacionImagine.numero_radicado_2 ?? undefined,
          fecha_radicacion_2: radicacionImagine.fecha_radicacion_2 ?? undefined,
          novedades_2: radicacionImagine.novedades_2 ?? undefined,
          estado_imagine: radicacionImagine.estado_imagine ?? undefined,
          actualizacion_sipab: radicacionImagine.actualizacion_sipab ?? undefined,
        }
      : undefined,
    facturacion: facturacion
      ? {
          numero_prefactura: facturacion.numero_prefactura ?? undefined,
          numero_factura: facturacion.numero_factura ?? undefined,
          estado_facturacion: facturacion.estado_facturacion ?? undefined,
          alerta_facturacion: facturacion.alerta_facturacion ?? undefined,
        }
      : undefined,
    liquidacion: liquidacion
      ? {
          valor_total_cotizado: liquidacion.valor_total_cotizado ?? undefined,
          valor_desplazamiento: liquidacion.valor_desplazamiento ?? undefined,
          gasto_servicio: liquidacion.gasto_servicio ?? undefined,
          iva: liquidacion.iva ?? undefined,
          valor_antes_iva: liquidacion.valor_antes_iva ?? undefined,
          retencion_fuente: liquidacion.retencion_fuente ?? undefined,
          retencion_ica: liquidacion.retencion_ica ?? undefined,
          retencion_iva: liquidacion.retencion_iva ?? undefined,
          total: liquidacion.total ?? undefined,
          ganancia: liquidacion.ganancia ?? undefined,
        }
      : undefined,
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <OrdenForm
        mode="existente"
        titulo={`Editar orden ${orden.id_unico ?? `#${orden.id}`}`}
        backHref={backHref}
        ordenId={orden.id}
        defaultValues={defaultValues}
        clientes={clientes.map((c) => ({ id: c.id, label: c.nombre_cliente }))}
        empresasUsuarias={empresasUsuarias.map((e) => ({
          id: e.id,
          label: e.nombre,
          nit: e.nit,
        }))}
        responsablesSec={responsablesSec.map((r) => ({
          id: r.id,
          label: r.nombre_completo,
        }))}
        profesionales={profesionales.map((p) => ({
          id: p.id,
          label: p.nombre_completo,
          valorHora: p.valor_hora,
          cedula: p.cedula,
          telefono: p.telefono,
          email: p.email,
        }))}
        participantesArl={catalogos.participantesArl.map((p) => ({ id: p.id, label: p.nombre_completo }))}
        vobo={catalogos.vobo.map((v) => ({ id: v.id, label: v.nombre_completo }))}
        departamentos={catalogos.departamentos.map((d) => ({ id: d.id, label: d.nombre }))}
        ciudades={catalogos.ciudades.map((c) => ({
          id: c.id,
          label: c.nombre,
          departamentoId: c.departamento_id,
        }))}
        estadosEjecucion={catalogos.estadosEjecucion.map((e) => ({ id: e.id, label: e.nombre }))}
        entregablesEstandar={catalogos.entregablesEstandar.map((e) => ({ id: e.id, label: e.nombre }))}
      />
    </div>
  );
}
