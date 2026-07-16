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
