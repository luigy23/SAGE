import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import NuevaAgendaForm from "./NuevaAgendaForm"

/**
 * Creación de agenda propia (self-service). Aplica tanto a docentes de PLANTA
 * como a No-Planta (ocasional, visitante, cátedra, invitado): todos diligencian
 * su propia agenda. El jefe de programa puede además crearla de forma delegada
 * desde /gestion/agendas. Los topes/semanas se resuelven server-side por modalidad.
 */
export default async function NuevaAgendaPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  return <NuevaAgendaForm />
}
