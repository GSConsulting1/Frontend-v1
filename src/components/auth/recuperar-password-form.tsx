// Formulario de "olvidé mi contraseña" (usuario deslogueado) — envía el
// correo de recuperación. Sigue el mismo look que LoginForm (misma pantalla
// de auth), pero deliberadamente no confirma si el email existe o no en la
// respuesta: Supabase no distingue ese caso en el mensaje de error, así que
// siempre se muestra el mismo "revisá tu correo" para no filtrar qué emails
// están registrados.

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";

export function RecuperarPasswordForm() {
  const { sendPasswordResetEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const { error } = await sendPasswordResetEmail(email);

    setPending(false);
    if (error) {
      setError(error);
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex w-full max-w-[360px] flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-bold tracking-tight text-[#1F2023]">
          Revisá tu correo
        </h1>
        <p className="text-sm text-[#87858F]">
          Si {email} tiene una cuenta, te enviamos un link para elegir una
          contraseña nueva.
        </p>
        <Link href="/login" className="text-sm font-semibold text-[#A23E8C]">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-[360px] flex-col items-center gap-[22px]"
      noValidate
    >
      <div className="text-center">
        <h1 className="text-xl font-bold tracking-tight text-[#1F2023]">
          Recuperar contraseña
        </h1>
        <p className="mt-1 text-[13px] text-[#87858F]">
          Te enviamos un link a tu correo para elegir una nueva
        </p>
      </div>

      <div className="w-full space-y-1.5">
        <Label htmlFor="email" className="sr-only">
          Correo corporativo
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="Correo corporativo"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-auto rounded-lg border-[#E4E2DF] px-3.5 py-3 text-sm text-[#1F2023]"
        />
      </div>

      {error && (
        <p className="w-full text-left text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-auto w-full rounded-lg bg-[#A23E8C] px-3.5 py-3 text-sm font-semibold text-white hover:bg-[#A23E8C]/90"
      >
        {pending ? "Enviando…" : "Enviar link"}
      </Button>

      <Link href="/login" className="text-xs font-semibold text-[#A23E8C]">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
