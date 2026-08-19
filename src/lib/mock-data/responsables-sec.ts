// Datos de prueba de `responsables_sec` para desarrollar sin Supabase, con la
// MISMA forma que las filas reales (ver database.types.ts).
//
// Los emails coinciden con los `responsable_os` de mockOrdenes
// (lib/mock-data/ordenes.ts) para que el conteo de órdenes del listado dé algo
// coherente. Son las casillas reales del equipo y no inventadas —a diferencia
// de lo que pide supabase/seed.sql para el resto— porque acá no hay base de por
// medio: este array ES el catálogo en modo mock, y con direcciones de fantasía
// el <Select> del formulario de órdenes no ofrecería a nadie que las órdenes de
// prueba ya tengan cargado. El celular sí va inventado.
//
// Los `id` son los mismos que dejan las dos migraciones del catálogo sobre una
// base limpia (hay huecos: 6 y 7 son las filas que se fusionaron en
// administrativo@). Mantenerlos alineados no es obligatorio, pero hace que una
// captura de pantalla del modo mock y una de la base local se puedan comparar.
//
// La última no tiene órdenes y está inactiva a propósito: es el único caso que
// se puede eliminar de verdad desde la pantalla (a las otras las frena la FK) y
// el que muestra el badge "Inactivo".

import type { ResponsableSec } from "@/types";

export const mockResponsablesSec: ResponsableSec[] = [
  {
    id: 1,
    nombre_completo: "Abigail Dorado",
    email: "psicologia@gsgroupsas.com",
    celular: "3001112233",
    activo: true,
    fecha_creacion: "2026-01-10T08:00:00Z",
  },
  {
    id: 2,
    nombre_completo: "Bibiana Sarmiento",
    email: "gerencia@gsgroupsas.com",
    celular: null,
    activo: true,
    fecha_creacion: "2026-01-10T08:00:00Z",
  },
  {
    id: 3,
    nombre_completo: "Daniela Rosso",
    email: "talentogs@gsgroupsas.com",
    celular: "3004445566",
    activo: true,
    fecha_creacion: "2026-01-15T08:00:00Z",
  },
  {
    // La casilla que en la base real quedó de fusionar tres filas (Lina Amell,
    // Lucia Bejarano y Tatiana Carrillo). El nombre es el de la casilla, no el
    // de una persona — ver la migración 20260819012529.
    id: 5,
    nombre_completo: "Administrativo GS",
    email: "administrativo@gsgroupsas.com",
    celular: null,
    activo: true,
    fecha_creacion: "2026-02-01T08:00:00Z",
  },
  {
    id: 9,
    nombre_completo: "Finanzas GS",
    email: "finanzas@gsgroupsas.com",
    celular: null,
    activo: false,
    fecha_creacion: "2026-02-20T08:00:00Z",
  },
];
