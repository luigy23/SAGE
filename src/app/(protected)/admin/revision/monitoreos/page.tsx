import { redirect } from "next/navigation"

/**
 * La revisión de monitoreos (FO-20) ahora vive en el módulo de Autoridad
 * Académica (`/gestion`), acotada por programa/facultad. Redirección legacy.
 */
export default function LegacyRevisionMonitoreosRedirect() {
  redirect("/gestion/monitoreos")
}
