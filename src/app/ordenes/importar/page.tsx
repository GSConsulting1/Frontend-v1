import { ImportarOrdenesForm } from "@/components/ordenes/importar-ordenes-form";
import { getClientesParaSelect } from "@/lib/data/ordenes";

// El Excel de cronograma lo manda siempre el mismo cliente (la ARL), así que
// se preselecciona para no tener que elegirlo a mano en cada importación.
//
// Se busca por NOMBRE y no por un id fijo: antes acá había un `= 10`, que es
// el id de ese cliente en el proyecto remoto y no existe en la base local ni
// en cualquier entorno nuevo. Como el id igual quedaba seteado, el formulario
// dejaba avanzar y la importación fallaba recién al insertar, con un error de
// foreign key por cada fila. Si no aparece, no se preselecciona nada y el
// botón "Previsualizar" queda deshabilitado hasta que se elija un cliente.
const NOMBRE_CLIENTE_PREDETERMINADO = "BOLIVAR";

function sinAcentos(texto: string): string {
  // \u0300-\u036f = marcas diacríticas que NFD separa de su letra base, para
  // que "BOLÍVAR" y "BOLIVAR" comparen igual. Escapadas y no literales: son
  // caracteres invisibles en el editor.
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export default async function ImportarOrdenesPage() {
  const clientes = await getClientesParaSelect();

  const clienteIdPredeterminado = clientes.find((c) =>
    sinAcentos(c.nombre_cliente).includes(NOMBRE_CLIENTE_PREDETERMINADO),
  )?.id;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <ImportarOrdenesForm
        clientes={clientes.map((c) => ({ id: c.id, label: c.nombre_cliente }))}
        clienteIdPredeterminado={clienteIdPredeterminado}
      />
    </div>
  );
}
