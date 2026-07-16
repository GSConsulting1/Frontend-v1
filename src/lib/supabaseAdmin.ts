// Cliente de Supabase con service role key — bypassa RLS por completo.
//
// Uso exclusivo: generación de documentos oficiales (ej. PDF de Orden de
// Servicio) que deben incluir datos con RLS restringido a "administrador"
// (valor_hora_orden) sin importar el rol de quien dispara la descarga.
// No usar desde lib/data/*.ts ni desde ningún flujo normal de lectura/
// escritura — para eso está lib/supabase/server.ts (ver structure.md).
//
// Solo debe importarse desde código que corre en el servidor (route
// handlers): SUPABASE_SERVICE_ROLE_KEY nunca debe llegar al cliente.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
