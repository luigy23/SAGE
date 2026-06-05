/**
 * Fixture del DEMO end-to-end (historia completa docente → autoridad).
 *
 * Personajes:
 *   - DIANA (profesora de planta): arma y envía su agenda FO-19 con cursos del
 *     catálogo, su proyecto aprobado precargado y su consejería.
 *   - CARLOS (jefe de programa): revisa su ámbito, ve a sus consejeros, aprueba
 *     un proyecto pendiente (con horas) y aprueba la agenda de Diana.
 *
 * Pensado para correr en vivo, narrado:  EXPLAIN=1 KEEP_OPEN=1
 */

export const PERIODO_DEMO = "2025-2"
export const PROGRAMA_DEMO = "Ingeniería de Sistemas (Demo)"
export const FACULTAD_DEMO = "Facultad de Ingeniería (Demo)"
export const COHORTE_DEMO = "2025-1" // vigente en 2025-2

const PASS = "Demo1234!"

export const DOCENTE_DEMO = {
  email: "diana.demo@usco.edu.co",
  password: PASS,
  nombre: "DIANA MARCELA ROJAS",
  cedula: "1075000001",
  modalidad: "PLANTA_TC" as const,
  sedeBase: "NEIVA" as const,
  facultad: FACULTAD_DEMO,
  programa: PROGRAMA_DEMO,
}

export const JEFE_DEMO = {
  email: "carlos.demo@usco.edu.co",
  password: PASS,
  nombre: "CARLOS PERDOMO JEFE",
  cedula: "1075000002",
  tipoCargo: "Jefe de Programa",
  cargoAmbitoValor: PROGRAMA_DEMO,
  facultad: FACULTAD_DEMO,
  programa: PROGRAMA_DEMO,
}

/** Proyecto YA aprobado → se precarga bloqueado en la agenda de Diana. */
export const PROYECTO_APROBADO_DEMO = {
  titulo: "Riego inteligente con IoT (Demo)",
  horas: 200, // Investigador Principal (≤ 220)
}

/** Proyecto PENDIENTE → el jefe lo aprueba en el Acto 2 (horas propuestas). */
export const PROYECTO_PENDIENTE_DEMO = {
  titulo: "Modelos de IA para el café del Huila (Demo)",
  horasPropuestas: 180,
}

/** 3 cursos teóricos del catálogo (4h pres c/u → 144h c/u = 432h docencia). */
export const CURSOS_DEMO = ["CBI001", "CBI002", "CBI003"]
export const HORAS_CURSO_DEMO = 144
export const CONSEJERIA_HORAS_DEMO = 48
