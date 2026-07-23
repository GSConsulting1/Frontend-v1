// Badge de color según el estado de la orden (usa src/components/ui/badge.tsx).
// Centraliza el mapeo nombre-de-estado -> color acá, para no repetir un
// switch/if de colores en cada lugar donde se muestra un estado.

import { Badge } from "@/components/ui/badge";

function variantParaEstado(nombre: string): "default" | "secondary" | "destructive" | "outline" {
  const n = nombre.toUpperCase();
  if (n.includes("URGENTE") || n.includes("FACTURAR")) return "destructive";
  if (n.includes("CANCELADA") || n.includes("CANCELAR")) return "outline";
  if (n.includes("FACTURADA")) return "default";
  return "secondary";
}

export function EstadoBadge({ estado }: { estado: string | null }) {
  if (!estado) return <Badge variant="secondary">Sin estado</Badge>;
  return <Badge variant={variantParaEstado(estado)}>{estado}</Badge>;
}
