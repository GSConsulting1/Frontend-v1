// Schema de Zod para el alta/edición de un "Responsable SEC para GS" — única
// fuente de verdad, usada tanto en components/responsables-sec/campos-responsable-sec.tsx
// (zodResolver de React Hook Form) como en
// app/profesionales/responsables-sec/actions.ts (vuelve a validar en servidor,
// nunca confiar solo en el <form> del cliente).
//
// A diferencia de vobo.schema.ts —del que salió calcado— acá el EMAIL es la
// identidad del responsable, no el nombre: es lo único que esta tabla comparte
// con `public.usuarios`, y por lo tanto lo único con lo que se puede resolver
// quién es el responsable de una orden (ver
// 20260819012529_responsables_sec_identidad_por_email.sql). De ahí las dos
// diferencias con vobo:
//
//   * es OBLIGATORIO (la columna es NOT NULL desde esa migración), así que ya
//     no lleva el union con z.literal("") que trata al campo vacío como "sin
//     dato" — vacío ahora es un error, no un valor;
//   * se normaliza a minúsculas con .toLowerCase(). Esto NO es cosmético: el
//     índice único de la tabla es sobre lower(btrim(email)), así que sin el
//     transform el formulario deja pasar "Fisioterapia@…" y la base lo rechaza
//     con un 23505 que habla de un índice por expresión. Ya había pasado con
//     esa dirección exacta, que quedó cargada con la F mayúscula y por eso no
//     matcheaba contra el usuario del mismo nombre.
//
// El nombre sigue siendo obligatorio (la columna es NOT NULL) pero ya NO es
// único: dos casillas pueden llamarse igual, y una casilla puede representar a
// varias personas. Quedó como etiqueta para el ABM y no se lee en ninguna otra
// pantalla.
//
// Sin max(): las columnas de `responsables_sec` son `character varying` sin
// longitud (ver la migración), no hay límite real que replicar.

import { z } from "zod";

export const responsableSecSchema = z.object({
  nombre_completo: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "El email es obligatorio")
    .email("Debe ser un email válido"),
  celular: z.string().trim().optional(),
});

export type ResponsableSecFormValues = z.infer<typeof responsableSecSchema>;
