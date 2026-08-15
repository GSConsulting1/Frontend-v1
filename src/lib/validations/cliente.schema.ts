// Schema de Zod para el alta/edición de un cliente — única fuente de verdad,
// usada tanto en components/clientes/campos-cliente.tsx (zodResolver de React
// Hook Form) como en app/clientes/actions.ts (vuelve a validar en servidor,
// nunca confiar solo en el cliente).
//
// Los max() replican los límites reales de la tabla (nombre_cliente
// varchar(255), nit varchar(50) — ver el baseline en supabase/migrations/):
// sin esto el error llega recién desde Postgres, ya con el formulario enviado.

import { z } from "zod";

export const clienteSchema = z.object({
  nombre_cliente: z
    .string()
    .trim()
    .min(1, "El nombre del cliente es obligatorio")
    .max(255, "Máximo 255 caracteres"),
  nit: z.string().trim().max(50, "Máximo 50 caracteres").optional(),
});

export type ClienteFormValues = z.infer<typeof clienteSchema>;
