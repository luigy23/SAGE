import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { AgendaWizard } from "@/components/agenda/agenda-wizard"
import type { AgendaConRelaciones } from "@/lib/types/agenda"

export default async function AgendaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  const agenda = await prisma.agendaSemestral.findUnique({
    where: { id },
    include: {
      docente: true,
      cursos: { include: { horarios: true } },
      otrasActividadesDocencia: true,
      actividadesInvestigacion: true,
      actividadesProyeccionSocial: true,
      actividadesGestion: true,
    },
  })

  if (!agenda || agenda.docenteId !== session!.user.id) {
    notFound()
  }

  const cursosGuardados = await prisma.cursoGuardado.findMany({
    where: { docenteId: session!.user.id },
  })

  return (
    <div className="space-y-6">
      <AgendaWizard
        agenda={agenda as AgendaConRelaciones}
        cursosGuardados={cursosGuardados}
      />
    </div>
  )
}
