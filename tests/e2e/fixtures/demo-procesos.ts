/**
 * Fixture del DEMO de PROCESOS (creación en vivo) — para grabar narrado.
 *
 * A diferencia de `demo.ts` (que precarga proyecto y consejería), aquí NADA viene
 * precreado: el docente crea su proyecto y elige su cohorte de consejería EN VIVO,
 * y el cargo administrativo aprueba el proyecto. Así se ve el ciclo completo.
 *
 * Cuentas con correo = característica (no nombres de persona):
 *   - planta.tc@usco.edu.co  → DOCENTE de planta tiempo completo (crea todo).
 *   - jefe@usco.edu.co       → Jefe de Programa (aprueba el proyecto y la agenda).
 *
 * Período DEDICADO "2026-1" con fechas alrededor de hoy, para que el calendario
 * de fechas del proyecto caiga en el mes actual (clic trivial) y no choque con el
 * "2025-2" que usan los demás escenarios.
 *
 * Correr narrado y pausado:  EXPLAIN=1 KEEP_OPEN=1 npx playwright test demo-procesos
 */

export const PERIODO_PROC = "2026-1"
export const PROGRAMA_PROC = "Ingeniería de Software (Demo)"
export const FACULTAD_PROC = "Facultad de Ingeniería (Demo)"

const PASS = "Demo1234!"

export const DOCENTE_PROC = {
  email: "planta.tc@usco.edu.co",
  password: PASS,
  nombre: "DOCENTE PLANTA TIEMPO COMPLETO",
  cedula: "1075300001",
  modalidad: "PLANTA_TC" as const,
  sedeBase: "NEIVA" as const,
  facultad: FACULTAD_PROC,
  programa: PROGRAMA_PROC,
}

export const JEFE_PROC = {
  email: "jefe@usco.edu.co",
  password: PASS,
  nombre: "JEFE DE PROGRAMA",
  cedula: "1075300002",
  tipoCargo: "Jefe de Programa",
  cargoAmbitoValor: PROGRAMA_PROC,
  facultad: FACULTAD_PROC,
  programa: PROGRAMA_PROC,
}

/** Proyecto que el docente CREA en vivo y el jefe APRUEBA (≤ 220 h para Inv. Principal). */
export const PROYECTO_PROC = {
  titulo: "Plataforma de telemedicina rural con IA (Demo)",
  horas: 200,
}

/** 3 cursos teóricos del catálogo (cubren de sobra el mínimo de docencia). */
export const CURSOS_PROC = ["CBI001", "CBI002", "CBI003"]
export const CONSEJERIA_HORAS_PROC = 48

/** Cohorte (período de ingreso) que el docente elige en vivo para su consejería. */
export const COHORTE_PROC = "2025-1"
