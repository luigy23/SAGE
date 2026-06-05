import type { Sede } from "@/generated/prisma/client"
import { SEDES_CATEDRA_EXTENDIDA } from "@/lib/utils/sede"

// ========================================
// Tipos — usados por el resolver, el wizard y las vistas de solo lectura
// ========================================

export type ValidationSeverity = "error" | "warning" | "info"

export type ValidationItem = {
  severity: ValidationSeverity
  message: string
  rule: string
}

export type AgendaTotals = {
  horasDocenciaCursos: number
  horasOtrasDocencia: number
  horasInvestigacion: number
  horasProyeccionSocial: number
  horasGestion: number
  totalDocencia: number
  granTotal: number
}

export type AgendaLimits = {
  horasTotalesPeriodo: number
  maxHorasSemanales: number
  esEstricto: boolean
  minDocencia: number
  maxGestion: number
  maxInvProySocialCatedra: number | null
  semanas: number
  semanasMaximas: number
  /** INVITADO sin horas autorizadas (invHorasContratadas null): no hay tope semestral aún. */
  sinTopeSemestral?: boolean
}

// ========================================
// Datos mínimos de un curso para evaluar Art. 4d (regla mixta de sede).
// ========================================

export type CursoParaSede = {
  sede?: string | null
  horasPresenciales: number
  semanas: number
}

/**
 * Art. 4d — regla mixta de sede para catedráticos.
 * Determina si un catedrático califica para el tope extendido (19 h/sem).
 *
 * - sedeBase regional actúa como PISO (vinculación contractual a sede regional).
 * - >50% de las horas presenciales en sedes regionales actúa como OVERRIDE
 *   permisivo (refleja "vinculados para orientar cursos en las sedes...").
 *
 * Si no se pasan cursos, solo `sedeBase` decide (back-compat con la firma anterior).
 */
export function esCatedraConTopeRegional(
  sedeBase: Sede | null,
  cursos?: CursoParaSede[]
): boolean {
  if (sedeBase && SEDES_CATEDRA_EXTENDIDA.includes(sedeBase)) return true
  if (!cursos || cursos.length === 0) return false

  let horasRegionales = 0
  let horasTotales = 0
  for (const c of cursos) {
    const horas = (c.horasPresenciales || 0) * (c.semanas || 0)
    horasTotales += horas
    if (c.sede && SEDES_CATEDRA_EXTENDIDA.includes(c.sede as Sede)) {
      horasRegionales += horas
    }
  }
  if (horasTotales === 0) return false
  return horasRegionales / horasTotales > 0.5
}
