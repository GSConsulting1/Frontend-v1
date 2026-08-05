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
//
// "Importar desde Excel" y "Exportar Excel" son ambos
// administrador/financiero/talento — coincide con ROLES_PERMITIDOS de
// app/api/ordenes/excel/route.tsx, que sí es la protección real para el
// export (esa misma ruta decide, ya del lado del servidor, si el .xlsx
// incluye o no la sección financiera según el rol). El import no tiene
// chequeo de rol del lado del servidor (mismo hueco que datos generales,
// ver structure.md: "mvp_open_access" tumba la RLS real de
// ordenes_servicio hoy), así que acá también es solo UX.

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
  const puedeExportar =
    esAdmin || perfil?.rol === "financiero" || perfil?.rol === "talento";
  const puedeImportar = puedeExportar;

  const grupoNavegacion = esAdmin || puedeImportar;

  if (!grupoNavegacion && !puedeExportar) return null;

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
        {esAdmin && (
          <DropdownMenuItem render={<Link href="/ordenes/nueva" />}>
            <FilePlus className="size-4" />
            Nueva orden
          </DropdownMenuItem>
        )}
        {puedeImportar && (
          <DropdownMenuItem render={<Link href="/ordenes/importar" />}>
            <Upload className="size-4" />
            Importar desde Excel
          </DropdownMenuItem>
        )}
        {grupoNavegacion && puedeExportar && <DropdownMenuSeparator />}
        {puedeExportar && (
          <DropdownMenuItem onClick={() => onExportar?.()}>
            <Download className="size-4" />
            Exportar Excel
          </DropdownMenuItem>
        )}
        {(grupoNavegacion || puedeExportar) && esAdmin && <DropdownMenuSeparator />}
        {esAdmin && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onEliminar?.()}
          >
            <Trash2 className="size-4" />
            Eliminar órdenes
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
