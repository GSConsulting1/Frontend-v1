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
});

export type ProfesionalFormValues = z.infer<typeof profesionalSchema>;
