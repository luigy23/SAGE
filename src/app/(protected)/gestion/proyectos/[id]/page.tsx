import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getProyectoDetalle } from "@/lib/actions/proyecto-actions"
import { getPeriodos } from "@/lib/actions/periodo-actions"
import { getAutoridadDeSesion } from "@/lib/auth/get-autoridad"
import { puedeGestionarFormulario, assertPuedeAprobar } from "@/lib/auth/autoridad"
import { ProyectoRevisionDetalle } from "@/components/proyectos/ProyectoRevisionDetalle"

export const metadata: Metadata = {
  title: "Revisar proyecto | Gestión SAGE",
}

/** Roles líder que anclan el proyecto a un programa/facultad. */
const LIDER_ROLES = ["INVESTIGADOR_PRINCIPAL", "COORDINADOR"]

export default async function GestionProyectoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const sesion = await getAutoridadDeSesion()
  if (!sesion) redirect("/dashboard")

  const proyecto = await getProyectoDetalle(id)
  if (!proyecto) notFound()

  // Scope: la autoridad en sesión debe gobernar al LÍDER del proyecto
  // (mismo anclaje que usa `verificarRevisor` al aprobar/rechazar).
  const lider = proyecto.participantes.find((p) => LIDER_ROLES.includes(p.rol))
  if (!lider) notFound()
  const enAmbito = puedeGestionarFormulario(sesion.autoridad, {
    id: lider.docente.id,
    programa: lider.docente.programa,
    facultad: lider.docente.facultad,
  })
  if (!enAmbito) notFound()

  // Separación de Deberes: tener el ámbito no basta. Nadie aprueba su PROPIO
  // proyecto (sube al decano/superadmin). Reusa el mismo candado que la acción.
  const bloqueoAprob = assertPuedeAprobar(sesion.actor, {
    id: lider.docente.id,
    programa: lider.docente.programa,
    facultad: lider.docente.facultad,
    modalidad: lider.docente.modalidad,
  })
  const puedeRevisar = proyecto.estado === "ENVIADO" && bloqueoAprob === null
  const avisoRevision =
    proyecto.estado === "ENVIADO" && bloqueoAprob
      ? `${bloqueoAprob.error} El proyecto queda pendiente para la autoridad del siguiente ámbito.`
      : null

  const periodosRaw = await getPeriodos()
  const periodos = periodosRaw.map((p) => ({
    nombre: p.nombre,
    fechaInicio: p.fechaInicio,
    fechaFin: p.fechaFin,
  }))

  return (
    <ProyectoRevisionDetalle
      proyecto={proyecto}
      puedeRevisar={puedeRevisar}
      periodos={periodos}
      backHref="/gestion/proyectos"
      avisoRevision={avisoRevision}
      esCreador={proyecto.creador.id === sesion.actor.id}
    />
  )
}
