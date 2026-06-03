import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getProyectoDetalle } from "@/lib/actions/proyecto-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProyectoStatusBadge } from "@/components/proyectos/ProyectoStatusBadge"
import { AprobarProyectoButton } from "@/components/proyectos/AprobarProyectoButton"
import { RechazarProyectoDialog } from "@/components/proyectos/RechazarProyectoDialog"
import { RehabilitarProyectoButton } from "@/components/proyectos/RehabilitarProyectoButton"
import { ArrowLeft, GraduationCap, Microscope } from "lucide-react"
import { getModalidadLabel } from "@/lib/utils/modalidad"
import { formatFechaInicio } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Detalle de Proyecto | SAGE Admin",
}

const TIPO_LABEL: Record<string, string> = {
  INVESTIGACION: "Investigación",
  PROYECCION_SOCIAL: "Proyección Social",
}

const ROL_LABEL: Record<string, string> = {
  INVESTIGADOR_PRINCIPAL: "Investigador Principal",
  COINVESTIGADOR: "Coinvestigador",
  COORDINADOR: "Coordinador",
  COGESTOR: "Cogestor",
}

export default async function RevisionProyectoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const proyecto = await getProyectoDetalle(id)
  if (!proyecto) notFound()

  const puedeRevisar = proyecto.estado === "ENVIADO"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
          <Link href="/admin/revision/proyectos">
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </Link>
        </Button>
        {puedeRevisar && (
          <div className="flex flex-wrap gap-2">
            <AprobarProyectoButton
              proyectoId={proyecto.id}
              docenteName={proyecto.creador.nombre}
            />
            <RechazarProyectoDialog
              proyectoId={proyecto.id}
              docenteName={proyecto.creador.nombre}
            />
          </div>
        )}
        {proyecto.estado === "APROBADO" && (
          <RehabilitarProyectoButton proyectoId={proyecto.id} />
        )}
      </div>

      {/* Docente info */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {proyecto.creador.nombre}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {proyecto.creador.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {getModalidadLabel(proyecto.creador.modalidad)}
            </p>
          </div>
          <ProyectoStatusBadge estado={proyecto.estado} />
        </CardHeader>
      </Card>

      {/* Proyecto info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Microscope className="h-4 w-4" />
            {proyecto.titulo}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Enviado el{" "}
            {new Date(proyecto.createdAt).toLocaleString("es-CO")}
          </p>
          {proyecto.revisadoEn && (
            <p className="text-xs text-muted-foreground">
              Revisado el{" "}
              {new Date(proyecto.revisadoEn).toLocaleString("es-CO")}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Tipo
              </dt>
              <dd>{TIPO_LABEL[proyecto.tipo] ?? proyecto.tipo}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">
                Participantes
              </dt>
              <dd>
                <ul className="mt-1 space-y-1">
                  {proyecto.participantes.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span>{p.docente.nombre} · {ROL_LABEL[p.rol] ?? p.rol}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.horasAsignadas != null ? `${p.horasAsignadas} h` : "horas sin asignar"}
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            {proyecto.entidadConvocatoria && (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Entidad / Convocatoria
                </dt>
                <dd>{proyecto.entidadConvocatoria}</dd>
              </div>
            )}
            {proyecto.periodoInicio && (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Periodo de inicio
                </dt>
                <dd>{formatFechaInicio(proyecto.periodoInicio)}</dd>
              </div>
            )}
            {proyecto.descripcion && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-muted-foreground">
                  Descripción
                </dt>
                <dd className="whitespace-pre-wrap">{proyecto.descripcion}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {proyecto.estado === "RECHAZADO" && proyecto.observacionesAdmin && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
          <p className="text-xs font-medium text-red-900 dark:text-red-200">
            Motivo del rechazo
          </p>
          <p className="mt-1 text-sm text-red-800 dark:text-red-300">
            {proyecto.observacionesAdmin}
          </p>
        </div>
      )}
    </div>
  )
}
