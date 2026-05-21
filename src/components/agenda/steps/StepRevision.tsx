"use client"

import { useFormContext, useWatch } from "react-hook-form"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import type { Docente } from "@/generated/prisma/client"
import { getModalidadLabel, getModalidadLabelLargo } from "@/lib/utils/modalidad"
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
  CheckCircle2,
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
  semanasPeriodo,
  minDocencia,
  excluyeTopeGestion20,
}: {
  docente: Docente
  maxHoras: number
  esEstricto: boolean
  semanasPeriodo: number
  minDocencia: number
  excluyeTopeGestion20: boolean
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
  // Comparación Semestral — granTotal vs límite legal del periodo
  // =========================================================
  const horasSemestrales = maxHoras * semanasPeriodo
  const excedidoSemestral = granTotal > horasSemestrales
  const porcentajeUso = horasSemestrales > 0 ? Math.round((granTotal / horasSemestrales) * 100) : 0

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
                {getModalidadLabel(docente.modalidad)}
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
          GRAN TOTAL — Comparación con la carga semestral del contrato
          ========================================== */}
      <Card
        className={cn(
          "print:border print:border-gray-400 print:bg-gray-50",
          excedidoSemestral
            ? "border-destructive/50 bg-destructive/5"
            : "border-primary/30 bg-primary/5"
        )}
      >
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h3 className="text-xl font-bold uppercase">Dedicación del Semestre</h3>
              <p className="text-sm text-muted-foreground print:text-gray-500">
                <strong>{getModalidadLabelLargo(docente.modalidad)}</strong>: tope máximo de <strong>{horasSemestrales} horas</strong>
              </p>
            </div>
            <div className="mt-2 sm:mt-0 text-right">
              <p className={cn(
                "text-3xl font-bold tabular-nums print:text-black",
                excedidoSemestral ? "text-destructive" : "text-primary"
              )}>
                {granTotal} / {horasSemestrales}h
              </p>
              <p className="text-xs text-muted-foreground print:text-gray-500">
                {porcentajeUso}% del tope contractual
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==========================================
          PANEL DE VALIDACIÓN DE REQUISITOS (Acuerdo 048)
          ========================================== */}
      <Card>
        <CardContent className="py-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Validación de Requisitos — Acuerdo 048
          </p>

          {/* Requisito 1: Mínimo de docencia (Art. 3) */}
          {minDocencia > 0 && (() => {
            const cumple = totalDocencia >= minDocencia
            const diff = Math.round(Math.abs(minDocencia - totalDocencia) * 10) / 10
            return (
              <div className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                cumple
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              )}>
                {cumple
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div>
                  <p className="font-medium">
                    Docencia mínima: {totalDocencia}h de {minDocencia}h requeridas
                  </p>
                  <p className="mt-0.5 text-xs opacity-75">
                    {cumple
                      ? `${diff}h por encima del mínimo legal (Art. 3).`
                      : `Faltan ${diff}h para alcanzar el mínimo legal (Art. 3). Regrese al Paso 2 y complete las horas de docencia.`}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Requisito 2: Tope máximo (Art. 4) — solo informativo hacia arriba */}
          {(() => {
            const margen = horasSemestrales - granTotal
            return (
              <div className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                excedidoSemestral
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
              )}>
                {!excedidoSemestral
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div>
                  <p className="font-medium">
                    Tope contractual: {granTotal}h de {horasSemestrales}h máximas
                  </p>
                  <p className="mt-0.5 text-xs opacity-75">
                    {!excedidoSemestral
                      ? `${margen}h de margen disponible. Este valor representa el valor máximo de su contratación, no un requisito de cumplimiento obligatorio (Art. 4).`
                      : `Excede el tope en ${Math.abs(margen)}h. Debe reducir actividades para poder enviar (Art. 4).`}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Requisito 3: Gestión (Art. 10) — solo si el docente tiene cargo administrativo.
              Los cargos exentos (Jefe de Programa/Departamento, Asesor de Vicerrectoría/
              Rectoría, Decano) se rigen por el Art. 11 y no tienen tope porcentual. */}
          {docente.cargoAdministrativo && (() => {
            // Caso A: cargo exento del Art. 11 → sin tope porcentual.
            if (excluyeTopeGestion20) {
              return (
                <div className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-sm",
                  "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                )}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">
                      Gestión Académica: {totalGestion}h registradas — sin tope porcentual
                    </p>
                    <p className="mt-0.5 text-xs opacity-75">
                      Su cargo se rige por los tiempos del Art. 11 del Acuerdo 048 y está exento del límite del 20% de gestión (Art. 10).
                    </p>
                  </div>
                </div>
              )
            }
            // Caso B: cargo NO exento → aplica el 20%.
            const limiteGestionSemestral = Math.floor(maxHoras * semanasPeriodo * 0.20)
            const excedeGestion = totalGestion > limiteGestionSemestral
            const diff = Math.round(Math.abs(limiteGestionSemestral - totalGestion) * 10) / 10
            return (
              <div className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                excedeGestion
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
              )}>
                {!excedeGestion
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div>
                  <p className="font-medium">
                    Gestión Académica: {totalGestion}h de {limiteGestionSemestral}h permitidas (20%)
                  </p>
                  <p className="mt-0.5 text-xs opacity-75">
                    {!excedeGestion
                      ? totalGestion === 0
                        ? `Sin actividades de gestión registradas. Límite disponible: ${limiteGestionSemestral}h (Art. 10).`
                        : `${diff}h de margen disponible sobre el límite del 20% (Art. 10).`
                      : `Excede en ${diff}h el límite del 20% de gestión. Regrese al Paso 4 y reduzca las actividades administrativas (Art. 10).`}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Errores Zod del formulario (visibles solo tras intento de envío) */}
          {(errors as Record<string, any>)._minDocenciaInsuficiente && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Mínimo de Docencia No Cumplido
                </p>
                <p className="mt-1 text-sm text-destructive/80">
                  {String((errors as Record<string, any>)._minDocenciaInsuficiente.message)}
                </p>
              </div>
            </div>
          )}

          {(errors as Record<string, any>)._horasExcedidas && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Tope Contractual Excedido
                </p>
                <p className="mt-1 text-sm text-destructive/80">
                  {String((errors as Record<string, any>)._horasExcedidas.message)}
                </p>
              </div>
            </div>
          )}

          {/* Nota informativa sutil para docentes con doctorado (Art. 4 Par. 3).
              No bloquea el envío — el jefe de programa revisará en monitoreo. */}
          {docente.doctorado && (
            <div className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
              <p className="leading-relaxed">
                Su perfil registra título de <span className="font-medium text-foreground/80">Doctorado</span>.
                El Art. 4, Par. 3 del Acuerdo 048 establece que los docentes con doctorado deben estar vinculados a un
                grupo de investigación avalado. Si participa de alguno, recuerde registrar las horas correspondientes
                en la Sección 2.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
