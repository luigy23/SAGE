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

  // Cátedra Visitante TC: igual que Visitante TC (40 h/sem, no estricto)
  if (modalidad === "CATEDRA_VISITANTE_TC") {
    return { maxHoras: 40, esEstricto: false }
  }

  // Cátedra Visitante MT: igual que Visitante MT (20 h/sem, no estricto)
  if (modalidad === "CATEDRA_VISITANTE_MT") {
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
  if (modalidad === "CATEDRA_VISITANTE_TC") {
    // Igual que Visitante TC (Art. 3 Par. 3): 60% de 40h/sem × semanasPeriodo
    return Math.floor(40 * semanasPeriodo * 0.60)
  }
  if (modalidad === "CATEDRA_VISITANTE_MT") {
    // Igual que Visitante MT (Art. 3 Par. 3): 60% de 20h/sem × semanasPeriodo
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

// ============================================================
// Aritmética de cohortes/períodos (Consejería — Art. 11)
// ============================================================
// Una "cohorte" es el período de ingreso (ej. "2026-1"). Un consejero queda
// afiliado a esa cohorte y tiene derecho a consejería por 6 semestres INCLUSIVE
// (el de inicio cuenta como el 1.º). Funciones puras / client-safe.

/** Nombre de período por defecto válido (`YYYY-S`, con S ∈ {1,2}). */
export const VENTANA_CONSEJERIA_SEMESTRES = 6

/**
 * Convierte "2026-1" en un ordinal comparable (`año*2 + (S-1)`).
 * Retorna `NaN` si el formato no es `YYYY-1` / `YYYY-2`.
 */
export function ordinalPeriodo(nombre: string): number {
  const m = /^(\d{4})-([12])$/.exec((nombre ?? "").trim())
  if (!m) return NaN
  return parseInt(m[1], 10) * 2 + (parseInt(m[2], 10) - 1)
}

/** Inverso de `ordinalPeriodo`: ordinal → "YYYY-S". */
export function periodoDeOrdinal(ordinal: number): string {
  return `${Math.floor(ordinal / 2)}-${(ordinal % 2) + 1}`
}

/**
 * Semestres entre dos períodos (`hasta` − `desde`). Positivo si `hasta` es
 * posterior. `NaN` si alguno tiene formato inválido.
 */
export function semestresEntre(desde: string, hasta: string): number {
  return ordinalPeriodo(hasta) - ordinalPeriodo(desde)
}

/**
 * Cohortes (períodos de ingreso) que aún tienen derecho a consejero respecto del
 * período actual: el período actual y los `ventana-1` anteriores (6 inclusive).
 * Ej. para "2026-1": ["2026-1","2025-2","2025-1","2024-2","2024-1","2023-2"].
 */
export function cohortesValidas(
  periodoActual: string,
  ventana: number = VENTANA_CONSEJERIA_SEMESTRES,
): string[] {
  const base = ordinalPeriodo(periodoActual)
  if (Number.isNaN(base)) return []
  const out: string[] = []
  for (let i = 0; i < ventana; i++) out.push(periodoDeOrdinal(base - i))
  return out
}

/**
 * ¿La cohorte `cohorte` tiene derecho a consejero en el período `periodoAgenda`?
 * Verdadero si la cohorte empezó en ese período o hasta 5 semestres antes
 * (0 ≤ semestres transcurridos ≤ ventana-1). Falso si es futura o vencida.
 */
export function cohorteVigente(
  cohorte: string,
  periodoAgenda: string,
  ventana: number = VENTANA_CONSEJERIA_SEMESTRES,
): boolean {
  const transcurridos = semestresEntre(cohorte, periodoAgenda)
  return Number.isFinite(transcurridos) && transcurridos >= 0 && transcurridos <= ventana - 1
}

// ============================================================
// Períodos (semestres) que abarca un proyecto según sus fechas
// ============================================================

export type PeriodoRango = {
  nombre: string
  fechaInicio: Date | string
  fechaFin: Date | string
}

/**
 * Nombres de los períodos académicos (semestres) que abarca el rango
 * `[inicio, fin]` de un proyecto: un período cuenta si su rango de fechas
 * se SOLAPA con el del proyecto. Devuelve los nombres ordenados
 * cronológicamente. Función pura / client-safe (recibe los períodos ya cargados).
 */
export function periodosQueAbarca(
  inicio: Date | string | null | undefined,
  fin: Date | string | null | undefined,
  periodos: PeriodoRango[],
): string[] {
  if (!inicio || !fin) return []
  const ini = new Date(inicio).getTime()
  const end = new Date(fin).getTime()
  if (Number.isNaN(ini) || Number.isNaN(end) || end < ini) return []
  return periodos
    .filter((p) => {
      const pIni = new Date(p.fechaInicio).getTime()
      const pFin = new Date(p.fechaFin).getTime()
      return pIni <= end && pFin >= ini // solapamiento de rangos
    })
    .map((p) => p.nombre)
    .sort((a, b) => {
      const oa = ordinalPeriodo(a)
      const ob = ordinalPeriodo(b)
      if (Number.isNaN(oa) || Number.isNaN(ob)) return a.localeCompare(b)
      return oa - ob
    })
}
