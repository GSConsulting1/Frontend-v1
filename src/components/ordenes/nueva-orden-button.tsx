// Botón "Nueva orden" del listado — separado en su propio Client Component
// porque app/ordenes/page.tsx es Server Component y no puede llamar a
// useAuth() directamente. Crear órdenes es solo para administrador (ver
// supabase/004_ordenes_servicio_rls.sql); el resto de roles no ve el botón.

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/role-gate";

export function NuevaOrdenButton() {
  return (
    <RoleGate allow={["administrador"]}>
      <Button nativeButton={false} render={<Link href="/ordenes/nueva">Nueva orden</Link>} />
    </RoleGate>
  );
}
