import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import type { MonitoreoConRelaciones } from "@/lib/types/monitoreo"
import { MonitoreoForm } from "@/components/monitoreo/MonitoreoForm"
import { MonitoreoReadOnly } from "@/components/monitoreo/MonitoreoReadOnly"

/**
 * Página de detalle de un Monitoreo.
 * - BORRADOR → <MonitoreoForm> editable
 * - ENVIADO  → <MonitoreoReadOnly> solo lectura
 */
export default async function MonitoreoDetallePage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const monitoreo = await prisma.monitoreo.findUnique({
    where: { id },
    include: {
      docente: true,
      agenda: {
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
      },
      reportesDocencia: true,
      reportesActividadDocencia: true,
      reportesInvestigacion: true,
      reportesProyeccion: true,
      reportesGestion: true,
    },
  })

  if (!monitoreo) notFound()
  if (monitoreo.docenteId !== session.user.id) notFound()

  const data = monitoreo as MonitoreoConRelaciones

  if (data.estado === "BORRADOR") {
    return <MonitoreoForm monitoreo={data} />
  }

  return <MonitoreoReadOnly monitoreo={data} />
}
