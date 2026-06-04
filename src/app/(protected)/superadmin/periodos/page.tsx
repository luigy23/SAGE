import { redirect } from "next/navigation"

/** Períodos unificados en `/admin/periodos` (el SUPERADMIN ve ahí crear/editar). */
export default function SuperadminPeriodosRedirect() {
  redirect("/admin/periodos")
}
