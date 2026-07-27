import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs es CommonJS y usa APIs nativas de Node (streams/zip). Se usa solo
  // en el route handler app/api/ordenes/excel — se excluye del bundle del
  // servidor para que se cargue desde node_modules en runtime y no rompa el
  // empaquetado.
  serverExternalPackages: ["exceljs"],
  experimental: {
    serverActions: {
      // Por defecto Next.js limita el body de un Server Action a 1MB.
      // previsualizarImportacionOrdenes (app/ordenes/actions.ts) recibe el
      // Excel completo como FormData, y la pantalla de importación anuncia
      // un máximo de 25MB (ver TAMANO_MAXIMO_MB en importar-ordenes-form.tsx)
      // — 26mb para dejar margen al overhead de multipart/form-data.
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
