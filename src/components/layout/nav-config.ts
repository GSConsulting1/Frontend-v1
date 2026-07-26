import { ClipboardList, Home, Users, type LucideIcon } from "lucide-react";
import type { RolUsuario } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  // Si se define, el link solo se muestra a esos roles (ver AppSidebar). Sin
  // esta propiedad, el link se muestra a cualquier sesión (o ninguna).
  roles?: RolUsuario[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  {
    href: "/ordenes",
    label: "Orden de servicio recibida",
    icon: ClipboardList,
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    icon: Users,
    roles: ["administrador"],
  },
];
