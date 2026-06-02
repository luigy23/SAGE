import { redirect } from "next/navigation"

/**
 * Redirect transparente al módulo de Autoridad Académica.
 * La revisión de agendas (FO-19) vive en `/gestion/agendas`, donde el SUPERADMIN
 * actúa como supervisión global (backstop).
 */
export default function LegacyRehabilitarAgendasRedirect() {
  redirect("/gestion/agendas")
}
