import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LayoutGrid, UserCog, Microscope } from "lucide-react"

/**
 * Layout del hub de revisión OPERATIVA del ADMIN: Perfiles y Proyectos.
 *
 * Las agendas (FO-19) y monitoreos (FO-20) NO se revisan aquí: son competencia
 * de la autoridad académica (Jefe/Decano/SUPERADMIN) en el módulo `/gestion`.
 *
 * Guard ADMIN/SUPERADMIN (el padre /admin ya lo asegura, defensa en profundidad).
 */
export default async function RevisionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")
  if (session.user.rol !== "ADMIN" && session.user.rol !== "SUPERADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto max-w-7xl py-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Revisión de solicitudes</h1>
        <p className="text-sm text-muted-foreground">
          Aprueba solicitudes de cambio de perfil y valida los proyectos de los
          docentes. La revisión de agendas y monitoreos vive en tu sección de
          gestión académica.
        </p>
      </div>

      <nav className="mb-6 flex flex-wrap items-center gap-1 border-b">
        <TabLink href="/admin/revision" icon={<LayoutGrid className="h-4 w-4" />}>
          Resumen
        </TabLink>
        <TabLink
          href="/admin/revision/perfiles"
          icon={<UserCog className="h-4 w-4" />}
        >
          Perfiles
        </TabLink>
        <TabLink
          href="/admin/revision/proyectos"
          icon={<Microscope className="h-4 w-4" />}
        >
          Proyectos
        </TabLink>
      </nav>

      {children}
    </div>
  )
}

function TabLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  // El active state se maneja con un client wrapper si hace falta; por ahora estilo neutro.
  return (
    <Link
      href={href}
      className="-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
    >
      {icon}
      {children}
    </Link>
  )
}
