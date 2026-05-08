/**
 * Resolver de reglas paramétricas — Fase 3 del refactor.
 *
 * Lee parámetros desde DB con cascada de precedencia:
 *   1. (periodoId=P, modalidad=M, sedeAplicable=S)
 *   2. (periodoId=P, modalidad=M, sedeAplicable=NULL)
 *   3. (periodoId=NULL, modalidad=M, sedeAplicable=S)
 *   4. (periodoId=NULL, modalidad=M, sedeAplicable=NULL)
 *   5. fallback hardcoded (Acuerdo 048) — síncrono, en agenda-rules.ts
 *
 * Resultados se cachean en memoria 60s vía `memoize()`.
 */

import { prisma } from "@/lib/prisma"
import { memoize } from "@/lib/rules/cache"
import type {
  Modalidad,
  Sede,
  TipoCurso,
} from "@/generated/prisma/client"
import type { AgendaLimits } from "@/lib/validations/agenda-rules"

// ========================================
// Parámetros por modalidad
// ========================================

export type ResolvedModalidad = {
  horasSemanalMax: number
  /**
   * Tope semestral fijo por norma. `null` significa derivado en runtime:
   * `horasSemanalMax * semanasPeriodo` (Art. 4c/4d/4e/4f).
   * Solo PLANTA_TC (880) y PLANTA_MT (440) lo tienen fijado por el Art. 4a/4b.
   */
  horasSemestralMax: number | null
  horasSemestralEstricto: boolean
  minDocencia: number | null
  minDocenciaConProyectos: number | null
  maxInvProySocSemanal: number | null
  fuente: "db" | "fallback-048"
}

/** Fallback síncrono según Acuerdo 048 (idéntico al seed default). */
function fallbackModalidad(
  modalidad: Modalidad,
  sedeBase: Sede | null
): ResolvedModalidad {
  switch (modalidad) {
    case "PLANTA_TC":
      // Art. 4a: "deben laborar 880 horas en 22 semanas" — tope fijo por norma
      return {
        horasSemanalMax: 40,
        horasSemestralMax: 880,
        horasSemestralEstricto: true,
        minDocencia: 432,
        minDocenciaConProyectos: 288,
        maxInvProySocSemanal: null,
        fuente: "fallback-048",
      }
    case "PLANTA_MT":
      // Art. 4b: "deben laborar 440 horas en 22 semanas" — tope fijo por norma
      return {
        horasSemanalMax: 20,
        horasSemestralMax: 440,
        horasSemestralEstricto: true,
        minDocencia: 240,
        minDocenciaConProyectos: 144,
        maxInvProySocSemanal: null,
        fuente: "fallback-048",
      }
    case "OCASIONAL_TC":
      // Art. 4c: "40 horas semanales durante el período de su vinculación" — derivado
      return {
        horasSemanalMax: 40,
        horasSemestralMax: null,
        horasSemestralEstricto: true,
        minDocencia: 432,
        minDocenciaConProyectos: 288,
        maxInvProySocSemanal: null,
        fuente: "fallback-048",
      }
    case "OCASIONAL_MT":
      // Art. 4c: "20 horas semanales durante el período de su vinculación" — derivado
      return {
        horasSemanalMax: 20,
        horasSemestralMax: null,
        horasSemestralEstricto: true,
        minDocencia: 240,
        minDocenciaConProyectos: 144,
        maxInvProySocSemanal: null,
        fuente: "fallback-048",
      }
    case "CATEDRA": {
      // Art. 4d: "podrán laborar HASTA 16 (Neiva) / 19 (regional) horas semanales" — tope máximo derivado
      const isRegional =
        sedeBase === "PITALITO" ||
        sedeBase === "GARZON" ||
        sedeBase === "LA_PLATA"
      const horasSemanalMax = isRegional ? 19 : 16
      return {
        horasSemanalMax,
        horasSemestralMax: null,
        horasSemestralEstricto: true,
        minDocencia: null,
        minDocenciaConProyectos: null,
        maxInvProySocSemanal: 4,
        fuente: "fallback-048",
      }
    }
    case "VISITANTE":
      // Art. 4e: "según tipo de dedicación" — derivado del semanal
      return {
        horasSemanalMax: 40,
        horasSemestralMax: null,
        horasSemestralEstricto: false,
        minDocencia: null,
        minDocenciaConProyectos: null,
        maxInvProySocSemanal: null,
        fuente: "fallback-048",
      }
    case "INVITADO":
      // Art. 4f: "hasta 100% según vinculación" — derivado del semanal
      return {
        horasSemanalMax: 40,
        horasSemestralMax: null,
        horasSemestralEstricto: false,
        minDocencia: null,
        minDocenciaConProyectos: null,
        maxInvProySocSemanal: null,
        fuente: "fallback-048",
      }
  }
}

/**
 * Resuelve parámetros por modalidad (con cascada).
 * `periodoId` opcional permite parametrización por período.
 */
export async function resolveModalidad(
  modalidad: Modalidad,
  sedeBase: Sede | null,
  periodoId: string | null = null
): Promise<ResolvedModalidad> {
  const cacheKey = `params:modalidad:${periodoId ?? "default"}:${modalidad}:${sedeBase ?? "any"}`

  return memoize(cacheKey, async () => {
    // Cascada: período + sede → período → default + sede → default
    const candidates = await prisma.parametrosModalidad.findMany({
      where: {
        OR: [
          ...(periodoId
            ? [
                { periodoId, modalidad, sedeAplicable: sedeBase },
                { periodoId, modalidad, sedeAplicable: null },
              ]
            : []),
          { periodoId: null, modalidad, sedeAplicable: sedeBase },
          { periodoId: null, modalidad, sedeAplicable: null },
        ],
        activo: true,
      },
    })

    // Ordenar por especificidad (período concreto > default; sede concreta > null)
    const sorted = candidates.sort((a, b) => {
      const aScore = (a.periodoId ? 2 : 0) + (a.sedeAplicable ? 1 : 0)
      const bScore = (b.periodoId ? 2 : 0) + (b.sedeAplicable ? 1 : 0)
      return bScore - aScore
    })

    const winner = sorted[0]
    if (!winner) return fallbackModalidad(modalidad, sedeBase)

    return {
      horasSemanalMax: winner.horasSemanalMax,
      horasSemestralMax: winner.horasSemestralMax,
      horasSemestralEstricto: winner.horasSemestralEstricto,
      minDocencia: winner.minDocencia,
      minDocenciaConProyectos: winner.minDocenciaConProyectos,
      maxInvProySocSemanal: winner.maxInvProySocSemanal,
      fuente: "db",
    }
  })
}

// ========================================
// Parámetros globales
// ========================================

export type ParametrosGlobales = {
  semanasPeriodo: number
  horasPorCredito: number
  toleranciaValidacionSemanal: number
  limiteGestionPorcentaje: number
  minVisitanteDocenciaPorcentaje: number
  factorPreparacionDefault: number
  horasTutoriaDefault: number
  fuente: "db" | "fallback-048" | "mixed"
}

const FALLBACK_GLOBALES: Omit<ParametrosGlobales, "fuente"> = {
  semanasPeriodo: 22,
  horasPorCredito: 48,
  toleranciaValidacionSemanal: 0.5,
  limiteGestionPorcentaje: 0.20,
  minVisitanteDocenciaPorcentaje: 0.60,
  factorPreparacionDefault: 1.5,
  horasTutoriaDefault: 1,
}

export async function resolveGlobales(
  periodoId: string | null = null
): Promise<ParametrosGlobales> {
  const cacheKey = `params:globales:${periodoId ?? "default"}`

  return memoize(cacheKey, async () => {
    const rows = await prisma.parametroGlobal.findMany({
      where: {
        OR: [
          ...(periodoId ? [{ periodoId }] : []),
          { periodoId: null },
        ],
        activo: true,
      },
    })

    // Construir mapa, dando prioridad a período > default
    const map = new Map<string, string>()
    // Primero los defaults
    for (const r of rows.filter((r) => r.periodoId === null)) {
      map.set(r.clave, r.valor)
    }
    // Luego los específicos del período (sobrescriben)
    for (const r of rows.filter((r) => r.periodoId === periodoId && periodoId)) {
      map.set(r.clave, r.valor)
    }

    const get = (clave: string, defaultVal: number, parser: (s: string) => number) => {
      const v = map.get(clave)
      return v !== undefined ? parser(v) : defaultVal
    }

    const result: ParametrosGlobales = {
      semanasPeriodo: get("semanas_periodo", FALLBACK_GLOBALES.semanasPeriodo, (s) => parseInt(s, 10)),
      horasPorCredito: get("horas_por_credito", FALLBACK_GLOBALES.horasPorCredito, (s) => parseInt(s, 10)),
      toleranciaValidacionSemanal: get("tolerancia_validacion_semanal", FALLBACK_GLOBALES.toleranciaValidacionSemanal, parseFloat),
      limiteGestionPorcentaje: get("limite_gestion_porcentaje", FALLBACK_GLOBALES.limiteGestionPorcentaje, parseFloat),
      minVisitanteDocenciaPorcentaje: get("min_visitante_docencia_porcentaje", FALLBACK_GLOBALES.minVisitanteDocenciaPorcentaje, parseFloat),
      factorPreparacionDefault: get("factor_preparacion_default", FALLBACK_GLOBALES.factorPreparacionDefault, parseFloat),
      horasTutoriaDefault: get("horas_tutoria_default", FALLBACK_GLOBALES.horasTutoriaDefault, parseFloat),
      fuente: rows.length === 0 ? "fallback-048" : map.size > 0 ? "db" : "mixed",
    }

    return result
  })
}

// ========================================
// Fórmulas por tipo de curso × facultad
// ========================================

export type ResolvedFormula = {
  factorHoras: number
  constanteSuma: number
  maxCreditosTrabajoIndep: number | null
  fuente: "db" | "fallback-048"
}

export async function resolveFormulaCurso(
  tipoCurso: TipoCurso,
  facultad: string | null,
  periodoId: string | null = null
): Promise<ResolvedFormula> {
  const cacheKey = `params:formula:${periodoId ?? "default"}:${tipoCurso}:${facultad ?? "any"}`

  return memoize(cacheKey, async () => {
    const candidates = await prisma.formulaCurso.findMany({
      where: {
        OR: [
          ...(periodoId
            ? [
                { periodoId, tipoCurso, facultad },
                { periodoId, tipoCurso, facultad: null },
              ]
            : []),
          { periodoId: null, tipoCurso, facultad },
          { periodoId: null, tipoCurso, facultad: null },
        ],
        activo: true,
      },
    })

    const sorted = candidates.sort((a, b) => {
      const aScore = (a.periodoId ? 2 : 0) + (a.facultad ? 1 : 0)
      const bScore = (b.periodoId ? 2 : 0) + (b.facultad ? 1 : 0)
      return bScore - aScore
    })

    const winner = sorted[0]
    if (!winner) {
      // Fallback hardcoded
      return {
        factorHoras: tipoCurso === "TEORICO" ? 1.5 : 1.5, // 048 default
        constanteSuma: 1,
        maxCreditosTrabajoIndep: null,
        fuente: "fallback-048",
      }
    }

    return {
      factorHoras: winner.factorHoras,
      constanteSuma: winner.constanteSuma,
      maxCreditosTrabajoIndep: winner.maxCreditosTrabajoIndep,
      fuente: "db",
    }
  })
}

// ========================================
// Composición: AgendaLimits a partir del resolver
// ========================================

type DocenteParaResolver = {
  modalidad: Modalidad
  sedeBase: Sede | null
  doctorado: boolean
  cargoAdministrativo: boolean
  proyectosActivos: boolean
}

/**
 * Resuelve los `AgendaLimits` desde DB para un docente concreto y período.
 * Es el reemplazo async de `getAgendaLimits()` (síncrono, fallback hardcoded).
 *
 * Server-side only — los clientes deben recibir el resultado como prop.
 */
export async function resolveAgendaLimits(
  docente: DocenteParaResolver,
  periodoId: string | null = null
): Promise<AgendaLimits & { fuente: ResolvedModalidad["fuente"] }> {
  const [modalidad, globales] = await Promise.all([
    resolveModalidad(docente.modalidad, docente.sedeBase, periodoId),
    resolveGlobales(periodoId),
  ])

  // Si la norma fija el tope semestral (PLANTA_TC=880, PLANTA_MT=440 — Art. 4a/4b)
  // se usa tal cual. Si no, se deriva: horasSemanalMax × semanasPeriodo (Art. 4c/4d/4e/4f).
  const horasTotalesPeriodo =
    modalidad.horasSemestralMax ?? modalidad.horasSemanalMax * globales.semanasPeriodo

  // Mínimo de docencia: si tiene proyectos activos, usa el reducido
  const minDocencia = docente.proyectosActivos
    ? modalidad.minDocenciaConProyectos ?? modalidad.minDocencia ?? 0
    : modalidad.minDocencia ?? 0

  // Máx gestión: 20% del total, salvo cargo administrativo
  const maxGestion = docente.cargoAdministrativo
    ? horasTotalesPeriodo
    : Math.floor(horasTotalesPeriodo * globales.limiteGestionPorcentaje)

  // Máx inv+PS para cátedras (Art. 3 Par. 2)
  const maxInvProySocialCatedra =
    docente.modalidad === "CATEDRA" && modalidad.maxInvProySocSemanal !== null
      ? modalidad.maxInvProySocSemanal * globales.semanasPeriodo
      : null

  return {
    horasTotalesPeriodo,
    maxHorasSemanales: modalidad.horasSemanalMax,
    esEstricto: modalidad.horasSemestralEstricto,
    minDocencia,
    maxGestion,
    maxInvProySocialCatedra,
    semanas: globales.semanasPeriodo,
    fuente: modalidad.fuente,
  }
}
