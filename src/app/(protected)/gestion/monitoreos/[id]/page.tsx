import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import type { MonitoreoConRelaciones } from "@/lib/types/monitoreo"
import { MonitoreoReadOnly } from "@/components/monitoreo/MonitoreoReadOnly"
import { HistorialRevisionPanel } from "@/components/revision/HistorialRevisionPanel"
import { RehabilitarMonitoreoDialog } from "@/components/revision/RehabilitarMonitoreoDialog"
import { AprobarMonitoreoButton } from "@/components/revision/AprobarMonitoreoButton"
import { RechazarMonitoreoDialog } from "@/components/revision/RechazarMonitoreoDialog"
import { getMonitoreoParaRevision } from "@/lib/actions/revision"
import { getAutoridadDeSesion } from "@/lib/auth/get-autoridad"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ShieldAlert } from "lucide-react"
import { getModalidadLabel } from "@/lib/utils/modalidad"
import { getSedeLabel } from "@/lib/utils/sede"

export default async function GestionMonitoreoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const sesion = await getAutoridadDeSesion()
  if (!sesion) redirect("/dashboard")

  const detalle = await getMonitoreoParaRevision(id)
  if (!detalle) notFound()

  const monitoreo = await prisma.monitoreo.findUnique({
    where: { id },
    include: {
      docente: true,
      agenda: {
        include: {
          docente: true,
          cursos: { orderBy: { numeroCurso: "asc" } },
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

  const esPropia =
    monitoreo.docente.id === sesion.actor.id && sesion.autoridad.tipo !== "SUPERADMIN"

  // Art. 4f: el monitoreo de un INVITADO lo aprueba el Consejo Académico (SUPERADMIN).
  const esInvitadoSinAutoridad =
    monitoreo.docente.modalidad === "INVITADO" && sesion.autoridad.tipo !== "SUPERADMIN"

  const actores = [...detalle.rehabilitadores, ...detalle.editores]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
          <Link href="/gestion/monitoreos">
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {esPropia ? (
            <p className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              Es tu propio monitoreo: lo aprueba la autoridad del siguiente ámbito (tu Decano o el SuperAdmin).
            </p>
          ) : esInvitadoSinAutoridad ? (
            <p className="flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs text-blue-800 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              Profesor invitado (Art. 4f): la aprobación la autoriza el Consejo Académico (SuperAdmin).
            </p>
          ) : (
            <>
              {monitoreo.estado === "ENVIADO" && (
                <>
                  <AprobarMonitoreoButton
                    monitoreoId={monitoreo.id}
                    docenteName={monitoreo.docente.nombre}
                    periodo={monitoreo.periodo}
                  />
                  <RechazarMonitoreoDialog
                    monitoreoId={monitoreo.id}
                    docenteName={monitoreo.docente.nombre}
                    periodo={monitoreo.periodo}
                    triggerSize="default"
                  />
                </>
              )}
              {(monitoreo.estado === "APROBADO" || monitoreo.estado === "RECHAZADO") && (
                <RehabilitarMonitoreoDialog
                  monitoreoId={monitoreo.id}
                  docenteName={monitoreo.docente.nombre}
                  periodo={monitoreo.periodo}
                  triggerSize="default"
                />
              )}
            </>
          )}
        </div>
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
              <Badge variant="outline">{getSedeLabel(monitoreo.docente.sedeBase)}</Badge>
              <Badge
                className={
                  monitoreo.estado === "ENVIADO"
                    ? "bg-yellow-500 hover:bg-yellow-500"
                    : monitoreo.estado === "APROBADO"
                      ? "bg-green-600 hover:bg-green-600"
                      : monitoreo.estado === "RECHAZADO"
                        ? "bg-red-600 hover:bg-red-600"
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
              auditoria={detalle.auditLogs}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
