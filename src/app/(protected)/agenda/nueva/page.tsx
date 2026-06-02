import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { esModalidadNoPlanta } from "@/lib/auth/autoridad"
import NuevaAgendaForm from "./NuevaAgendaForm"

/**
 * Creación de agenda propia (self-service). Solo aplica a docentes de PLANTA.
 * A los No-Planta se la elabora su jefe de programa, así que se les redirige a
 * `/agenda` (donde verán la vista de solo lectura / aviso correspondiente).
 */
export default async function NuevaAgendaPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const docente = await prisma.docente.findUnique({
    where: { id: session.user.id },
    select: { modalidad: true },
  })
  if (!docente) redirect("/auth/login")
  if (esModalidadNoPlanta(docente.modalidad)) redirect("/agenda")

  return <NuevaAgendaForm />
}
