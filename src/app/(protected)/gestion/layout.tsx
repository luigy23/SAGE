import { redirect } from "next/navigation"
import Link from "next/link"
import { getAutoridadDeSesion } from "@/lib/auth/get-autoridad"
import { getEtiquetaGestion } from "@/lib/auth/autoridad"
import { Users } from "lucide-react"

/**
 * Layout del módulo de Autoridad Académica Delegada (`/gestion`).
 *
 * Acceso EXCLUSIVO para usuarios con autoridad académica:
 *   - Jefe de Programa → su programa
 *   - Decano           → su facultad
 *   - SUPERADMIN       → global (backstop)
 *
 * Un docente común o un ADMIN operativo (sin cargo) NO entra aquí: el ADMIN
 * gestiona plataforma (cuentas, cursos, ventanas, perfiles, proyectos), no
 * agendas/monitoreos académicos.
 */
export default async function GestionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sesion = await getAutoridadDeSesion()
  if (!sesion) redirect("/dashboard")

  const etiqueta = getEtiquetaGestion(sesion.autoridad)
  const ambito = sesion.autoridad.ambitoValor

  return (
    <div className="container mx-auto max-w-5xl space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-[#8F141B]" />
          <h1 className="text-2xl font-bold">{etiqueta}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Revisa y gestiona las agendas (FO-19) y monitoreos (FO-20)
          {ambito ? (
            <>
              {" "}
              de <span className="font-medium text-foreground">{ambito}</span>.
            </>
          ) : (
            " de toda la universidad (supervisión global)."
          )}
        </p>
        <nav className="flex gap-4 border-b pt-2 text-sm">
          <Link
            href="/gestion/agendas"
            className="border-b-2 border-transparent pb-2 font-medium hover:border-[#8F141B]"
          >
            Agendas (FO-19)
          </Link>
          <Link
            href="/gestion/monitoreos"
            className="border-b-2 border-transparent pb-2 font-medium hover:border-[#8F141B]"
          >
            Monitoreos (FO-20)
          </Link>
          <Link
            href="/gestion/proyectos"
            className="border-b-2 border-transparent pb-2 font-medium hover:border-[#8F141B]"
          >
            Proyectos
          </Link>
          <Link
            href="/gestion/perfiles"
            className="border-b-2 border-transparent pb-2 font-medium hover:border-[#8F141B]"
          >
            Solicitudes
          </Link>
        </nav>
      </header>
      {children}
    </div>
  )
}
