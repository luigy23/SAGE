import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { getAutoridadDeSesion } from "@/lib/auth/get-autoridad"
import { getEtiquetaGestion } from "@/lib/auth/autoridad"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")
  if (session.user.estadoCuenta === "RECHAZADO") redirect("/cuenta-rechazada")
  // Visto bueno único: solo cuentas ACTIVO (aprobadas) entran. PENDIENTE
  // (sin aprobar) e INACTIVO (desactivada) van a la pantalla de espera.
  if (session.user.estadoCuenta !== "ACTIVO") redirect("/cuenta-pendiente")

  // Autoridad académica (Jefe/Decano/SUPERADMIN) → sección "Mi Programa/Facultad".
  // El cargo no viaja en el JWT, por eso se lee de BD aquí.
  const sesionAutoridad = await getAutoridadDeSesion()
  const gestion = sesionAutoridad
    ? { label: getEtiquetaGestion(sesionAutoridad.autoridad) }
    : null

  return (
    <SidebarProvider>
      <div className="print:hidden">
        <AppSidebar user={session.user} gestion={gestion} />
      </div>
      <SidebarInset>
        <div className="print:hidden">
          <AppHeader />
        </div>
        <main className="flex-1 p-6 print:p-0">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
