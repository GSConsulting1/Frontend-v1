// Cliente de Supabase por-request para Server Components y Server Actions,
// con la sesión leída de cookies (a diferencia de lib/supabase/client.ts,
// que es un singleton anon-key sin identidad de usuario).
//
// Necesario desde que valor_hora_orden (y usuarios) tienen RLS: el
// singleton siempre pega como anon, así que auth.uid() da null ahí adentro
// — las policies "solo administrador" nunca ven al usuario real. Con este
// cliente, lib/data/*.ts sí manda el JWT de la sesión.
//
// Solo llamar dentro de la rama "real" (después de chequear
// isSupabaseConfigured) — asume que las env vars ya existen.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components no pueden escribir cookies (solo leerlas) —
            // proxy.ts ya refresca la sesión en cada request, así que esto
            // es inofensivo acá. Sí hace falta en Server Actions, que
            // pueden escribir cookies sin problema.
          }
        },
      },
    },
  );
}
