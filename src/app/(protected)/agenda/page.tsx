import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AgendaList } from "@/components/agenda/agenda-list"

export default async function AgendaPage() {
  const session = await auth()
  const agendas = await prisma.agendaSemestral.findMany({
    where: { docenteId: session!.user.id },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Agenda Semestral (FO-19)</h1>
      <AgendaList agendas={agendas} />
    </div>
  )
}
