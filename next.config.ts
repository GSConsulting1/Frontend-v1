import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs es CommonJS y usa APIs nativas de Node (streams/zip). Se usa solo
  // en el route handler app/api/ordenes/excel — se excluye del bundle del
  // servidor para que se cargue desde node_modules en runtime y no rompa el
  // empaquetado.
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
