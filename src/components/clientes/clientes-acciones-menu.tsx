// Menú "⋮" del header de /clientes — las dos acciones de la pantalla (Nuevo
// cliente, Eliminar clientes), mismo patrón que ordenes-acciones-menu.tsx:
// DropdownMenu + DropdownMenuTrigger render={<Button .../>}.
//
// A diferencia del de órdenes, acá no se calcula ningún rol: /clientes ya es
// una pantalla solo para administrador y el bloqueo real lo hace
// app/clientes/page.tsx en servidor (getPerfilActual() + redirect). Repetir
// un chequeo de rol acá, además de redundante, dejaría la pantalla sin
// acciones en modo mock (sin Supabase no hay `perfil`, ver auth-provider).
//
// "Nuevo cliente" no navega a otra ruta: abre el formulario de alta inline
// arriba de la tabla (son 2 campos, no justifica una página propia como
// /ordenes/nueva). Por eso es un onClick y no un <Link>.

"use client";

import { MoreVertical, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ClientesAccionesMenuProps = {
  // Ambos opcionales: app/clientes/loading.tsx (Server Component) renderiza
  // este menú para que el header no cambie al terminar de cargar, y ahí no hay
  // handlers que pasar — una función no se puede pasar de un Server Component
  // a un Client Component de todas formas. Cada onClick la llama solo si
  // existe.
  onNuevo?: () => void;
  onEliminar?: () => void;
};

export function ClientesAccionesMenu({
  onNuevo,
  onEliminar,
}: ClientesAccionesMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Más acciones">
            <MoreVertical className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem onClick={() => onNuevo?.()}>
          <UserPlus className="size-4" />
          Nuevo cliente
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onEliminar?.()}>
          <Trash2 className="size-4" />
          Eliminar clientes
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
