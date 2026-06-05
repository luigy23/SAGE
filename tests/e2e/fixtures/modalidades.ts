/**
 * Fixture del test E2E "agenda-modalidades".
 *
 * Verifica que la agenda FO-19 calcula y valida DISTINTO según la modalidad del
 * docente (Acuerdo 048/2018), y para cada modalidad prueba LAS DOS CARAS:
 *   - RECHAZO: cuando se viola la regla, el envío se bloquea.
 *   - ACEPTA:  cuando la agenda cumple los límites, se envía exitosamente.
 *
 * Cada escenario usa su PROPIO docente para quedar aislado (sin acoplar estado).
 */

import { SEMANAS_CLASES, FACTORES, CONSTANTE_SUMA } from "./calculos"

export { SEMANAS_CLASES } from "./calculos"

export const PERIODO_MOD = "2025-2"

/** Semanas del semestre (planta) — debe coincidir con semanas_periodo forzado en DB. */
export const SEMANAS_PERIODO = 22
/** Semanas efectivas de los contratos temporales (no-planta) forzadas en DB. */
export const SEMANAS_NO_PLANTA = 16

/** Calcula el total de un curso (Acuerdo 048 Art. 3 Par. 4). */
export function totalCurso(tipo: keyof typeof FACTORES, horas: number): number {
  return (horas * FACTORES[tipo] + CONSTANTE_SUMA) * SEMANAS_CLASES
}

// Cursos QA del catálogo (todos teóricos: factor 2, +1, × 16 semanas_clases).
export const CURSO_PEQUENO = { codigo: "QA-TEO-01", horasPresenciales: 4 } // 144h docencia
export const CURSO_MEDIANO = {
  codigo: "QA-TEO-MID",
  nombre: "Curso QA Teorico Mediano",
  tipo: "TEORICO" as const,
  creditos: 4,
  horasSemT: 14,
  horasSemP: 0,
} // (14×2+1)×16 = 464h docencia
export const CURSO_GRANDE = {
  codigo: "QA-TEO-BIG",
  nombre: "Curso QA Teorico Grande",
  tipo: "TEORICO" as const,
  creditos: 4,
  horasSemT: 20,
  horasSemP: 0,
} // (20×2+1)×16 = 656h docencia

export const TOTAL_CURSO_PEQUENO = totalCurso("TEORICO", CURSO_PEQUENO.horasPresenciales) // 144

/** Actividad de investigación QA (sin tope propio) para probar el cap de cátedra. */
export const ACTIVIDAD_INV_QA = { categoria: "INVESTIGACION" as const, nombre: "Investigacion QA libre" }
/** Tope de cátedra Inv+Proy = 4 h/sem × semanas (Art. 3 Par. 2). */
export const TOPE_CATEDRA_INVPS = 4 * SEMANAS_NO_PLANTA // 64
export const INV_CATEDRA_EXCESO = 80 // > 64 → bloquea

export type ModalidadQA = "PLANTA_TC" | "OCASIONAL_TC" | "CATEDRA" | "VISITANTE_TC"
export type Resultado = "accept" | "block-button" | "reject-toast"
export type Paso = { curso: string } | { inv: { nombre: string; horas: number } }

export type Escenario = {
  modKey: ModalidadQA
  variante: "rechazo" | "acepta"
  docente: {
    email: string
    password: string
    nombre: string
    cedula: string
    modalidad: ModalidadQA
    sedeBase: "NEIVA"
    facultad: string
    programa: string
    semanasVinculacion: number | null
  }
  /** Tope semestral esperado (denominador del encabezado). */
  topeSemestral: number
  /** Acciones a ejecutar en el wizard. */
  pasos: Paso[]
  /** Resultado esperado del envío. */
  resultado: Resultado
  /** Nota explicativa del caso. */
  nota: string
}

const COMUN = { password: "Test1234!", sedeBase: "NEIVA" as const, facultad: "Facultad QA", programa: "Programa QA" }

function docente(modalidad: ModalidadQA, email: string, nombre: string, cedula: string, semanasVinculacion: number | null) {
  return { ...COMUN, email, nombre, cedula, modalidad, semanasVinculacion }
}

export const ESCENARIOS: Escenario[] = [
  // ── PLANTA_TC — tope 880 fijo, estricto, mínimo docencia 432 ──────────────
  {
    modKey: "PLANTA_TC",
    variante: "rechazo",
    docente: docente("PLANTA_TC", "qa.planta.bad@usco.edu.co", "QA PLANTA BAD", "90000020", null),
    topeSemestral: 40 * SEMANAS_PERIODO, // 880
    pasos: [{ curso: CURSO_PEQUENO.codigo }], // docencia 144 < 432
    resultado: "reject-toast",
    nota: "docencia 144 < mínimo 432 → bloquea",
  },
  {
    modKey: "PLANTA_TC",
    variante: "acepta",
    docente: docente("PLANTA_TC", "qa.planta.ok@usco.edu.co", "QA PLANTA OK", "90000021", null),
    topeSemestral: 40 * SEMANAS_PERIODO, // 880
    pasos: [{ curso: CURSO_GRANDE.codigo }], // docencia 656 (≥432, ≤880)
    resultado: "accept",
    nota: "docencia 656 (≥432, ≤880) → acepta",
  },

  // ── OCASIONAL_TC — tope 640 derivado, estricto, mínimo docencia 432 ───────
  {
    modKey: "OCASIONAL_TC",
    variante: "rechazo",
    docente: docente("OCASIONAL_TC", "qa.ocasional.bad@usco.edu.co", "QA OCASIONAL BAD", "90000022", SEMANAS_NO_PLANTA),
    topeSemestral: 40 * SEMANAS_NO_PLANTA, // 640
    pasos: [{ curso: CURSO_PEQUENO.codigo }, { curso: CURSO_GRANDE.codigo }], // 144+656=800 > 640
    resultado: "block-button",
    nota: "total 800 > tope 640 (estricto) → botón deshabilitado",
  },
  {
    modKey: "OCASIONAL_TC",
    variante: "acepta",
    docente: docente("OCASIONAL_TC", "qa.ocasional.ok@usco.edu.co", "QA OCASIONAL OK", "90000023", SEMANAS_NO_PLANTA),
    topeSemestral: 40 * SEMANAS_NO_PLANTA, // 640
    pasos: [{ curso: CURSO_MEDIANO.codigo }], // 464 (≥432, ≤640)
    resultado: "accept",
    nota: "docencia 464 (≥432, ≤640) → acepta",
  },

  // ── CÁTEDRA — tope 256 derivado, sin mínimo docencia, tope Inv+Proy 64 ────
  {
    modKey: "CATEDRA",
    variante: "rechazo",
    docente: docente("CATEDRA", "qa.catedra.bad@usco.edu.co", "QA CATEDRA BAD", "90000024", SEMANAS_NO_PLANTA),
    topeSemestral: 16 * SEMANAS_NO_PLANTA, // 256
    pasos: [{ curso: CURSO_PEQUENO.codigo }, { inv: { nombre: ACTIVIDAD_INV_QA.nombre, horas: INV_CATEDRA_EXCESO } }],
    resultado: "block-button",
    nota: "Inv 80 > tope cátedra 64 → botón deshabilitado",
  },
  {
    modKey: "CATEDRA",
    variante: "acepta",
    docente: docente("CATEDRA", "qa.catedra.ok@usco.edu.co", "QA CATEDRA OK", "90000025", SEMANAS_NO_PLANTA),
    topeSemestral: 16 * SEMANAS_NO_PLANTA, // 256
    pasos: [{ curso: CURSO_PEQUENO.codigo }], // 144 ≤ 256, sin mínimo de docencia
    resultado: "accept",
    nota: "docencia 144 ≤ 256, cátedra sin mínimo → acepta",
  },

  // ── VISITANTE_TC — tope 640 derivado, NO estricto, mínimo 60% = 384 ───────
  {
    modKey: "VISITANTE_TC",
    variante: "rechazo",
    docente: docente("VISITANTE_TC", "qa.visitante.bad@usco.edu.co", "QA VISITANTE BAD", "90000026", SEMANAS_NO_PLANTA),
    topeSemestral: 40 * SEMANAS_NO_PLANTA, // 640
    pasos: [{ curso: CURSO_PEQUENO.codigo }], // docencia 144 < 60%·640 = 384
    resultado: "reject-toast",
    nota: "docencia 144 < mínimo 60% (384) → bloquea",
  },
  {
    modKey: "VISITANTE_TC",
    variante: "acepta",
    docente: docente("VISITANTE_TC", "qa.visitante.ok@usco.edu.co", "QA VISITANTE OK", "90000027", SEMANAS_NO_PLANTA),
    topeSemestral: 40 * SEMANAS_NO_PLANTA, // 640
    pasos: [{ curso: CURSO_GRANDE.codigo }], // docencia 656 ≥ 384; 656 > 640 pero NO estricto
    resultado: "accept",
    nota: "docencia 656 ≥ 384 y excede 640 pero no es estricto → acepta",
  },
]

/** Modalidades cuyos ParametrosModalidad hay que forzar (deterministas). */
export const MODALIDADES_FORZAR: ModalidadQA[] = ["PLANTA_TC", "OCASIONAL_TC", "CATEDRA", "VISITANTE_TC"]
