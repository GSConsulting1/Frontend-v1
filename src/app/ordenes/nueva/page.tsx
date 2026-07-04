// Pantalla 2a: creación de una orden nueva. Server Component que precarga
// las opciones de los <select> y le pasa el trabajo a OrdenForm (Client
// Component), que a su vez llama a la Server Action createOrden.

import Link from "next/link";
import { OrdenForm } from "@/components/ordenes/orden-form";
import {
  getClientesParaSelect,
  getEstadosParaSelect,
  getProfesionalesParaSelect,
} from "@/lib/data/ordenes";

export default async function NuevaOrdenPage() {
  const [clientes, estados, profesionales] = await Promise.all([
    getClientesParaSelect(),
    getEstadosParaSelect(),
    getProfesionalesParaSelect(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/ordenes" className="text-sm text-muted-foreground hover:underline">
          ← Volver al listado
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Nueva orden de servicio</h1>
      </div>

      <OrdenForm
        mode="crear"
        clientes={clientes.map((c) => ({ id: c.id, label: c.nombre_cliente }))}
        estados={estados.map((e) => ({ id: e.id, label: e.nombre }))}
        profesionales={profesionales.map((p) => ({ id: p.id, label: p.nombre_completo }))}
      />
    </div>
  );
}
