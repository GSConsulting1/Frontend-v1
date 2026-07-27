"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { NAV_ITEMS } from "./nav-config";

const COLLAPSED_STORAGE_KEY = "gsc-sidebar-collapsed";

// Rutas de auth (sin sesión, o a medio camino de una): pantalla completa
// propia, sin el chrome de la app.
const RUTAS_SIN_SIDEBAR = ["/login", "/recuperar-password", "/actualizar-password"];

export function AppSidebar() {
  const pathname = usePathname();
  const { session, perfil, signOut } = useAuth();
  // Arranca en false (mismo valor que renderiza el servidor, que no tiene
  // localStorage) y solo se lee el valor guardado en un efecto, después de
  // hidratar — leerlo en el initializer de useState rompía la hidratación
  // (servidor siempre "false", cliente a veces "true") y React tiraba todo
  // el árbol de AppSidebar para re-renderizarlo desde cero.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Única sincronización con localStorage al montar (no una suscripción
    // a cambios externos) — justo el caso que la regla no distingue del
    // patrón "cascading renders" que sí quiere evitar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  };

  if (RUTAS_SIN_SIDEBAR.includes(pathname)) return null;

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || (perfil && item.roles.includes(perfil.rol)),
  );

  return (
    <aside
      suppressHydrationWarning
      className={cn(
        "relative flex shrink-0 flex-col bg-neutral-900 text-neutral-100 transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div
          className={cn(
            "flex items-center gap-2.5 px-5 py-5",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-emerald-400 text-xs font-bold text-white">
            GS
          </span>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-sm font-semibold">GS Group</p>
              <p className="text-[0.65rem] tracking-wide text-neutral-400 uppercase">
                Consulting
              </p>
            </div>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {items.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "border-t border-neutral-800 px-3 py-3",
            collapsed && "px-2",
          )}
        >
          {session ? (
            <div
              className={cn(
                "flex items-center gap-2.5 px-2",
                collapsed && "flex-col gap-2 px-0",
              )}
            >
              {!collapsed && (
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-medium">
                    {perfil?.nombre_completo ?? session.user.email}
                  </p>
                  <p className="truncate text-[0.65rem] text-neutral-400">
                    {perfil?.rol ?? "sin perfil en `usuarios`"}
                  </p>
                </div>
              )}
              <Link
                href="/cuenta"
                title="Mi cuenta"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
              >
                <Settings className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                title="Cerrar sesión"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              title={collapsed ? "Iniciar sesión" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-100",
                collapsed && "justify-center px-0",
              )}
            >
              {!collapsed && "Iniciar sesión"}
            </Link>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? "Expandir menú" : "Contraer menú"}
        className="absolute top-6 -right-3 z-20 flex size-6 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-300 shadow-md transition-colors hover:bg-neutral-700 hover:text-neutral-100"
      >
        {collapsed ? (
          <ChevronRight className="size-3.5" />
        ) : (
          <ChevronLeft className="size-3.5" />
        )}
      </button>
    </aside>
  );
}
