import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { resolveGlobales } from "@/lib/rules/resolver"
import { ProfileEditForm } from "@/components/perfil/profile-edit-form"
import { ShieldAlert } from "lucide-react"
import {
  getSolicitudActivaParaDocente,
  getUltimaSolicitudParaDocente,
} from "@/lib/actions/solicitud-perfil"

export default async function EditarPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const [docente, solicitudActiva, ultimaSolicitud] = await Promise.all([
    prisma.docente.findUnique({ where: { id: session.user.id } }),
    getSolicitudActivaParaDocente(session.user.id),
    getUltimaSolicitudParaDocente(session.user.id),
  ])

  if (!docente) redirect("/auth/login")

  const [params, globales] = await Promise.all([
    searchParams,
    resolveGlobales(null),
  ])
  const avisoRequerido = params?.aviso === "requerido"

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Editar Perfil</h1>

      {avisoRequerido && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Acción Requerida
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Por favor, confirme y guarde sus condiciones académicas actuales
              para desbloquear el acceso a la Agenda Semestral (FO-19).
            </p>
          </div>
        </div>
      )}

      <ProfileEditForm
        docente={docente} maxSemanas={globales.semanasPeriodo}
        solicitudActiva={solicitudActiva}
        ultimaSolicitud={ultimaSolicitud}
      />
    </div>
  )
}
