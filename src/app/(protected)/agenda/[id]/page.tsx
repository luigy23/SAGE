import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { AgendaReadOnly } from "@/components/agenda/AgendaReadOnly"
import type { AgendaConRelaciones } from "@/lib/types/agenda"

/**
 * Página de detalle de una agenda por ID.
 *
 * Usado para ver agendas de periodos anteriores.
 * Siempre renderiza en modo solo lectura (AgendaReadOnly).
 */
export default async function AgendaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) notFound()

  const agenda = await prisma.agendaSemestral.findUnique({
    where: { id },
    include: {
      docente: true,
      cursos: {
        include: { horarios: true },
        orderBy: { numeroCurso: "asc" },
      },
      otrasActividadesDocencia: { orderBy: { nombre: "asc" } },
      actividadesInvestigacion: { orderBy: { nombre: "asc" } },
      actividadesProyeccionSocial: { orderBy: { nombre: "asc" } },
      actividadesGestion: { orderBy: { nombre: "asc" } },
    },
  })

  // Verificar existencia y propiedad
  if (!agenda || agenda.docenteId !== session.user.id) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <AgendaReadOnly agenda={agenda as AgendaConRelaciones} />
    </div>
  )
}
