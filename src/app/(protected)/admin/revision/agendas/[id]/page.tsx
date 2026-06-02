import { redirect } from "next/navigation"

/** Redirección a la revisión de agendas en el módulo de Autoridad Académica. */
export default async function LegacyRevisionAgendaDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/gestion/agendas/${id}`)
}
