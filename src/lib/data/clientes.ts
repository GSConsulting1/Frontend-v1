// Capa de acceso a datos para "clientes" — administración completa (listado +
// alta + edición + activo/inactivo + borrado), distinta de
// getClientesParaSelect() en lib/data/ordenes.ts (esa es solo el catálogo
// id/nombre_cliente para el <Select> y los filtros de órdenes, activos
// únicamente). Reusa el mismo mock (mockClientes de lib/mock-data/ordenes.ts)
// para no duplicar datos de prueba.
//
// A diferencia de lib/data/profesionales.ts, acá SÍ hay borrado real: la FK
// ordenes_servicio_cliente_id_fkey NO tiene ON DELETE CASCADE, así que
// Postgres rechaza con 23503 el DELETE de un cliente que ya tiene órdenes —
// el historial lo protege la base, no la UI. Lo único que hace este archivo
// es traducir ese código a un mensaje que se entienda en pantalla.
//
// Usa createSupabaseServerClient() (no el singleton de lib/supabase/client.ts)
// porque `clientes` tiene RLS habilitado — mismo criterio que ordenes.ts,
// usuarios.ts y profesionales.ts.

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mockClientes } from "@/lib/mock-data/ordenes";
import type { Cliente } from "@/types";
import type { ClienteFormValues } from "@/lib/validations/cliente.schema";

// Código de "foreign_key_violation" de Postgres. Es el que devuelve el DELETE
// de un cliente referenciado por ordenes_servicio.cliente_id.
const FK_VIOLATION = "23503";

function normalizarInput(input: ClienteFormValues) {
  return {
    nombre_cliente: input.nombre_cliente,
    nit: input.nit || null,
  };
}

export async function getClientes(): Promise<Cliente[]> {
  if (!isSupabaseConfigured) {
    return [...mockClientes].sort((a, b) =>
      a.nombre_cliente.localeCompare(b.nombre_cliente),
    );
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nombre_cliente");

  if (error)
    throw new Error(`No se pudieron cargar los clientes: ${error.message}`);
  return (data ?? []) as unknown as Cliente[];
}

export async function crearClienteRecord(
  input: ClienteFormValues,
): Promise<Cliente> {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const nextId = Math.max(0, ...mockClientes.map((c) => c.id)) + 1;
    const nuevo: Cliente = {
      id: nextId,
      ...normalizado,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    };
    mockClientes.push(nuevo);
    return nuevo;
  }
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("clientes")
    .insert(normalizado)
    .select("*")
    .single();

  if (error) throw new Error(`No se pudo crear el cliente: ${error.message}`);
  return data as unknown as Cliente;
}

export async function actualizarClienteRecord(
  id: number,
  input: ClienteFormValues,
): Promise<void> {
  const normalizado = normalizarInput(input);

  if (!isSupabaseConfigured) {
    const index = mockClientes.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Cliente no encontrado");
    mockClientes[index] = { ...mockClientes[index], ...normalizado };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("clientes")
    .update(normalizado)
    .eq("id", id);

  if (error)
    throw new Error(`No se pudo actualizar el cliente: ${error.message}`);
}

export async function actualizarActivoClienteRecord(
  id: number,
  activo: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = mockClientes.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Cliente no encontrado");
    mockClientes[index] = { ...mockClientes[index], activo };
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("clientes")
    .update({ activo })
    .eq("id", id);

  if (error)
    throw new Error(`No se pudo actualizar el estado: ${error.message}`);
}

export async function deleteClienteRecord(id: number): Promise<void> {
  if (!isSupabaseConfigured) {
    const index = mockClientes.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Cliente no encontrado");
    mockClientes.splice(index, 1);
    return;
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) {
    // El caso frecuente: el cliente ya tiene órdenes de servicio. El mensaje
    // crudo de Postgres nombra la constraint, que no le dice nada a quien
    // está en la pantalla — ver el encabezado de este archivo.
    if (error.code === FK_VIOLATION) {
      throw new Error(
        "No se puede eliminar: el cliente tiene órdenes de servicio asociadas. Marcalo como inactivo en su lugar.",
      );
    }
    throw new Error(`No se pudo eliminar el cliente: ${error.message}`);
  }
}
