"use client"

import { useWatch } from "react-hook-form"
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
  XCircle,
  CheckCircle2,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getSedeLabel } from "@/lib/utils/sede"

/**
 * Estado semántico de un indicador de validación.
 *
 * Regla de oro contra la "trampa del cero": un indicador SOLO puede ganarse
 * el verde (success) o el rojo (error) cuando hay interacción real (valor > 0).
 * Con 0 horas el estado es siempre `neutral` (informativo, sin juicios).
 */
type EstadoIndicador = "neutral" | "success" | "error"

/** Piso (Art. 3): el valor debe ALCANZAR el mínimo. 0 = aún sin empezar. */
function estadoMinimo(valor: number, minimo: number): EstadoIndicador {
  if (valor <= 0) return "neutral"
  return valor >= minimo ? "success" : "error"
}

/** Techo (Art. 4/10/3 Par. 2): el valor NO debe EXCEDER el tope. 0 = aún sin empezar. */
function estadoTope(valor: number, tope: number): EstadoIndicador {
  if (valor <= 0) return "neutral"
  return valor > tope ? "error" : "success"
}

const ESTILO_INDICADOR: Record<
  EstadoIndicador,
  { className: string; Icon: typeof CheckCircle2 }
> = {
  neutral: {
    className: "border-muted bg-muted/40 text-muted-foreground",
    Icon: Info,
  },
  success: {
    className:
      "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
    Icon: CheckCircle2,
  },
  error: {
    className: "border-destructive/40 bg-destructive/5 text-destructive",
    Icon: XCircle,
  },
}

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
  horasTotalesPeriodo,
  maxGestion,
  minDocencia,
  excluyeTopeGestion20,
  maxInvProySocialCatedra,
}: {
  docente: Docente
  horasTotalesPeriodo: number
  maxGestion: number
  minDocencia: number
  excluyeTopeGestion20: boolean
  maxInvProySocialCatedra: number | null
}) {
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
  // horasTotalesPeriodo viene del servidor (resolver DB → fallback 40×sem)
  // =========================================================
  const horasSemestrales = horasTotalesPeriodo
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
                {getSedeLabel(docente.sedeBase)}
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

          {/* Requisito 1: Mínimo de docencia (Art. 3) — piso */}
          {minDocencia > 0 && (() => {
            const estado = estadoMinimo(totalDocencia, minDocencia)
            const { className, Icon } = ESTILO_INDICADOR[estado]
            const diff = Math.round(Math.abs(minDocencia - totalDocencia) * 10) / 10
            return (
              <div className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                className
              )}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    {estado === "neutral"
                      ? `Docencia mínima: mínimo legal de ${minDocencia}h (Art. 3)`
                      : `Docencia mínima: ${totalDocencia}h de ${minDocencia}h requeridas`}
                  </p>
                  <p className="mt-0.5 text-xs opacity-75">
                    {estado === "neutral"
                      ? "Aún sin horas de docencia. Registra tus cursos en el Paso 2 para evaluar este requisito."
                      : estado === "success"
                        ? `${diff}h por encima del mínimo legal (Art. 3).`
                        : `Faltan ${diff}h para alcanzar el mínimo legal (Art. 3). Regrese al Paso 2 y complete las horas de docencia.`}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Requisito 2: Tope máximo (Art. 4) — techo, solo informativo hacia arriba */}
          {(() => {
            const estado = estadoTope(granTotal, horasSemestrales)
            const { className, Icon } = ESTILO_INDICADOR[estado]
            const margen = horasSemestrales - granTotal
            return (
              <div className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                className
              )}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    {estado === "neutral"
                      ? `Tope contractual: máximo de ${horasSemestrales}h (Art. 4)`
                      : `Tope contractual: ${granTotal}h de ${horasSemestrales}h máximas`}
                  </p>
                  <p className="mt-0.5 text-xs opacity-75">
                    {estado === "neutral"
                      ? `Aún sin actividades registradas. Este valor es el máximo de su contratación, no un requisito de cumplimiento obligatorio (Art. 4).`
                      : estado === "success"
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
            // Caso A: cargo exento del Art. 11 → es un ESTADO informativo, no una
            // validación de aprobado/reprobado. Siempre neutro (nunca check verde).
            if (excluyeTopeGestion20) {
              const { className, Icon } = ESTILO_INDICADOR.neutral
              return (
                <div className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-sm",
                  className
                )}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">
                      {totalGestion > 0
                        ? `Gestión Académica: ${totalGestion}h registradas — exento del tope del 20%`
                        : `Gestión Académica: exento del tope del 20%`}
                    </p>
                    <p className="mt-0.5 text-xs opacity-75">
                      Su cargo se rige por los tiempos del Art. 11 del Acuerdo 048 y está exento del límite del 20% de gestión (Art. 10).
                    </p>
                  </div>
                </div>
              )
            }
            // Caso B: cargo NO exento → techo del servidor (ParametroGlobal).
            const limiteGestionSemestral = maxGestion
            const estado = estadoTope(totalGestion, limiteGestionSemestral)
            const { className, Icon } = ESTILO_INDICADOR[estado]
            const diff = Math.round(Math.abs(limiteGestionSemestral - totalGestion) * 10) / 10
            return (
              <div className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                className
              )}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    {estado === "neutral"
                      ? `Gestión Académica: límite del 20% = ${limiteGestionSemestral}h (Art. 10)`
                      : `Gestión Académica: ${totalGestion}h de ${limiteGestionSemestral}h permitidas (20%)`}
                  </p>
                  <p className="mt-0.5 text-xs opacity-75">
                    {estado === "neutral"
                      ? `Aún sin actividades de gestión. Límite disponible: ${limiteGestionSemestral}h (Art. 10).`
                      : estado === "success"
                        ? `${diff}h de margen disponible sobre el límite del 20% (Art. 10).`
                        : `Excede en ${diff}h el límite del 20% de gestión. Regrese al Paso 4 y reduzca las actividades administrativas (Art. 10).`}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Requisito 4: Tope Inv + Proyección Social para cátedras (Art. 3 Par. 2) — techo */}
          {maxInvProySocialCatedra !== null && (() => {
            const invPS = totalInvestigacion + totalProyeccion
            const estado = estadoTope(invPS, maxInvProySocialCatedra)
            const { className, Icon } = ESTILO_INDICADOR[estado]
            const diff = Math.round(Math.abs(maxInvProySocialCatedra - invPS) * 10) / 10
            return (
              <div className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                className
              )}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    {estado === "neutral"
                      ? `Tope de Cátedra (Investigación y Proyección social): máximo ${maxInvProySocialCatedra}h`
                      : `Tope de Cátedra (Investigación y Proyección social): ${invPS}h asignadas de ${maxInvProySocialCatedra}h máximas`}
                  </p>
                  <p className="mt-0.5 text-xs opacity-75">
                    {estado === "neutral"
                      ? `Aún sin horas de investigación o proyección. Tiene ${maxInvProySocialCatedra}h de margen si desea agregar actividades (Art. 3 Par. 2).`
                      : estado === "error"
                        ? `⚠️ Límite superado por ${diff}h. Reduzca sus actividades en el Paso 3 para poder enviar la agenda (Art. 3 Par. 2).`
                        : invPS === maxInvProySocialCatedra
                          ? `Límite exacto alcanzado. Cumple con el tope normativo (Art. 3 Par. 2).`
                          : `Tiene ${diff}h de margen si desea registrar más actividades (Art. 3 Par. 2).`}
                  </p>
                </div>
              </div>
            )
          })()}

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
