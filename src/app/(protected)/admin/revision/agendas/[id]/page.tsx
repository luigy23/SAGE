import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { resolveGlobales } from "@/lib/rules/resolver"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import { AgendaReadOnly } from "@/components/agenda/AgendaReadOnly"
import { HistorialRevisionPanel } from "@/components/revision/HistorialRevisionPanel"
import { RehabilitarAgendaDialog } from "@/components/revision/RehabilitarAgendaDialog"
import { getAgendaParaRevision } from "@/lib/actions/revision"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

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
        include: { horarios: true },
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
  const globales = await resolveGlobales(periodoRow?.id ?? null)

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
        {agenda.estado === "ENVIADO" && (
          <RehabilitarAgendaDialog
            agendaId={agenda.id}
            docenteName={agenda.docente.nombre}
            periodo={agenda.periodo}
            triggerSize="default"
          />
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl">{agenda.docente.nombre}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {agenda.docente.email} ·{" "}
                <span className="font-mono">{agenda.docente.cedula}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {agenda.periodo}
              </Badge>
              <Badge variant="outline">{agenda.docente.modalidad}</Badge>
              <Badge variant="outline">{agenda.docente.sedeBase}</Badge>
              <Badge
                className={
                  agenda.estado === "ENVIADO"
                    ? "bg-green-600 hover:bg-green-600"
                    : agenda.estado === "APROBADO"
                      ? "bg-blue-600 hover:bg-blue-600"
                      : ""
                }
              >
                {agenda.estado}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {agenda.docente.facultad} · {agenda.docente.programa}
          {agenda.rehabilitadaCount > 0 && (
            <>
              {" "}
              · Rehabilitada{" "}
              <span className="font-medium text-foreground">
                {agenda.rehabilitadaCount}
              </span>{" "}
              {agenda.rehabilitadaCount === 1 ? "vez" : "veces"}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AgendaReadOnly
            agenda={agenda as AgendaConRelaciones}
            semanasPeriodo={globales.semanasPeriodo}
          />
        </div>
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <HistorialRevisionPanel
              rehabilitaciones={detalle.agenda.rehabilitaciones}
              ediciones={detalle.ediciones}
              actores={actores}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
