// Pantalla 2a: crear una orden nueva — mismo formulario que
// /ordenes/[id]/editar (vía OrdenForm), pero sin datos precargados y con las
// secciones extendidas deshabilitadas (ver la nota en OrdenForm sobre
// orden_id como PK/FK). Al guardar los datos generales, createOrden
// redirige a /ordenes/{id}/editar.

import { OrdenForm } from "@/components/ordenes/orden-form";
import {
  getClientesParaSelect,
  getProfesionalesParaSelect,
  getParticipantesArlParaSelect,
} from "@/lib/data/ordenes";
import { getCatalogosInfoOrden } from "@/lib/data/info-orden";

export default async function NuevaOrdenPage() {
  const [clientes, profesionales, participantesArl, catalogos] =
    await Promise.all([
      getClientesParaSelect(),
      getProfesionalesParaSelect(),
      getParticipantesArlParaSelect(),
      getCatalogosInfoOrden(),
    ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <OrdenForm
        mode="nueva"
        titulo="Nueva orden"
        clientes={clientes.map((c) => ({ id: c.id, label: c.nombre_cliente }))}
        profesionales={profesionales.map((p) => ({
          id: p.id,
          label: p.nombre_completo,
        }))}
        participantesArl={participantesArl.map((p) => ({
          id: p.id,
          label: p.nombre_completo,
        }))}
        ciudades={catalogos.ciudades.map((c) => ({
          id: c.id,
          label: c.nombre,
        }))}
        estadosEjecucion={catalogos.estadosEjecucion.map((e) => ({
          id: e.id,
          label: e.nombre,
        }))}
        entregablesEstandar={catalogos.entregablesEstandar.map((e) => ({
          id: e.id,
          label: e.nombre,
        }))}
      />
    </div>
  );
}
