// Pestañas de la pantalla /clientes: "Clientes" (la tabla de quién contrata y
// paga) y "Empresas usuarias" (dónde se ejecuta el servicio). Son dos rutas
// distintas, no dos estados de una misma página, así que cada una tiene su
// propio page.tsx + loading.tsx y el navegador guarda su historial.
//
// No hay un layout.tsx compartido a propósito: cada página renderiza su propio
// PageHeader (los botones del header dependen del estado de selección de esa
// tabla, ver clientes-listado.tsx) y un layout tendría que dibujar las
// pestañas ARRIBA de ese header, o sea encima del título. Cada listado la monta
// justo debajo de su PageHeader; son dos líneas repetidas y a cambio el header
// sigue siendo dueño de sus acciones.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/clientes", label: "Clientes" },
  { href: "/clientes/empresas-usuarias", label: "Empresas usuarias" },
];

export function ClientesTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1" aria-label="Secciones de clientes">
      {TABS.map(({ href, label }) => {
        const activo = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              activo
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
