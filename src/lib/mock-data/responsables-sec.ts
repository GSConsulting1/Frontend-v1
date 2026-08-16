// Datos de prueba de `responsables_sec` para desarrollar sin Supabase, con la
// MISMA forma que las filas reales (ver database.types.ts).
//
// Los nombres coinciden con los `responsable_os` de mockOrdenes
// (lib/mock-data/ordenes.ts) para que el conteo de órdenes del listado dé algo
// coherente. Son los nombres reales del equipo y no inventados —a diferencia de
// lo que pide supabase/seed.sql para el resto— porque acá no hay base de por
// medio: este array ES el catálogo en modo mock, y con nombres de fantasía el
// <Select> del formulario de órdenes no ofrecería a nadie que las órdenes de
// prueba ya tengan cargado. Email y celular sí van inventados (`.test`).
//
// La última no tiene órdenes y está inactiva a propósito: es el único caso que
// se puede eliminar de verdad desde la pantalla (a las otras las frena la FK) y
// el que muestra el badge "Inactivo".

import type { ResponsableSec } from "@/types";

export const mockResponsablesSec: ResponsableSec[] = [
  {
    id: 1,
    nombre_completo: "Bibiana Sarmiento",
    email: "bibiana.sarmiento@ejemplo.test",
    celular: "3001112233",
    activo: true,
    fecha_creacion: "2026-01-10T08:00:00Z",
  },
  {
    id: 2,
    nombre_completo: "Daniela Rosso",
    email: "daniela.rosso@ejemplo.test",
    celular: null,
    activo: true,
    fecha_creacion: "2026-01-10T08:00:00Z",
  },
  {
    id: 3,
    nombre_completo: "Lucia Bejarano",
    email: null,
    celular: "3004445566",
    activo: true,
    fecha_creacion: "2026-01-15T08:00:00Z",
  },
  {
    id: 4,
    nombre_completo: "Yulieth Amell",
    email: "yulieth.amell@ejemplo.test",
    celular: null,
    activo: true,
    fecha_creacion: "2026-02-01T08:00:00Z",
  },
  {
    id: 5,
    nombre_completo: "Tatiana Carrillo",
    email: null,
    celular: null,
    activo: false,
    fecha_creacion: "2026-02-20T08:00:00Z",
  },
];
