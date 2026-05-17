/**
 * Reglas de validación de la Agenda Semestral
 * según Acuerdo 048 de 2018 — Universidad Surcolombiana
 *
 * NOTA: Este archivo será reemplazado en la Fase 3 por un resolver
 * paramétrico que lea desde la tabla `ParametrosModalidad`.
 * Mientras tanto, contiene los valores por defecto del Acuerdo 048.
 */

import type { Modalidad, Sede } from "@/generated/prisma/client"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import { esCargoExentoGestion20 } from "@/lib/utils/cargo"

// ========================================
// Tipos
// ========================================

type DocenteInfo = {
  modalidad: Modalidad
  doctorado: boolean
  cargoAdministrativo: boolean
  proyectosActivos: boolean
  sedeBase: Sede | null
  // Texto libre del cargo (ej: "Jefe de Programa"). Usado para resolver
  // la exención del tope del 20% de gestión (Art. 10).
  tipoCargo: string | null
}

export type ValidationSeverity = "error" | "warning" | "info"

export type ValidationItem = {
  severity: ValidationSeverity
  message: string
  rule: string // referencia al artículo
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
  esEstricto: boolean // bloqueo duro al envío si excede
  minDocencia: number
  maxGestion: number
  maxInvProySocialCatedra: number | null // null = sin límite especial
  semanas: number
}

// ========================================
// Constantes (Acuerdo 048 — defaults)
// ========================================

const SEMANAS_PERIODO = 22
const SEDES_CATEDRA_EXTENDIDA: Sede[] = ["PITALITO", "GARZON", "LA_PLATA"]
const PORCENTAJE_GESTION_MAX = 0.20
const PORCENTAJE_VISITANTE_DOCENCIA_MIN = 0.60
const HORAS_SEMANALES_INV_PS_CATEDRA = 4

// ========================================
// Cálculo de límites según modalidad
// ========================================

export function getAgendaLimits(docente: DocenteInfo): AgendaLimits {
  // Acuerdo 048: VISITANTE/INVITADO no estrictos; el resto sí.
  const esEstricto =
    docente.modalidad !== "VISITANTE" && docente.modalidad !== "INVITADO"
  return {
    horasTotalesPeriodo: getHorasTotalesPeriodo(docente),
    maxHorasSemanales: getMaxHorasSemanales(docente),
    esEstricto,
    minDocencia: getMinDocencia(docente),
    maxGestion: getMaxGestion(docente),
    maxInvProySocialCatedra: getMaxInvProySocialCatedra(docente),
    semanas: SEMANAS_PERIODO,
  }
}

/** Art. 4: Horas totales del periodo */
function getHorasTotalesPeriodo(docente: DocenteInfo): number {
  switch (docente.modalidad) {
    case "PLANTA_TC":
    case "OCASIONAL_TC":
      return 880 // Art. 4a/4c
    case "PLANTA_MT":
    case "OCASIONAL_MT":
      return 440 // Art. 4b/4c
    case "CATEDRA":
      return getMaxHorasSemanales(docente) * SEMANAS_PERIODO
    case "VISITANTE":
    case "INVITADO":
      // Art. 4e/f: según contrato. Default conservador a TC hasta tener parámetro.
      return 880
  }
}

/** Art. 4: Horas máximas semanales */
function getMaxHorasSemanales(docente: DocenteInfo): number {
  switch (docente.modalidad) {
    case "PLANTA_TC":
    case "OCASIONAL_TC":
      return 40
    case "PLANTA_MT":
    case "OCASIONAL_MT":
      return 20
    case "CATEDRA":
      return docente.sedeBase &&
        SEDES_CATEDRA_EXTENDIDA.includes(docente.sedeBase)
        ? 19 // Art. 4d sedes regionales
        : 16 // Art. 4d sede central
    case "VISITANTE":
    case "INVITADO":
      return 40
  }
}

/**
 * Art. 3: Horas mínimas de docencia
 * - PLANTA/OCASIONAL: reducible si hay proyectos activos (Par. 1)
 * - VISITANTE: ≥ 60% de la agenda (Par. 3)
 * - CATEDRA / INVITADO: sin mínimo formal
 */
function getMinDocencia(docente: DocenteInfo): number {
  switch (docente.modalidad) {
    case "PLANTA_TC":
    case "OCASIONAL_TC":
      return docente.proyectosActivos ? 288 : 432
    case "PLANTA_MT":
    case "OCASIONAL_MT":
      return docente.proyectosActivos ? 144 : 240
    case "VISITANTE":
      return Math.floor(
        getHorasTotalesPeriodo(docente) * PORCENTAJE_VISITANTE_DOCENCIA_MIN
      )
    case "CATEDRA":
    case "INVITADO":
      return 0
  }
}

/**
 * Art. 10: Gestión no puede exceder 20% del total.
 * Excepto los 5 cargos exentos (Art. 10 + Art. 11):
 *   Jefes de Programa, Jefes de Departamento, Asesores de Vicerrectoría,
 *   Asesores de Rectoría y Decanos.
 * Cualquier otro cargo administrativo sí está sujeto al 20%.
 */
function getMaxGestion(docente: DocenteInfo): number {
  if (esCargoExentoGestion20(docente.tipoCargo)) {
    return getHorasTotalesPeriodo(docente)
  }
  return Math.floor(getHorasTotalesPeriodo(docente) * PORCENTAJE_GESTION_MAX)
}

/**
 * Art. 3, Parágrafo 2: Catedráticos con proyectos pueden hasta
 * 4 hrs/sem en investigación o proyección social
 */
function getMaxInvProySocialCatedra(
  docente: DocenteInfo
): number | null {
  if (docente.modalidad !== "CATEDRA") return null
  return HORAS_SEMANALES_INV_PS_CATEDRA * SEMANAS_PERIODO
}

// ========================================
// Cálculo de totales de la agenda
// ========================================

export function getAgendaTotals(agenda: AgendaConRelaciones): AgendaTotals {
  const horasDocenciaCursos = agenda.cursos.reduce(
    (s, c) => s + c.dedicacionPeriodo,
    0
  )
  const horasOtrasDocencia = agenda.otrasActividadesDocencia.reduce(
    (s, a) => s + a.dedicacionPeriodo,
    0
  )
  const horasInvestigacion = agenda.actividadesInvestigacion.reduce(
    (s, a) => s + a.dedicacionPeriodo,
    0
  )
  const horasProyeccionSocial =
    agenda.actividadesProyeccionSocial.reduce(
      (s, a) => s + a.dedicacionPeriodo,
      0
    )
  const horasGestion = agenda.actividadesGestion.reduce(
    (s, a) => s + a.dedicacionPeriodo,
    0
  )

  const totalDocencia = horasDocenciaCursos + horasOtrasDocencia
  const granTotal =
    totalDocencia + horasInvestigacion + horasProyeccionSocial + horasGestion

  return {
    horasDocenciaCursos,
    horasOtrasDocencia,
    horasInvestigacion,
    horasProyeccionSocial,
    horasGestion,
    totalDocencia,
    granTotal,
  }
}

// ========================================
// Validación completa
// ========================================

export function validateAgenda(
  agenda: AgendaConRelaciones
): ValidationItem[] {
  const docente: DocenteInfo = {
    modalidad: agenda.docente.modalidad,
    doctorado: agenda.docente.doctorado,
    cargoAdministrativo: agenda.docente.cargoAdministrativo,
    proyectosActivos: agenda.docente.proyectosActivos,
    sedeBase: agenda.docente.sedeBase,
    tipoCargo: agenda.docente.tipoCargo ?? null,
  }

  const limits = getAgendaLimits(docente)
  const totals = getAgendaTotals(agenda)
  const items: ValidationItem[] = []

  // 1. Horas totales vs objetivo
  if (totals.granTotal > limits.horasTotalesPeriodo) {
    items.push({
      severity: "error",
      message: `Las horas totales (${totals.granTotal}h) exceden el máximo permitido (${limits.horasTotalesPeriodo}h) para ${formatModalidad(docente.modalidad)}.`,
      rule: "Art. 4",
    })
  } else if (
    docente.modalidad !== "CATEDRA" &&
    totals.granTotal < limits.horasTotalesPeriodo
  ) {
    const margin = limits.horasTotalesPeriodo - totals.granTotal
    items.push({
      severity: "info",
      message: `Tiene ${margin}h de margen disponible sobre el tope contractual (${limits.horasTotalesPeriodo}h). El tope es un límite superior, no una carga obligatoria.`,
      rule: "Art. 4 — tope máximo",
    })
  }

  // 2. Mínimo de docencia
  if (limits.minDocencia > 0 && totals.totalDocencia < limits.minDocencia) {
    const diff = limits.minDocencia - totals.totalDocencia
    const motivo =
      docente.modalidad === "VISITANTE"
        ? " (mínimo 60% para visitantes, Art. 3 Par. 3)"
        : docente.proyectosActivos
        ? " (reducido por proyectos activos)"
        : ""
    items.push({
      severity: "error",
      message: `La docencia total (${totals.totalDocencia}h) no alcanza el mínimo requerido (${limits.minDocencia}h)${motivo}. Faltan ${diff}h.`,
      rule:
        docente.modalidad === "VISITANTE" ? "Art. 3 Par. 3" : "Art. 3",
    })
  }

  // 3. Gestión (Art. 10):
  //    a) Sin cargo administrativo → no se permite ninguna hora de gestión.
  //    b) Con cargo NO exento → tope del 20% del total.
  //    c) Con cargo exento (5 cargos del Art. 11) → sin tope porcentual.
  const cargoExento = esCargoExentoGestion20(docente.tipoCargo)
  if (!docente.cargoAdministrativo && totals.horasGestion > 0) {
    items.push({
      severity: "error",
      message: `Tiene ${totals.horasGestion}h de gestión registradas pero no tiene cargo administrativo en su perfil. Art. 10 exige cargo para acumular horas de gestión.`,
      rule: "Art. 10",
    })
  } else if (
    docente.cargoAdministrativo &&
    !cargoExento &&
    totals.horasGestion > limits.maxGestion
  ) {
    items.push({
      severity: "error",
      message: `Las horas de gestión (${totals.horasGestion}h) exceden el 20% permitido (${limits.maxGestion}h). Art. 10 limita gestión al 20% del tiempo total, salvo los cargos exentos del Art. 11.`,
      rule: "Art. 10",
    })
  }

  // 4. Catedráticos: límite inv + proyección social
  if (docente.modalidad === "CATEDRA" && limits.maxInvProySocialCatedra !== null) {
    const invProySocial = totals.horasInvestigacion + totals.horasProyeccionSocial
    if (invProySocial > limits.maxInvProySocialCatedra) {
      items.push({
        severity: "error",
        message: `Los docentes catedráticos pueden dedicar máximo ${limits.maxInvProySocialCatedra}h (4 hrs/sem) a investigación y proyección social. Actual: ${invProySocial}h.`,
        rule: "Art. 3, Parágrafo 2",
      })
    }
  }

  // 5. Docentes con doctorado: deben tener investigación
  if (docente.doctorado && totals.horasInvestigacion === 0) {
    items.push({
      severity: "warning",
      message:
        "Los docentes con doctorado deben estar vinculados a un grupo de investigación y participar en actividades de investigación.",
      rule: "Art. 4, Parágrafo 3",
    })
  }

  // 6. Sin cursos
  if (
    agenda.cursos.length === 0 &&
    docente.modalidad !== "CATEDRA" &&
    docente.modalidad !== "INVITADO"
  ) {
    items.push({
      severity: "warning",
      message: "No se han registrado cursos en la agenda.",
      rule: "Art. 3",
    })
  }

  return items
}

// ========================================
// Helpers
// ========================================

export function formatModalidad(modalidad: Modalidad): string {
  const labels: Record<Modalidad, string> = {
    PLANTA_TC: "Tiempo Completo Planta",
    PLANTA_MT: "Medio Tiempo Planta",
    OCASIONAL_TC: "Tiempo Completo Ocasional",
    OCASIONAL_MT: "Medio Tiempo Ocasional",
    CATEDRA: "Cátedra",
    VISITANTE: "Visitante",
    INVITADO: "Invitado",
  }
  return labels[modalidad]
}
