import { redirect } from "next/navigation"

/** Redirección a la revisión de monitoreos en el módulo de Autoridad Académica. */
export default async function LegacyRevisionMonitoreoDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/gestion/monitoreos/${id}`)
}
