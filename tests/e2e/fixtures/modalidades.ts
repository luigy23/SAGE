/**
 * Fixture del test E2E "agenda-modalidades".
 *
 * Verifica que la agenda FO-19 calcula y valida DISTINTO según la modalidad del
 * docente, conforme al Acuerdo 048/2018:
 *
 *   - Tope semestral (denominador): PLANTA fijo (880/440) vs derivado (h/sem × semanas).
 *   - Semanas efectivas: PLANTA 22 vs No-Planta 16 (cátedra/ocasional/visitante).
 *   - El CÁLCULO POR CURSO es igual para todos: (horas × factor + 1) × semanas_clases.
 *   - Reglas de envío: mínimo de docencia, bloqueo estricto, tope cátedra Inv+Proy,
 *     y la flexibilidad (no estricto) de los visitantes.
 *
 * Las 4 modalidades clave cubren los 4 comportamientos distintos.
 */

import { SEMANAS_CLASES, FACTORES, CONSTANTE_SUMA } from "./calculos"

export { SEMANAS_CLASES } from "./calculos"

export const PERIODO_MOD = "2025-2"

/** Semanas del semestre (planta) — debe coincidir con semanas_periodo forzado en DB. */
export const SEMANAS_PERIODO = 22
/** Semanas efectivas de los contratos temporales (no-planta) forzadas en DB. */
export const SEMANAS_NO_PLANTA = 16

/** Curso teórico pequeño (h=4): (4×2+1)×16 = 144h. Sirve de docencia base. */
export const CURSO_PEQUENO = {
  codigo: "QA-TEO-01",
  tipo: "TEORICO" as const,
  horasPresenciales: 4,
}
/** Curso teórico grande (h=20): (20×2+1)×16 = 656h. Empuja el total sobre el tope. */
export const CURSO_GRANDE = {
  codigo: "QA-TEO-BIG",
  nombre: "Curso QA Teorico Grande",
  tipo: "TEORICO" as const,
  creditos: 4,
  horasSemT: 20,
  horasSemP: 0,
}

/** Actividad de investigación QA (sin tope propio) para probar el cap de cátedra. */
export const ACTIVIDAD_INV_QA = {
  categoria: "INVESTIGACION" as const,
  nombre: "Investigacion QA libre",
}

/** Calcula el total de un curso con la fórmula del Acuerdo 048 Art. 3 Par. 4. */
export function totalCurso(tipo: keyof typeof FACTORES, horas: number): number {
  return (horas * FACTORES[tipo] + CONSTANTE_SUMA) * SEMANAS_CLASES
}

export const TOTAL_CURSO_PEQUENO = totalCurso(CURSO_PEQUENO.tipo, CURSO_PEQUENO.horasPresenciales) // 144

type SubmitEscenario =
  // Min docencia insuficiente → toast de error al enviar.
  | { tipo: "reject-min-docencia" }
  // Excede el tope estricto → el botón "Enviar Agenda" queda deshabilitado.
  | { tipo: "block-tope-estricto" }
  // Cátedra excede Inv+Proy → botón deshabilitado por el cap del Art. 3 Par. 2.
  | { tipo: "block-catedra-invps" }
  // Visitante NO es estricto → excede el tope pero se acepta el envío.
  | { tipo: "accept-no-estricto" }

export type CasoModalidad = {
  key: string
  docente: {
    email: string
    password: string
    nombre: string
    cedula: string
    modalidad:
      | "PLANTA_TC"
      | "OCASIONAL_TC"
      | "CATEDRA"
      | "VISITANTE_TC"
    sedeBase: "NEIVA"
    facultad: string
    programa: string
    /** Semanas de vínculo (no-planta). null para planta (usa semanas del semestre). */
    semanasVinculacion: number | null
  }
  /** Semanas efectivas esperadas. */
  semanas: number
  /** Horas semanales máximas (Art. 4). */
  horasSemanalMax: number
  /** Tope semestral esperado (denominador del encabezado). */
  topeSemestral: number
  /** ¿El tope es de bloqueo estricto? */
  estricto: boolean
  submit: SubmitEscenario
}

const COMUN = {
  password: "Test1234!",
  sedeBase: "NEIVA" as const,
}

export const CASOS: CasoModalidad[] = [
  {
    key: "PLANTA_TC",
    docente: {
      ...COMUN,
      email: "qa.planta.tc@usco.edu.co",
      nombre: "QA PLANTA TC",
      cedula: "90000010",
      modalidad: "PLANTA_TC",
      facultad: "Facultad QA",
      programa: "Programa QA",
      semanasVinculacion: null,
    },
    semanas: SEMANAS_PERIODO, // 22
    horasSemanalMax: 40,
    topeSemestral: 40 * SEMANAS_PERIODO, // 880 (fijo)
    estricto: true,
    submit: { tipo: "reject-min-docencia" }, // docencia 144 < 432
  },
  {
    key: "OCASIONAL_TC",
    docente: {
      ...COMUN,
      email: "qa.ocasional.tc@usco.edu.co",
      nombre: "QA OCASIONAL TC",
      cedula: "90000011",
      modalidad: "OCASIONAL_TC",
      facultad: "Facultad QA",
      programa: "Programa QA",
      semanasVinculacion: SEMANAS_NO_PLANTA,
    },
    semanas: SEMANAS_NO_PLANTA, // 16
    horasSemanalMax: 40,
    topeSemestral: 40 * SEMANAS_NO_PLANTA, // 640 (derivado)
    estricto: true,
    submit: { tipo: "block-tope-estricto" }, // 144 + 656 = 800 > 640
  },
  {
    key: "CATEDRA",
    docente: {
      ...COMUN,
      email: "qa.catedra@usco.edu.co",
      nombre: "QA CATEDRA",
      cedula: "90000012",
      modalidad: "CATEDRA",
      facultad: "Facultad QA",
      programa: "Programa QA",
      semanasVinculacion: SEMANAS_NO_PLANTA,
    },
    semanas: SEMANAS_NO_PLANTA, // 16
    horasSemanalMax: 16, // Neiva
    topeSemestral: 16 * SEMANAS_NO_PLANTA, // 256 (derivado)
    estricto: true,
    submit: { tipo: "block-catedra-invps" }, // Inv 80 > 4×16 = 64
  },
  {
    key: "VISITANTE_TC",
    docente: {
      ...COMUN,
      email: "qa.visitante.tc@usco.edu.co",
      nombre: "QA VISITANTE TC",
      cedula: "90000013",
      modalidad: "VISITANTE_TC",
      facultad: "Facultad QA",
      programa: "Programa QA",
      semanasVinculacion: SEMANAS_NO_PLANTA,
    },
    semanas: SEMANAS_NO_PLANTA, // 16
    horasSemanalMax: 40,
    topeSemestral: 40 * SEMANAS_NO_PLANTA, // 640 (derivado)
    estricto: false, // visitante NO es estricto (Art. 4e)
    submit: { tipo: "accept-no-estricto" }, // 800 > 640 pero se acepta; docencia 800 ≥ 60%·640=384
  },
]

/** Tope de cátedra Inv+Proy = 4 h/sem × semanas (Art. 3 Par. 2). */
export const TOPE_CATEDRA_INVPS = 4 * SEMANAS_NO_PLANTA // 64
/** Horas de la actividad de investigación que excede el tope de cátedra. */
export const INV_CATEDRA_EXCESO = 80
