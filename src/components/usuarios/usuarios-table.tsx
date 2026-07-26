// Tabla de administración de usuarios — cada fila tiene un <Select> de rol
// que, al cambiar de valor, abre un AlertDialog de confirmación antes de
// disparar actualizarRolUsuario() (mismo espíritu que el resto de selects
// del form de órdenes, pero un cambio de rol pesa más que un campo suelto).
// El único estado de cliente es el de "guardando" por fila y el cambio
// pendiente de confirmar.
//
// Un <Select> queda deshabilitado (con tooltip explicando por qué) en dos
// casos: la propia fila del usuario logueado, y la del único administrador
// restante — ambas reglas se vuelven a validar en el servidor
// (app/usuarios/actions.ts), acá es solo para no dejar clickear algo que de
// todos modos va a rebotar.

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { actualizarRolUsuario } from "@/app/usuarios/actions";
import type { RolUsuario, Usuario } from "@/types";

const COLUMNAS = 3;

const ROLES: { value: RolUsuario; label: string }[] = [
  { value: "administrador", label: "Administrador" },
  { value: "programador", label: "Programador" },
  { value: "profesional", label: "Profesional" },
  { value: "lectura", label: "Lectura" },
  { value: "financiero", label: "Financiero" },
];

type CambioPendiente = { usuario: Usuario; rol: RolUsuario };

type UsuariosTableProps = {
  usuarios: Usuario[];
  currentUserId?: string;
};

export function UsuariosTable({ usuarios, currentUserId }: UsuariosTableProps) {
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [cambioPendiente, setCambioPendiente] = useState<CambioPendiente | null>(null);

  const totalAdministradores = usuarios.filter(
    (u) => u.rol === "administrador",
  ).length;

  function solicitarCambioRol(usuario: Usuario, rol: RolUsuario) {
    if (rol === usuario.rol) return;
    setError(null);
    setCambioPendiente({ usuario, rol });
  }

  async function confirmarCambioRol() {
    if (!cambioPendiente) return;
    const { usuario, rol } = cambioPendiente;
    setCambioPendiente(null);

    setSavingIds((prev) => new Set(prev).add(usuario.id));
    const result = await actualizarRolUsuario(usuario.id, rol);
    if (!result.ok) setError(result.error);
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(usuario.id);
      return next;
    });
  }

  const rolPendienteLabel = cambioPendiente
    ? (ROLES.find((r) => r.value === cambioPendiente.rol)?.label ?? cambioPendiente.rol)
    : null;
  const esDegradacionDeAdmin =
    cambioPendiente?.usuario.rol === "administrador" &&
    cambioPendiente.rol !== "administrador";

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Rol</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={COLUMNAS}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No hay usuarios registrados.
              </TableCell>
            </TableRow>
          )}

          {usuarios.map((usuario) => {
            const isSaving = savingIds.has(usuario.id);
            const esUsuarioActual = usuario.id === currentUserId;
            const esUltimoAdmin =
              usuario.rol === "administrador" && totalAdministradores === 1;

            const motivoBloqueo = esUsuarioActual
              ? "No puedes cambiar tu propio rol."
              : esUltimoAdmin
                ? "Debe quedar al menos un administrador en el sistema."
                : null;

            const select = (
              <Select
                value={usuario.rol}
                onValueChange={(v: string | null) => {
                  if (v) solicitarCambioRol(usuario, v as RolUsuario);
                }}
              >
                <SelectTrigger
                  className="w-40"
                  disabled={isSaving || motivoBloqueo != null}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((rol) => (
                    <SelectItem key={rol.value} value={rol.value}>
                      {rol.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );

            return (
              <TableRow key={usuario.id}>
                <TableCell className="font-medium">
                  {usuario.nombre_completo}
                </TableCell>
                <TableCell>{usuario.email ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isSaving && (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}
                    {motivoBloqueo ? (
                      <Tooltip>
                        <TooltipTrigger render={<span>{select}</span>} />
                        <TooltipContent>{motivoBloqueo}</TooltipContent>
                      </Tooltip>
                    ) : (
                      select
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={cambioPendiente != null}
        onOpenChange={(open) => {
          if (!open) setCambioPendiente(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar rol de usuario</AlertDialogTitle>
            <AlertDialogDescription>
              {cambioPendiente && (
                <>
                  ¿Cambiar el rol de{" "}
                  <strong className="text-foreground">
                    {cambioPendiente.usuario.nombre_completo}
                  </strong>{" "}
                  a &quot;{rolPendienteLabel}&quot;?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant={esDegradacionDeAdmin ? "destructive" : "default"}
              onClick={confirmarCambioRol}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
