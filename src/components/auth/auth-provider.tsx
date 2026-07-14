// Sesión de Supabase Auth + perfil (tabla `usuarios`) como Context de React.
// Client Component: se monta una sola vez en app/layout.tsx (ver
// structure.md) envolviendo toda la app — cualquier Client Component de
// abajo puede llamar useAuth() para leer session/perfil/loading o disparar
// signIn/signOut.
//
// Si NEXT_PUBLIC_SUPABASE_URL/ANON_KEY todavía no están configuradas
// (supabaseBrowser === null — el caso normal mientras Persona A termina la
// DB), el provider no rompe: session y perfil quedan en null, loading pasa
// a false enseguida, y signIn devuelve un error explicándolo.

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import type { Usuario } from "@/types";

type AuthContextValue = {
  session: Session | null;
  perfil: Usuario | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  // Si no hay cliente (env vars sin configurar), no hay nada que esperar.
  const [loading, setLoading] = useState(supabaseBrowser !== null);

  async function cargarPerfil(userId: string) {
    if (!supabaseBrowser) return;

    const { data, error } = await supabaseBrowser
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      // Pasa si el usuario existe en auth.users pero todavía no tiene fila
      // en `usuarios` (falta el INSERT manual — ver
      // supabase/002_usuarios_roles_rls.sql, sección 3).
      console.error("No se pudo cargar el perfil del usuario:", error.message);
      setPerfil(null);
      return;
    }
    setPerfil(data as Usuario);
  }

  useEffect(() => {
    if (!supabaseBrowser) return;

    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) cargarPerfil(session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          cargarPerfil(session.user.id);
        } else {
          setPerfil(null);
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    if (!supabaseBrowser) {
      return { error: "Supabase todavía no está configurado (faltan las env vars)." };
    }
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }

  async function signOut() {
    await supabaseBrowser?.auth.signOut();
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ session, perfil, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
