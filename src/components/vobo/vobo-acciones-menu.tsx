// Menú "⋮" del header de /profesionales/vobo — las dos acciones de la pestaña
// (Nueva persona, Eliminar personas), mismo patrón que
// clientes-acciones-menu.tsx: DropdownMenu + DropdownMenuTrigger
// render={<Button .../>}.
//
// Sin chequeo de rol acá: la pantalla entera ya está gateada en servidor
// (app/profesionales/vobo/page.tsx, getPerfilActual() + redirect). Repetirlo en
// el cliente, además de redundante, dejaría la pestaña sin acciones en modo
// mock (sin Supabase no hay `perfil`, ver auth-provider).
//
// "Nueva persona" no navega a otra ruta: abre el formulario de alta inline
// arriba de la tabla (son 3 campos, no justifica una página propia). Por eso es
// un onClick y no un <Link>.

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

type VoboAccionesMenuProps = {
  // Ambos opcionales: el loading.tsx (Server Component) renderiza este menú
  // para que el header no cambie al terminar de cargar, y ahí no hay handlers
  // que pasar — una función no se puede pasar de un Server Component a un
  // Client Component de todas formas. Cada onClick la llama solo si existe.
  onNuevo?: () => void;
  onEliminar?: () => void;
};

export function VoboAccionesMenu({
  onNuevo,
  onEliminar,
}: VoboAccionesMenuProps) {
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
          Nueva persona de VoBo
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onEliminar?.()}>
          <Trash2 className="size-4" />
          Eliminar personas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
