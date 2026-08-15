// Server Actions ("use server") para mutar clientes — el único lugar que
// escribe en la tabla `clientes`. Mismo patrón que app/profesionales/actions.ts:
// vuelve a validar con Zod (nunca confiar solo en el <form> del cliente).
//
// Todas revalidan además "/ordenes": el listado de órdenes y su filtro por
// cliente se alimentan de getClientesParaSelect() (lib/data/ordenes.ts, solo
// activos), así que un alta/edición/baja acá cambia lo que esa pantalla
// muestra.

"use server";

import { revalidatePath } from "next/cache";
import { clienteSchema } from "@/lib/validations/cliente.schema";
import {
  crearClienteRecord,
  actualizarClienteRecord,
  actualizarActivoClienteRecord,
  deleteClienteRecord,
} from "@/lib/data/clientes";

export type ClienteActionState =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

export type MutacionResult = { ok: true } | { ok: false; error: string };

function revalidar() {
  revalidatePath("/clientes");
  revalidatePath("/ordenes");
}

function mensajeDeError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export async function crearCliente(input: unknown): Promise<ClienteActionState> {
  const parsed = clienteSchema.safeParse(input);
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
    await crearClienteRecord(parsed.data);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(err, "Error desconocido al crear el cliente"),
    };
  }

  revalidar();
  return { ok: true };
}

export async function actualizarCliente(
  id: number,
  input: unknown,
): Promise<ClienteActionState> {
  const parsed = clienteSchema.safeParse(input);
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
    await actualizarClienteRecord(id, parsed.data);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(err, "Error desconocido al actualizar el cliente"),
    };
  }

  revalidar();
  return { ok: true };
}

export async function actualizarActivoCliente(
  id: number,
  activo: boolean,
): Promise<MutacionResult> {
  try {
    await actualizarActivoClienteRecord(id, activo);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(err, "Error desconocido al actualizar el estado"),
    };
  }

  revalidar();
  return { ok: true };
}

export async function eliminarCliente(id: number): Promise<MutacionResult> {
  try {
    await deleteClienteRecord(id);
  } catch (err) {
    return {
      ok: false,
      error: mensajeDeError(err, "Error desconocido al eliminar el cliente"),
    };
  }

  revalidar();
  return { ok: true };
}

// Borrado en lote — mismo contrato y espíritu resiliente que eliminarOrdenes
// (app/ordenes/actions.ts): no aborta el lote si una fila falla y hace un solo
// revalidate al final. Acá fallar es lo esperable cuando el cliente ya tiene
// órdenes (FK 23503, ver lib/data/clientes.ts), así que el detalle de las
// fallidas se devuelve para poder mostrarlo.
export async function eliminarClientes(
  ids: number[],
): Promise<{ eliminados: number; fallidos: { id: number; error: string }[] }> {
  let eliminados = 0;
  const fallidos: { id: number; error: string }[] = [];

  for (const id of ids) {
    try {
      await deleteClienteRecord(id);
      eliminados++;
    } catch (err) {
      fallidos.push({
        id,
        error: mensajeDeError(err, "Error desconocido al eliminar el cliente"),
      });
    }
  }

  revalidar();
  return { eliminados, fallidos };
}
