// Pantalla de login — sin sidebar (ver AppSidebar: se oculta en /login).
// Server Component delgado; toda la interacción vive en LoginForm.

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="h-1.5 bg-gradient-to-r from-[#A23E8C] to-[#8BC53F]" />
      <div className="flex flex-1 items-center justify-center bg-[#FAFAF8] px-4">
        <LoginForm />
      </div>
    </div>
  );
}
