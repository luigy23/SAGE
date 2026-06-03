import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProyectoDetalle } from "@/lib/actions/proyecto-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProyectoStatusBadge } from "@/components/proyectos/ProyectoStatusBadge"
import { EnviarProyectoButton } from "@/components/proyectos/EnviarProyectoButton"
import { CancelarProyectoButton } from "@/components/proyectos/CancelarProyectoButton"
import { CorregirProyectoButton } from "@/components/proyectos/CorregirProyectoButton"
import { ArrowLeft, Microscope, Clock } from "lucide-react"
import { formatFechaInicio } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Detalle de Proyecto | SAGE",
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

export default async function DetalleProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const proyecto = await getProyectoDetalle(id)
  if (!proyecto) notFound()

  // Cualquier participante puede ver el proyecto; editar/enviar/retirar es solo del creador.
  const miId = session.user.id
  const esParticipante = proyecto.participantes.some((p) => p.docente.id === miId)
  if (!esParticipante) notFound()

  const esCreador = proyecto.creador.id === miId
  const miRol = proyecto.participantes.find((p) => p.docente.id === miId)?.rol ?? null
  const puedeEnviar = esCreador && proyecto.estado === "BORRADOR"
  const puedeCancelar =
    esCreador && (proyecto.estado === "BORRADOR" || proyecto.estado === "ENVIADO")

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
          <Link href="/proyectos">
            <ArrowLeft className="h-4 w-4" />
            Volver a mis proyectos
          </Link>
        </Button>

        {(puedeEnviar || puedeCancelar) && (
          <div className="flex flex-wrap gap-2">
            {puedeEnviar && <EnviarProyectoButton proyectoId={id} />}
            {puedeCancelar && (
              <CancelarProyectoButton proyectoId={id} estado={proyecto.estado} />
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5" />
              {proyecto.titulo}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Creado el{" "}
              {new Date(proyecto.createdAt).toLocaleString("es-CO")}
            </p>
            {proyecto.updatedAt.getTime() !== proyecto.createdAt.getTime() && (
              <p className="text-xs text-muted-foreground">
                Actualizado el{" "}
                {new Date(proyecto.updatedAt).toLocaleString("es-CO")}
              </p>
            )}
          </div>
          <ProyectoStatusBadge estado={proyecto.estado} />
        </CardHeader>

        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Tipo
              </dt>
              <dd>{TIPO_LABEL[proyecto.tipo] ?? proyecto.tipo}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Mi rol en el proyecto
              </dt>
              <dd>{miRol ? (ROL_LABEL[miRol] ?? miRol) : "—"}</dd>
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
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">
                Participantes
              </dt>
              <dd>
                <ul className="mt-1 space-y-1">
                  {proyecto.participantes.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span>
                        {p.docente.nombre}
                        {p.docente.id === miId && " (vos)"} · {ROL_LABEL[p.rol] ?? p.rol}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p.horasAsignadas != null ? `${p.horasAsignadas} h` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {proyecto.estado === "ENVIADO" && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            Tu proyecto está en revisión. Un administrador lo procesará a la
            brevedad.
          </span>
        </div>
      )}

      {proyecto.estado === "BORRADOR" && proyecto.observacionesAdmin && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
            Recomendaciones de la última revisión (corregí esto antes de reenviar)
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            {proyecto.observacionesAdmin}
          </p>
        </div>
      )}

      {proyecto.estado === "RECHAZADO" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
          <p className="text-xs font-medium text-red-900 dark:text-red-200">
            Proyecto rechazado{proyecto.observacionesAdmin ? " — motivo" : ""}
          </p>
          {proyecto.observacionesAdmin && (
            <p className="mt-1 text-sm text-red-800 dark:text-red-300">
              {proyecto.observacionesAdmin}
            </p>
          )}
          {esCreador && (
            <>
              <p className="mt-2 text-xs text-red-700 dark:text-red-400">
                Podés corregirlo y reenviarlo sin esperar al revisor.
              </p>
              <CorregirProyectoButton proyectoId={id} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
