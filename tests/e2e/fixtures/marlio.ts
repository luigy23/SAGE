/**
 * Fixture de datos para el test E2E "MBC-2025B".
 *
 * Reproduce 1:1 la agenda académica real del docente MARLIO BEDOYA CARDOSO
 * (PDF Downloads/MBC-2025B.pdf — Universidad Surcolombiana, período 2025-2):
 *
 *   - Vinculación: DE PLANTA DOCENTE - TIEMPO COMPLETO  → PLANTA_TC
 *   - Sede: NEIVA · Departamento: Ingeniería Agrícola
 *   - Cargo: Decano (exento del tope del 20% de gestión, Art. 10/11)
 *
 *   DOCENCIA (160h)  — actividades del catálogo Art. 11:
 *     · Coordinación de Laboratorios de Docencia ............ 44h  (tope 44)
 *     · Coordinación de Programas de Postgrados subsidiados . 100h (tope 220)
 *     · Reuniones de Programa o Departamento ................ 16h  (tope 88)
 *   GESTIÓN (620h):
 *     · Rectoría / Decanatura / Vicerrectoría ............... 620h (tope 880)
 *
 *   TOTAL: 780h
 *
 * Las cadenas de actividad coinciden EXACTAMENTE con prisma/seed.ts para que
 * el selector del catálogo (cmdk) las encuentre.
 */

export const MARLIO = {
  email: "marlio.bedoya@usco.edu.co",
  password: "Test1234!",
  nombre: "MARLIO BEDOYA CARDOSO",
  cedula: "12198375",
  sedeBase: "NEIVA" as const,
  modalidad: "PLANTA_TC" as const,
  facultad: "Facultad de Ingeniería",
  programa: "Ingeniería Agrícola",
  tipoCargo: "Decano",
}

export const PERIODO = "2025-2"

/** Actividades de docencia (Paso 2 — "1.2 Otras Actividades de Docencia"). */
export const ACTIVIDADES_DOCENCIA = [
  { nombre: "Coordinación de Laboratorios de Docencia", horas: 44 },
  { nombre: "Coordinación de Programas de Postgrados subsidiados", horas: 100 },
  { nombre: "Reuniones de Programa o Departamento", horas: 16 },
]

/** Actividades de gestión (Paso 4 — "Gestión Académico-Administrativa"). */
export const ACTIVIDADES_GESTION = [
  { nombre: "Rectoría / Decanatura / Vicerrectoría", horas: 620 },
]

export const TOTAL_DOCENCIA = ACTIVIDADES_DOCENCIA.reduce((s, a) => s + a.horas, 0) // 160
export const TOTAL_GESTION = ACTIVIDADES_GESTION.reduce((s, a) => s + a.horas, 0) // 620
export const TOTAL_SEMESTRE = TOTAL_DOCENCIA + TOTAL_GESTION // 780
