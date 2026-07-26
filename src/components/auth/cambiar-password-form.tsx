// Cambio de contraseña para un usuario ya logueado (app/cuenta/page.tsx).
// Supabase updateUser() no valida la contraseña actual por sí solo — acá se
// verifica a mano llamando signIn con la contraseña "vieja" antes de
// actualizar, para no dejar que cualquiera con la sesión abierta (ej. sesión
// olvidada en una compu compartida) cambie la contraseña sin saberla.
//
// Tras actualizar, se cierra la sesión y se vuelve a /login a propósito —
// para que el usuario confirme la contraseña nueva ahí mismo en vez de
// quedar con la sesión vieja abierta como si nada hubiera cambiado.

"use client";

import { useState, type FormEvent } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/forms/password-input";
import { useAuth } from "@/components/auth/auth-provider";

const PASSWORD_MIN_LENGTH = 6;
const REDIRECT_DELAY_MS = 1500;

export function CambiarPasswordForm() {
  const { session, signIn, updatePassword, signOut } = useAuth();
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [pending, setPending] = useState(false);

  if (!session?.user.email) {
    return (
      <p className="text-sm text-muted-foreground">
        Iniciá sesión para poder editar tu contraseña.
      </p>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setExito(false);

    if (passwordNueva.length < PASSWORD_MIN_LENGTH) {
      setError(`La contraseña nueva debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
      return;
    }
    if (passwordNueva !== passwordConfirmar) {
      setError("La confirmación no coincide con la contraseña nueva.");
      return;
    }

    setPending(true);

    const { error: errorActual } = await signIn(session!.user.email!, passwordActual);
    if (errorActual) {
      setPending(false);
      setError("La contraseña actual no es correcta.");
      return;
    }

    const { error: errorUpdate } = await updatePassword(passwordNueva);
    setPending(false);

    if (errorUpdate) {
      setError(errorUpdate);
      return;
    }

    setExito(true);
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordConfirmar("");
    setTimeout(() => signOut(), REDIRECT_DELAY_MS);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="password-actual">Contraseña actual</Label>
        <PasswordInput
          id="password-actual"
          autoComplete="current-password"
          required
          value={passwordActual}
          onChange={(e) => setPasswordActual(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password-nueva">Contraseña nueva</Label>
        <PasswordInput
          id="password-nueva"
          autoComplete="new-password"
          required
          value={passwordNueva}
          onChange={(e) => setPasswordNueva(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password-confirmar">Confirmar contraseña nueva</Label>
        <PasswordInput
          id="password-confirmar"
          autoComplete="new-password"
          required
          value={passwordConfirmar}
          onChange={(e) => setPasswordConfirmar(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {exito && (
        <p className="text-sm text-emerald-600">
          Contraseña actualizada. Cerrando sesión para que vuelvas a
          iniciarla…
        </p>
      )}

      <Button type="submit" disabled={pending || exito} className="w-fit">
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
