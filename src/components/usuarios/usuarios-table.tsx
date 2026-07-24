// Tabla de administración de usuarios — cada fila tiene un <Select> de rol
// que dispara actualizarRolUsuario() al cambiar de valor (sin botón
// "Guardar" aparte, mismo espíritu que el resto de selects del form de
// órdenes). El único estado de cliente es el de "guardando" por fila, para
// dar feedback mientras corre el Server Action.

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

type UsuariosTableProps = {
  usuarios: Usuario[];
};

export function UsuariosTable({ usuarios }: UsuariosTableProps) {
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleChangeRol(usuario: Usuario, rol: RolUsuario) {
    if (rol === usuario.rol) return;

    setError(null);
    setSavingIds((prev) => new Set(prev).add(usuario.id));
    const result = await actualizarRolUsuario(usuario.id, rol);
    if (!result.ok) setError(result.error);
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(usuario.id);
      return next;
    });
  }

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
                    <Select
                      value={usuario.rol}
                      onValueChange={(v: string | null) => {
                        if (v) handleChangeRol(usuario, v as RolUsuario);
                      }}
                    >
                      <SelectTrigger className="w-40" disabled={isSaving}>
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
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
