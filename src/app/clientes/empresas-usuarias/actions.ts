// Server Actions ("use server") para mutar empresas usuarias — el único lugar
// que escribe en la tabla `empresas_usuarias`. Mismo patrón que
// app/clientes/actions.ts: vuelve a validar con Zod (nunca confiar solo en el
// <form> del cliente).
//
// Revalida además "/ordenes" porque el nombre de la empresa usuaria se muestra
// en el listado de órdenes: renombrar una acá cambia lo que esa pantalla
// muestra. (Hoy órdenes lee todavía la columna de texto vieja, así que el
// revalidate es preventivo — cuando esa pantalla pase a leer
// empresa_usuaria_id, ya está puesto.)

"use server";

import { revalidatePath } from "next/cache";
import { empresaUsuariaSchema } from "@/lib/validations/empresa-usuaria.schema";
import {
  crearEmpresaUsuariaRecord,
  actualizarEmpresaUsuariaRecord,
  actualizarActivoEmpresaUsuariaRecord,
  deleteEmpresaUsuariaRecord,
} from "@/lib/data/empresas-usuarias";

export type EmpresaUsuariaActionState =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

export type MutacionResult = { ok: true } | { ok: false; error: string };

const RUTA = "/clientes/empresas-usuarias";

function revalidar() {
  revalidatePath(RUTA);
  // Con "layout" y no a secas: el <Combobox> de "Datos generales" sale de
  // getEmpresasUsuariasParaSelect() y vive en /ordenes/nueva y
  // /ordenes/[id]/editar, que son rutas hijas — sin "layout" el revalidate no
  // baja hasta ellas y seguirían con el catálogo viejo en caché. Además
  // renombrar una empresa reescribe el nombre/NIT de sus órdenes, y eso se ve
  // en el listado.
  revalidatePath("/ordenes", "layout");
}

function mensajeDeError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export async function crearEmpresaUsuaria(
  input: unknown,
): Promise<EmpresaUsuariaActionState> {
  const parsed = empresaUsuariaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    await crearEmpresaUsuariaRecord(parsed.data);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(err, "Error desconocido al crear la empresa"),
    };
  }

  revalidar();
  return { ok: true };
}

export async function actualizarEmpresaUsuaria(
  id: number,
  input: unknown,
): Promise<EmpresaUsuariaActionState> {
  const parsed = empresaUsuariaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    await actualizarEmpresaUsuariaRecord(id, parsed.data);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(err, "Error desconocido al actualizar la empresa"),
    };
  }

  revalidar();
  return { ok: true };
}

export async function actualizarActivoEmpresaUsuaria(
  id: number,
  activo: boolean,
): Promise<MutacionResult> {
  try {
    await actualizarActivoEmpresaUsuariaRecord(id, activo);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(err, "Error desconocido al actualizar el estado"),
    };
  }

  revalidar();
  return { ok: true };
}

export async function eliminarEmpresaUsuaria(
  id: number,
): Promise<MutacionResult> {
  try {
    await deleteEmpresaUsuariaRecord(id);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(err, "Error desconocido al eliminar la empresa"),
    };
  }

  revalidar();
  return { ok: true };
}

// Borrado en lote — mismo contrato que eliminarClientes (app/clientes/
// actions.ts): no aborta el lote si una fila falla y hace un solo revalidate al
// final. Acá fallar es lo esperable para cualquier empresa que ya tenga
// órdenes (FK 23503).
export async function eliminarEmpresasUsuarias(
  ids: number[],
): Promise<{ eliminadas: number; fallidas: { id: number; error: string }[] }> {
  let eliminadas = 0;
  const fallidas: { id: number; error: string }[] = [];

  for (const id of ids) {
    try {
      await deleteEmpresaUsuariaRecord(id);
      eliminadas++;
    } catch (err) {
      fallidas.push({
        id,
        error: mensajeDeError(err, "Error desconocido al eliminar la empresa"),
      });
    }
  }

  revalidar();
  return { eliminadas, fallidas };
}
