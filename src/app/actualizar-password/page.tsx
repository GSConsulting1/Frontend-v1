// Landing del link de recuperación de contraseña — sin sidebar, mismo layout
// que /login (ver AppSidebar: se oculta en las tres rutas de auth).

import { ActualizarPasswordForm } from "@/components/auth/actualizar-password-form";

export default function ActualizarPasswordPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="h-1.5 bg-gradient-to-r from-[#A23E8C] to-[#8BC53F]" />
      <div className="flex flex-1 items-center justify-center bg-[#FAFAF8] px-4">
        <ActualizarPasswordForm />
      </div>
    </div>
  );
}
