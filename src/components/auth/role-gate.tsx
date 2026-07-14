// Gate genérico por rol — mientras `perfil` no cargó (o el rol no está en
// `allow`) renderiza `fallback` (null por defecto) en vez de `children`.
// Primer uso: "Valor hora profesional" en orden-info-secciones.tsx; pensado
// para reusarse en cualquier control futuro que dependa del rol (botones de
// crear/editar, etc. — ver plan MVP Día 2).
//
// Esto es UX, no seguridad: el dato real solo queda protegido cuando la
// tabla tiene RLS en Supabase (hoy, valor_hora_orden y usuarios). Ocultar un
// control acá no reemplaza esa política.

"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { RolUsuario } from "@/types";

type RoleGateProps = {
  allow: RolUsuario[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const { perfil } = useAuth();
  if (!perfil || !allow.includes(perfil.rol)) return <>{fallback}</>;
  return <>{children}</>;
}
