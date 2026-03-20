"use client"

import type { AgendaConRelaciones } from "@/lib/types/agenda"
import {
  validateAgenda,
  getAgendaLimits,
  getAgendaTotals,
  formatModalidad,
  type ValidationItem,
  type AgendaLimits,
  type AgendaTotals,
} from "@/lib/validations/agenda-rules"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react"

function ProgressBar({
  value,
  max,
  label,
  sublabel,
}: {
  value: number
  max: number
  label: string
  sublabel?: string
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const over = value > max
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={over ? "text-destructive font-semibold" : "text-muted-foreground"}>
          {value}h / {max}h
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-2 rounded-full transition-all ${over ? "bg-destructive" : pct >= 100 ? "bg-green-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {sublabel && (
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  )
}

function ValidationMessage({ item }: { item: ValidationItem }) {
  const Icon =
    item.severity === "error"
      ? XCircle
      : item.severity === "warning"
        ? AlertTriangle
        : Info

  const colors =
    item.severity === "error"
      ? "text-destructive bg-destructive/10 border-destructive/20"
      : item.severity === "warning"
        ? "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800"
        : "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800"

  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${colors}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p>{item.message}</p>
        <p className="mt-0.5 text-xs opacity-70">{item.rule}</p>
      </div>
    </div>
  )
}

export function AgendaValidationPanel({
  agenda,
  compact = false,
}: {
  agenda: AgendaConRelaciones
  compact?: boolean
}) {
  const limits = getAgendaLimits(agenda.docente)
  const totals = getAgendaTotals(agenda)
  const validations = validateAgenda(agenda)

  const errors = validations.filter((v) => v.severity === "error")
  const warnings = validations.filter((v) => v.severity === "warning")

  if (compact) {
    return <CompactView limits={limits} totals={totals} errors={errors} warnings={warnings} modalidad={agenda.docente.modalidad} />
  }

  return <FullView limits={limits} totals={totals} validations={validations} errors={errors} modalidad={agenda.docente.modalidad} />
}

function CompactView({
  limits,
  totals,
  errors,
  warnings,
  modalidad,
}: {
  limits: AgendaLimits
  totals: AgendaTotals
  errors: ValidationItem[]
  warnings: ValidationItem[]
  modalidad: string
}) {
  const hasIssues = errors.length > 0 || warnings.length > 0

  if (!hasIssues) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          {totals.granTotal}h / {limits.horasTotalesPeriodo}h — Sin problemas detectados
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">
          {totals.granTotal}h / {limits.horasTotalesPeriodo}h ({formatModalidad(modalidad as never)})
        </span>
        {errors.length > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            {errors.length} error{errors.length > 1 ? "es" : ""}
          </span>
        )}
        {warnings.length > 0 && (
          <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {warnings.length} aviso{warnings.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      {errors.map((e, i) => (
        <ValidationMessage key={i} item={e} />
      ))}
    </div>
  )
}

function FullView({
  limits,
  totals,
  validations,
  errors,
  modalidad,
}: {
  limits: AgendaLimits
  totals: AgendaTotals
  validations: ValidationItem[]
  errors: ValidationItem[]
  modalidad: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Validación Acuerdo 048</span>
          {errors.length === 0 ? (
            <span className="flex items-center gap-1 text-sm font-normal text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Sin errores
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm font-normal text-destructive">
              <XCircle className="h-4 w-4" />
              {errors.length} error{errors.length > 1 ? "es" : ""}
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {formatModalidad(modalidad as never)} — {limits.maxHorasSemanales} hrs/semana — {limits.semanas} semanas
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bars */}
        <div className="space-y-3">
          <ProgressBar
            value={totals.granTotal}
            max={limits.horasTotalesPeriodo}
            label="Total Periodo"
          />
          {limits.minDocencia > 0 && (
            <ProgressBar
              value={totals.totalDocencia}
              max={limits.minDocencia}
              label="Docencia (mínimo)"
              sublabel={`Cursos: ${totals.horasDocenciaCursos}h + Otras: ${totals.horasOtrasDocencia}h`}
            />
          )}
          {limits.maxGestion < limits.horasTotalesPeriodo && (
            <ProgressBar
              value={totals.horasGestion}
              max={limits.maxGestion}
              label="Gestión (máx 20%)"
            />
          )}
          {limits.maxInvProySocialCatedra !== null && (
            <ProgressBar
              value={totals.horasInvestigacion + totals.horasProyeccionSocial}
              max={limits.maxInvProySocialCatedra}
              label="Inv. + Proy. Social (máx cátedra)"
            />
          )}
        </div>

        {/* Validation messages */}
        {validations.length > 0 && (
          <div className="space-y-2">
            {validations.map((item, i) => (
              <ValidationMessage key={i} item={item} />
            ))}
          </div>
        )}

        {validations.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Todos los criterios del Acuerdo 048 se cumplen.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Helper: returns true if the agenda has validation errors (not just warnings) */
export function agendaHasErrors(agenda: AgendaConRelaciones): boolean {
  return validateAgenda(agenda).some((v) => v.severity === "error")
}
