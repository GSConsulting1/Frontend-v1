// Next 16 renombró middleware.ts a proxy.ts (ver
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
//
// Única función: refrescar el token de sesión de Supabase en cada request y
// reescribir la cookie si cambió — sin esto, la sesión del browser
// (supabaseBrowser, cookies) se vence sin que nadie la renueve, porque los
// Server Components no pueden escribir cookies.
//
// Todavía NO redirige nada (ver structure.md: las rutas de /ordenes siguen
// abiertas a propósito hasta que haya usuarios reales creados en Supabase).

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() (no getSession()) porque valida el token contra Supabase Auth
  // en vez de confiar ciegamente en la cookie — es el chequeo recomendado
  // acá, aunque todavía no lo usemos para bloquear nada.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
