/**
 * Fixture del test E2E "consejeria-vista".
 *
 * Verifica la vista /gestion/consejeria con scope por autoridad:
 *   - Jefe de Programa: ve SOLO los consejeros de su programa.
 *   - Decano: ve los consejeros de TODA su facultad (varios programas).
 *
 * Escenario: una facultad con 2 programas, un consejero (cátedra) en cada uno.
 * Los compromisos se siembran directo en DB (probamos la VISTA, no la reserva).
 */

export const PERIODO_VISTA = "2025-2"

export const FACULTAD_VISTA = "Facultad Consej Vista QA"
export const PROGRAMA_A = "Programa Consej A QA"
export const PROGRAMA_B = "Programa Consej B QA"

/** Cohorte de ingreso usada por ambos consejeros (vigente en 2025-2). */
export const COHORTE_VISTA = "2025-2"

const PASS = "Test1234!"

/** Consejero del programa A (cátedra). */
export const PROF_A = {
  email: "qa.cons.profa@usco.edu.co",
  password: PASS,
  nombre: "QA CONSEJERO A",
  cedula: "90000040",
  modalidad: "CATEDRA" as const,
  sedeBase: "NEIVA" as const,
  facultad: FACULTAD_VISTA,
  programa: PROGRAMA_A,
  semestresCompromiso: 3,
}

/** Consejero del programa B (cátedra). */
export const PROF_B = {
  email: "qa.cons.profb@usco.edu.co",
  password: PASS,
  nombre: "QA CONSEJERO B",
  cedula: "90000041",
  modalidad: "CATEDRA" as const,
  sedeBase: "NEIVA" as const,
  facultad: FACULTAD_VISTA,
  programa: PROGRAMA_B,
  semestresCompromiso: 4,
}

export const CONSEJEROS = [PROF_A, PROF_B]

/** Decano de la facultad (ve A y B). */
export const DECANO_VISTA = {
  email: "qa.cons.decano@usco.edu.co",
  password: PASS,
  nombre: "QA DECANO VISTA",
  cedula: "90000042",
  tipoCargo: "Decano",
  cargoAmbitoValor: FACULTAD_VISTA,
  facultad: FACULTAD_VISTA,
  programa: PROGRAMA_A,
}

/** Jefe del programa A (ve solo A). */
export const JEFE_VISTA = {
  email: "qa.cons.jefe@usco.edu.co",
  password: PASS,
  nombre: "QA JEFE VISTA",
  cedula: "90000043",
  tipoCargo: "Jefe de Programa",
  cargoAmbitoValor: PROGRAMA_A,
  facultad: FACULTAD_VISTA,
  programa: PROGRAMA_A,
}
