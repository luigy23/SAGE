import { redirect } from "next/navigation"

/**
 * La revisión de agendas (FO-19) ahora vive en el módulo de Autoridad Académica
 * (`/gestion`), acotada por programa/facultad. El ADMIN operativo ya no aprueba
 * agendas. Esta ruta queda como redirección para enlaces antiguos.
 */
export default function LegacyRevisionAgendasRedirect() {
  redirect("/gestion/agendas")
}
