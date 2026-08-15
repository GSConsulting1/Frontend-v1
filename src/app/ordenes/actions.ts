// Server Actions ("use server") para mutar órdenes de servicio — el único
// lugar que escribe en Supabase para esta entidad. No hace falta crear
// app/api/ordenes/route.ts: los componentes llaman a estas funciones
// directamente desde el cliente, sin pasar por una API REST propia
// (coherente con la decisión del plan de no escribir backend CRUD manual).
//
// Todas vuelven a validar con el schema de Zod (nunca confiar solo en la
// validación que ya corrió en el cliente).
//
// createOrden es la única que redirige — la usa /ordenes/nueva al guardar
// los datos generales por primera vez, llevando al usuario a
// /ordenes/{id}/editar donde ya se pueden llenar las secciones extendidas.
// guardarInformacionOrden es la que usa /ordenes/[id]/editar: guarda, en una
// sola llamada, tanto los datos generales como las 6 secciones extendidas de
// "Información orden del servicio" (un solo botón "Guardar" en el form) y no
// redirige. eliminarOrden es la única mutación que todavía se dispara desde
// la tabla de /ordenes.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ordenServicioSchema,
  campoOrdenInlineSchema,
  type CampoOrdenInlinePatch,
  type OrdenServicioFormValues,
} from "@/lib/validations/orden.schema";
import { ordenInfoExtendidaSchema } from "@/lib/validations/info-orden.schema";
import {
  createOrdenRecord,
  updateOrdenRecord,
  deleteOrdenRecord,
  actualizarCampoOrdenRecord,
  getNumerosOsExistentes,
  getClientesParaSelect,
} from "@/lib/data/ordenes";
import {
  eliminarInfoOrdenCompleta,
  guardarInfoOrdenCompleta,
} from "@/lib/data/info-orden";
import { leerOrdenesDesdeExcel } from "@/lib/excel/leer-ordenes-excel";
import {
  buscarEmpresasUsuariasPorNombre,
  resolverEmpresasUsuarias,
  normalizarNombreEmpresa,
  type EmpresaUsuariaResuelta,
  type EntradaEmpresaUsuaria,
} from "@/lib/data/empresas-usuarias";

export type OrdenActionState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | void;

export async function createOrden(input: unknown): Promise<OrdenActionState> {
  const parsed = ordenServicioSchema.safeParse(input);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  let id: number;
  try {
    id = await createOrdenRecord(parsed.data);
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Error desconocido al crear la orden",
    };
  }

  revalidatePath("/ordenes");
  redirect(`/ordenes/${id}/editar`);
}

export type MutacionResult = { ok: true } | { ok: false; error: string };

export async function guardarInformacionOrden(
  ordenId: number,
  // null cuando el usuario no es administrador ni financiero (ver
  // OrdenForm.onSubmit): SeccionDatosGenerales ya está deshabilitada en
  // pantalla para esos roles, así que ni se intenta el update — de lo
  // contrario tumbaría el guardado de las demás secciones también.
  datosBase: unknown | null,
  datosExtendidos: unknown,
): Promise<MutacionResult> {
  const parsedBase =
    datosBase === null ? null : ordenServicioSchema.safeParse(datosBase);
  if (parsedBase && !parsedBase.success) {
    return {
      ok: false,
      error: "Revisa los datos generales de la orden — hay campos inválidos.",
    };
  }
  const parsedExtendidos = ordenInfoExtendidaSchema.safeParse(datosExtendidos);
  if (!parsedExtendidos.success) {
    return {
      ok: false,
      error:
        "Revisa las secciones de información extendida — hay campos inválidos.",
    };
  }

  try {
    if (parsedBase) await updateOrdenRecord(ordenId, parsedBase.data);
    await guardarInfoOrdenCompleta(ordenId, parsedExtendidos.data);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error desconocido al guardar la información de la orden",
    };
  }

  revalidatePath("/ordenes");
  revalidatePath(`/ordenes/${ordenId}/editar`);
  return { ok: true };
}

export async function actualizarCampoOrden(
  id: number,
  patch: CampoOrdenInlinePatch,
): Promise<MutacionResult> {
  const parsed = campoOrdenInlineSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: "Valor inválido." };
  }

  try {
    await actualizarCampoOrdenRecord(id, parsed.data);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error desconocido al actualizar la orden",
    };
  }

  revalidatePath("/ordenes");
  return { ok: true };
}

export async function eliminarOrden(id: number): Promise<MutacionResult> {
  try {
    // Primero las 5 tablas extendidas (sin ON DELETE CASCADE hacia
    // ordenes_servicio en el esquema actual), después la orden misma.
    await eliminarInfoOrdenCompleta(id);
    await deleteOrdenRecord(id);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error desconocido al eliminar la orden",
    };
  }

  revalidatePath("/ordenes");
  return { ok: true };
}

export async function eliminarOrdenes(
  ids: number[],
): Promise<{ eliminadas: number; fallidas: { id: number; error: string }[] }> {
  let eliminadas = 0;
  const fallidas: { id: number; error: string }[] = [];

  for (const id of ids) {
    try {
      await eliminarInfoOrdenCompleta(id);
      await deleteOrdenRecord(id);
      eliminadas++;
    } catch (err) {
      fallidas.push({
        id,
        error:
          err instanceof Error
            ? err.message
            : "Error desconocido al eliminar la orden",
      });
    }
  }

  revalidatePath("/ordenes");
  return { eliminadas, fallidas };
}

export type FilaPreviewImportacion = {
  fila: number;
  valores: OrdenServicioFormValues;
  errores: string[];
  valida: boolean;
};

export async function previsualizarImportacionOrdenes(
  formData: FormData,
): Promise<
  | { filas: FilaPreviewImportacion[]; empresasNuevas: EntradaEmpresaUsuaria[] }
  | { error: string }
> {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Selecciona un archivo Excel (.xlsx)." };
  }
  const clienteId = Number(formData.get("clienteId"));
  if (!clienteId || Number.isNaN(clienteId)) {
    return { error: "Selecciona un cliente." };
  }

  // Que el cliente EXISTA se valida acá y no se descubre al insertar: sin este
  // chequeo, un id que no está en `clientes` pasa toda la previsualización como
  // válida y recién explota fila por fila con
  // "violates foreign key constraint ordenes_servicio_cliente_id_fkey", que no
  // le dice nada a quien está importando. Pasó de verdad con el id
  // preseleccionado, que estaba hardcodeado al del proyecto remoto y no existe
  // en las demás bases (ver app/ordenes/importar/page.tsx).
  try {
    const clientes = await getClientesParaSelect();
    if (!clientes.some((c) => c.id === clienteId)) {
      return {
        error:
          "El cliente seleccionado ya no existe. Elegí uno de la lista y volvé a previsualizar.",
      };
    }
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "No se pudo validar el cliente seleccionado",
    };
  }

  let filasExcel;
  try {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    filasExcel = await leerOrdenesDesdeExcel(buffer);
  } catch {
    return {
      error:
        "No se pudo leer el archivo. Verifica que sea un Excel (.xlsx) válido.",
    };
  }

  // Números de OS repetidos: dentro del archivo (dos filas con el mismo
  // número) y contra órdenes que ya existen en la DB para este cliente. El
  // número de OS lo asigna el cliente, así que la unicidad es por
  // (cliente_id, numero_os_cliente), no global.
  const numerosEnArchivo = [
    ...new Set(
      filasExcel
        .map(({ valores }) => valores.numero_os_cliente?.trim())
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  let numerosExistentes: Set<string>;
  try {
    numerosExistentes = await getNumerosOsExistentes(clienteId, numerosEnArchivo);
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "No se pudieron validar números de OS duplicados",
    };
  }

  // Empresas usuarias del archivo contra el catálogo. El Excel del ARL trae la
  // razón social escrita a mano, así que se agrupa por nombre NORMALIZADO
  // (mismo criterio que el índice único de la tabla): dos filas con "ACME SA"
  // y "acme  sa" son la misma empresa y no dos altas distintas.
  //
  // Acá solo se CONSULTA — la creación pasa recién en
  // importarOrdenesDesdeExcel, después de que el usuario vea en pantalla
  // cuáles se van a crear. Que una importación dé de alta empresas en
  // silencio es justo lo que llenó de variantes la etapa de texto libre.
  const empresasDelArchivo = filasExcel
    .map(({ valores }) => ({
      nombre: valores.nombre_empresa_usuaria?.trim() ?? "",
      nit: valores.nit_empresa_usuaria?.trim() || null,
    }))
    .filter((e) => e.nombre);

  let empresasExistentes: Map<string, EmpresaUsuariaResuelta>;
  try {
    empresasExistentes = await buscarEmpresasUsuariasPorNombre(
      empresasDelArchivo.map((e) => e.nombre),
    );
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "No se pudieron validar las empresas usuarias",
    };
  }

  const empresasNuevas: EntradaEmpresaUsuaria[] = [];
  const clavesNuevas = new Set<string>();
  for (const empresa of empresasDelArchivo) {
    const clave = normalizarNombreEmpresa(empresa.nombre);
    if (empresasExistentes.has(clave) || clavesNuevas.has(clave)) continue;
    clavesNuevas.add(clave);
    empresasNuevas.push(empresa);
  }

  const numerosVistos = new Set<string>();
  const filas: FilaPreviewImportacion[] = filasExcel.map(
    ({ fila, valores }) => {
      // Si la empresa ya está en el catálogo, la fila se muestra con el
      // nombre y el NIT canónicos (los de la tabla), no con lo que traía el
      // Excel: es lo que de verdad se va a guardar, y así la previsualización
      // no miente. Las que todavía no existen se muestran tal cual vinieron.
      const nombreEmpresa = valores.nombre_empresa_usuaria?.trim();
      const empresa = nombreEmpresa
        ? empresasExistentes.get(normalizarNombreEmpresa(nombreEmpresa))
        : undefined;

      const candidato = {
        ...valores,
        nombre_servicio: valores.nombre_servicio ?? "",
        cliente_id: clienteId,
        ...(empresa
          ? {
              empresa_usuaria_id: empresa.id,
              nombre_empresa_usuaria: empresa.nombre,
              nit_empresa_usuaria: empresa.nit ?? undefined,
            }
          : {}),
      };
      const parsed = ordenServicioSchema.safeParse(candidato);

      const numero = valores.numero_os_cliente?.trim();
      let errorDuplicado: string | null = null;
      if (numero) {
        if (numerosExistentes.has(numero)) {
          errorDuplicado = `Ya existe una orden con el número de OS "${numero}" para este cliente`;
        } else if (numerosVistos.has(numero)) {
          errorDuplicado = `Número de OS "${numero}" repetido en el archivo`;
        } else {
          numerosVistos.add(numero);
        }
      }

      if (parsed.success && !errorDuplicado) {
        return { fila, valores: parsed.data, errores: [], valida: true };
      }

      const erroresSchema = parsed.success
        ? []
        : Object.values(parsed.error.flatten().fieldErrors)
            .flat()
            .filter((mensaje): mensaje is string => Boolean(mensaje));
      const errores = errorDuplicado
        ? [...erroresSchema, errorDuplicado]
        : erroresSchema;

      return {
        fila,
        valores: candidato as OrdenServicioFormValues,
        errores: errores.length ? errores : ["Datos inválidos"],
        valida: false,
      };
    },
  );

  return { filas, empresasNuevas };
}

export type FilaParaImportar = {
  fila: number;
  valores: OrdenServicioFormValues;
};

export async function importarOrdenesDesdeExcel(
  filas: FilaParaImportar[],
): Promise<{
  creadas: number;
  empresasCreadas: number;
  fallidas: { fila: number; error: string }[];
}> {
  let creadas = 0;
  const fallidas: { fila: number; error: string }[] = [];

  // Se resuelve el catálogo ANTES de crear ninguna orden, y del lado del
  // servidor: las `filas` vienen del cliente, así que el empresa_usuaria_id
  // que calculó la previsualización no se usa como verdad. Además el catálogo
  // pudo cambiar entre que se previsualizó y que se confirmó.
  const empresasDelArchivo = filas
    .map(({ valores }) => ({
      nombre: valores.nombre_empresa_usuaria?.trim() ?? "",
      nit: valores.nit_empresa_usuaria?.trim() || null,
    }))
    .filter((e) => e.nombre);

  let empresas: Map<string, EmpresaUsuariaResuelta>;
  const idsAntes = new Set<number>();
  try {
    const previas = await buscarEmpresasUsuariasPorNombre(
      empresasDelArchivo.map((e) => e.nombre),
    );
    for (const empresa of previas.values()) idsAntes.add(empresa.id);
    empresas = await resolverEmpresasUsuarias(empresasDelArchivo);
  } catch (err) {
    return {
      creadas: 0,
      empresasCreadas: 0,
      fallidas: filas.map(({ fila }) => ({
        fila,
        error:
          err instanceof Error
            ? err.message
            : "No se pudieron resolver las empresas usuarias",
      })),
    };
  }

  // Cuántas se dieron de alta recién, para informarlo en el resultado.
  let empresasCreadas = 0;
  for (const entrada of empresasDelArchivo) {
    const empresa = empresas.get(normalizarNombreEmpresa(entrada.nombre));
    if (empresa && !idsAntes.has(empresa.id)) {
      idsAntes.add(empresa.id);
      empresasCreadas++;
    }
  }

  for (const { fila, valores } of filas) {
    const nombreEmpresa = valores.nombre_empresa_usuaria?.trim();
    const empresa = nombreEmpresa
      ? empresas.get(normalizarNombreEmpresa(nombreEmpresa))
      : undefined;

    const parsed = ordenServicioSchema.safeParse({
      ...valores,
      ...(empresa
        ? {
            empresa_usuaria_id: empresa.id,
            nombre_empresa_usuaria: empresa.nombre,
            nit_empresa_usuaria: empresa.nit ?? undefined,
          }
        : {}),
    });
    if (!parsed.success) {
      fallidas.push({ fila, error: "Datos inválidos" });
      continue;
    }
    try {
      await createOrdenRecord(parsed.data);
      creadas++;
    } catch (err) {
      fallidas.push({
        fila,
        error:
          err instanceof Error
            ? err.message
            : "Error desconocido al crear la orden",
      });
    }
  }

  revalidatePath("/ordenes");
  // El catálogo de empresas usuarias también pudo cambiar.
  revalidatePath("/clientes/empresas-usuarias");
  return { creadas, empresasCreadas, fallidas };
}
