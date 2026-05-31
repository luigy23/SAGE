/**
 * Utilidades puras de período/modalidad — client-safe (sin import de Prisma).
 *
 * Para resolución del período activo desde DB, ver `periodo-server.ts` (server-only).
 */

import { SEDES_CATEDRA_EXTENDIDA } from "@/lib/utils/sede"

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
 * - esEstricto: `true` = bloqueo duro en envío. VISITANTE e INVITADO son `false`
 *               porque el Art. 4e/4f les permite flexibilidad según su contrato.
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
    const esSedeRegional = SEDES_CATEDRA_EXTENDIDA.includes(sedeNorm as never)
    return { maxHoras: esSedeRegional ? 19 : 16, esEstricto: true }
  }

  // Art. 4e — Visitante TC: 40 h/sem, no estricto
  if (modalidad === "VISITANTE_TC") {
    return { maxHoras: 40, esEstricto: false }
  }

  // Art. 4e — Visitante MT: 20 h/sem, no estricto
  if (modalidad === "VISITANTE_MT") {
    return { maxHoras: 20, esEstricto: false }
  }

  // Art. 4f — Invitado: hasta 100% según resolución CA, no estricto
  if (modalidad === "INVITADO") {
    return { maxHoras: 40, esEstricto: false }
  }

  // Fallback defensivo: tratar como estricto si la modalidad es desconocida.
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
  proyectosActivos: boolean,
  semanasPeriodo: number = 22,
): number {
  if (modalidad === "PLANTA_TC" || modalidad === "OCASIONAL_TC") {
    // TODO(Art. 4c): para OCASIONAL, el mínimo real depende de semanasVinculacion.
    return proyectosActivos ? 288 : 432
  }
  if (modalidad === "PLANTA_MT" || modalidad === "OCASIONAL_MT") {
    // TODO(Art. 4c): para OCASIONAL, el mínimo real depende de semanasVinculacion.
    return proyectosActivos ? 144 : 240
  }
  if (modalidad === "VISITANTE_TC") {
    // Art. 3 Par. 3: mínimo 60% de la agenda total (40h/sem × semanasPeriodo × 0.60)
    return Math.floor(40 * semanasPeriodo * 0.60)
  }
  if (modalidad === "VISITANTE_MT") {
    // Art. 3 Par. 3: mínimo 60% de la agenda total (20h/sem × semanasPeriodo × 0.60)
    return Math.floor(20 * semanasPeriodo * 0.60)
  }
  // CATEDRA, INVITADO: sin mínimo de docencia
  return 0
}

/**
 * getMaxInvProySocialCatedra — Tope semestral combinado de Investigación +
 * Proyección Social para cátedras (Art. 3 Par. 2 Acuerdo 048: máx 4h/sem).
 *
 * Retorna `null` para modalidades sin límite especial.
 * Síncrono / client-safe. Para resolver desde DB ver `resolveAgendaLimits`.
 */
export function getMaxInvProySocialCatedra(
  modalidad: string,
  semanasPeriodo: number,
): number | null {
  return modalidad === "CATEDRA" ? 4 * semanasPeriodo : null
}
