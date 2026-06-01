import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { resolveGlobales } from "@/lib/rules/resolver"
import { ProfileEditForm } from "@/components/perfil/profile-edit-form"
import {
  getSolicitudActivaParaDocente,
  getUltimaSolicitudParaDocente,
} from "@/lib/actions/solicitud-perfil"

export default async function EditarPerfilPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const [docente, solicitudActiva, ultimaSolicitud] = await Promise.all([
    prisma.docente.findUnique({ where: { id: session.user.id } }),
    getSolicitudActivaParaDocente(session.user.id),
    getUltimaSolicitudParaDocente(session.user.id),
  ])

  if (!docente) redirect("/auth/login")

  const globales = await resolveGlobales(null)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Editar Perfil</h1>

      <ProfileEditForm
        docente={docente} maxSemanas={globales.semanasPeriodo}
        solicitudActiva={solicitudActiva}
        ultimaSolicitud={ultimaSolicitud}
      />
    </div>
  )
}
