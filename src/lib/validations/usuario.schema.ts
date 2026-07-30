// Schema de Zod para el cambio de rol de un usuario — única fuente de
// verdad, usada tanto en src/components/usuarios/usuarios-table.tsx (feedback
// inmediato antes de disparar el Server Action) como en
// src/app/usuarios/actions.ts (revalidación en servidor).
//
// Los valores deben coincidir con el CHECK real de la tabla `usuarios` en
// Supabase y con el union `RolUsuario` de src/types/index.ts — si se
// agrega/renombra un rol ahí, reflejarlo acá también.

import { z } from "zod";

export const rolUsuarioSchema = z.enum([
  "administrador",
  "programador",
  "profesional",
  "lectura",
  "financiero",
  "talento",
]);

export type RolUsuarioFormValues = z.infer<typeof rolUsuarioSchema>;
