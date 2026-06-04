import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getProyectoDetalle, resolverTopesPorRol } from "@/lib/actions/proyecto-actions"
import { getPeriodos } from "@/lib/actions/periodo-actions"
import { getAutoridadDeSesion } from "@/lib/auth/get-autoridad"
import { puedeGestionarFormulario } from "@/lib/auth/autoridad"
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

  const puedeRevisar = proyecto.estado === "ENVIADO"
  const [topes, periodosRaw] = await Promise.all([
    puedeRevisar ? resolverTopesPorRol() : Promise.resolve(undefined),
    getPeriodos(),
  ])
  const periodos = periodosRaw.map((p) => ({
    nombre: p.nombre,
    fechaInicio: p.fechaInicio,
    fechaFin: p.fechaFin,
  }))

  return (
    <ProyectoRevisionDetalle
      proyecto={proyecto}
      puedeRevisar={puedeRevisar}
      topes={topes}
      periodos={periodos}
      backHref="/gestion/proyectos"
    />
  )
}
