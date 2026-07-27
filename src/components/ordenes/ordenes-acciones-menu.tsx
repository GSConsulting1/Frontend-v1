// Menú "⋮" del header de /ordenes — agrupa las 4 acciones que antes eran
// botones sueltos (Nueva orden, Importar desde Excel, Exportar Excel,
// Eliminar órdenes). Mismo patrón que el menú de acciones de cada fila
// (ver ordenes-table.tsx): DropdownMenu + DropdownMenuTrigger
// render={<Button .../>} + DropdownMenuItem render={<Link .../>} para los
// ítems de navegación.
//
// No se envuelve cada ítem en <RoleGate> por separado: se calcula el rol
// una sola vez (mismo criterio que puedeVerFinanciera en orden-form.tsx) y,
// si el usuario no tiene ningún permiso, el componente no renderiza nada —
// así no queda un botón "⋮" que abre un menú vacío.

"use client";

import Link from "next/link";
import { Download, FilePlus, MoreVertical, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/auth-provider";

type OrdenesAccionesMenuProps = {
  // Ambos opcionales: en app/ordenes/loading.tsx (Server Component) no hay
  // handlers reales que pasar todavía (no existe tabla ni estado de
  // selección mientras getOrdenes() sigue resolviendo) — y una función no
  // se puede pasar desde un Server Component a este Client Component de
  // todas formas. Cada onClick la llama solo si existe.
  onExportar?: () => void;
  onEliminar?: () => void;
};

export function OrdenesAccionesMenu({
  onExportar,
  onEliminar,
}: OrdenesAccionesMenuProps) {
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === "administrador";
  const puedeExportar = esAdmin || perfil?.rol === "financiero";

  if (!esAdmin && !puedeExportar) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Más acciones">
            <MoreVertical className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {esAdmin && (
          <DropdownMenuItem render={<Link href="/ordenes/nueva" />}>
            <FilePlus className="size-4" />
            Nueva orden
          </DropdownMenuItem>
        )}
        {esAdmin && (
          <DropdownMenuItem render={<Link href="/ordenes/importar" />}>
            <Upload className="size-4" />
            Importar desde Excel
          </DropdownMenuItem>
        )}
        {/* Los dos separadores solo tienen sentido si hay algo de los dos
            lados — esAdmin implica puedeExportar (ver arriba), así que
            cuando esAdmin es true siempre hay un grupo de navegación
            arriba, "Exportar Excel" en medio y "Eliminar órdenes" abajo. */}
        {esAdmin && <DropdownMenuSeparator />}
        {puedeExportar && (
          <DropdownMenuItem onClick={() => onExportar?.()}>
            <Download className="size-4" />
            Exportar Excel
          </DropdownMenuItem>
        )}
        {esAdmin && <DropdownMenuSeparator />}
        {esAdmin && (
          <DropdownMenuItem variant="destructive" onClick={() => onEliminar?.()}>
            <Trash2 className="size-4" />
            Eliminar órdenes
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
