import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProfileEditForm } from "@/components/perfil/profile-edit-form"

export default async function EditarPerfilPage() {
  const session = await auth()
  const docente = await prisma.docente.findUnique({
    where: { id: session!.user.id },
  })

  if (!docente) return null

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Editar Perfil</h1>
      <ProfileEditForm docente={docente} />
    </div>
  )
}
