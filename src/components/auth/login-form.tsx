// Formulario de /login — sigue el mockup que pasó la usuaria (barra de
// gradiente A23E8C→8BC53F, tarjeta centrada). Los colores de marca van como
// valores arbitrarios de Tailwind porque todavía no existen como tokens de
// tema (globals.css sigue en la paleta neutra de shadcn) — si en algún
// momento se reusan en más de una pantalla, ese es el momento de
// promoverlos a variables de --primary/--accent.

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";

export function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const { error } = await signIn(email, password);

    setPending(false);
    if (error) {
      setError(error);
      return;
    }
    router.push("/ordenes");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-[360px] flex-col items-center gap-[22px]"
      noValidate
    >
      <div className="text-center">
        <h1 className="text-xl font-bold tracking-tight text-[#1F2023]">
          Iniciar sesión
        </h1>
        <p className="mt-1 text-[13px] text-[#87858F]">
          Acceso al panel de gestión SST
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <div className="space-y-1.5">
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
        <div className="space-y-1.5">
          <Label htmlFor="password" className="sr-only">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Contraseña"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-auto rounded-lg border-[#E4E2DF] px-3.5 py-3 text-sm text-[#1F2023]"
          />
        </div>
      </div>

      {error && (
        <p className="w-full text-left text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-auto w-full rounded-lg bg-[#A23E8C] px-3.5 py-3 text-sm font-semibold text-white hover:bg-[#A23E8C]/90"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>

      {/* TODO: agregar esta funcionalidad en un futuro <p className="text-xs text-[#ABA9A4]">
        ¿Olvidaste tu contraseña?{" "}
        <span className="font-semibold text-[#A23E8C]">Recupérala aquí</span>
      </p> */}
    </form>
  );
}
