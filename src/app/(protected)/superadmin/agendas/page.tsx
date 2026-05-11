import { redirect } from "next/navigation"

/**
 * Redirect transparente al nuevo hub de revisión.
 * El módulo legacy /superadmin/agendas se reemplazó por /admin/revision/agendas,
 * accesible para ADMIN y SUPERADMIN.
 */
export default function LegacyRehabilitarAgendasRedirect() {
  redirect("/admin/revision/agendas")
}
