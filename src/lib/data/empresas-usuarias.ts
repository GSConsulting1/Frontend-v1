// Capa de acceso a datos para "empresas usuarias" — la empresa donde se
// ejecuta el servicio, distinta del `Cliente` que lo contrata (ver types/).
// CRUD completo: listado con conteo de órdenes, alta, edición, activo/inactivo
// y borrado.
//
// Dos errores de Postgres se traducen acá a mensajes que se entiendan en
// pantalla, porque los dos son casos ESPERABLES de esta pantalla y no bugs:
//
//   23505 (unique_violation) — el índice único es sobre el nombre NORMALIZADO
//     (trim + espacios colapsados + mayúsculas, ver la migración), así que
//     crear "ACME SA" cuando ya existe "acme  sa" choca aunque el texto no sea
//     idéntico. Sin traducir, el mensaje habla de un índice por expresión y no
//     dice nada.
//   23503 (foreign_key_violation) — ordenes_servicio.empresa_usuaria_id no
//     tiene ON DELETE CASCADE: una empresa con órdenes no se puede borrar.
//     Mismo criterio y mismo mensaje que lib/data/clientes.ts.
//
// El conteo de órdenes del listado sale de un embedded aggregate de PostgREST
// (`ordenes_servicio(count)`), no de una columna: se normaliza acá a un number
// para que la UI no vea la forma `[{ count }]` que devuelve Supabase.
//
// ordenes_servicio.nombre_empresa_usuaria / nit_empresa_usuaria son copias
// denormalizadas del nombre y el NIT de esta tabla — siguen siendo las que leen
// el listado de órdenes, el Excel de export y el PDF. Editar una empresa acá
// las reescribe en sus órdenes (ver actualizarEmpresaUsuariaRecord); mismo
// criterio que lib/data/responsables-sec.ts con responsable_os.

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mockEmpresasUsuarias } from "@/lib/mock-data/empresas-usuarias";
import { mockOrdenes } from "@/lib/mock-data/ordenes";
import type { EmpresaUsuaria, EmpresaUsuariaConConteo } from "@/types";
import type { EmpresaUsuariaFormValues } from "@/lib/validations/empresa-usuaria.schema";

const UNIQUE_VIOLATION = "23505";
const FK_VIOLATION = "23503";

const MSG_DUPLICADA =
  "Ya existe una empresa usuaria con ese nombre (se comparan sin distinguir mayúsculas ni espacios de más).";
const MSG_CON_ORDENES =
  "No se puede eliminar: la empresa tiene órdenes de servicio asociadas. Marcala como inactiva en su lugar.";

// La misma normalización que usa el índice único de la migración
// (btrim + espacios colapsados + upper). Se exporta porque la importación de
// órdenes desde Excel necesita agrupar los nombres del archivo con el mismo
// criterio con el que la base decide si dos nombres son "el mismo".
export function normalizarNombreEmpresa(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").toUpperCase();
}

const normalizar = normalizarNombreEmpresa;

function normalizarInput(input: EmpresaUsuariaFormValues) {
  return {
    nombre: input.nombre,
    nit: input.nit || null,
  };
}

function contarOrdenesMock(empresa: EmpresaUsuaria): number {
  return mockOrdenes.filter(
    (o) =>
      o.nombre_empresa_usuaria != null &&
      normalizar(o.nombre_empresa_usuaria) === normalizar(empresa.nombre),
  ).length;
}

export async function getEmpresasUsuarias(): Promise<EmpresaUsuariaConConteo[]> {
  if (!isSupabaseConfigured) {
    return [...mockEmpresasUsuarias]
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((e) => ({ ...e, ordenes: contarOrdenesMock(e) }));
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("empresas_usuarias")
    .select("*, ordenes_servicio(count)")
    .order("nombre");

  if (error)
    throw new Error(
      `No se pudieron cargar las empresas usuarias: ${error.message}`,
    );

  return (data ?? []).map((fila) => {
    const { ordenes_servicio, ...empresa } = fila as EmpresaUsuaria & {
      ordenes_servicio: { count: number }[] | null;
    };
    return { ...empresa, ordenes: ordenes_servicio?.[0]?.count ?? 0 };
  });
}

// Catálogo para el Combobox de "Datos generales" en el formulario de órdenes
// (ver components/ordenes/orden-campos.tsx). Trae el NIT además del nombre
// porque al elegir una empresa el formulario autocompleta el campo NIT con
// este valor — el usuario ya no lo escribe.
//
// `incluirId` es para la pantalla de edición: la lista son las empresas
// ACTIVAS, pero si la orden que se está editando apunta a una que se marcó
// inactiva después, hay que incluirla igual o el campo aparecería vacío y
// guardar la orden le borraría el vínculo sin que nadie lo pidiera.
export async function getEmpresasUsuariasParaSelect(incluirId?: number | null) {
  if (!isSupabaseConfigured) {
    return mockEmpresasUsuarias
      .filter((e) => e.activo || e.id === incluirId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((e) => ({ id: e.id, nombre: e.nombre, nit: e.nit }));
  }
  const supabase = await createSupabaseServerClient();

  const query = supabase.from("empresas_usuarias").select("id, nombre, nit");

  const { data, error } = await (
    incluirId != null
      ? query.or(`activo.eq.true,id.eq.${incluirId}`)
      : query.eq("activo", true)
  ).order("nombre");

  if (error)
    throw new Error(
      `No se pudieron cargar las empresas usuarias: ${error.message}`,
    );
  return data ?? [];
}

export type EmpresaUsuariaResuelta = {
  id: number;
  nombre: string;
  nit: string | null;
};

export type EntradaEmpresaUsuaria = { nombre: string; nit?: string | null };

// Todas las empresas del catálogo indexadas por nombre normalizado, para
// resolver los nombres sueltos que trae un Excel de importación.
//
// Incluye las INACTIVAS a propósito: si una empresa existe pero está dada de
// baja, hay que reusarla igual — crear otra con el mismo nombre chocaría con
// el índice único, y "está inactiva" no significa "no existe".
async function indexarPorNombre(): Promise<
  Map<string, EmpresaUsuariaResuelta>
> {
  if (!isSupabaseConfigured) {
    return new Map(
      mockEmpresasUsuarias.map((e) => [
        normalizar(e.nombre),
        { id: e.id, nombre: e.nombre, nit: e.nit },
      ]),
    );
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("empresas_usuarias")
    .select("id, nombre, nit");

  if (error)
    throw new Error(
      `No se pudieron cargar las empresas usuarias: ${error.message}`,
    );

  return new Map(
    (data ?? []).map((e) => [
      normalizar(e.nombre),
      { id: e.id, nombre: e.nombre, nit: e.nit },
    ]),
  );
}

// Solo lectura — para la PREVISUALIZACIÓN de la importación: cuáles de los
// nombres del archivo ya existen en el catálogo. Lo que no está acá es lo que
// se va a crear, y eso se le muestra al usuario antes de confirmar.
export async function buscarEmpresasUsuariasPorNombre(
  nombres: string[],
): Promise<Map<string, EmpresaUsuariaResuelta>> {
  const indice = await indexarPorNombre();
  const encontradas = new Map<string, EmpresaUsuariaResuelta>();

  for (const nombre of nombres) {
    const clave = normalizar(nombre);
    const empresa = indice.get(clave);
    if (empresa) encontradas.set(clave, empresa);
  }
  return encontradas;
}

// Lectura + alta — para la IMPORTACIÓN real: devuelve el mapa completo,
// creando las que falten. Se vuelve a resolver del lado del servidor en vez de
// confiar en lo que calculó la previsualización (el cliente podría mandar
// cualquier cosa, y además el catálogo pudo cambiar entre un paso y otro).
export async function resolverEmpresasUsuarias(
  entradas: EntradaEmpresaUsuaria[],
): Promise<Map<string, EmpresaUsuariaResuelta>> {
  const indice = await indexarPorNombre();

  // Distintas por nombre normalizado: un archivo trae la misma empresa
  // repetida en muchas filas y no hay que crearla una vez por fila.
  const pendientes = new Map<string, EntradaEmpresaUsuaria>();
  for (const entrada of entradas) {
    const clave = normalizar(entrada.nombre);
    if (!clave || indice.has(clave) || pendientes.has(clave)) continue;
    pendientes.set(clave, entrada);
  }

  for (const [clave, entrada] of pendientes) {
    try {
      const creada = await crearEmpresaUsuariaRecord({
        nombre: entrada.nombre.trim(),
        nit: entrada.nit?.trim() || undefined,
      });
      indice.set(clave, {
        id: creada.id,
        nombre: creada.nombre,
        nit: creada.nit,
      });
    } catch {
      // El caso realista es que otra importación simultánea la haya creado
      // entre indexarPorNombre() y este insert (el índice único lo rechaza).
      // Se vuelve a leer el catálogo y, si ahora está, se usa esa.
      const reintento = await indexarPorNombre();
      const empresa = reintento.get(clave);
      if (!empresa)
        throw new Error(
          `No se pudo crear la empresa usuaria "${entrada.nombre}"`,
        );
      indice.set(clave, empresa);
    }
  }

  return indice;
}

export async function crearEmpresaUsuariaRecord(
  input: EmpresaUsuariaFormValues,
): Promise<EmpresaUsuaria> {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const yaExiste = mockEmpresasUsuarias.some(
      (e) => normalizar(e.nombre) === normalizar(normalizado.nombre),
    );
    if (yaExiste) throw new Error(MSG_DUPLICADA);

    const nextId = Math.max(0, ...mockEmpresasUsuarias.map((e) => e.id)) + 1;
    const nueva: EmpresaUsuaria = {
      id: nextId,
      ...normalizado,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    };
    mockEmpresasUsuarias.push(nueva);
    return nueva;
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("empresas_usuarias")
    .insert(normalizado)
    .select("*")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(MSG_DUPLICADA);
    throw new Error(`No se pudo crear la empresa usuaria: ${error.message}`);
  }
  return data as unknown as EmpresaUsuaria;
}

export async function actualizarEmpresaUsuariaRecord(
  id: number,
  input: EmpresaUsuariaFormValues,
): Promise<void> {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const index = mockEmpresasUsuarias.findIndex((e) => e.id === id);
    if (index === -1) throw new Error("Empresa usuaria no encontrada");
    const chocaConOtra = mockEmpresasUsuarias.some(
      (e) =>
        e.id !== id && normalizar(e.nombre) === normalizar(normalizado.nombre),
    );
    if (chocaConOtra) throw new Error(MSG_DUPLICADA);

    mockEmpresasUsuarias[index] = {
      ...mockEmpresasUsuarias[index],
      ...normalizado,
    };
    for (const orden of mockOrdenes) {
      if (orden.empresa_usuaria_id === id) {
        orden.nombre_empresa_usuaria = normalizado.nombre;
        orden.nit_empresa_usuaria = normalizado.nit;
      }
    }
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("empresas_usuarias")
    .update(normalizado)
    .eq("id", id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(MSG_DUPLICADA);
    throw new Error(
      `No se pudo actualizar la empresa usuaria: ${error.message}`,
    );
  }

  // nombre_empresa_usuaria / nit_empresa_usuaria son copias denormalizadas de
  // esta fila: son las que leen el listado de órdenes, el Excel de export y el
  // PDF (ver el encabezado de este archivo). Sin esta cascada, corregir el
  // nombre o el NIT acá dejaba a las órdenes ya cargadas mostrando el valor
  // viejo para siempre — o sea, dos nombres para la misma empresa, que es
  // justo el desorden que el catálogo vino a limpiar. Alcanza con `eq` sobre
  // la FK: las órdenes viejas que tienen texto pero empresa_usuaria_id en NULL
  // NO se tocan, porque nadie confirmó todavía que sean esta empresa.
  //
  // Va después del UPDATE de la tabla y no antes para no reescribir órdenes si
  // el nombre nuevo chocó con el índice único.
  const { error: errorOrdenes } = await supabase
    .from("ordenes_servicio")
    .update({
      nombre_empresa_usuaria: normalizado.nombre,
      nit_empresa_usuaria: normalizado.nit,
    })
    .eq("empresa_usuaria_id", id);

  if (errorOrdenes)
    throw new Error(
      `Se guardó la empresa, pero no se pudo actualizar su nombre en las órdenes: ${errorOrdenes.message}`,
    );
}

export async function actualizarActivoEmpresaUsuariaRecord(
  id: number,
  activo: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = mockEmpresasUsuarias.findIndex((e) => e.id === id);
    if (index === -1) throw new Error("Empresa usuaria no encontrada");
    mockEmpresasUsuarias[index] = { ...mockEmpresasUsuarias[index], activo };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("empresas_usuarias")
    .update({ activo })
    .eq("id", id);

  if (error)
    throw new Error(`No se pudo actualizar el estado: ${error.message}`);
}

export async function deleteEmpresaUsuariaRecord(id: number): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = mockEmpresasUsuarias.findIndex((e) => e.id === id);
    if (index === -1) throw new Error("Empresa usuaria no encontrada");
    if (contarOrdenesMock(mockEmpresasUsuarias[index]) > 0)
      throw new Error(MSG_CON_ORDENES);
    mockEmpresasUsuarias.splice(index, 1);
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("empresas_usuarias")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === FK_VIOLATION) throw new Error(MSG_CON_ORDENES);
    throw new Error(`No se pudo eliminar la empresa usuaria: ${error.message}`);
  }
}
