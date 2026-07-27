// Cliente único de Supabase, compartido por Server Components, Server Actions
// y (si hace falta) Client Components — sin autenticación por ahora, así que
// no necesitamos @supabase/ssr ni manejo de cookies de sesión.
//
// isSupabaseConfigured permite que src/lib/data/*.ts caiga a datos mock cuando
// las env vars todavía no existen (Día 1-2 de Persona B, sin depender de A).
// Una vez Persona A comparta NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (Día 3), esto
// empieza a pegarle a Supabase real sin tocar el resto del código.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: "sb-anon-sin-sesion",
      },
    })
  : null;
