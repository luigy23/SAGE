"use client"

import { useFormContext, useWatch } from "react-hook-form"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import type { Docente } from "@/generated/prisma/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  FlaskConical,
  Users,
  Building2,
  GraduationCap,
  AlertTriangle,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Paso 5 — Revisión y Resumen
 *
 * Muestra un resumen de todos los arrays del formulario con subtotales
 * y un GRAN TOTAL con doble presentación:
 * - Row 1: Dedicación Semestral (total absoluto en horas del periodo)
 * - Row 2: Equivalencia Promedio Semanal vs. límite legal de la modalidad
 *
 * El botón de envío vive en el AgendaWizardForm (orquestador)
 * porque necesita manejar el estado de submit y la lógica de disabled.
 *
 * Usa useWatch() para leer los datos en tiempo real del formulario.
 */
export function StepRevision({
  docente,
  maxHoras,
  esEstricto,
}: {
  docente: Docente
  maxHoras: number
  esEstricto: boolean
}) {
  // Observar el estado del formulario globalmente
  const { formState: { errors } } = useFormContext<AgendaWizardFormData>()

  // Observar todos los arrays del formulario
  const cursos = useWatch<AgendaWizardFormData, "cursos">({ name: "cursos" }) || []
  const otrasDocencia = useWatch<AgendaWizardFormData, "otrasActividadesDocencia">({ name: "otrasActividadesDocencia" }) || []
  const investigacion = useWatch<AgendaWizardFormData, "actividadesInvestigacion">({ name: "actividadesInvestigacion" }) || []
  const proyeccion = useWatch<AgendaWizardFormData, "actividadesProyeccionSocial">({ name: "actividadesProyeccionSocial" }) || []
  const gestion = useWatch<AgendaWizardFormData, "actividadesGestion">({ name: "actividadesGestion" }) || []

  // Calcular subtotales (horas semestrales)
  const sum = (items: { dedicacionPeriodo?: number }[]) =>
    items.reduce((acc, i) => acc + (Number(i?.dedicacionPeriodo) || 0), 0)

  const subtotalCursos = sum(cursos)
  const subtotalOtrasDocencia = sum(otrasDocencia)
  const totalDocencia = subtotalCursos + subtotalOtrasDocencia
  const totalInvestigacion = sum(investigacion)
  const totalProyeccion = sum(proyeccion)
  const totalGestion = sum(gestion)
  const granTotal = totalDocencia + totalInvestigacion + totalProyeccion + totalGestion

  // =========================================================
  // Equivalencia Promedio Semanal — compara contra maxHoras
  // =========================================================
  const SEMANAS_REFERENCIA = 22
  const promedioSemanal = granTotal / SEMANAS_REFERENCIA
  const promedioRedondeado = Math.round(promedioSemanal * 10) / 10
  const excedidoSemanal = promedioSemanal > maxHoras

  return (
    <div className="space-y-6">
      {/* Información del docente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Datos del Docente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Nombre: </span>
              <span className="font-medium">{docente.nombre}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cédula: </span>
              <span className="font-medium">{docente.cedula}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Facultad: </span>
              <span className="font-medium">{docente.facultad}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Programa: </span>
              <span className="font-medium">{docente.programa}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Modalidad: </span>
              <Badge variant="secondary" className="ml-1">
                {docente.modalidad}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Sede: </span>
              <Badge variant="secondary" className="ml-1">
                {docente.sedeBase}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 1: Docencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            1. Docencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 1.0 Cursos */}
          <div>
            <h4 className="mb-2 text-sm font-semibold">
              1.0 Cursos ({cursos.length})
            </h4>
            {cursos.length > 0 ? (
              <div className="space-y-1">
                {cursos.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm odd:bg-muted/50"
                  >
                    <span>
                      {c?.numeroCurso || "—"} — {c?.nombreCurso || "Sin nombre"}
                      {c?.subgrupo ? ` (${c.subgrupo})` : ""}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {Number(c?.dedicacionPeriodo) || 0}h
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between border-t px-2 pt-1 text-sm font-medium">
                  <span>Subtotal Cursos</span>
                  <span className="tabular-nums">{subtotalCursos}h</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin cursos</p>
            )}
          </div>

          <Separator />

          {/* 1.2 Otras Actividades de Docencia */}
          <div>
            <h4 className="mb-2 text-sm font-semibold">
              1.2 Otras Actividades ({otrasDocencia.length})
            </h4>
            {otrasDocencia.length > 0 ? (
              <div className="space-y-1">
                {otrasDocencia.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm odd:bg-muted/50"
                  >
                    <span>{a?.nombre || "Sin nombre"}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {Number(a?.dedicacionPeriodo) || 0}h
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between border-t px-2 pt-1 text-sm font-medium">
                  <span>Subtotal Otras Docencia</span>
                  <span className="tabular-nums">{subtotalOtrasDocencia}h</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin actividades</p>
            )}
          </div>

          <div className="flex justify-between rounded-md bg-primary/5 px-3 py-2 text-sm font-bold">
            <span>TOTAL 1 — Docencia</span>
            <span className="tabular-nums">{totalDocencia}h</span>
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Investigación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            2. Investigación ({investigacion.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {investigacion.length > 0 ? (
            <div className="space-y-1">
              {investigacion.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded px-2 py-1 text-sm odd:bg-muted/50"
                >
                  <span>{a?.nombre || "Sin nombre"}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {Number(a?.dedicacionPeriodo) || 0}h
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin actividades</p>
          )}
          <div className="mt-2 flex justify-between rounded-md bg-primary/5 px-3 py-2 text-sm font-bold">
            <span>TOTAL 2 — Investigación</span>
            <span className="tabular-nums">{totalInvestigacion}h</span>
          </div>
        </CardContent>
      </Card>

      {/* Sección 3: Proyección Social */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            3. Proyección Social ({proyeccion.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proyeccion.length > 0 ? (
            <div className="space-y-1">
              {proyeccion.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded px-2 py-1 text-sm odd:bg-muted/50"
                >
                  <span>{a?.nombre || "Sin nombre"}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {Number(a?.dedicacionPeriodo) || 0}h
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin actividades</p>
          )}
          <div className="mt-2 flex justify-between rounded-md bg-primary/5 px-3 py-2 text-sm font-bold">
            <span>TOTAL 3 — Proyección Social</span>
            <span className="tabular-nums">{totalProyeccion}h</span>
          </div>
        </CardContent>
      </Card>

      {/* Sección 4: Gestión (solo si tiene cargoAdministrativo) */}
      {docente.cargoAdministrativo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              4. Gestión ({gestion.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gestion.length > 0 ? (
              <div className="space-y-1">
                {gestion.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm odd:bg-muted/50"
                  >
                    <span>{a?.nombre || "Sin nombre"}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {Number(a?.dedicacionPeriodo) || 0}h
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin actividades</p>
            )}
            <div className="mt-2 flex justify-between rounded-md bg-primary/5 px-3 py-2 text-sm font-bold">
              <span>TOTAL 4 — Gestión</span>
              <span className="tabular-nums">{totalGestion}h</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==========================================
          GRAN TOTAL — Doble presentación legal
          Row 1: Dedicación Semestral (absoluta)
          Row 2: Equivalencia Promedio Semanal vs. maxHoras
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
                (errors as Record<string, any>)._horasExcedidas ? "text-destructive" : "text-muted-foreground"
              )}>
                Equivalencia Promedio Semanal
              </h3>
              <p className="text-sm text-muted-foreground print:text-gray-500">
                Modalidad ({docente.modalidad}): <strong>{maxHoras} hrs/semana</strong>
              </p>
            </div>
            <span className={cn(
              "text-2xl font-bold tabular-nums mt-2 sm:mt-0 print:text-black",
              (errors as Record<string, any>)._horasExcedidas ? "text-destructive" : "text-green-600"
            )}>
              {promedioRedondeado} hrs/semana
            </span>
          </div>

          {/* Clean Validation Hook Alert directly tied to Zod tolerances */}
          {(errors as Record<string, any>)._horasExcedidas && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Validación Contractual Estricta
                </p>
                <p className="mt-1 text-sm text-destructive/80">
                  {String((errors as Record<string, any>)._horasExcedidas.message)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
