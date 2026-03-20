/**
 * Reglas de validación de la Agenda Semestral
 * según Acuerdo 048 de 2018 — Universidad Surcolombiana
 */

import type { Modalidad } from "@/generated/prisma/client"
import type { AgendaConRelaciones } from "@/lib/types/agenda"

// ========================================
// Tipos
// ========================================

type DocenteInfo = {
  modalidad: Modalidad
  doctorado: boolean
  cargoAdministrativo: boolean
  proyectosActivos: boolean
  sede: string | null
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
  minDocencia: number
  maxGestion: number
  maxInvProySocialCatedra: number | null // null = sin límite especial
  semanas: number
}

// ========================================
// Constantes
// ========================================

const SEMANAS_PERIODO = 22
const SEDES_CATEDRA_EXTENDIDA = ["Pitalito", "Garzón", "La Plata"]

// ========================================
// Cálculo de límites según modalidad
// ========================================

export function getAgendaLimits(docente: DocenteInfo): AgendaLimits {
  const horasTotales = getHorasTotalesPeriodo(docente)
  return {
    horasTotalesPeriodo: horasTotales,
    maxHorasSemanales: getMaxHorasSemanales(docente),
    minDocencia: getMinDocencia(docente),
    maxGestion: getMaxGestion(docente),
    maxInvProySocialCatedra: getMaxInvProySocialCatedra(docente),
    semanas: SEMANAS_PERIODO,
  }
}

/** Art. 4: Horas totales del periodo */
function getHorasTotalesPeriodo(docente: DocenteInfo): number {
  switch (docente.modalidad) {
    case "TCP":
    case "TCO":
      return 880
    case "MTP":
    case "MTC":
      return 440
    case "CATEDRA":
      // Sedes regionales: hasta 19 hrs/sem, sino 16 hrs/sem
      if (
        docente.sede &&
        SEDES_CATEDRA_EXTENDIDA.includes(docente.sede)
      ) {
        return 19 * SEMANAS_PERIODO // 418
      }
      return 16 * SEMANAS_PERIODO // 352
  }
}

/** Art. 4: Horas máximas semanales */
function getMaxHorasSemanales(docente: DocenteInfo): number {
  switch (docente.modalidad) {
    case "TCP":
    case "TCO":
      return 40
    case "MTP":
    case "MTC":
      return 20
    case "CATEDRA":
      if (
        docente.sede &&
        SEDES_CATEDRA_EXTENDIDA.includes(docente.sede)
      ) {
        return 19
      }
      return 16
  }
}

/**
 * Art. 3: Horas mínimas de docencia
 * Docentes con proyectos activos de investigación/proyección social
 * tienen un mínimo reducido
 */
function getMinDocencia(docente: DocenteInfo): number {
  if (docente.modalidad === "CATEDRA") return 0 // no aplica mínimo formal

  const conProyectos = docente.proyectosActivos

  switch (docente.modalidad) {
    case "TCP":
    case "TCO":
      return conProyectos ? 288 : 432
    case "MTP":
    case "MTC":
      return conProyectos ? 144 : 240
  }
}

/**
 * Art. 10: Gestión no puede exceder 20% del total
 * Excepto jefes de programa/departamento, asesores (cargoAdministrativo = true)
 */
function getMaxGestion(docente: DocenteInfo): number {
  if (docente.cargoAdministrativo) {
    // Sin límite del 20% para cargos administrativos
    return getHorasTotalesPeriodo(docente)
  }
  return Math.floor(getHorasTotalesPeriodo(docente) * 0.2)
}

/**
 * Art. 3, Parágrafo 2: Catedráticos con proyectos pueden hasta
 * 4 hrs/sem en investigación o proyección social (88 hrs)
 */
function getMaxInvProySocialCatedra(
  docente: DocenteInfo
): number | null {
  if (docente.modalidad !== "CATEDRA") return null
  return 4 * SEMANAS_PERIODO // 88
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
    sede: agenda.docente.sede,
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
    const diff = limits.horasTotalesPeriodo - totals.granTotal
    items.push({
      severity: "warning",
      message: `Faltan ${diff}h para completar las ${limits.horasTotalesPeriodo}h del periodo. Total actual: ${totals.granTotal}h.`,
      rule: "Art. 4",
    })
  }

  // 2. Mínimo de docencia
  if (docente.modalidad !== "CATEDRA" && limits.minDocencia > 0) {
    if (totals.totalDocencia < limits.minDocencia) {
      const diff = limits.minDocencia - totals.totalDocencia
      items.push({
        severity: "error",
        message: `La docencia total (${totals.totalDocencia}h) no alcanza el mínimo requerido (${limits.minDocencia}h)${docente.proyectosActivos ? " (reducido por proyectos activos)" : ""}. Faltan ${diff}h.`,
        rule: "Art. 3",
      })
    }
  }

  // 3. Gestión no puede exceder 20%
  if (!docente.cargoAdministrativo && totals.horasGestion > limits.maxGestion) {
    items.push({
      severity: "error",
      message: `Las horas de gestión (${totals.horasGestion}h) exceden el 20% permitido (${limits.maxGestion}h). Art. 10 limita gestión al 20% del tiempo total.`,
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
  if (agenda.cursos.length === 0 && docente.modalidad !== "CATEDRA") {
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
    TCP: "Tiempo Completo Planta",
    TCO: "Tiempo Completo Ocasional",
    MTP: "Medio Tiempo Planta",
    MTC: "Medio Tiempo Cátedra",
    CATEDRA: "Cátedra",
  }
  return labels[modalidad]
}
