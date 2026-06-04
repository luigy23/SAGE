import { redirect } from "next/navigation"

/** Listado unificado en `/admin/docentes` ("Gestión de Usuarios"); el SUPERADMIN
 *  ve ahí la columna Rol. El detalle de rol sigue en `/superadmin/usuarios/[id]`. */
export default function SuperadminUsuariosRedirect() {
  redirect("/admin/docentes")
}
