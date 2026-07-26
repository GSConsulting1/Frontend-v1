// Datos de prueba usados por src/lib/data/usuarios.ts mientras Supabase no
// está configurado. Misma forma que la fila real de `usuarios` (ver
// database.types.ts / types/index.ts) para que el swap a Supabase no rompa
// nada en la UI.

import type { Usuario } from "@/types";

export const mockUsuarios: Usuario[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    nombre_completo: "Laura Sofía Gil Chaves",
    email: "laura.gil@example.com",
    rol: "administrador",
    activo: true,
    profesional_id: null,
    fecha_creacion: "2026-01-05T08:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    nombre_completo: "Camila Rodríguez",
    email: "camila.rodriguez@example.com",
    rol: "programador",
    activo: true,
    profesional_id: null,
    fecha_creacion: "2026-01-12T08:00:00Z",
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    nombre_completo: "Mateo Peña",
    email: "mateo.pena@example.com",
    rol: "financiero",
    activo: true,
    profesional_id: null,
    fecha_creacion: "2026-02-10T08:00:00Z",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    nombre_completo: "Andrés Torres",
    email: "andres.torres@example.com",
    rol: "profesional",
    activo: true,
    profesional_id: 1,
    fecha_creacion: "2026-01-20T08:00:00Z",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    nombre_completo: "Valentina Ríos",
    email: "valentina.rios@example.com",
    rol: "lectura",
    activo: true,
    profesional_id: null,
    fecha_creacion: "2026-02-02T08:00:00Z",
  },
];
