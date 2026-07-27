import { ImportarOrdenesForm } from "@/components/ordenes/importar-ordenes-form";
import { getClientesParaSelect } from "@/lib/data/ordenes";

const CLIENTE_PREDETERMINADO_ID = 10;

export default async function ImportarOrdenesPage() {
  const clientes = await getClientesParaSelect();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <ImportarOrdenesForm
        clientes={clientes.map((c) => ({ id: c.id, label: c.nombre_cliente }))}
        clienteIdPredeterminado={CLIENTE_PREDETERMINADO_ID}
      />
    </div>
  );
}
