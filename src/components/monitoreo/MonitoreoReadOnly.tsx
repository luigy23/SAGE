import Link from "next/link"
import type { MonitoreoConRelaciones } from "@/lib/types/monitoreo"
import { compararEjecucion } from "@/lib/types/monitoreo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FlaskConical,
  GraduationCap,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"

type Row = {
  id: string
  itemNombre: string
  itemDescripcion: string | null
  itemExtra: string | null
  horasPlanificadas: number
  horasEjecutadas: number
  productosEntregados: string | null
}

export function MonitoreoReadOnly({
  monitoreo,
}: {
  monitoreo: MonitoreoConRelaciones
}) {
  // Construir las filas por sección cruzando reportes con items de agenda.
  const reportesDocPorCurso = new Map(
    monitoreo.reportesDocencia.map((r) => [r.cursoAgendaId, r]),
  )
  const reportesActDocPorItem = new Map(
    monitoreo.reportesActividadDocencia.map((r) => [
      r.actividadDocenciaId,
      r,
    ]),
  )
  const reportesInvPorItem = new Map(
    monitoreo.reportesInvestigacion.map((r) => [
      r.actividadInvestigacionId,
      r,
    ]),
  )
  const reportesProyPorItem = new Map(
    monitoreo.reportesProyeccion.map((r) => [
      r.actividadProyeccionSocialId,
      r,
    ]),
  )
  const reportesGesPorItem = new Map(
    monitoreo.reportesGestion.map((r) => [r.actividadGestionId, r]),
  )

  const docencia: Row[] = monitoreo.agenda.cursos
    .map((c): Row | null => {
      const r = reportesDocPorCurso.get(c.id)
      if (!r) return null
      return {
        id: r.id,
        itemNombre: `${c.numeroCurso} — ${c.nombreCurso}`,
        itemDescripcion: c.subgrupo ? `Subgrupo ${c.subgrupo}` : null,
        itemExtra: c.sede ?? null,
        horasPlanificadas: c.dedicacionPeriodo,
        horasEjecutadas: r.horasEjecutadas,
        productosEntregados: r.productosEntregados,
      }
    })
    .filter((r): r is Row => r !== null)

  const otrasDoc: Row[] = monitoreo.agenda.otrasActividadesDocencia
    .map((a): Row | null => {
      const r = reportesActDocPorItem.get(a.id)
      if (!r) return null
      return {
        id: r.id,
        itemNombre: a.nombre,
        itemDescripcion: a.descripcion,
        itemExtra: null,
        horasPlanificadas: a.dedicacionPeriodo,
        horasEjecutadas: r.horasEjecutadas,
        productosEntregados: r.productosEntregados,
      }
    })
    .filter((r): r is Row => r !== null)

  const investigacion: Row[] = monitoreo.agenda.actividadesInvestigacion
    .map((a): Row | null => {
      const r = reportesInvPorItem.get(a.id)
      if (!r) return null
      return {
        id: r.id,
        itemNombre: a.nombre,
        itemDescripcion: a.descripcion,
        itemExtra: null,
        horasPlanificadas: a.dedicacionPeriodo,
        horasEjecutadas: r.horasEjecutadas,
        productosEntregados: r.productosEntregados,
      }
    })
    .filter((r): r is Row => r !== null)

  const proyeccion: Row[] = monitoreo.agenda.actividadesProyeccionSocial
    .map((a): Row | null => {
      const r = reportesProyPorItem.get(a.id)
      if (!r) return null
      return {
        id: r.id,
        itemNombre: a.nombre,
        itemDescripcion: a.descripcion,
        itemExtra: null,
        horasPlanificadas: a.dedicacionPeriodo,
        horasEjecutadas: r.horasEjecutadas,
        productosEntregados: r.productosEntregados,
      }
    })
    .filter((r): r is Row => r !== null)

  const gestion: Row[] = monitoreo.agenda.actividadesGestion
    .map((a): Row | null => {
      const r = reportesGesPorItem.get(a.id)
      if (!r) return null
      return {
        id: r.id,
        itemNombre: a.nombre,
        itemDescripcion: a.descripcion,
        itemExtra: null,
        horasPlanificadas: a.dedicacionPeriodo,
        horasEjecutadas: r.horasEjecutadas,
        productosEntregados: r.productosEntregados,
      }
    })
    .filter((r): r is Row => r !== null)

  const all = [
    ...docencia,
    ...otrasDoc,
    ...investigacion,
    ...proyeccion,
    ...gestion,
  ]
  const totalPlan = all.reduce((s, r) => s + r.horasPlanificadas, 0)
  const totalReal = all.reduce((s, r) => s + r.horasEjecutadas, 0)
  const diff = totalReal - totalPlan

  return (
    <div className="space-y-6 pb-10">
      {/* Encabezado */}
      <div className="space-y-2">
        <Link
          href="/monitoreo"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver a Monitoreo
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              <ClipboardCheck className="h-7 w-7 text-primary" />
              Monitoreo {monitoreo.periodo}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enviado el{" "}
              {new Date(monitoreo.updatedAt).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-green-600 hover:bg-green-600">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              ENVIADO
            </Badge>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={`/api/monitoreo/${monitoreo.id}/pdf`} download>
                <Download className="h-4 w-4" />
                Descargar PDF (FO-20)
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <Card>
        <CardContent className="grid grid-cols-3 gap-3 py-4 text-center">
          <div>
            <p className="text-2xl font-bold tabular-nums">{totalPlan}h</p>
            <p className="text-xs text-muted-foreground">Planificado</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{totalReal}h</p>
            <p className="text-xs text-muted-foreground">Ejecutado</p>
          </div>
          <div>
            <p
              className={`text-2xl font-bold tabular-nums ${
                diff === 0
                  ? "text-green-600"
                  : diff < 0
                    ? "text-amber-600"
                    : "text-blue-600"
              }`}
            >
              {diff > 0 ? "+" : ""}
              {diff}h
            </p>
            <p className="text-xs text-muted-foreground">Diferencia</p>
          </div>
        </CardContent>
      </Card>

      {/* Secciones */}
      {docencia.length > 0 && (
        <SectionView
          icon={<BookOpen className="h-5 w-5 text-blue-600" />}
          title="Cursos (Docencia directa)"
          rows={docencia}
        />
      )}
      {otrasDoc.length > 0 && (
        <SectionView
          icon={<Users className="h-5 w-5 text-purple-600" />}
          title="Otras actividades de docencia"
          rows={otrasDoc}
        />
      )}
      {investigacion.length > 0 && (
        <SectionView
          icon={<FlaskConical className="h-5 w-5 text-green-600" />}
          title="Investigación"
          rows={investigacion}
        />
      )}
      {proyeccion.length > 0 && (
        <SectionView
          icon={<Building2 className="h-5 w-5 text-orange-600" />}
          title="Proyección Social"
          rows={proyeccion}
        />
      )}
      {gestion.length > 0 && (
        <SectionView
          icon={<GraduationCap className="h-5 w-5 text-rose-600" />}
          title="Gestión"
          rows={gestion}
        />
      )}
    </div>
  )
}

function SectionView({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode
  title: string
  rows: Row[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((r) => {
            const estado = compararEjecucion(
              r.horasPlanificadas,
              r.horasEjecutadas,
            )
            return (
              <div
                key={r.id}
                className="rounded-lg border bg-card p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">{r.itemNombre}</p>
                    {(r.itemDescripcion || r.itemExtra) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.itemDescripcion}
                        {r.itemDescripcion && r.itemExtra ? " · " : ""}
                        {r.itemExtra}
                      </p>
                    )}
                  </div>
                  <EstadoBadge estado={estado} />
                </div>

                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Plan:{" "}
                    <span className="font-medium text-foreground">
                      {r.horasPlanificadas}h
                    </span>
                  </span>
                  <span>→</span>
                  <span>
                    Ejecutado:{" "}
                    <span className="font-medium text-foreground">
                      {r.horasEjecutadas}h
                    </span>
                  </span>
                </div>

                {r.productosEntregados && (
                  <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs">
                    <p className="mb-1 font-medium text-muted-foreground">
                      Productos / evidencias
                    </p>
                    <p className="whitespace-pre-wrap">
                      {r.productosEntregados}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function EstadoBadge({
  estado,
}: {
  estado: "igual" | "menos" | "mas"
}) {
  if (estado === "igual") {
    return (
      <Badge
        variant="outline"
        className="shrink-0 gap-1 border-green-500 text-green-700 dark:text-green-300"
      >
        <CheckCircle2 className="h-3 w-3" />
        Cumplido
      </Badge>
    )
  }
  if (estado === "menos") {
    return (
      <Badge
        variant="outline"
        className="shrink-0 gap-1 border-amber-500 text-amber-700 dark:text-amber-300"
      >
        <TrendingDown className="h-3 w-3" />
        Menos
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="shrink-0 gap-1 border-blue-500 text-blue-700 dark:text-blue-300"
    >
      <TrendingUp className="h-3 w-3" />
      Más
    </Badge>
  )
}
