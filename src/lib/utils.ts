import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a periodoInicio string (yyyy-MM-dd) into a readable Spanish date.
 * Example: "2026-06-30" → "30 de junio de 2026"
 */
export function formatFechaInicio(fecha: string): string {
  try {
    const date = parse(fecha, "yyyy-MM-dd", new Date())
    return format(date, "d 'de' MMMM 'de' yyyy", { locale: es })
  } catch {
    return fecha
  }
}
