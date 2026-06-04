import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProyectoDetalle } from "@/lib/actions/proyecto-actions"
import { getPeriodos } from "@/lib/actions/periodo-actions"
import { periodosQueAbarca } from "@/lib/utils/periodo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProyectoStatusBadge } from "@/components/proyectos/ProyectoStatusBadge"
import { CancelarProyectoButton } from "@/components/proyectos/CancelarProyectoButton"
import { ProyectoForm } from "@/components/proyectos/ProyectoForm"
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

  const periodos = (await getPeriodos()).map((p) => ({
    nombre: p.nombre,
    fechaInicio: p.fechaInicio,
    fechaFin: p.fechaFin,
  }))
  const semestres = periodosQueAbarca(proyecto.fechaInicio, proyecto.fechaFin, periodos)

  // Cualquier participante puede ver el proyecto; editar/enviar/retirar es solo del creador.
  const miId = session.user.id
  const esParticipante = proyecto.participantes.some((p) => p.docente.id === miId)
  if (!esParticipante) notFound()

  const esCreador = proyecto.creador.id === miId
  const miRol = proyecto.participantes.find((p) => p.docente.id === miId)?.rol ?? null
  const puedeCancelar =
    esCreador && (proyecto.estado === "BORRADOR" || proyecto.estado === "ENVIADO")

  // Edición directa (sin botón "Corregir"): el creador edita en BORRADOR o RECHAZADO.
  const puedeEditar =
    esCreador && (proyecto.estado === "BORRADOR" || proyecto.estado === "RECHAZADO")
  const fechaToInput = (d: Date | null) =>
    d ? new Date(d).toISOString().slice(0, 10) : undefined
  const initialProyecto = {
    values: {
      titulo: proyecto.titulo,
      descripcion: proyecto.descripcion ?? "",
      tipo: proyecto.tipo,
      rolDocente: miRol ?? undefined,
      entidadConvocatoria: proyecto.entidadConvocatoria ?? "",
      fechaInicio: fechaToInput(proyecto.fechaInicio),
      fechaFin: fechaToInput(proyecto.fechaFin),
    },
    participantes: proyecto.participantes
      .filter((p) => p.docente.id !== proyecto.creador.id)
      .map((p) => ({
        id: p.docente.id,
        nombre: p.docente.nombre,
        cedula: p.docente.cedula,
        programa: p.docente.programa,
        rol: p.rol,
      })),
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
          <Link href="/proyectos">
            <ArrowLeft className="h-4 w-4" />
            Volver a mis proyectos
          </Link>
        </Button>
        {puedeCancelar && (
          <CancelarProyectoButton proyectoId={id} estado={proyecto.estado} />
        )}
      </div>

      {/* Nota de la última revisión (motivo de rechazo) — visible al editar directo. */}
      {proyecto.estado === "RECHAZADO" && proyecto.observacionesAdmin && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
          <p className="text-xs font-medium text-red-900 dark:text-red-200">
            Motivo del rechazo
          </p>
          <p className="mt-1 text-sm text-red-800 dark:text-red-300">
            {proyecto.observacionesAdmin}
          </p>
          <p className="mt-2 text-xs text-red-700 dark:text-red-400">
            Corrige lo necesario abajo y presiona “Reenviar a revisión”.
          </p>
        </div>
      )}

      {puedeEditar ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Microscope className="h-5 w-5" />
              {proyecto.estado === "RECHAZADO" ? "Corregir proyecto" : "Editar proyecto"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProyectoForm
              creadorId={proyecto.creador.id}
              periodos={periodos}
              proyectoId={id}
              initial={initialProyecto}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Microscope className="h-5 w-5" />
                  {proyecto.titulo}
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Creado el {new Date(proyecto.createdAt).toLocaleString("es-CO")}
                </p>
                {proyecto.updatedAt.getTime() !== proyecto.createdAt.getTime() && (
                  <p className="text-xs text-muted-foreground">
                    Actualizado el {new Date(proyecto.updatedAt).toLocaleString("es-CO")}
                  </p>
                )}
              </div>
              <ProyectoStatusBadge estado={proyecto.estado} />
            </CardHeader>

            <CardContent>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Tipo</dt>
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
                {(proyecto.fechaInicio || proyecto.fechaFin) && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">
                      Tiempo del proyecto
                    </dt>
                    <dd>
                      {proyecto.fechaInicio ? formatFechaInicio(fechaToInput(proyecto.fechaInicio)!) : "—"}{" "}
                      → {proyecto.fechaFin ? formatFechaInicio(fechaToInput(proyecto.fechaFin)!) : "—"}
                      {semestres.length > 0 && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Semestres: {semestres.join(", ")}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {proyecto.descripcion && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-muted-foreground">Descripción</dt>
                    <dd className="whitespace-pre-wrap">{proyecto.descripcion}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">Participantes</dt>
                  <dd>
                    <ul className="mt-1 space-y-1">
                      {proyecto.participantes.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span>
                            {p.docente.nombre}
                            {p.docente.id === miId && " (tú)"} · {ROL_LABEL[p.rol] ?? p.rol}
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
              <span>Tu proyecto está en revisión. La autoridad académica lo procesará pronto.</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
