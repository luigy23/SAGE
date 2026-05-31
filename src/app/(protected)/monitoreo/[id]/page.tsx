import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import type { MonitoreoConRelaciones } from "@/lib/types/monitoreo"
import { MonitoreoForm } from "@/components/monitoreo/MonitoreoForm"
import { MonitoreoReadOnly } from "@/components/monitoreo/MonitoreoReadOnly"
import { CheckCircle2, XCircle } from "lucide-react"

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

  return (
    <div className="space-y-4">
      {data.estado === "APROBADO" && (
        <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-semibold text-green-900 dark:text-green-200">Monitoreo aprobado</p>
            <p className="mt-0.5 text-green-800 dark:text-green-300">
              Tu Monitoreo (FO-20) para el período{" "}
              <span className="font-mono font-medium">{data.periodo}</span> ha sido aprobado por el administrador.
            </p>
          </div>
        </div>
      )}
      {data.estado === "RECHAZADO" && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">Monitoreo rechazado</p>
            <p className="mt-1 text-red-800 dark:text-red-300">
              Tu Monitoreo (FO-20) para el período{" "}
              <span className="font-mono font-medium">{data.periodo}</span> fue rechazado.
              Contactá a tu coordinador para que habilite la corrección.
            </p>
            {data.observacionesAdmin && (
              <div className="mt-2 rounded border border-red-300 bg-red-100 px-3 py-2 dark:border-red-800 dark:bg-red-900">
                <p className="font-medium text-red-900 dark:text-red-200">Motivo:</p>
                <p className="mt-0.5 text-red-800 dark:text-red-300">{data.observacionesAdmin}</p>
              </div>
            )}
          </div>
        </div>
      )}
      <MonitoreoReadOnly monitoreo={data} />
    </div>
  )
}
