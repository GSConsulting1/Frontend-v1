// Landing del link de "olvidé mi contraseña" (app/actualizar-password).
// El link del correo trae un `code` en la URL que @supabase/ssr intercambia
// automáticamente por una sesión de recovery al montar el cliente (ver
// sendPasswordResetEmail en auth-provider.tsx) — por eso acá alcanza con
// esperar a `session` desde useAuth en vez de leer la URL a mano. Si no hay
// sesión una vez que terminó de cargar, el link ya venció o es inválido.
//
// Tras actualizar, se cierra la sesión de recovery y se manda a /login en
// vez de dejar al usuario adentro con esa sesión — mismo criterio que
// cambiar-password-form.tsx: confirmar la contraseña nueva con un login
// real, no seguir con la sesión que abrió el link del correo.

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/forms/password-input";
import { useAuth } from "@/components/auth/auth-provider";

const PASSWORD_MIN_LENGTH = 6;
const REDIRECT_DELAY_MS = 1500;

export function ActualizarPasswordForm() {
  const { session, loading, updatePassword, signOut } = useAuth();
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [pending, setPending] = useState(false);

  if (loading) return null;

  if (!session) {
    return (
      <div className="flex w-full max-w-[360px] flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-bold tracking-tight text-[#1F2023]">
          Este link venció
        </h1>
        <p className="text-sm text-[#87858F]">
          Pedí un nuevo link de recuperación e intentá de nuevo.
        </p>
        <Link href="/recuperar-password" className="text-sm font-semibold text-[#A23E8C]">
          Recuperar contraseña
        </Link>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (passwordNueva.length < PASSWORD_MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
      return;
    }
    if (passwordNueva !== passwordConfirmar) {
      setError("La confirmación no coincide con la contraseña nueva.");
      return;
    }

    setPending(true);
    const { error } = await updatePassword(passwordNueva);
    setPending(false);

    if (error) {
      setError(error);
      return;
    }
    setExito(true);
    setTimeout(() => signOut(), REDIRECT_DELAY_MS);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-[360px] flex-col items-center gap-[22px]"
      noValidate
    >
      <div className="text-center">
        <h1 className="text-xl font-bold tracking-tight text-[#1F2023]">
          Elegí una contraseña nueva
        </h1>
      </div>

      <div className="flex w-full flex-col gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="password-nueva" className="sr-only">
            Contraseña nueva
          </Label>
          <PasswordInput
            id="password-nueva"
            placeholder="Contraseña nueva"
            autoComplete="new-password"
            required
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            className="h-auto rounded-lg border-[#E4E2DF] px-3.5 py-3 text-sm text-[#1F2023]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password-confirmar" className="sr-only">
            Confirmar contraseña nueva
          </Label>
          <PasswordInput
            id="password-confirmar"
            placeholder="Confirmar contraseña nueva"
            autoComplete="new-password"
            required
            value={passwordConfirmar}
            onChange={(e) => setPasswordConfirmar(e.target.value)}
            className="h-auto rounded-lg border-[#E4E2DF] px-3.5 py-3 text-sm text-[#1F2023]"
          />
        </div>
      </div>

      {error && (
        <p className="w-full text-left text-sm text-destructive">{error}</p>
      )}
      {exito && (
        <p className="w-full text-left text-sm text-emerald-600">
          Contraseña actualizada. Cerrando sesión para que vuelvas a
          iniciarla…
        </p>
      )}

      <Button
        type="submit"
        disabled={pending || exito}
        className="h-auto w-full rounded-lg bg-[#A23E8C] px-3.5 py-3 text-sm font-semibold text-white hover:bg-[#A23E8C]/90"
      >
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
