// Pantalla de cuenta del usuario logueado — hoy solo cambio de contraseña.
// Server Component delgado, como el resto de app/**/page.tsx; toda la
// interacción vive en CambiarPasswordForm (necesita useAuth, Client Component).

import { PageHeader } from "@/components/layout/page-header";
import { CambiarPasswordForm } from "@/components/auth/cambiar-password-form";

export default function CuentaPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Mi cuenta"
        description="Editá tu contraseña de acceso"
      />

      <CambiarPasswordForm />
    </div>
  );
}
