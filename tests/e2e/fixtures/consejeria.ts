/**
 * Fixture del test E2E "agenda-consejeria".
 *
 * Valida las reglas de Consejería Académica (Acuerdo 048 Art. 11):
 *   - 48 horas por cohorte (autocalculado).
 *   - Máximo 2 cohortes simultáneas.
 *   - Ventana de 6 semestres: solo cohortes vigentes son elegibles.
 *   - Exclusividad: un solo consejero por cohorte + programa.
 *
 * Usa docentes de CÁTEDRA (sin mínimo de docencia) para que una agenda con SOLO
 * consejería pueda enviarse y así reservar la cohorte.
 */

export const PERIODO_CONSEJ = "2025-2"

/** Horas por cohorte (Art. 11). */
export const HORAS_POR_COHORTE = 48
/** Máximo de cohortes simultáneas (Art. 11). */
export const MAX_COHORTES = 2

/**
 * Cohortes para el período 2025-2 (ventana de 6 semestres):
 *   vigentes: 2025-2, 2025-1, 2024-2, 2024-1, 2023-2, 2023-1
 *   fuera de ventana (NO debe aparecer): 2022-2 y anteriores.
 */
export const COHORTE_VIGENTE = "2025-2"
export const COHORTE_VIGENTE_2 = "2025-1"
export const COHORTE_FUERA_VENTANA = "2022-2"

const COMUN = {
  password: "Test1234!",
  sedeBase: "NEIVA" as const,
  modalidad: "CATEDRA" as const,
  semanasVinculacion: 16,
}

/** Docente para las reglas de UI (máx 2, 48h, ventana). Programa propio. */
export const CONSEJ_UI = {
  ...COMUN,
  email: "qa.consej.ui@usco.edu.co",
  nombre: "QA CONSEJERIA UI",
  cedula: "90000030",
  facultad: "Facultad Consej QA",
  programa: "Programa Consej UI QA",
}

/** Docente que RESERVA una cohorte (exclusividad). Mismo programa que el verificador. */
export const CONSEJ_RESERVA = {
  ...COMUN,
  email: "qa.consej.res@usco.edu.co",
  nombre: "QA CONSEJERIA RESERVA",
  cedula: "90000031",
  facultad: "Facultad Consej QA",
  programa: "Programa Consej Excl QA",
}

/** Docente que verifica que la cohorte ya reservada NO está disponible. */
export const CONSEJ_VERIFICA = {
  ...COMUN,
  email: "qa.consej.chk@usco.edu.co",
  nombre: "QA CONSEJERIA VERIFICA",
  cedula: "90000032",
  facultad: "Facultad Consej QA",
  programa: "Programa Consej Excl QA",
}

export const DOCENTES_CONSEJ = [CONSEJ_UI, CONSEJ_RESERVA, CONSEJ_VERIFICA]
/** Programas a limpiar (compromisos) en cada corrida. */
export const PROGRAMAS_CONSEJ = [CONSEJ_UI.programa, CONSEJ_RESERVA.programa]
/** Cohorte que el reservador toma (y que el verificador ya no debe ver). */
export const COHORTE_RESERVA = "2024-2"
