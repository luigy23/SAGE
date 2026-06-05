/**
 * Fixture del test E2E "agenda-invitado".
 *
 * Verifica el tope del INVITADO (Acuerdo 048 Art. 4f):
 *   - Sin horas autorizadas (invHorasContratadas null) → "sin tope asignado".
 *   - Con horas autorizadas → el tope es exactamente ese valor.
 */

export const PERIODO_INV = "2025-2"

const COMUN = {
  password: "Test1234!",
  sedeBase: "NEIVA" as const,
  modalidad: "INVITADO" as const,
  facultad: "Facultad Invitado QA",
  programa: "Programa Invitado QA",
}

/** Invitado SIN horas asignadas por el decano → sin tope. */
export const INVITADO_SIN = {
  ...COMUN,
  email: "qa.invitado.sin@usco.edu.co",
  nombre: "QA INVITADO SIN HORAS",
  cedula: "90000050",
  invHorasContratadas: null as number | null,
}

/** Invitado CON horas asignadas → ese es el tope. */
export const INVITADO_CON = {
  ...COMUN,
  email: "qa.invitado.con@usco.edu.co",
  nombre: "QA INVITADO CON HORAS",
  cedula: "90000051",
  invHorasContratadas: 300 as number | null,
}

export const INVITADOS = [INVITADO_SIN, INVITADO_CON]
export const HORAS_INVITADO_CON = 300
