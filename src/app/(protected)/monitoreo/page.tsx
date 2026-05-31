import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ClipboardCheck,
  ClipboardList,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Pencil,
  CalendarDays,
  Clock,
  Clock3,
  XCircle,
} from "lucide-react"
import { StartMonitoreoButton } from "@/components/monitoreo/StartMonitoreoButton"
import { getPeriodoActivoConFechas } from "@/lib/utils/periodo-server"

/**
 * Página principal de Monitoreo (FO-20).
 *
 * Server Component que clasifica las agendas ENVIADAS en 3 grupos:
 *  - Pendientes: agenda enviada sin monitoreo aún → CTA "Iniciar Monitoreo"
 *  - En curso:   monitoreo BORRADOR → CTA "Continuar"
 *  - Enviados:   monitoreo ENVIADO → CTA "Ver"
 *
 * Solo se puede monitorear una agenda que ya fue ENVIADA (Art. 12 Acuerdo 048).
 */
export default async function MonitoreoPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  // Periodo activo + ventana FO-20 para el banner informativo
  const periodoActivo = await getPeriodoActivoConFechas()

  // Traer todas las agendas APROBADAS del docente, ordenadas por periodo desc
  const agendas = await prisma.agendaSemestral.findMany({
    where: {
      docenteId: session.user.id,
      estado: "APROBADO",
    },
    orderBy: { periodo: "desc" },
    select: {
      id: true,
      periodo: true,
      updatedAt: true,
      _count: {
        select: {
          cursos: true,
          otrasActividadesDocencia: true,
          actividadesInvestigacion: true,
          actividadesProyeccionSocial: true,
          actividadesGestion: true,
        },
      },
    },
  })

  // Traer todos los monitoreos del docente, indexados por agendaId
  const monitoreos = await prisma.monitoreo.findMany({
    where: { docenteId: session.user.id },
    select: {
      id: true,
      estado: true,
      agendaId: true,
      updatedAt: true,
      observacionesAdmin: true,
    },
  })
  const monitoreoPorAgenda = new Map(monitoreos.map((m) => [m.agendaId, m]))

  // Clasificar
  const pendientes: typeof agendas = []
  const enCurso: typeof agendas = []
  const procesados: typeof agendas = []

  for (const a of agendas) {
    const m = monitoreoPorAgenda.get(a.id)
    if (!m) pendientes.push(a)
    else if (m.estado === "BORRADOR") enCurso.push(a)
    else procesados.push(a)
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Encabezado */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <ClipboardCheck className="h-7 w-7 text-primary" />
          Monitoreo (FO-20)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reporte de ejecución al cierre del semestre. Confirme cuántas horas
          realmente dedicó a cada actividad planificada en su agenda y adjunte
          las evidencias.
        </p>
      </div>

      {/* Banner estado ventana FO-20 */}
      {periodoActivo && (() => {
        const now = new Date()
        const { monitoreoDesde, monitoreoHasta } = periodoActivo
        if (!monitoreoDesde || !monitoreoHasta) {
          return (
            <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                  Ventana de monitoreo no configurada
                </CardTitle>
                <CardDescription>
                  El administrador aún no ha definido el período de entrega del Monitoreo (FO-20) para el
                  semestre <span className="font-mono font-medium">{periodoActivo.nombre}</span>.
                  Puedes revisar tus monitoreos existentes, pero no iniciar nuevos hasta que se configure la ventana.
                </CardDescription>
              </CardHeader>
            </Card>
          )
        }
        if (now < monitoreoDesde) {
          return (
            <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-blue-600" />
                  La ventana de monitoreo aún no está abierta
                </CardTitle>
                <CardDescription>
                  Podrás iniciar el Monitoreo (FO-20) a partir del{" "}
                  <span className="font-medium text-foreground">
                    {monitoreoDesde.toLocaleDateString("es-CO", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  .
                </CardDescription>
              </CardHeader>
            </Card>
          )
        }
        if (now > monitoreoHasta) {
          return (
            <Card className="border-secondary bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Ventana de monitoreo cerrada
                </CardTitle>
                <CardDescription>
                  La ventana de entrega del Monitoreo (FO-20) para el semestre{" "}
                  <span className="font-mono font-medium">{periodoActivo.nombre}</span> cerró el{" "}
                  <span className="font-medium text-foreground">
                    {monitoreoHasta.toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  . Solo puedes consultar monitoreos ya enviados.
                </CardDescription>
              </CardHeader>
            </Card>
          )
        }
        return (
          <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Ventana de monitoreo abierta
              </CardTitle>
              <CardDescription>
                Puedes iniciar y entregar el Monitoreo (FO-20) hasta el{" "}
                <span className="font-medium text-foreground">
                  {monitoreoHasta.toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                .
              </CardDescription>
            </CardHeader>
          </Card>
        )
      })()}

      {/* Banner explicativo cuando no hay nada que monitorear */}
      {agendas.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">
                Aún no tiene agendas aprobadas para monitorear
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                El monitoreo (FO-20) se realiza al final del semestre sobre
                agendas (FO-19) que hayan sido <strong>aprobadas</strong> por el administrador.
              </p>
            </div>
            <Link
              href="/agenda"
              className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Ir a Agenda Semestral →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Pendientes — agendas ENVIADAS sin monitoreo */}
      {pendientes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Pendientes de monitoreo</h2>
            <Badge variant="secondary">{pendientes.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendientes.map((a) => (
              <Card
                key={a.id}
                className="border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/10"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>Agenda {a.periodo}</span>
                    <Badge
                      variant="outline"
                      className="border-amber-500 text-xs text-amber-700 dark:text-amber-300"
                    >
                      Por iniciar
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {a._count.cursos} cursos ·{" "}
                    {a._count.otrasActividadesDocencia +
                      a._count.actividadesInvestigacion +
                      a._count.actividadesProyeccionSocial +
                      a._count.actividadesGestion}{" "}
                    actividades
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StartMonitoreoButton agendaId={a.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* En curso — monitoreos BORRADOR */}
      {enCurso.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">En progreso</h2>
            <Badge variant="secondary">{enCurso.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {enCurso.map((a) => {
              const m = monitoreoPorAgenda.get(a.id)!
              return (
                <Link key={a.id} href={`/monitoreo/${m.id}`}>
                  <Card className="border-yellow-500/30 bg-yellow-50/40 transition-colors hover:border-yellow-500/60 dark:bg-yellow-950/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>Monitoreo {a.periodo}</span>
                        <Badge
                          variant="outline"
                          className="border-yellow-500 text-xs text-yellow-700 dark:text-yellow-300"
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Borrador
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Última edición:{" "}
                        {new Date(m.updatedAt).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm font-medium text-primary">
                        Continuar editando
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Procesados — monitoreos ENVIADO / APROBADO / RECHAZADO */}
      {procesados.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Monitoreos enviados</h2>
            <Badge variant="secondary">{procesados.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {procesados.map((a) => {
              const m = monitoreoPorAgenda.get(a.id)!
              const isRechazado = m.estado === "RECHAZADO"
              const isAprobado = m.estado === "APROBADO"
              return (
                <Link key={a.id} href={`/monitoreo/${m.id}`}>
                  <Card
                    className={
                      isRechazado
                        ? "border-red-200 transition-colors hover:border-red-400 dark:border-red-900"
                        : isAprobado
                          ? "border-blue-200 transition-colors hover:border-blue-400 dark:border-blue-900"
                          : "transition-colors hover:border-primary/40"
                    }
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>Monitoreo {a.periodo}</span>
                        {isRechazado ? (
                          <Badge className="bg-red-600 text-xs hover:bg-red-600">
                            <XCircle className="mr-1 h-3 w-3" />
                            Rechazado
                          </Badge>
                        ) : isAprobado ? (
                          <Badge className="bg-green-600 text-xs hover:bg-green-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Aprobado
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500 text-xs hover:bg-yellow-500">
                            <Clock3 className="mr-1 h-3 w-3" />
                            Enviado
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(m.updatedAt).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {isRechazado && m.observacionesAdmin && (
                          <span className="mt-1 block truncate text-red-600 dark:text-red-400">
                            Motivo: {m.observacionesAdmin}
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                        Ver reporte
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Footer informativo */}
      {(pendientes.length > 0 || enCurso.length > 0 || procesados.length > 0) && (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex items-start gap-3 py-4 text-xs text-muted-foreground">
            <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>Acuerdo 048/2018 Art. 12:</strong> al culminar cada
              período académico, los docentes deben entregar un informe digital
              del cumplimiento de su agenda con copia digital de los productos
              y resultados de sus planes de trabajo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
