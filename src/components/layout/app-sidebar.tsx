"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { NAV_ITEMS } from "./nav-config";

export function AppSidebar() {
  const pathname = usePathname();
  const { session, perfil, signOut } = useAuth();

  if (pathname === "/login") return null;

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto bg-neutral-900 text-neutral-100">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-emerald-400 text-xs font-bold text-white">
          GS
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">GS Group</p>
          <p className="text-[0.65rem] tracking-wide text-neutral-400 uppercase">
            Consulting
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-800 px-3 py-3">
        {session ? (
          <div className="flex items-center gap-2.5 px-2">
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium">
                {perfil?.nombre_completo ?? session.user.email}
              </p>
              <p className="truncate text-[0.65rem] text-neutral-400">
                {perfil?.rol ?? "sin perfil en `usuarios`"}
              </p>
            </div>
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
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </aside>
  );
}
