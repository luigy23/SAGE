import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import type { MonitoreoConRelaciones } from "@/lib/types/monitoreo"
import { MonitoreoReadOnly } from "@/components/monitoreo/MonitoreoReadOnly"
import { HistorialRevisionPanel } from "@/components/revision/HistorialRevisionPanel"
import { RehabilitarMonitoreoDialog } from "@/components/revision/RehabilitarMonitoreoDialog"
import { getMonitoreoParaRevision } from "@/lib/actions/revision"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { getModalidadLabel } from "@/lib/utils/modalidad"

export default async function RevisionMonitoreoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const detalle = await getMonitoreoParaRevision(id)
  if (!detalle) notFound()

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

  const actores = [...detalle.rehabilitadores, ...detalle.editores]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
          <Link href="/admin/revision/monitoreos">
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </Link>
        </Button>
        {monitoreo.estado === "ENVIADO" && (
          <RehabilitarMonitoreoDialog
            monitoreoId={monitoreo.id}
            docenteName={monitoreo.docente.nombre}
            periodo={monitoreo.periodo}
            triggerSize="default"
          />
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl">{monitoreo.docente.nombre}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {monitoreo.docente.email} ·{" "}
                <span className="font-mono">{monitoreo.docente.cedula}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {monitoreo.periodo}
              </Badge>
              <Badge variant="outline">{getModalidadLabel(monitoreo.docente.modalidad)}</Badge>
              <Badge variant="outline">{monitoreo.docente.sedeBase}</Badge>
              <Badge
                className={
                  monitoreo.estado === "ENVIADO"
                    ? "bg-green-600 hover:bg-green-600"
                    : monitoreo.estado === "APROBADO"
                      ? "bg-blue-600 hover:bg-blue-600"
                      : ""
                }
              >
                {monitoreo.estado}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {monitoreo.docente.facultad} · {monitoreo.docente.programa}
          {monitoreo.rehabilitadaCount > 0 && (
            <>
              {" "}
              · Rehabilitado{" "}
              <span className="font-medium text-foreground">
                {monitoreo.rehabilitadaCount}
              </span>{" "}
              {monitoreo.rehabilitadaCount === 1 ? "vez" : "veces"}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonitoreoReadOnly monitoreo={monitoreo as MonitoreoConRelaciones} />
        </div>
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <HistorialRevisionPanel
              rehabilitaciones={detalle.monitoreo.rehabilitaciones}
              ediciones={detalle.ediciones}
              actores={actores}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
