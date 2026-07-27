// Parser del Excel de cronograma que manda el ARL (ej. Bolívar) — por cada
// fila de datos arma los valores de "Datos generales" (ordenServicioSchema)
// que sí tienen campo confirmado por negocio (ver COLUMNAS_IMPORTAR abajo).
// El resto de columnas del Excel (Actividad Programa, fechas/horas de
// ejecución, valores de viáticos individuales, Proveedor, Profesional,
// Director Sectorial, Ubicacion Actividad, etc.) no tiene campo hoy en
// orden-campos.tsx y se ignora a propósito.
//
// Es el equivalente de lectura de matriz-ordenes.ts/construir-matriz-excel.ts
// (que arman el .xlsx de export): acá se lee uno. exceljs corre solo en
// Node (usa Buffer/zip) — solo se importa desde Server Actions (ver
// app/ordenes/actions.ts), nunca desde código de cliente.

import ExcelJS from "exceljs";
import type { OrdenServicioFormValues } from "@/lib/validations/orden.schema";

export type FilaExcelOrden = {
  fila: number;
  valores: Partial<OrdenServicioFormValues>;
};

type CampoImportable = keyof Omit<OrdenServicioFormValues, "cliente_id">;

// Header normalizado (sin tildes, minúscula, trim) -> campo del formulario.
// Los nombres de columna vienen del Excel real que manda el ARL, sin
// tildes. cliente_id no aparece acá: no viene en el Excel, se elige en la
// pantalla de importación y se agrega aparte por fila.
const COLUMNAS_IMPORTAR: Record<string, CampoImportable> = {
  "razon social": "nombre_empresa_usuaria",
  "nit empresa": "nit_empresa_usuaria",
  "numero cronograma": "cronograma",
  "actividad cronograma": "secuencia",
  descripcion: "nombre_servicio",
  "act programadas": "horas_cargadas",
  "tipo servicio": "tipo_servicio",
  "fecha programada": "fecha_sipab",
  "nombre asesor gestion riesgos": "asesor_gestion_riesgos",
  observaciones: "observaciones_iniciales",
  "autoriza viaticos": "tarifa_valor_transporte",
};

const CAMPOS_NUMERICOS = new Set<CampoImportable>(["cronograma", "horas_cargadas"]);

// A=Asesoría, T=Informe técnico, C=Capacitación — cualquier otro código (o
// vacío) cae en "N/A". Confirmado por negocio.
const TIPO_SERVICIO_POR_CODIGO: Record<
  string,
  OrdenServicioFormValues["tipo_servicio"]
> = {
  a: "Asesoría",
  t: "Informe técnico",
  c: "Capacitación",
};

const MESES: Record<string, string> = {
  ene: "01",
  jan: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12",
  dec: "12",
};

function normalizarHeader(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// exceljs entrega texto plano casi siempre, pero para celdas con rich
// text/hipervínculo/fórmula devuelve un objeto — se resuelve al valor
// primitivo antes de aplicar el transform de cada campo.
function resolverValorCelda(valor: unknown): unknown {
  if (valor && typeof valor === "object") {
    if ("richText" in valor) {
      return (valor as { richText: { text: string }[] }).richText
        .map((r) => r.text)
        .join("");
    }
    if ("result" in valor) {
      return (valor as { result: unknown }).result;
    }
    if ("text" in valor) {
      return (valor as { text: unknown }).text;
    }
  }
  return valor;
}

function celdaTexto(valor: unknown): string | undefined {
  const texto = String(valor ?? "").trim();
  return texto || undefined;
}

function celdaNumero(valor: unknown): number | undefined {
  if (valor === null || valor === undefined || valor === "") return undefined;
  const numero =
    typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
  return Number.isFinite(numero) ? numero : undefined;
}

// "06/jan/2026" -> "2026-01-06" (formato que espera fecha_sipab / <input
// type="date">). exceljs también puede entregar la celda ya como Date si la
// columna viene formateada como fecha en el Excel.
function celdaFecha(valor: unknown): string | undefined {
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }
  if (typeof valor === "string") {
    const match = valor.trim().match(/^(\d{1,2})\/([a-zA-Z]{3,})\/(\d{4})$/);
    if (match) {
      const [, dia, mesTexto, anio] = match;
      const mes = MESES[mesTexto.toLowerCase().slice(0, 3)];
      if (mes) return `${anio}-${mes}-${dia.padStart(2, "0")}`;
    }
  }
  return undefined;
}

function celdaTipoServicio(
  valor: unknown,
): OrdenServicioFormValues["tipo_servicio"] {
  const codigo = String(valor ?? "").trim().toLowerCase();
  return TIPO_SERVICIO_POR_CODIGO[codigo] ?? "N/A";
}

function extraerValor(campo: CampoImportable, valorCelda: unknown) {
  const resuelto = resolverValorCelda(valorCelda);
  if (campo === "fecha_sipab") return celdaFecha(resuelto);
  if (campo === "tipo_servicio") return celdaTipoServicio(resuelto);
  if (CAMPOS_NUMERICOS.has(campo)) return celdaNumero(resuelto);
  return celdaTexto(resuelto);
}

export async function leerOrdenesDesdeExcel(
  buffer: Buffer,
): Promise<FilaExcelOrden[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const hoja = workbook.worksheets[0];
  if (!hoja) return [];

  const indicePorCampo = new Map<CampoImportable, number>();
  hoja.getRow(1).eachCell((cell, colNumber) => {
    const campo = COLUMNAS_IMPORTAR[normalizarHeader(cell.value)];
    if (campo) indicePorCampo.set(campo, colNumber);
  });

  const filas: FilaExcelOrden[] = [];
  hoja.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header

    const valores: Partial<OrdenServicioFormValues> = {};
    for (const [campo, colNumber] of indicePorCampo) {
      const valor = extraerValor(campo, row.getCell(colNumber).value);
      if (valor !== undefined) {
        (valores as Record<string, unknown>)[campo] = valor;
      }
    }

    if (Object.keys(valores).length > 0) {
      filas.push({ fila: rowNumber, valores });
    }
  });

  return filas;
}
