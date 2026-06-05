import {
  prepararEscenario,
  prepararEscenarioCalculos,
  prepararEscenarioModalidades,
} from "./fixtures/db"

/**
 * Se ejecuta UNA vez antes de la suite:
 *  - MBC-2025B: docente MARLIO + período activo "2025-2".
 *  - Cálculos: docente PROF_CALC + cursos QA + parámetro/fórmulas deterministas.
 *  - Modalidades: un docente por modalidad clave + ParametrosModalidad del Acuerdo.
 * Todos comparten el período "2025-2" y limpian sus agendas previas.
 */
export default async function globalSetup() {
  const mbc = await prepararEscenario()
  const calc = await prepararEscenarioCalculos()
  const mods = await prepararEscenarioModalidades()
  console.log("[global-setup] escenarios listos:", { mbc, calc, mods })
}
