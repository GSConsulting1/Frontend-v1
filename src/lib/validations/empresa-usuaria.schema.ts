// Schema de Zod para el alta/edición de una empresa usuaria — única fuente de
// verdad, usada tanto en components/empresas-usuarias/campos-empresa-usuaria.tsx
// (zodResolver de React Hook Form) como en
// app/clientes/empresas-usuarias/actions.ts (vuelve a validar en servidor,
// nunca confiar solo en el cliente).
//
// Mismos límites que la tabla (nombre varchar(255), nit varchar(50), ver
// supabase/migrations/20260815123716_catalogo_empresas_usuarias.sql).

import { z } from "zod";

export const empresaUsuariaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre de la empresa es obligatorio")
    .max(255, "Máximo 255 caracteres"),
  nit: z.string().trim().max(50, "Máximo 50 caracteres").optional(),
});

export type EmpresaUsuariaFormValues = z.infer<typeof empresaUsuariaSchema>;
