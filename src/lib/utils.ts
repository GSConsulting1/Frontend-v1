import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// "" -> null para campos de texto opcionales de un formulario, antes de
// persistir (mock o Supabase real). Promovido acá porque lo usan dos
// archivos de lib/data/ (ordenes.ts e info-orden.ts) — ver structure.md.
export function orNull(v: string | undefined): string | null {
  return v && v.trim() !== "" ? v : null
}

// true si al menos uno de los valores observados (react-hook-form `watch`)
// no está vacío — usado por cada archivo de components/ordenes/secciones/
// para el chip "Completo" del acordeón.
export function algunoLleno(valores: unknown[]): boolean {
  return valores.some((v) => v !== undefined && v !== null && v !== "")
}

// "YYYY-MM-DD" (el formato que guardan la DB y los <input type="date">) ->
// "DD/MM/AAAA" para cualquier lugar que muestre una fecha como texto plano
// (tabla, chip de filtro, Excel, PDF) — un <input type="date"> no necesita
// esto, ya se muestra en el formato local del navegador. Promovido acá
// porque ya lo necesitaban matriz-ordenes.ts y pdf/route.tsx (duplicado) más
// ordenes-table.tsx/ordenes-filtros.tsx — ver structure.md.
export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return ""
  const [year, month, day] = iso.split("-")
  return day && month && year ? `${day}/${month}/${year}` : iso
}
