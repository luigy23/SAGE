import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { resolveGlobales, resolveAgendaLimits } from "@/lib/rules/resolver"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import { AgendaReadOnly } from "@/components/agenda/AgendaReadOnly"
import { HistorialRevisionPanel } from "@/components/revision/HistorialRevisionPanel"
import { RehabilitarAgendaDialog } from "@/components/revision/RehabilitarAgendaDialog"
import { AprobarAgendaButton } from "@/components/revision/AprobarAgendaButton"
import { RechazarAgendaDialog } from "@/components/revision/RechazarAgendaDialog"
import { getAgendaParaRevision } from "@/lib/actions/revision"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, GraduationCap } from "lucide-react"
import { getModalidadLabel } from "@/lib/utils/modalidad"

export default async function RevisionAgendaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Datos básicos + historial (con guard ADMIN)
  const detalle = await getAgendaParaRevision(id)
  if (!detalle) notFound()

  // Cargar la agenda completa con relaciones para AgendaReadOnly
  const agenda = await prisma.agendaSemestral.findUnique({
    where: { id },
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
  })
  if (!agenda) notFound()

  const periodoRow = await prisma.periodoAcademico.findUnique({
    where: { nombre: agenda.periodo },
    select: { id: true },
  })

  const [globales, agendaLimits] = await Promise.all([
    resolveGlobales(periodoRow?.id ?? null),
    resolveAgendaLimits(
      {
        modalidad: agenda.docente.modalidad,
        sedeBase: agenda.docente.sedeBase,
        doctorado: agenda.docente.doctorado,
        cargoAdministrativo: agenda.docente.cargoAdministrativo,
        proyectosActivos: agenda.docente.proyectosActivos,
        tipoCargo: agenda.docente.tipoCargo ?? null,
        semanasVinculacion: agenda.docente.semanasVinculacion ?? null,
      },
      periodoRow?.id ?? null
    ),
  ])

  const actores = [...detalle.rehabilitadores, ...detalle.editores]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
          <Link href="/admin/revision/agendas">
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {agenda.estado === "ENVIADO" && (
            <>
              <AprobarAgendaButton
                agendaId={agenda.id}
                docenteName={agenda.docente.nombre}
                periodo={agenda.periodo}
              />
              <RechazarAgendaDialog
                agendaId={agenda.id}
                docenteName={agenda.docente.nombre}
                periodo={agenda.periodo}
                triggerSize="default"
              />
            </>
          )}
          {(agenda.estado === "APROBADO" || agenda.estado === "RECHAZADO") && (
            <RehabilitarAgendaDialog
              agendaId={agenda.id}
              docenteName={agenda.docente.nombre}
              periodo={agenda.periodo}
              triggerSize="default"
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Datos del Docente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Nombre</dt>
              <dd className="text-sm font-medium">{agenda.docente.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Cédula</dt>
              <dd className="text-sm font-medium">{agenda.docente.cedula}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Correo</dt>
              <dd className="text-sm font-medium">{agenda.docente.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Facultad</dt>
              <dd className="text-sm font-medium">{agenda.docente.facultad}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Programa</dt>
              <dd className="text-sm font-medium">{agenda.docente.programa}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Modalidad</dt>
              <dd className="text-sm font-medium">{getModalidadLabel(agenda.docente.modalidad)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Sede</dt>
              <dd className="text-sm font-medium">{agenda.docente.sedeBase}</dd>
            </div>
          </dl>

          <Separator className="my-4" />

          <div className="flex flex-wrap gap-2">
            <Badge variant={agenda.docente.doctorado ? "default" : "secondary"}>
              Doctorado: {agenda.docente.doctorado ? "Sí" : "No"}
            </Badge>
            <Badge variant={agenda.docente.cargoAdministrativo ? "default" : "secondary"}>
              Cargo Administrativo: {agenda.docente.cargoAdministrativo ? "Sí" : "No"}
            </Badge>
            <Badge variant={agenda.docente.proyectosActivos ? "default" : "secondary"}>
              Proyectos Activos: {agenda.docente.proyectosActivos ? "Sí" : "No"}
            </Badge>
          </div>

          {agenda.rehabilitadaCount > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Rehabilitada{" "}
              <span className="font-medium text-foreground">
                {agenda.rehabilitadaCount}
              </span>{" "}
              {agenda.rehabilitadaCount === 1 ? "vez" : "veces"}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AgendaReadOnly
            agenda={agenda as AgendaConRelaciones}
            semanasPeriodo={globales.semanasPeriodo}
            agendaLimits={agendaLimits}
            hideDatosDocente
          />
        </div>
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <HistorialRevisionPanel
              rehabilitaciones={detalle.agenda.rehabilitaciones}
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
