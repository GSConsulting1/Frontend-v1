// Menú "⋮" del header de la pestaña "Empresas usuarias" — mismo patrón y
// mismos motivos que components/clientes/clientes-acciones-menu.tsx (sin
// chequeo de rol acá: la ruta entera ya está gateada a administrador en
// servidor, y repetirlo dejaría la pantalla sin acciones en modo mock).

"use client";

import { Building2, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EmpresasUsuariasAccionesMenuProps = {
  // Opcionales por el loading.tsx (Server Component), que renderiza el menú
  // para que el header no cambie al terminar de cargar y no tiene handlers que
  // pasar.
  onNueva?: () => void;
  onEliminar?: () => void;
};

export function EmpresasUsuariasAccionesMenu({
  onNueva,
  onEliminar,
}: EmpresasUsuariasAccionesMenuProps) {
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
        <DropdownMenuItem onClick={() => onNueva?.()}>
          <Building2 className="size-4" />
          Nueva empresa usuaria
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onEliminar?.()}>
          <Trash2 className="size-4" />
          Eliminar empresas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
