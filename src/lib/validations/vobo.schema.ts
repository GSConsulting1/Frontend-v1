// Schema de Zod para el alta/edición de una persona de VoBo — única fuente de
// verdad, usada tanto en components/vobo/campos-vobo.tsx (zodResolver de React
// Hook Form) como en app/profesionales/vobo/actions.ts (vuelve a validar en
// servidor, nunca confiar solo en el <form> del cliente).
//
// El email va con el mismo union de profesional.schema.ts: el <Input> manda ""
// cuando el campo queda vacío, y un z.string().email().optional() pelado lo
// rechazaría por "no es un email" en vez de tratarlo como "sin dato".
//
// Sin max(): las columnas de `vobo` son `character varying` sin longitud (ver
// el baseline en supabase/migrations/), no hay límite real que replicar.

import { z } from "zod";

export const voboSchema = z.object({
  nombre_completo: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z
    .union([z.literal(""), z.string().trim().email("Debe ser un email válido")])
    .optional(),
  celular: z.string().trim().optional(),
});

export type VoboFormValues = z.infer<typeof voboSchema>;
