import { prepararEscenario } from "./fixtures/db"

/**
 * Se ejecuta UNA vez antes de la suite: deja el docente MARLIO, el período
 * activo "2025-2" y limpia agendas previas.
 */
export default async function globalSetup() {
  const r = await prepararEscenario()
  // eslint-disable-next-line no-console
  console.log("[global-setup] escenario MBC-2025B listo:", r)
}
