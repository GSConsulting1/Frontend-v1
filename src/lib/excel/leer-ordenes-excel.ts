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
import {
  RESPONSABLES_OS,
  type OrdenServicioFormValues,
} from "@/lib/validations/orden.schema";
import type { LiquidacionFormValues } from "@/lib/validations/info-orden.schema";

export type FilaExcelOrden = {
  fila: number;
  valores: Partial<OrdenServicioFormValues>;
  // valor_desplazamiento vive en `liquidacion` (tabla 1-a-1 aparte, no
  // ordenes_servicio) — por eso no entra en COLUMNAS_IMPORTAR/CampoImportable
  // de abajo, que solo cubren columnas de OrdenServicioFormValues.
  liquidacion?: Partial<LiquidacionFormValues>;
};

type CampoImportable = keyof Omit<OrdenServicioFormValues, "cliente_id">;

// Header normalizado (sin tildes, minúscula, trim) -> campo del formulario.
// Los nombres de columna vienen del Excel real que manda el ARL, sin
// tildes. cliente_id no aparece acá: no viene en el Excel, se elige en la
// pantalla de importación y se agrega aparte por fila.
const COLUMNAS_IMPORTAR: Record<string, CampoImportable> = {
  "numero de os del cliente": "numero_os_cliente",
  "fecha de recepcion os del cliente": "fecha_recepcion_os",
  "responsable sec para gs": "responsable_os",
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

// Columna aparte de COLUMNAS_IMPORTAR: escribe en `liquidacion.valor_desplazamiento`
// (tabla 1-a-1 con orden_id, no en ordenes_servicio), así que se resuelve por
// fuera del mapa CampoImportable de arriba — ver el bloque final de
// leerOrdenesDesdeExcel.
const COLUMNA_VALOR_DESPLAZAMIENTO = "valor desplazamiento";

const CAMPOS_NUMERICOS = new Set<CampoImportable>(["cronograma", "horas_cargadas"]);
const CAMPOS_FECHA = new Set<CampoImportable>(["fecha_sipab", "fecha_recepcion_os"]);

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

function normalizarTexto(valor: unknown): string {
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

function tokenizar(valor: string): string[] {
  return normalizarTexto(valor).split(/\s+/).filter(Boolean);
}

// Match tolerante a nombres/apellidos de más (ej. "Yulieth Andrea Amell
// Gonzalez" sigue matcheando a "Yulieth Amell"): un responsable de
// RESPONSABLES_OS coincide si todos sus tokens están contenidos en los
// tokens de la celda. Si hay 0 o 2+ coincidencias (p. ej. "Amell" solo,
// ambiguo entre Yulieth Amell y Lina Amell) se devuelve el texto crudo sin
// normalizar en vez de un match adivinado: como no es ninguno de los
// valores de RESPONSABLES_OS, ordenServicioSchema.safeParse lo rechaza (es
// un z.enum) y la fila queda marcada inválida en la previsualización en vez
// de asignarse en silencio a la persona equivocada.
function celdaResponsableOs(valor: unknown): string | undefined {
  const texto = celdaTexto(valor);
  if (!texto) return undefined;

  const tokensCelda = new Set(tokenizar(texto));
  const coincidencias = RESPONSABLES_OS.filter((nombre) =>
    tokenizar(nombre).every((token) => tokensCelda.has(token)),
  );

  return coincidencias.length === 1 ? coincidencias[0] : texto;
}

function extraerValor(campo: CampoImportable, valorCelda: unknown) {
  const resuelto = resolverValorCelda(valorCelda);
  if (CAMPOS_FECHA.has(campo)) return celdaFecha(resuelto);
  if (campo === "tipo_servicio") return celdaTipoServicio(resuelto);
  if (campo === "responsable_os") return celdaResponsableOs(resuelto);
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
  let indiceValorDesplazamiento: number | undefined;
  hoja.getRow(1).eachCell((cell, colNumber) => {
    const encabezado = normalizarTexto(cell.value);
    const campo = COLUMNAS_IMPORTAR[encabezado];
    if (campo) indicePorCampo.set(campo, colNumber);
    if (encabezado === COLUMNA_VALOR_DESPLAZAMIENTO) indiceValorDesplazamiento = colNumber;
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

    const valorDesplazamiento =
      indiceValorDesplazamiento != null
        ? celdaNumero(resolverValorCelda(row.getCell(indiceValorDesplazamiento).value))
        : undefined;
    const liquidacion =
      valorDesplazamiento !== undefined
        ? { valor_desplazamiento: valorDesplazamiento }
        : undefined;

    if (Object.keys(valores).length > 0 || liquidacion) {
      filas.push({ fila: rowNumber, valores, liquidacion });
    }
  });

  return filas;
}
