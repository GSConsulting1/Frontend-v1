// Cliente de Supabase para Client Components (por ahora, solo AuthProvider).
// A diferencia de `client.ts` (singleton con la anon key, sin sesión, usado
// por lib/data/*.ts), este guarda la sesión en cookies en vez de
// localStorage — así proxy.ts puede leerla y refrescarla en cada request.
//
// lib/data/*.ts sigue sin tocar este archivo: mientras las tablas de
// órdenes no tengan RLS (ver structure.md), no hay ninguna diferencia entre
// consultarlas con o sin sesión, así que no vale la pena todavía mover esas
// funciones a un cliente de servidor por-request. El día que Persona A les
// agregue RLS, ese es el momento de crear lib/supabase/server.ts y usarlo
// ahí — no antes.

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBrowser = isSupabaseConfigured
  ? createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : null;
