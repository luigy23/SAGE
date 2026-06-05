/**
 * Fixture del test E2E "agenda-calculos".
 *
 * Verifica los cálculos de horas de la agenda FO-19, en particular el cálculo
 * por CURSO según el Acuerdo 048/2018 Art. 3 Par. 4:
 *
 *     dedicacionPeriodo = (horasPresenciales × factorHoras + constanteSuma) × semanas_clases
 *
 * donde:
 *   - factorHoras depende del tipo de curso: TEÓRICO=2, TEÓRICO-PRÁCTICO=1.5, PRÁCTICO=1
 *   - constanteSuma = 1 (preparación)
 *   - semanas_clases = parámetro fijo (16); el docente NO lo edita
 *
 * Usa cursos QA creados a propósito (catálogo determinista) para que el cálculo
 * no dependa del contenido del seed.
 */

/** Parámetro semanas_clases que el test fuerza en la DB (debe coincidir con la UI). */
export const SEMANAS_CLASES = 16

/** Constante de preparación (Art. 3 Par. 4). */
export const CONSTANTE_SUMA = 1

/** Factor de horas por tipo de curso (Art. 3 Par. 4 Acuerdo 048). */
export const FACTORES = {
  TEORICO: 2,
  TEORICO_PRACTICO: 1.5,
  PRACTICO: 1,
} as const

export type TipoCursoQA = keyof typeof FACTORES

/** Docente de prueba (planta TC, sin cargo) que diligencia cursos. */
export const PROF_CALC = {
  email: "prof.calculos@usco.edu.co",
  password: "Test1234!",
  nombre: "PROFESOR CALCULOS QA",
  cedula: "90000001",
  sedeBase: "NEIVA" as const,
  modalidad: "PLANTA_TC" as const,
  facultad: "Facultad de Ingeniería QA",
  programa: "Ingeniería QA",
}

/** Reutiliza el mismo período activo que el escenario MBC. */
export const PERIODO_CALC = "2025-2"

type CursoBase = {
  codigo: string
  nombre: string
  tipo: TipoCursoQA
  creditos: number
  horasSemT: number
  horasSemP: number
}

const CURSOS_BASE: CursoBase[] = [
  // horas = 4 en los tres → aísla el efecto del factor por tipo.
  { codigo: "QA-TEO-01", nombre: "Curso QA Teorico", tipo: "TEORICO", creditos: 3, horasSemT: 4, horasSemP: 0 },
  { codigo: "QA-TP-01", nombre: "Curso QA Teorico Practico", tipo: "TEORICO_PRACTICO", creditos: 3, horasSemT: 2, horasSemP: 2 },
  { codigo: "QA-PRA-01", nombre: "Curso QA Practico", tipo: "PRACTICO", creditos: 2, horasSemT: 0, horasSemP: 4 },
]

/** Cursos con sus horas presenciales, h/sem calculadas y total del semestre. */
export const CURSOS = CURSOS_BASE.map((c) => {
  const horasPresenciales = c.horasSemT + c.horasSemP
  const horasSemanales = horasPresenciales * FACTORES[c.tipo] + CONSTANTE_SUMA
  const total = horasSemanales * SEMANAS_CLASES
  return { ...c, horasPresenciales, horasSemanales, total }
})

/** Total esperado de la sección de cursos (suma de dedicaciones). */
export const TOTAL_CURSOS = CURSOS.reduce((s, c) => s + c.total, 0)
