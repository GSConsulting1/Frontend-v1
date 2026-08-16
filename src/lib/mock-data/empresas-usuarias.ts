// Datos de prueba de `empresas_usuarias` para desarrollar sin Supabase, con la
// MISMA forma que las filas reales (ver database.types.ts). Los nombres/NIT
// coinciden con los `nombre_empresa_usuaria` de mockOrdenes (lib/mock-data/
// ordenes.ts) para que el conteo de órdenes del listado dé algo coherente.
//
// Archivo propio y no dentro de ordenes.ts —a diferencia de mockClientes—
// porque acá la entidad es la pantalla, no un catálogo de apoyo de las órdenes.

import type { EmpresaUsuaria } from "@/types";

export const mockEmpresasUsuarias: EmpresaUsuaria[] = [
  {
    id: 1,
    nombre: "Bolívar Seguros S.A.",
    nit: "860.002.964-1",
    activo: true,
    fecha_creacion: "2026-01-10T08:00:00Z",
  },
  {
    id: 2,
    nombre: "Constructora Andina Ltda.",
    nit: "900.123.456-7",
    activo: true,
    fecha_creacion: "2026-01-15T08:00:00Z",
  },
  {
    id: 3,
    nombre: "Textiles del Norte S.A.S.",
    nit: "800.987.654-3",
    activo: true,
    fecha_creacion: "2026-02-01T08:00:00Z",
  },
  // Sin órdenes y inactiva: el único caso que se puede eliminar de verdad
  // (a las otras las frena la FK) y el que muestra el badge "Inactiva".
  {
    id: 4,
    nombre: "Metalúrgica Ficticia S.A.S.",
    nit: "900.100.004-4",
    activo: false,
    fecha_creacion: "2026-02-20T08:00:00Z",
  },
];
