/**
 * Utilidades puras de período/modalidad — client-safe (sin import de Prisma).
 *
 * Para resolución del período activo desde DB, ver `periodo-server.ts` (server-only).
 */

/**
 * Sedes regionales que permiten 19h/sem para catedráticos.
 * Art. 4d: "...vinculados para orientar cursos en las sedes de Pitalito, Garzón y La Plata,
 * quienes podrán laborar hasta 19 horas semanales."
 *
 * Valores deben coincidir con el enum Prisma `Sede` (sin tildes, mayúsculas).
 */
const SEDES_REGIONALES_19H = ["PITALITO", "GARZON", "LA_PLATA"]

/**
 * getMaxHoras — Single Source of Truth (síncrono / fallback) para límites
 * legales del Acuerdo 048. Para resolver desde DB con cascada, usar
 * `resolveAgendaLimits` del módulo `@/lib/rules/resolver` (server-only).
 *
 * @param modalidad  — Modalidad del docente (enum Prisma: PLANTA_TC, PLANTA_MT, etc.)
 * @param sedeBase   — Sede contractual del docente (enum Prisma: NEIVA, PITALITO, etc.)
 *                     Solo relevante para CATEDRA (Art. 4d).
 *
 * Retorna:
 * - maxHoras:   Límite máximo de horas SEMANALES.
 * - esEstricto: `true` = bloqueo duro en envío. ALL modalities are strict per Acuerdo 048.
 */
export function getMaxHoras(
  modalidad: string,
  sedeBase?: string | null
): {
  maxHoras: number
  esEstricto: boolean
} {
  // Art. 4a/4c — Tiempo Completo → 40 h/sem (estricto)
  if (modalidad === "PLANTA_TC" || modalidad === "OCASIONAL_TC") {
    return { maxHoras: 40, esEstricto: true }
  }

  // Art. 4b/4c — Medio Tiempo → 20 h/sem (estricto)
  if (modalidad === "PLANTA_MT" || modalidad === "OCASIONAL_MT") {
    return { maxHoras: 20, esEstricto: true }
  }

  // Art. 4d — Cátedra → 16 h/sem (central) ó 19 h/sem (sedes regionales)
  if (modalidad === "CATEDRA") {
    const sedeNorm = (sedeBase || "").toUpperCase().trim()
    const esSedeRegional = SEDES_REGIONALES_19H.includes(sedeNorm)
    return { maxHoras: esSedeRegional ? 19 : 16, esEstricto: true }
  }

  // Fallback (VISITANTE, INVITADO): 40 h/sem hasta tener parámetro contractual.
  return { maxHoras: 40, esEstricto: true }
}

/**
 * getMinDocencia — Mínimo legal de horas de docencia para el semestre
 * (Acuerdo 048, Art. 3). Si el docente tiene proyectos activos, aplica el
 * mínimo reducido (Art. 3 Par. 1).
 *
 * Síncrono / fallback. Para resolver desde DB ver `resolveAgendaLimits`.
 */
export function getMinDocencia(
  modalidad: string,
  proyectosActivos: boolean
): number {
  if (modalidad === "PLANTA_TC" || modalidad === "OCASIONAL_TC") {
    return proyectosActivos ? 288 : 432
  }
  if (modalidad === "PLANTA_MT" || modalidad === "OCASIONAL_MT") {
    return proyectosActivos ? 144 : 240
  }
  if (modalidad === "VISITANTE") {
    return 528 // 60% de 880 (Art. 3 Par. 4)
  }
  // CATEDRA, INVITADO: sin mínimo de docencia
  return 0
}
