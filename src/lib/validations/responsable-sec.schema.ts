// Schema de Zod para el alta/edición de un "Responsable SEC para GS" — única
// fuente de verdad, usada tanto en components/responsables-sec/campos-responsable-sec.tsx
// (zodResolver de React Hook Form) como en
// app/profesionales/responsables-sec/actions.ts (vuelve a validar en servidor,
// nunca confiar solo en el <form> del cliente).
//
// Calcado de vobo.schema.ts: son los mismos tres campos sobre una tabla con las
// mismas columnas. El email va con el mismo union porque el <Input> manda ""
// cuando el campo queda vacío, y un z.string().email().optional() pelado lo
// rechazaría por "no es un email" en vez de tratarlo como "sin dato".
//
// Sin max(): las columnas de `responsables_sec` son `character varying` sin
// longitud (ver la migración), no hay límite real que replicar.

import { z } from "zod";

export const responsableSecSchema = z.object({
  nombre_completo: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z
    .union([z.literal(""), z.string().trim().email("Debe ser un email válido")])
    .optional(),
  celular: z.string().trim().optional(),
});

export type ResponsableSecFormValues = z.infer<typeof responsableSecSchema>;
