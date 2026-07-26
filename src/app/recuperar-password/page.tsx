// Pantalla de "olvidé mi contraseña" — sin sidebar, mismo layout que /login
// (ver AppSidebar: se oculta en las tres rutas de auth).

import { RecuperarPasswordForm } from "@/components/auth/recuperar-password-form";

export default function RecuperarPasswordPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="h-1.5 bg-gradient-to-r from-[#A23E8C] to-[#8BC53F]" />
      <div className="flex flex-1 items-center justify-center bg-[#FAFAF8] px-4">
        <RecuperarPasswordForm />
      </div>
    </div>
  );
}
