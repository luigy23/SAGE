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
import { semanasDeContratoEnPeriodo } from "@/lib/utils/vinculacion"
import type {
  Modalidad,
  Sede,
  TipoCurso,
} from "@/generated/prisma/client"
import type { AgendaLimits } from "@/lib/validations/agenda-rules"
import { SEDES_CATEDRA_EXTENDIDA } from "@/lib/utils/sede"
import { esCargoExentoGestion20 } from "@/lib/utils/cargo"

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
      const isRegional = sedeBase !== null && SEDES_CATEDRA_EXTENDIDA.includes(sedeBase)
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
    case "VISITANTE_TC":
      // Art. 4e: "según tipo de dedicación — tiempo completo" — derivado del semanal
      return {
        horasSemanalMax: 40,
        horasSemestralMax: null,
        horasSemestralEstricto: false,
        minDocencia: null,
        minDocenciaConProyectos: null,
        maxInvProySocSemanal: null,
        fuente: "fallback-048",
      }
    case "VISITANTE_MT":
      // Art. 4e: "según tipo de dedicación — medio tiempo" — derivado del semanal
      return {
        horasSemanalMax: 20,
        horasSemestralMax: null,
        horasSemestralEstricto: false,
        minDocencia: null,
        minDocenciaConProyectos: null,
        maxInvProySocSemanal: null,
        fuente: "fallback-048",
      }
    case "CATEDRA_VISITANTE_TC":
      // Cátedra Visitante TC: mismas reglas que Visitante TC (Art. 4e) — distinción solo de nombre
      return {
        horasSemanalMax: 40,
        horasSemestralMax: null,
        horasSemestralEstricto: false,
        minDocencia: null,
        minDocenciaConProyectos: null,
        maxInvProySocSemanal: null,
        fuente: "fallback-048",
      }
    case "CATEDRA_VISITANTE_MT":
      // Cátedra Visitante MT: mismas reglas que Visitante MT (Art. 4e) — distinción solo de nombre
      return {
        horasSemanalMax: 20,
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
  /** Semanas por defecto para cátedra (Art. 4d). */
  semanasPeriodoCatedra: number
  /** Semanas por defecto para ocasionales — fallback si no hay fechas de contrato (Art. 4c). */
  semanasPeriodoOcasional: number
  /** Semanas por defecto para visitantes/cátedra visitante — fallback si no hay fechas de contrato (Art. 4e). */
  semanasPeriodoVisitante: number
  /** Semanas de clase — base del cálculo de horas de los CURSOS, independiente de las semanas del contrato. */
  semanasClases: number
  /** Semanas de clase POR SEDE donde se dicta el curso (override del default por sede;
   *  ej. sedes regionales con calendario distinto). Cada sede cae a `semanasClases` si no se configura. */
  semanasClasesPorSede: Record<Sede, number>
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
  semanasPeriodoCatedra: 16,
  semanasPeriodoOcasional: 16,
  semanasPeriodoVisitante: 16,
  semanasClases: 16,
  semanasClasesPorSede: { NEIVA: 16, PITALITO: 16, GARZON: 16, LA_PLATA: 16 },
  horasPorCredito: 48,
  toleranciaValidacionSemanal: 0.5,
  limiteGestionPorcentaje: 0.20,
  minVisitanteDocenciaPorcentaje: 0.60,
  factorPreparacionDefault: 1.5,
  horasTutoriaDefault: 1,
}

export async function resolveGlobales(
  periodoId: string | null = null,
  semanasFromDates?: number
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

    const semanasClasesBase = get("semanas_clases", FALLBACK_GLOBALES.semanasClases, (s) => parseInt(s, 10))
    // Semanas de clase por sede: cada sede cae al valor base si no tiene override.
    const semanasClasesPorSede: Record<Sede, number> = {
      NEIVA: get("semanas_clases_neiva", semanasClasesBase, (s) => parseInt(s, 10)),
      PITALITO: get("semanas_clases_pitalito", semanasClasesBase, (s) => parseInt(s, 10)),
      GARZON: get("semanas_clases_garzon", semanasClasesBase, (s) => parseInt(s, 10)),
      LA_PLATA: get("semanas_clases_la_plata", semanasClasesBase, (s) => parseInt(s, 10)),
    }

    const result: ParametrosGlobales = {
      semanasPeriodo: get("semanas_periodo", semanasFromDates ?? FALLBACK_GLOBALES.semanasPeriodo, (s) => parseInt(s, 10)),
      semanasPeriodoCatedra: get("semanas_periodo_catedra", FALLBACK_GLOBALES.semanasPeriodoCatedra, (s) => parseInt(s, 10)),
      semanasPeriodoOcasional: get("semanas_periodo_ocasional", FALLBACK_GLOBALES.semanasPeriodoOcasional, (s) => parseInt(s, 10)),
      semanasPeriodoVisitante: get("semanas_periodo_visitante", FALLBACK_GLOBALES.semanasPeriodoVisitante, (s) => parseInt(s, 10)),
      semanasClases: semanasClasesBase,
      semanasClasesPorSede,
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
        factorHoras:
          tipoCurso === "TEORICO" ? 2
          : tipoCurso === "TEORICO_PRACTICO" ? 1.5
          : 1, // Art. 3 Par. 4 Acuerdo 048
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
  tipoCargo: string | null
  /** Semanas efectivas de contrato. Aplica a OCASIONAL/VISITANTE/INVITADO (Art. 4c/4e/4f). */
  semanasVinculacion: number | null
  /**
   * Rango del contrato (ocasional/visitante/cátedra visitante). Si está presente, las
   * semanas efectivas del periodo se derivan del solape de este rango con las fechas del
   * periodo, en vez de usar el número plano `semanasVinculacion`. Soporta contratos que
   * abarcan varios semestres (ej. ocasional de ~11 meses).
   */
  vinculacionDesde?: Date | null
  vinculacionHasta?: Date | null
  /** Horas contratadas del INVITADO (base del 100%, Art. 4f). Solo INVITADO; null en el resto. */
  invHorasContratadas?: number | null
}

/**
 * Semanas base por defecto según modalidad. Reemplaza el plano `semanasPeriodo`
 * como punto de partida del cálculo:
 *   - PLANTA / INVITADO → semanasPeriodo global (22)
 *   - CÁTEDRA → semanasPeriodoCatedra (16)
 *   - OCASIONAL → semanasPeriodoOcasional (fallback si no hay fechas de contrato)
 *   - VISITANTE / CÁTEDRA_VISITANTE → semanasPeriodoVisitante (idem)
 */
function semanasBasePorModalidad(
  modalidad: Modalidad,
  globales: ParametrosGlobales
): number {
  switch (modalidad) {
    case "CATEDRA":
      return globales.semanasPeriodoCatedra
    case "OCASIONAL_TC":
    case "OCASIONAL_MT":
      return globales.semanasPeriodoOcasional
    case "VISITANTE_TC":
    case "VISITANTE_MT":
    case "CATEDRA_VISITANTE_TC":
    case "CATEDRA_VISITANTE_MT":
      return globales.semanasPeriodoVisitante
    default:
      return globales.semanasPeriodo
  }
}

/**
 * Resuelve los `AgendaLimits` desde DB para un docente concreto y período.
 * Es el reemplazo async de `getAgendaLimits()` (síncrono, fallback hardcoded).
 *
 * Server-side only — los clientes deben recibir el resultado como prop.
 *
 * @param semanasAgendaOverride — semanas que el docente eligió para esta agenda.
 *   Si se omite, se usan las semanas efectivas del contrato (semanasVinculacion o semanasPeriodo).
 *   Si se provee, escala horasTotalesPeriodo, maxGestion y maxInvProySocialCatedra.
 *   minDocencia permanece fijo (Acuerdo 048 — valores absolutos), salvo VISITANTE que es porcentual.
 */
export async function resolveAgendaLimits(
  docente: DocenteParaResolver,
  periodoId: string | null = null,
  semanasAgendaOverride?: number
): Promise<AgendaLimits & { fuente: ResolvedModalidad["fuente"] }> {
  const [modalidad, globales] = await Promise.all([
    resolveModalidad(docente.modalidad, docente.sedeBase, periodoId),
    resolveGlobales(periodoId),
  ])

  // Para OCASIONAL/VISITANTE/INVITADO, el techo viene del período de vinculación del contrato
  // (Art. 4c/4e/4f). PLANTA usa el semestral global.
  const MODALIDADES_VINCULACION = new Set([
    "OCASIONAL_TC", "OCASIONAL_MT", "VISITANTE_TC", "VISITANTE_MT",
    "CATEDRA_VISITANTE_TC", "CATEDRA_VISITANTE_MT", "INVITADO",
  ] as const)
  const esVinculacionTemporal = MODALIDADES_VINCULACION.has(docente.modalidad as never)

  // Semanas efectivas del periodo. Precedencia:
  //   1. Rango de contrato (vinculacionDesde/Hasta) → solape con las fechas del periodo
  //      (soporta contratos multi-semestre, p.ej. ocasional de ~11 meses).
  //   2. Número plano `semanasVinculacion` (compatibilidad / captura manual).
  //   3. Default por modalidad (cátedra=16, ocasional/visitante parametrizables; PLANTA=22 global).
  let semanasEfectivas = semanasBasePorModalidad(docente.modalidad, globales)
  if (esVinculacionTemporal) {
    let derivadasDeRango = 0
    if (docente.vinculacionDesde && docente.vinculacionHasta && periodoId) {
      const per = await prisma.periodoAcademico.findUnique({
        where: { id: periodoId },
        select: { fechaInicio: true, fechaFin: true },
      })
      if (per) {
        derivadasDeRango = semanasDeContratoEnPeriodo(
          docente.vinculacionDesde,
          docente.vinculacionHasta,
          per,
        )
      }
    }
    if (derivadasDeRango > 0) {
      semanasEfectivas = derivadasDeRango
    } else if (docente.semanasVinculacion != null) {
      semanasEfectivas = docente.semanasVinculacion
    }
  }

  // semanasReales: lo que el docente elige para esta agenda (clampeado al techo efectivo).
  // Si no se pasa override, se usa el techo completo.
  const semanasReales = semanasAgendaOverride != null
    ? Math.min(Math.max(1, semanasAgendaOverride), semanasEfectivas)
    : semanasEfectivas

  // horasTotalesPeriodo: si hay override de semanas, se recalcula siempre desde la tasa semanal.
  // Sin override, PLANTA_TC/MT usan el valor fijo del Acuerdo (880/440); los demás derivan.
  // INVITADO (Art. 4f): el 100% es lo CONTRATADO (horas absolutas autorizadas por el Consejo
  // Académico). Mientras el decano/Consejo NO asigne `invHorasContratadas`, NO se inventa un
  // tope derivado: la agenda queda "sin tope" (el invitado ya es no-estricto) y el tope real
  // aparece cuando se asignan las horas.
  const invitadoSinTope =
    docente.modalidad === "INVITADO" && docente.invHorasContratadas == null

  const horasTotalesPeriodo =
    docente.modalidad === "INVITADO" && docente.invHorasContratadas != null
      ? docente.invHorasContratadas
      : semanasAgendaOverride != null
        ? modalidad.horasSemanalMax * semanasReales
        : (modalidad.horasSemestralMax ?? modalidad.horasSemanalMax * semanasReales)

  // Mínimo de docencia: si tiene proyectos activos, usa el reducido.
  // Para VISITANTE_TC/MT, el mínimo es porcentual (60% del total), escala con semanasReales.
  // Para todos los demás: FIJO según Acuerdo 048 (Art. 3 — valores absolutos).
  const baseMinDocencia = docente.proyectosActivos
    ? (modalidad.minDocenciaConProyectos ?? modalidad.minDocencia)
    : modalidad.minDocencia

  const esVisitante =
    docente.modalidad === "VISITANTE_TC" || docente.modalidad === "VISITANTE_MT" ||
    docente.modalidad === "CATEDRA_VISITANTE_TC" || docente.modalidad === "CATEDRA_VISITANTE_MT"

  const minDocencia =
    baseMinDocencia !== null
      ? baseMinDocencia
      : esVisitante
        ? Math.floor(horasTotalesPeriodo * globales.minVisitanteDocenciaPorcentaje)
        : 0

  // Art. 10: 20% del total, EXCEPTO los 5 cargos exentos del Art. 11.
  // Escala con horasTotalesPeriodo (que a su vez escala con semanasReales).
  const maxGestion = esCargoExentoGestion20(docente.tipoCargo)
    ? horasTotalesPeriodo
    : Math.floor(horasTotalesPeriodo * globales.limiteGestionPorcentaje)

  // Máx inv+PS para cátedras (Art. 3 Par. 2) — escala con semanasReales.
  const maxInvProySocialCatedra =
    docente.modalidad === "CATEDRA" && modalidad.maxInvProySocSemanal !== null
      ? modalidad.maxInvProySocSemanal * semanasReales
      : null

  return {
    horasTotalesPeriodo,
    maxHorasSemanales: modalidad.horasSemanalMax,
    esEstricto: modalidad.horasSemestralEstricto,
    minDocencia,
    maxGestion,
    maxInvProySocialCatedra,
    semanas: semanasReales,          // semanas efectivas de trabajo para esta agenda
    semanasMaximas: semanasEfectivas, // techo máximo elegible por el docente
    sinTopeSemestral: invitadoSinTope,
    fuente: modalidad.fuente,
  }
}
