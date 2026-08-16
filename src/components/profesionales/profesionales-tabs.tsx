// Pestañas de la pantalla /profesionales: "Profesionales" (el equipo de campo
// que ejecuta las órdenes), "Participantes ARL" (el equipo de la ARL que firma
// el detalle de entrega y el acta), "VoBo" (el personal interno de GS Group que
// da el visto bueno) y "Responsables SEC" (quién de GS Group responde por la
// orden). Son cuatro catálogos DISTINTOS —cuatro tablas distintas— que hasta
// ahora solo se podían tocar por SQL; acá se administran. VoBo y Responsables
// SEC comparten varias personas pero son dos roles, no uno: alguien puede
// responder por órdenes sin dar el visto bueno de ninguna.
//
// Mismo criterio que components/clientes/clientes-tabs.tsx: son tres rutas, no
// tres estados de una misma página, así que cada una tiene su propio page.tsx +
// loading.tsx y el navegador guarda su historial.
//
// No hay un layout.tsx compartido a propósito: las pestañas de las tablas con
// selección de filas tienen que ir DEBAJO del PageHeader, y ese header lo
// renderiza cada listado (sus acciones dependen del estado de selección de esa
// tabla). Un layout las dibujaría encima del título. Cada página la monta
// justo debajo de su header; son dos líneas repetidas a cambio de que el
// header siga siendo dueño de sus acciones.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/profesionales", label: "Profesionales" },
  { href: "/profesionales/participantes-arl", label: "Participantes ARL" },
  { href: "/profesionales/vobo", label: "VoBo" },
  { href: "/profesionales/responsables-sec", label: "Responsables SEC" },
];

export function ProfesionalesTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1" aria-label="Secciones de profesionales">
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
