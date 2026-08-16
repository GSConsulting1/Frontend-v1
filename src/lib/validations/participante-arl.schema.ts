// Schema de Zod para el alta/edición de un participante ARL — única fuente de
// verdad, usada tanto en components/participantes-arl/campos-participante-arl.tsx
// (zodResolver de React Hook Form) como en
// app/profesionales/participantes-arl/actions.ts (vuelve a validar en servidor,
// nunca confiar solo en el <form> del cliente).
//
// Sin max() como el de cliente.schema.ts: `participantes_arl.nombre_completo` y
// `.cedula` son `character varying` SIN longitud en la tabla (ver el baseline
// en supabase/migrations/), así que no hay límite real que replicar — poner uno
// acá sería inventar una regla que la base no tiene.

import { z } from "zod";

export const participanteArlSchema = z.object({
  nombre_completo: z.string().trim().min(1, "El nombre es obligatorio"),
  cedula: z.string().trim().optional(),
});

export type ParticipanteArlFormValues = z.infer<typeof participanteArlSchema>;
