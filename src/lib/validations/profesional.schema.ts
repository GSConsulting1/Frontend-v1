// Schema de Zod para el alta de un profesional — única fuente de verdad,
// usada tanto en components/profesionales/profesionales-listado.tsx
// (zodResolver de React Hook Form) como en app/profesionales/actions.ts
// (vuelve a validar en servidor, nunca confiar solo en el cliente).

import { z } from "zod";

export const profesionalSchema = z.object({
  nombre_completo: z.string().trim().min(1, "El nombre es obligatorio"),
  cedula: z.string().trim().optional(),
  email: z
    .union([z.literal(""), z.string().trim().email("Debe ser un email válido")])
    .optional(),
  telefono: z.string().trim().optional(),
  // Tarifa base del profesional (distinta de valor_hora_orden.valor_hora_profesional,
  // que es el valor pactado por orden puntual) — igual que el resto del
  // formulario, llega ya normalizado a number | undefined (setValueAs en el
  // <Input>, no acá).
  valor_hora: z.number().nonnegative("Debe ser un número positivo").optional(),
});

export type ProfesionalFormValues = z.infer<typeof profesionalSchema>;
