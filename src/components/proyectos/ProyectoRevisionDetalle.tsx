import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProyectoStatusBadge } from "@/components/proyectos/ProyectoStatusBadge"
import { ProyectoAprobarPanel } from "@/components/proyectos/ProyectoAprobarPanel"
import { RehabilitarProyectoButton } from "@/components/proyectos/RehabilitarProyectoButton"
import { ArrowLeft, GraduationCap, Microscope, ShieldAlert } from "lucide-react"
import { getModalidadLabel } from "@/lib/utils/modalidad"
import { formatFechaInicio, cn } from "@/lib/utils"
import { periodosQueAbarca, type PeriodoRango } from "@/lib/utils/periodo"
import { ROL_LIDER } from "@/lib/schemas/proyecto-schema"
import type { getProyectoDetalle } from "@/lib/actions/proyecto-actions"

type ProyectoDetalle = NonNullable<Awaited<ReturnType<typeof getProyectoDetalle>>>

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

/**
 * Vista de revisión de un proyecto, compartida por la ruta de admin
 * (`/admin/revision/proyectos/[id]`) y la de autoridad académica
 * (`/gestion/proyectos/[id]`). La autorización real la imponen las server
 * actions (`verificarRevisor`); aquí solo se muestran las acciones.
 */
export function ProyectoRevisionDetalle({
  proyecto,
  puedeRevisar,
  periodos,
  backHref,
  backLabel = "Volver al listado",
  avisoRevision = null,
}: {
  proyecto: ProyectoDetalle
  puedeRevisar: boolean
  periodos: PeriodoRango[]
  backHref: string
  backLabel?: string
  /** Si el proyecto está ENVIADO pero el actor NO puede aprobarlo (p. ej. es el suyo). */
  avisoRevision?: string | null
  /** Si el usuario actual es el creador del proyecto (para permitir edición) */
  esCreador?: boolean
}) {
  const fechaInicioStr = proyecto.fechaInicio
    ? new Date(proyecto.fechaInicio).toISOString().slice(0, 10)
    : undefined
  const fechaFinStr = proyecto.fechaFin
    ? new Date(proyecto.fechaFin).toISOString().slice(0, 10)
    : undefined
  const semestres = periodosQueAbarca(proyecto.fechaInicio, proyecto.fechaFin, periodos)

  return (
    <div className="space-y-6">
      {/* Encabezado: volver + (rehabilitar si ya está aprobado) */}
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {esCreador && (proyecto.estado === "BORRADOR" || proyecto.estado === "RECHAZADO" || proyecto.estado === "ENVIADO") && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/gestion/proyectos/${proyecto.id}/editar`}>
                Editar proyecto
              </Link>
            </Button>
          )}
          {proyecto.estado === "APROBADO" && (
            <RehabilitarProyectoButton proyectoId={proyecto.id} />
          )}
        </div>
      </div>

      {/* 1) INFORMACIÓN COMPLETA DEL PROYECTO (todo integrado, para revisar primero) */}
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Microscope className="h-5 w-5" />
              {proyecto.titulo}
            </CardTitle>
            <ProyectoStatusBadge estado={proyecto.estado} />
          </div>
          <p className="text-xs text-muted-foreground">
            Registrado por {proyecto.creador.nombre} · Enviado el{" "}
            {new Date(proyecto.createdAt).toLocaleString("es-CO")}
            {proyecto.revisadoEn && (
              <> · Revisado el {new Date(proyecto.revisadoEn).toLocaleString("es-CO")}</>
            )}
          </p>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Tipo</dt>
              <dd>{TIPO_LABEL[proyecto.tipo] ?? proyecto.tipo}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Entidad / Convocatoria</dt>
              <dd>{proyecto.entidadConvocatoria || "—"}</dd>
            </div>
            {(fechaInicioStr || fechaFinStr) && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-muted-foreground">Tiempo del proyecto</dt>
                <dd>
                  {fechaInicioStr ? formatFechaInicio(fechaInicioStr) : "—"} →{" "}
                  {fechaFinStr ? formatFechaInicio(fechaFinStr) : "—"}
                  {semestres.length > 0 && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Semestres: {semestres.join(", ")}
                    </span>
                  )}
                </dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">
                Equipo ({proyecto.participantes.length})
              </dt>
              <dd>
                <ul className="mt-1 space-y-2">
                  {proyecto.participantes.map((p) => {
                    const esLider = p.rol === ROL_LIDER[proyecto.tipo as keyof typeof ROL_LIDER]
                    return (
                      <li
                        key={p.id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-md border p-3",
                          esLider && "border-primary/40 bg-primary/5",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.docente.nombre}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.docente.email} · {getModalidadLabel(p.docente.modalidad)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={esLider ? "default" : "secondary"}
                          className="shrink-0 font-normal"
                        >
                          {ROL_LABEL[p.rol] ?? p.rol}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Las horas de cada docente se definen en su agenda (FO-19), no acá.
                </p>
              </dd>
            </div>
            {proyecto.descripcion && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-muted-foreground">Descripción</dt>
                <dd className="whitespace-pre-wrap">{proyecto.descripcion}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* 2) Motivo del rechazo (si aplica) */}
      {proyecto.estado === "RECHAZADO" && proyecto.observacionesAdmin && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
          <p className="text-xs font-medium text-red-900 dark:text-red-200">Motivo del rechazo</p>
          <p className="mt-1 text-sm text-red-800 dark:text-red-300">{proyecto.observacionesAdmin}</p>
        </div>
      )}

      {/* 3) Aviso de Separación de Deberes (no podés aprobar el tuyo) */}
      {avisoRevision && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-700 dark:bg-amber-950">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">No podés aprobar este proyecto</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">{avisoRevision}</p>
          </div>
        </div>
      )}

      {/* 4) ZONA DE DECISIÓN — al final, después de revisar la info */}
      {puedeRevisar && (
        <ProyectoAprobarPanel
          proyectoId={proyecto.id}
          creadorNombre={proyecto.creador.nombre}
          fechaInicioInicial={fechaInicioStr}
          fechaFinInicial={fechaFinStr}
          periodos={periodos}
        />
      )}
    </div>
  )
}
