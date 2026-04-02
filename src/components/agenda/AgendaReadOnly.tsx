"use client"

import type { AgendaConRelaciones } from "@/lib/types/agenda"
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
  Clock,
} from "lucide-react"

// ==========================================
// Helper: etiquetas de días para horarios
// ==========================================

const DIAS_LABELS: Record<string, string> = {
  lunes: "Lun",
  martes: "Mar",
  miercoles: "Mié",
  jueves: "Jue",
  viernes: "Vie",
  sabado: "Sáb",
  domingo: "Dom",
}

// ==========================================
// Sub-componente reutilizable: Sección de actividades
// ==========================================

interface ActividadItem {
  id: string
  nombre: string
  descripcion: string | null
  dedicacionPeriodo: number
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

/**
 * AgendaReadOnly — Vista estrictamente estática de una agenda en estado ENVIADO.
 *
 * Características:
 * - CERO inputs, CERO botones de edición, CERO validaciones de formulario
 * - Reutiliza diseño de tarjetas (Card de Shadcn UI) del StepRevision
 * - Botón "Descargar PDF / Imprimir" que ejecuta window.print()
 * - Clases print:hidden en elementos no aptos para impresión
 * - Tabla detallada para cursos con horarios inline
 */
export function AgendaReadOnly({
  agenda,
}: {
  agenda: AgendaConRelaciones
}) {
  const { docente } = agenda

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
  // Render
  // ==========================================

  return (
    <div className="space-y-6">
      {/* ==========================================
          Header: Título, estado y botón de impresión
          ========================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Agenda Semestral — {agenda.periodo}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enviada el{" "}
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
            className="gap-1.5 bg-green-600 px-3 py-1.5 text-sm hover:bg-green-600"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            ENVIADO
          </Badge>
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="gap-2 print:hidden"
          >
            <Printer className="h-4 w-4" />
            Descargar PDF / Imprimir
          </Button>
        </div>
      </div>

      {/* Badge visible solo en impresión */}
      <div className="hidden print:block print:text-right">
        <span className="text-sm font-semibold">Estado: ENVIADO ✓</span>
      </div>

      {/* Aviso de solo lectura */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950 print:border print:border-gray-300 print:bg-white">
        <p className="text-sm font-medium text-green-700 dark:text-green-300 print:text-black">
          ✅ Esta agenda ha sido enviada y se encuentra en estado de solo
          lectura. No puede ser modificada.
        </p>
      </div>

      {/* ==========================================
          Datos del Docente
          ========================================== */}
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
              <dd className="text-sm font-medium">{docente.modalidad}</dd>
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

      {/* ==========================================
          Sección 1: Docencia
          ========================================== */}
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
                      <th className="pb-2 pr-3">Subgrupo</th>
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
                        <td className="py-2 pr-3">
                          {curso.subgrupo || "—"}
                        </td>
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
                      <td colSpan={7} className="py-2 pr-3 text-right">
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

            {/* Horarios por curso */}
            {agenda.cursos.map((curso) => {
              const horario = curso.horarios[0]
              if (!horario) return null

              const diasConHorario = Object.entries(DIAS_LABELS)
                .map(([key, label]) => ({
                  label,
                  value: (horario as Record<string, string | null>)[key],
                }))
                .filter((d) => d.value)

              if (diasConHorario.length === 0) return null

              return (
                <div
                  key={`horario-${curso.id}`}
                  className="ml-4 mt-2 rounded border-l-2 border-primary/30 pl-3"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    <Clock className="mr-1 inline h-3 w-3" />
                    Horario de {curso.numeroCurso} — {curso.nombreCurso}:
                  </p>
                  <p className="mt-1 text-xs">
                    {diasConHorario
                      .map((d) => `${d.label}: ${d.value}`)
                      .join(" · ")}
                  </p>
                </div>
              )
            })}
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

      {/* ==========================================
          Sección 2: Investigación
          ========================================== */}
      <SectionCard
        icon={<FlaskConical className="h-5 w-5 print:hidden" />}
        title="2. Investigación"
        actividades={agenda.actividadesInvestigacion}
        total={totalInvestigacion}
        totalLabel="TOTAL 2 — Investigación"
      />

      {/* ==========================================
          Sección 3: Proyección Social
          ========================================== */}
      <SectionCard
        icon={<Users className="h-5 w-5 print:hidden" />}
        title="3. Proyección Social"
        actividades={agenda.actividadesProyeccionSocial}
        total={totalProyeccion}
        totalLabel="TOTAL 3 — Proyección Social"
      />

      {/* ==========================================
          Sección 4: Gestión (solo si tiene actividades)
          ========================================== */}
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
          Gran Total
          ========================================== */}
      <Card className="border-primary/30 bg-primary/5 print:border print:border-gray-400 print:bg-gray-50">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">GRAN TOTAL</h3>
              <p className="text-sm text-muted-foreground print:text-gray-500">
                Suma de todas las secciones
              </p>
            </div>
            <span className="text-3xl font-bold tabular-nums text-primary print:text-black">
              {granTotal}h
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
