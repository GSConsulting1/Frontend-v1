// Regenera src/types/database.types.ts desde el esquema real de Supabase.
// Reemplaza al `supabase gen types ... > archivo` que estaba inline en
// package.json, por dos razones:
//
//   1. El banner: el archivo generado no trae ninguna marca de "no editar", y
//      como se sobreescribe completo en cada corrida, un comentario puesto a
//      mano se perdería. Acá se escribe junto con el contenido generado, así
//      que sobrevive a todas las regeneraciones.
//
//   2. La redirección `>` de la shell truncaba el archivo ANTES de correr el
//      CLI: si `supabase gen types` fallaba (sin login, sin red, proyecto
//      pausado), quedaba un database.types.ts vacío y la app entera sin
//      tipos. Acá solo se escribe si el comando salió bien.

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

// Lee la base LOCAL por defecto, no el proyecto remoto. Es lo único coherente
// con el flujo de migraciones: los tipos tienen que describir el esquema de TU
// rama —el que sale de supabase/migrations/ al correr `pnpm db:reset`—, no el
// que hoy tenga producción. Antes esto apuntaba fijo al project-id de prod, y
// eso hacía que escribieras una migración, corrieras `pnpm db:types` y los
// tipos salieran SIN tu cambio; el error aparecía después, como un choque de
// tipos incomprensible en el código que usaba la columna nueva.
//
//   pnpm db:types            -> base local (necesita `pnpm db:start` arriba)
//   pnpm db:types --linked   -> proyecto remoto enlazado, para comparar drift
//                               entre las migraciones y lo que hay desplegado
const USAR_REMOTO = process.argv.slice(2).includes("--linked");
const ORIGEN = USAR_REMOTO ? "--linked" : "--local";

const DESTINO = "src/types/database.types.ts";

const BANNER = `// ⚠️ ARCHIVO AUTOGENERADO — NO EDITAR A MANO ⚠️
//
// Se regenera completo con \`pnpm db:types\` (ver scripts/gen-db-types.mjs) a
// partir del esquema de Supabase: cualquier cambio hecho acá se pierde en la
// siguiente corrida.
//
// ¿Cambió una columna en la DB? Corré \`pnpm db:types\` y ajustá los alias de
// dominio de src/types/index.ts, que es la capa curada a mano desde la que
// importa el resto de la app (ver structure.md > "types/").
`;

let generado;
try {
  generado = execFileSync(
    "supabase",
    ["gen", "types", "typescript", ORIGEN, "--schema", "public"],
    {
      encoding: "utf8",
      // stderr directo a la consola: ahí sale el "you need to login" y demás.
      stdio: ["ignore", "pipe", "inherit"],
      maxBuffer: 32 * 1024 * 1024,
    },
  );
} catch {
  console.error(`\n✖ No se pudieron generar los tipos — ${DESTINO} quedó intacto.`);
  if (!USAR_REMOTO) {
    console.error("  ¿Está la base local arriba? Probá `pnpm db:start`.");
  }
  process.exit(1);
}

writeFileSync(DESTINO, `${BANNER}\n${generado}`);
console.log(`✔ ${DESTINO} regenerado desde ${USAR_REMOTO ? "el proyecto remoto" : "la base local"}.`);
