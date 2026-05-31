"use client"

import type { AgendaConRelaciones } from "@/lib/types/agenda"
import type { AgendaLimits } from "@/lib/validations/agenda-rules"
import { getMaxHoras } from "@/lib/utils/periodo"
import { getModalidadLabel } from "@/lib/utils/modalidad"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  BookOpen,
  FlaskConical,
  Users,
  Building2,
  GraduationCap,
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock3,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ==========================================
// Sub-componente reutilizable: Sección de actividades
// ==========================================
interface ActividadItem {
  id: string
  nombre: string
  descripcion: string | null
  dedicacionPeriodo: number
  sede?: string | null
}

function SectionCard({
  icon,
  title,
  actividades,
  total,
  totalLabel,
}: {
  icon: React.ReactNode
  title: string
  actividades: ActividadItem[]
  total: number
  totalLabel: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title} ({actividades.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actividades.length > 0 ? (
          <div className="space-y-1">
            {actividades.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between rounded px-2 py-1.5 text-sm odd:bg-muted/50"
              >
                <div>
                  <span className="font-medium">{act.nombre}</span>
                  {act.sede && (
                    <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      {act.sede}
                    </span>
                  )}
                  {act.descripcion && (
                    <span className="ml-2 text-muted-foreground">
                      — {act.descripcion}
                    </span>
                  )}
                </div>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {act.dedicacionPeriodo}h
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin actividades</p>
        )}
        <div className="mt-3 flex justify-between rounded-md bg-primary/5 px-3 py-2 text-sm font-bold">
          <span>{totalLabel}</span>
          <span className="tabular-nums">{total}h</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ==========================================
// Componente principal: AgendaReadOnly
// ==========================================
export function AgendaReadOnly({
  agenda,
  semanasPeriodo,
  agendaLimits,
  hideDatosDocente = false,
  slotPostDatosDocente,
}: {
  agenda: AgendaConRelaciones
  semanasPeriodo: number
  agendaLimits?: AgendaLimits
  hideDatosDocente?: boolean
  slotPostDatosDocente?: React.ReactNode
}) {
  const { docente } = agenda

  // ==========================================
  // Dynamic legal limit — prefers DB-sourced agendaLimits (via resolveAgendaLimits),
  // falls back to hardcoded getMaxHoras only when prop is absent.
  // ==========================================
  const { maxHoras, esEstricto } = agendaLimits
    ? { maxHoras: agendaLimits.maxHorasSemanales, esEstricto: agendaLimits.esEstricto }
    : getMaxHoras(docente.modalidad, docente.sedeBase)

  // ==========================================
  // Calcular todos los totales una sola vez
  // ==========================================
  const subtotalCursos = agenda.cursos.reduce(
    (s, c) => s + c.dedicacionPeriodo,
    0
  )
  const subtotalOtrasDocencia = agenda.otrasActividadesDocencia.reduce(
    (s, a) => s + a.dedicacionPeriodo,
    0
  )
  const totalDocencia = subtotalCursos + subtotalOtrasDocencia
  const totalInvestigacion = agenda.actividadesInvestigacion.reduce(
    (s, a) => s + a.dedicacionPeriodo,
    0
  )
  const totalProyeccion = agenda.actividadesProyeccionSocial.reduce(
    (s, a) => s + a.dedicacionPeriodo,
    0
  )
  const totalGestion = agenda.actividadesGestion.reduce(
    (s, a) => s + a.dedicacionPeriodo,
    0
  )
  const granTotal =
    totalDocencia + totalInvestigacion + totalProyeccion + totalGestion

  // ==========================================
  // Equivalencia Promedio Semanal
  // ==========================================
  const promedioSemanal = semanasPeriodo > 0 ? granTotal / semanasPeriodo : 0
  const promedioRedondeado = Math.round(promedioSemanal * 10) / 10
  const excedidoSemanal = promedioSemanal > maxHoras

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Header: Título, estado y botón de impresión */}
      {(() => {
        const estadoConfig = {
          ENVIADO:   { badgeBg: "bg-yellow-500 hover:bg-yellow-500", Icon: Clock3,       accionTexto: "Enviada el"   },
          APROBADO:  { badgeBg: "bg-green-600 hover:bg-green-600",   Icon: CheckCircle2, accionTexto: "Aprobada el"  },
          RECHAZADO: { badgeBg: "bg-red-600 hover:bg-red-600",       Icon: XCircle,      accionTexto: "Rechazada el" },
        }[agenda.estado as "ENVIADO" | "APROBADO" | "RECHAZADO"] ?? {
          badgeBg: "", Icon: Clock3, accionTexto: "Actualizada el",
        }
        const { badgeBg, Icon, accionTexto } = estadoConfig

        return (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  Agenda Semestral — {agenda.periodo}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {accionTexto}{" "}
                  {new Date(agenda.updatedAt).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3 print:hidden">
                <Badge
                  variant="default"
                  className={`gap-1.5 px-3 py-1.5 text-sm ${badgeBg}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {agenda.estado}
                </Badge>
                <Button
                  asChild
                  variant="outline"
                  className="gap-2 print:hidden"
                >
                  <a href={`/api/agenda/${agenda.id}/pdf`} download>
                    <Printer className="h-4 w-4" />
                    Descargar PDF (FO-19)
                  </a>
                </Button>
              </div>
            </div>

            {/* Badge visible solo en impresión */}
            <div className="hidden print:block print:text-right">
              <span className="text-sm font-semibold">Estado: {agenda.estado} ✓</span>
            </div>
          </>
        )
      })()}

      {/* Datos del Docente */}
      {!hideDatosDocente && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 print:hidden" />
            Datos del Docente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-muted-foreground print:text-gray-500">
                Nombre
              </dt>
              <dd className="text-sm font-medium">{docente.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground print:text-gray-500">
                Cédula
              </dt>
              <dd className="text-sm font-medium">{docente.cedula}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground print:text-gray-500">
                Correo
              </dt>
              <dd className="text-sm font-medium">{docente.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground print:text-gray-500">
                Facultad
              </dt>
              <dd className="text-sm font-medium">{docente.facultad}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground print:text-gray-500">
                Programa
              </dt>
              <dd className="text-sm font-medium">{docente.programa}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground print:text-gray-500">
                Modalidad
              </dt>
              <dd className="text-sm font-medium">{getModalidadLabel(docente.modalidad)}</dd>
            </div>
          </dl>

          <Separator className="my-4" />

          <div className="flex flex-wrap gap-2">
            <Badge variant={docente.doctorado ? "default" : "secondary"}>
              Doctorado: {docente.doctorado ? "Sí" : "No"}
            </Badge>
            <Badge
              variant={docente.cargoAdministrativo ? "default" : "secondary"}
            >
              Cargo Administrativo:{" "}
              {docente.cargoAdministrativo ? "Sí" : "No"}
            </Badge>
            <Badge
              variant={docente.proyectosActivos ? "default" : "secondary"}
            >
              Proyectos Activos: {docente.proyectosActivos ? "Sí" : "No"}
            </Badge>
          </div>
        </CardContent>
      </Card>
      )}

      {slotPostDatosDocente}

      {/* Sección 1: Docencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 print:hidden" />
            1. Docencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1.0 Cursos — tabla detallada */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">
              1.0 Cursos Asignados ({agenda.cursos.length})
            </h4>
            {agenda.cursos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                      <th className="pb-2 pr-3">No. Curso</th>
                      <th className="pb-2 pr-3">Nombre</th>
                      <th className="pb-2 pr-3">Sede</th>
                      <th className="pb-2 pr-3 text-right">Hrs. Pres.</th>
                      <th className="pb-2 pr-3 text-right">Créditos</th>
                      <th className="pb-2 pr-3 text-right">Semanas</th>
                      <th className="pb-2 text-right">Dedicación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agenda.cursos.map((curso) => (
                      <tr
                        key={curso.id}
                        className="border-b last:border-0"
                      >
                        <td className="py-2 pr-3 font-medium">
                          {curso.numeroCurso}
                        </td>
                        <td className="py-2 pr-3">{curso.nombreCurso}</td>
                        <td className="py-2 pr-3">{curso.sede || "—"}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {curso.horasPresenciales}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {curso.creditos}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {curso.semanas}
                        </td>
                        <td className="py-2 text-right font-medium tabular-nums">
                          {curso.dedicacionPeriodo}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td colSpan={6} className="py-2 pr-3 text-right">
                        Subtotal Cursos:
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {subtotalCursos}h
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin cursos</p>
            )}
          </div>

          <Separator />

          {/* 1.2 Otras Actividades de Docencia */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">
              1.2 Otras Actividades de Docencia (
              {agenda.otrasActividadesDocencia.length})
            </h4>
            {agenda.otrasActividadesDocencia.length > 0 ? (
              <div className="space-y-1">
                {agenda.otrasActividadesDocencia.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-sm odd:bg-muted/50"
                  >
                    <div>
                      <span className="font-medium">{act.nombre}</span>
                      {act.sede && (
                        <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                          {act.sede}
                        </span>
                      )}
                      {act.descripcion && (
                        <span className="ml-2 text-muted-foreground">
                          — {act.descripcion}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {act.dedicacionPeriodo}h
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between border-t px-2 pt-1 text-sm font-semibold">
                  <span>Subtotal Otras Docencia</span>
                  <span className="tabular-nums">
                    {subtotalOtrasDocencia}h
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin actividades adicionales
              </p>
            )}
          </div>

          <div className="flex justify-between rounded-md bg-primary/5 px-3 py-2 text-sm font-bold">
            <span>TOTAL 1 — Docencia</span>
            <span className="tabular-nums">{totalDocencia}h</span>
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Investigación */}
      <SectionCard
        icon={<FlaskConical className="h-5 w-5 print:hidden" />}
        title="2. Investigación"
        actividades={agenda.actividadesInvestigacion}
        total={totalInvestigacion}
        totalLabel="TOTAL 2 — Investigación"
      />

      {/* Sección 3: Proyección Social */}
      <SectionCard
        icon={<Users className="h-5 w-5 print:hidden" />}
        title="3. Proyección Social"
        actividades={agenda.actividadesProyeccionSocial}
        total={totalProyeccion}
        totalLabel="TOTAL 3 — Proyección Social"
      />

      {/* Sección 4: Gestión (solo si tiene actividades) */}
      {agenda.actividadesGestion.length > 0 && (
        <SectionCard
          icon={<Building2 className="h-5 w-5 print:hidden" />}
          title="4. Gestión Académico-Administrativa"
          actividades={agenda.actividadesGestion}
          total={totalGestion}
          totalLabel="TOTAL 4 — Gestión"
        />
      )}

      {/* ==========================================
          GRAN TOTAL — Doble presentación legal
          Row 1: Dedicación Semestral (absoluta)
          Row 2: Equivalencia Promedio Semanal vs. maxHoras dinámico
          ========================================== */}
      <Card
        className={cn(
          "print:border print:border-gray-400 print:bg-gray-50",
          excedidoSemanal
            ? "border-destructive/50 bg-destructive/5"
            : "border-primary/30 bg-primary/5"
        )}
      >
        <CardContent className="py-6 space-y-4">
          {/* Row 1: Dedicación Semestral (absoluta) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 border-primary/20">
            <div>
              <h3 className="text-xl font-bold uppercase">Dedicación Semestral</h3>
              <p className="text-sm text-muted-foreground print:text-gray-500">
                Suma absoluta de todas las horas en el periodo
              </p>
            </div>
            <span className="text-3xl font-bold tabular-nums text-primary mt-2 sm:mt-0 print:text-black">
              {granTotal} horas
            </span>
          </div>

          {/* Row 2: Equivalencia Promedio Semanal vs límite legal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2">
            <div>
              <h3 className={cn(
                "text-lg font-bold",
                excedidoSemanal ? "text-destructive" : "text-muted-foreground"
              )}>
                Equivalencia Promedio Semanal
              </h3>
              <p className="text-sm text-muted-foreground print:text-gray-500">
                Límite máximo estricto por modalidad ({getModalidadLabel(docente.modalidad)}): <strong>{maxHoras} hrs/semana</strong>
              </p>
            </div>
            <span className={cn(
              "text-2xl font-bold tabular-nums mt-2 sm:mt-0 print:text-black",
              excedidoSemanal ? "text-destructive" : "text-green-600"
            )}>
              {promedioRedondeado} hrs/semana
            </span>
          </div>

          {/* Warning box when exceeded (read-only view — informational) */}
          {excedidoSemanal && (
            <div className="mt-2 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 print:hidden">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  ⚠️ Advertencia Legal
                </p>
                <p className="mt-1 text-sm text-destructive/80">
                  La carga promedio ({promedioRedondeado} hrs/sem) supera el
                  límite legal de {maxHoras} hrs/sem para la modalidad {getModalidadLabel(docente.modalidad)}.
                  Esta agenda requiere revisión administrativa.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}