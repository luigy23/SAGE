import {
  prepararEscenario,
  prepararEscenarioCalculos,
  prepararEscenarioModalidades,
  prepararEscenarioConsejeria,
  prepararEscenarioConsejeriaVista,
  prepararEscenarioInvitado,
  prepararEscenarioProyectoInyectado,
} from "./fixtures/db"

/**
 * Se ejecuta UNA vez antes de la suite:
 *  - MBC-2025B: docente MARLIO + período activo "2025-2".
 *  - Cálculos: docente PROF_CALC + cursos QA + parámetro/fórmulas deterministas.
 *  - Modalidades: un docente por escenario + ParametrosModalidad del Acuerdo.
 *  - Consejería: docentes de cátedra + catálogo de consejería + limpieza de compromisos.
 * Todos comparten el período "2025-2" y limpian sus agendas previas.
 */
export default async function globalSetup() {
  const mbc = await prepararEscenario()
  const calc = await prepararEscenarioCalculos()
  const mods = await prepararEscenarioModalidades()
  const consej = await prepararEscenarioConsejeria()
  const consejVista = await prepararEscenarioConsejeriaVista()
  const invitado = await prepararEscenarioInvitado()
  const proyIny = await prepararEscenarioProyectoInyectado()
  console.log("[global-setup] escenarios listos:", { mbc, calc, mods, consej, consejVista, invitado, proyIny })
}
