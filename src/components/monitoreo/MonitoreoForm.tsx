"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import type { MonitoreoConRelaciones } from "@/lib/types/monitoreo"
import { compararEjecucion } from "@/lib/types/monitoreo"
import {
  updateReporteAction,
  enviarMonitoreoAction,
  descartarMonitoreoAction,
  type TipoReporte,
} from "@/lib/actions/monitoreo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  BookOpen,
  ClipboardList,
  FlaskConical,
  Users,
  Building2,
  GraduationCap,
  Send,
  Trash2,
  Loader2,
  ArrowLeft,
  Info,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Download,
} from "lucide-react"

// ============================================================
// Tipos auxiliares
// ============================================================

type ReporteState = {
  id: string
  tipo: TipoReporte
  itemNombre: string
  itemDescripcion: string | null
  itemExtra?: string | null
  horasPlanificadas: number
  horasEjecutadas: number
  productosEntregados: string
  /** Para autosave: valores ya persistidos en server */
  saved: {
    horasEjecutadas: number
    productosEntregados: string
  }
  /** Estado UX de guardado */
  saving: boolean
}

// ============================================================
// Componente principal
// ============================================================

export function MonitoreoForm({
  monitoreo,
}: {
  monitoreo: MonitoreoConRelaciones
}) {
  const router = useRouter()
  const [isEnviando, startEnviarTransition] = useTransition()
  const [isDescartando, startDescartarTransition] = useTransition()

  // ----------------------------------------------------------
  // Construir estado inicial cruzando reportes con items de agenda
  // ----------------------------------------------------------
  const [secciones, setSecciones] = useState(() =>
    buildSecciones(monitoreo)
  )

  // ----------------------------------------------------------
  // Totales reactivos
  // ----------------------------------------------------------
  const totales = useMemo(() => {
    let plan = 0
    let real = 0
    for (const s of secciones) {
      for (const r of s.reportes) {
        plan += r.horasPlanificadas
        real += r.horasEjecutadas
      }
    }
    return { plan, real, diff: real - plan }
  }, [secciones])

  // ----------------------------------------------------------
  // Actualizar fila + autosave on-blur
  // ----------------------------------------------------------
  function updateRow(
    seccionIdx: number,
    rowIdx: number,
    patch: Partial<Pick<ReporteState, "horasEjecutadas" | "productosEntregados">>,
  ) {
    setSecciones((prev) => {
      const next = [...prev]
      const seccion = { ...next[seccionIdx] }
      const reportes = [...seccion.reportes]
      reportes[rowIdx] = { ...reportes[rowIdx], ...patch }
      seccion.reportes = reportes
      next[seccionIdx] = seccion
      return next
    })
  }

  async function saveRow(seccionIdx: number, rowIdx: number) {
    const row = secciones[seccionIdx].reportes[rowIdx]
    // Skip si nada cambió
    if (
      row.horasEjecutadas === row.saved.horasEjecutadas &&
      row.productosEntregados === row.saved.productosEntregados
    ) {
      return
    }

    setSecciones((prev) => {
      const next = [...prev]
      const seccion = { ...next[seccionIdx] }
      const reportes = [...seccion.reportes]
      reportes[rowIdx] = { ...reportes[rowIdx], saving: true }
      seccion.reportes = reportes
      next[seccionIdx] = seccion
      return next
    })

    const result = await updateReporteAction({
      reporteId: row.id,
      tipo: row.tipo,
      horasEjecutadas: row.horasEjecutadas,
      productosEntregados: row.productosEntregados.trim() || null,
    })

    setSecciones((prev) => {
      const next = [...prev]
      const seccion = { ...next[seccionIdx] }
      const reportes = [...seccion.reportes]
      const r = reportes[rowIdx]
      if ("error" in result) {
        toast.error(result.error)
        reportes[rowIdx] = { ...r, saving: false }
      } else {
        reportes[rowIdx] = {
          ...r,
          saving: false,
          saved: {
            horasEjecutadas: r.horasEjecutadas,
            productosEntregados: r.productosEntregados,
          },
        }
      }
      seccion.reportes = reportes
      next[seccionIdx] = seccion
      return next
    })
  }

  // ----------------------------------------------------------
  // Enviar / Descartar
  // ----------------------------------------------------------
  function handleEnviar() {
    startEnviarTransition(async () => {
      const result = await enviarMonitoreoAction(monitoreo.id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Monitoreo enviado exitosamente.")
      router.refresh()
    })
  }

  function handleDescartar() {
    startDescartarTransition(async () => {
      const result = await descartarMonitoreoAction(monitoreo.id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Borrador de monitoreo descartado.")
      router.push("/monitoreo")
    })
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  const hasReportes = secciones.some((s) => s.reportes.length > 0)

  return (
    <div className="space-y-6 pb-32">
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
              <ClipboardList className="h-7 w-7 text-primary" />
              Monitoreo {monitoreo.periodo}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reporte de ejecución sobre la agenda enviada el{" "}
              {new Date(monitoreo.agenda.updatedAt).toLocaleDateString(
                "es-CO",
                { day: "numeric", month: "long", year: "numeric" },
              )}
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-yellow-500 text-yellow-700 dark:text-yellow-300"
            >
              BORRADOR
            </Badge>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a
                href={`/api/monitoreo/${monitoreo.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Vista previa PDF
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Banner instructivo */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-3 py-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1">
            <p>
              <strong>Cómo diligenciar:</strong> cada fila muestra una
              actividad que planificó. Indique las{" "}
              <strong>horas que realmente dedicó</strong> (prellenamos lo
              planificado) y, opcionalmente, una breve nota sobre los{" "}
              <strong>productos o evidencias</strong>. Los cambios se guardan
              automáticamente al salir del campo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mensaje cuando la agenda no tiene items */}
      {!hasReportes && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Esta agenda no tiene cursos ni actividades para reportar.
          </CardContent>
        </Card>
      )}

      {/* Secciones */}
      {secciones.map((seccion, sIdx) =>
        seccion.reportes.length > 0 ? (
          <SeccionCard
            key={seccion.key}
            icon={seccion.icon}
            title={seccion.title}
            description={seccion.description}
          >
            <div className="space-y-3">
              {seccion.reportes.map((row, rIdx) => (
                <ReporteRow
                  key={row.id}
                  row={row}
                  onChange={(patch) => updateRow(sIdx, rIdx, patch)}
                  onBlur={() => saveRow(sIdx, rIdx)}
                />
              ))}
            </div>
          </SeccionCard>
        ) : null,
      )}

      {/* Sticky bottom bar — totales + acciones */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Planificado</span>
              <span className="font-bold tabular-nums">{totales.plan}h</span>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Ejecutado</span>
              <span className="font-bold tabular-nums">{totales.real}h</span>
            </div>
            <Badge
              variant="outline"
              className={
                totales.diff === 0
                  ? "border-green-500 text-green-700 dark:text-green-300"
                  : totales.diff < 0
                    ? "border-amber-500 text-amber-700 dark:text-amber-300"
                    : "border-blue-500 text-blue-700 dark:text-blue-300"
              }
            >
              {totales.diff > 0 ? "+" : ""}
              {totales.diff}h
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={isDescartando || isEnviando}
                >
                  {isDescartando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Descartar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Descartar el monitoreo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminará el borrador actual y todos los reportes que
                    ha registrado. Podrá volver a iniciarlo más tarde, pero
                    perderá los datos ingresados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDescartar}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sí, descartar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={isEnviando || isDescartando || !hasReportes}
                >
                  {isEnviando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar Monitoreo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Enviar el monitoreo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Una vez enviado no podrá modificarlo. El Jefe de Programa
                    podrá consultar el reporte. Verifique las horas ejecutadas
                    de cada actividad antes de continuar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Revisar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEnviar}>
                    Sí, enviar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Sub-componentes
// ============================================================

function SeccionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function ReporteRow({
  row,
  onChange,
  onBlur,
}: {
  row: ReporteState
  onChange: (
    patch: Partial<
      Pick<ReporteState, "horasEjecutadas" | "productosEntregados">
    >,
  ) => void
  onBlur: () => void
}) {
  const estado = compararEjecucion(row.horasPlanificadas, row.horasEjecutadas)
  const dirty =
    row.horasEjecutadas !== row.saved.horasEjecutadas ||
    row.productosEntregados !== row.saved.productosEntregados

  return (
    <div className="rounded-lg border bg-card p-3 transition-colors hover:border-primary/30">
      {/* Header: item info + estado */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight">{row.itemNombre}</p>
          {(row.itemDescripcion || row.itemExtra) && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {row.itemDescripcion}
              {row.itemDescripcion && row.itemExtra ? " · " : ""}
              {row.itemExtra}
            </p>
          )}
        </div>
        <EstadoBadge estado={estado} dirty={dirty} saving={row.saving} />
      </div>

      {/* Grid: horas + productos */}
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        {/* Horas */}
        <div className="space-y-1">
          <Label className="text-xs">
            Horas ejecutadas{" "}
            <span className="text-muted-foreground">
              (plan: {row.horasPlanificadas}h)
            </span>
          </Label>
          <Input
            type="number"
            min={0}
            step="0.5"
            inputMode="decimal"
            value={row.horasEjecutadas}
            onChange={(e) =>
              onChange({ horasEjecutadas: Number(e.target.value) || 0 })
            }
            onBlur={onBlur}
            className="h-9 tabular-nums"
          />
        </div>

        {/* Productos */}
        <div className="space-y-1">
          <Label className="text-xs">
            Productos / evidencias{" "}
            <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea
            value={row.productosEntregados}
            onChange={(e) => onChange({ productosEntregados: e.target.value })}
            onBlur={onBlur}
            placeholder="Ej: Notas finales en plataforma, artículo enviado a..., listado de asistentes..."
            className="min-h-[64px] resize-y text-sm"
          />
        </div>
      </div>
    </div>
  )
}

function EstadoBadge({
  estado,
  dirty,
  saving,
}: {
  estado: "igual" | "menos" | "mas"
  dirty: boolean
  saving: boolean
}) {
  if (saving) {
    return (
      <Badge variant="outline" className="shrink-0 gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Guardando
      </Badge>
    )
  }
  if (dirty) {
    return (
      <Badge
        variant="outline"
        className="shrink-0 border-muted-foreground/40 text-muted-foreground"
      >
        Sin guardar
      </Badge>
    )
  }
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

// ============================================================
// Helpers de construcción de estado
// ============================================================

type SeccionConfig = {
  key: string
  title: string
  description: string
  icon: React.ReactNode
  reportes: ReporteState[]
}

function buildSecciones(m: MonitoreoConRelaciones): SeccionConfig[] {
  // Indexar reportes por item id
  const reportesDocPorCurso = new Map(
    m.reportesDocencia.map((r) => [r.cursoAgendaId, r]),
  )
  const reportesActDocPorItem = new Map(
    m.reportesActividadDocencia.map((r) => [r.actividadDocenciaId, r]),
  )
  const reportesInvPorItem = new Map(
    m.reportesInvestigacion.map((r) => [r.actividadInvestigacionId, r]),
  )
  const reportesProyPorItem = new Map(
    m.reportesProyeccion.map((r) => [r.actividadProyeccionSocialId, r]),
  )
  const reportesGesPorItem = new Map(
    m.reportesGestion.map((r) => [r.actividadGestionId, r]),
  )

  const seccion1: ReporteState[] = m.agenda.cursos
    .map((c) => {
      const r = reportesDocPorCurso.get(c.id)
      if (!r) return null
      return makeRow({
        id: r.id,
        tipo: "docencia",
        itemNombre: `${c.numeroCurso} — ${c.nombreCurso}`,
        itemDescripcion: null,
        itemExtra: c.sede ?? null,
        horasPlanificadas: c.dedicacionPeriodo,
        horasEjecutadas: r.horasEjecutadas,
        productosEntregados: r.productosEntregados ?? "",
      })
    })
    .filter((r): r is ReporteState => r !== null)

  const seccion2: ReporteState[] = m.agenda.otrasActividadesDocencia
    .map((a) => {
      const r = reportesActDocPorItem.get(a.id)
      if (!r) return null
      return makeRow({
        id: r.id,
        tipo: "actividadDocencia",
        itemNombre: a.nombre,
        itemDescripcion: a.descripcion,
        itemExtra: a.sede ?? null,
        horasPlanificadas: a.dedicacionPeriodo,
        horasEjecutadas: r.horasEjecutadas,
        productosEntregados: r.productosEntregados ?? "",
      })
    })
    .filter((r): r is ReporteState => r !== null)

  const seccion3: ReporteState[] = m.agenda.actividadesInvestigacion
    .map((a) => {
      const r = reportesInvPorItem.get(a.id)
      if (!r) return null
      return makeRow({
        id: r.id,
        tipo: "investigacion",
        itemNombre: a.nombre,
        itemDescripcion: a.descripcion,
        itemExtra: a.sede ?? null,
        horasPlanificadas: a.dedicacionPeriodo,
        horasEjecutadas: r.horasEjecutadas,
        productosEntregados: r.productosEntregados ?? "",
      })
    })
    .filter((r): r is ReporteState => r !== null)

  const seccion4: ReporteState[] = m.agenda.actividadesProyeccionSocial
    .map((a) => {
      const r = reportesProyPorItem.get(a.id)
      if (!r) return null
      return makeRow({
        id: r.id,
        tipo: "proyeccion",
        itemNombre: a.nombre,
        itemDescripcion: a.descripcion,
        itemExtra: a.sede ?? null,
        horasPlanificadas: a.dedicacionPeriodo,
        horasEjecutadas: r.horasEjecutadas,
        productosEntregados: r.productosEntregados ?? "",
      })
    })
    .filter((r): r is ReporteState => r !== null)

  const seccion5: ReporteState[] = m.agenda.actividadesGestion
    .map((a) => {
      const r = reportesGesPorItem.get(a.id)
      if (!r) return null
      return makeRow({
        id: r.id,
        tipo: "gestion",
        itemNombre: a.nombre,
        itemDescripcion: a.descripcion,
        itemExtra: a.sede ?? null,
        horasPlanificadas: a.dedicacionPeriodo,
        horasEjecutadas: r.horasEjecutadas,
        productosEntregados: r.productosEntregados ?? "",
      })
    })
    .filter((r): r is ReporteState => r !== null)

  return [
    {
      key: "docencia",
      title: "Cursos (Docencia directa)",
      description:
        "Asignaturas que figuran en su agenda. Indique horas reales dictadas y, si aplica, entregas formales (notas, syllabus cumplido).",
      icon: <BookOpen className="h-5 w-5 text-blue-600" />,
      reportes: seccion1,
    },
    {
      key: "otrasDocencia",
      title: "Otras actividades de docencia",
      description:
        "Tutorías, dirección de trabajos de grado, preparación, asesorías, etc.",
      icon: <Users className="h-5 w-5 text-purple-600" />,
      reportes: seccion2,
    },
    {
      key: "investigacion",
      title: "Investigación",
      description:
        "Proyectos, productos académicos, semilleros y grupos de investigación.",
      icon: <FlaskConical className="h-5 w-5 text-green-600" />,
      reportes: seccion3,
    },
    {
      key: "proyeccion",
      title: "Proyección Social",
      description:
        "Extensión, convenios, asesorías a comunidades, ponencias y servicios.",
      icon: <Building2 className="h-5 w-5 text-orange-600" />,
      reportes: seccion4,
    },
    {
      key: "gestion",
      title: "Gestión académica/administrativa",
      description:
        "Cargos administrativos, comités, coordinaciones y representaciones.",
      icon: <GraduationCap className="h-5 w-5 text-rose-600" />,
      reportes: seccion5,
    },
  ]
}

function makeRow(input: {
  id: string
  tipo: TipoReporte
  itemNombre: string
  itemDescripcion: string | null
  itemExtra?: string | null
  horasPlanificadas: number
  horasEjecutadas: number
  productosEntregados: string
}): ReporteState {
  return {
    id: input.id,
    tipo: input.tipo,
    itemNombre: input.itemNombre,
    itemDescripcion: input.itemDescripcion,
    itemExtra: input.itemExtra ?? null,
    horasPlanificadas: input.horasPlanificadas,
    horasEjecutadas: input.horasEjecutadas,
    productosEntregados: input.productosEntregados,
    saved: {
      horasEjecutadas: input.horasEjecutadas,
      productosEntregados: input.productosEntregados,
    },
    saving: false,
  }
}
