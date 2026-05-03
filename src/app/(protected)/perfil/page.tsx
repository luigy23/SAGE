import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProfileView } from "@/components/perfil/profile-view"

export default async function PerfilPage() {
  const session = await auth()
  const docente = await prisma.docente.findUnique({
    where: { id: session!.user.id },
  })

  if (!docente) return null

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Mi Perfil</h1>
      <ProfileView docente={docente} />
    </div>
  )
}
