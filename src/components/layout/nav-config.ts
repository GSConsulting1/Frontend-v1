import { ClipboardList, Home, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  {
    href: "/ordenes",
    label: "Orden de servicio recibida",
    icon: ClipboardList,
  },
];
