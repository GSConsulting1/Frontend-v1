// Builder del archivo .xlsx de la "matriz de órdenes". Recibe las filas ya
// unidas (una por orden) y devuelve el buffer binario del Excel. Es el
// equivalente a lib/pdf/OrdenServicioDocument para el PDF: solo arma el
// documento, no toca Supabase (eso lo hace app/api/ordenes/excel/route.ts).
//
// Hoja plana (una sola fila de encabezados, sin bandas de color ni celdas
// combinadas) con las columnas en el orden exacto de COLUMNAS_MATRIZ.
//
// exceljs corre solo en Node (usa Buffer/zip); importar este módulo solo
// desde route handlers, nunca desde código de cliente.

import ExcelJS from "exceljs";
import { COLUMNAS_MATRIZ, type MatrizOrdenRow } from "./matriz-ordenes";

export async function construirMatrizExcel(
  filas: MatrizOrdenRow[],
  opciones?: { incluirFinanciera?: boolean },
): Promise<Buffer> {
  // talento exporta sin las columnas financiera: true (RLS restringe esas 5
  // tablas a administrador/financiero, ver ROLES_CON_FINANCIERA en
  // app/api/ordenes/excel/route.tsx).
  const columnas =
    opciones?.incluirFinanciera === false
      ? COLUMNAS_MATRIZ.filter((columna) => !columna.financiera)
      : COLUMNAS_MATRIZ;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Órdenes de servicio");

  worksheet.columns = columnas.map((columna) => ({
    header: columna.header,
    width: 26,
  }));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.height = 42;

  for (const fila of filas) {
    worksheet.addRow(columnas.map((columna) => columna.value(fila)));
  }

  // Formato de miles para las columnas marcadas como money (getColumn es
  // 1-indexado, igual que el orden de `columnas`).
  columnas.forEach((columna, indice) => {
    if (columna.money) worksheet.getColumn(indice + 1).numFmt = "#,##0";
  });

  // Congela la fila de encabezados al hacer scroll horizontal/vertical.
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
