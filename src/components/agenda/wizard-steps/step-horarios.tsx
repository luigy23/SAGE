"use client"

import { startTransition, useActionState, useState } from "react"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import { upsertHorarioAction } from "@/lib/actions/agenda"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const DIAS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miercoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sabado" },
  { key: "domingo", label: "Domingo" },
] as const

// Convierte "8:00" a "08:00" para el input type="time"
function toTimeInput(val: string): string {
  if (!val) return ""
  const [h, m] = val.split(":")
  return `${h.padStart(2, "0")}:${(m || "00").padStart(2, "0")}`
}

// Convierte "08:00" del input a "8:00" para guardar
function fromTimeInput(val: string): string {
  if (!val) return ""
  const [h, m] = val.split(":")
  return `${parseInt(h, 10)}:${m}`
}

function parseRange(value: string | null): { inicio: string; fin: string } {
  if (!value) return { inicio: "", fin: "" }
  const parts = value.split("-")
  return {
    inicio: toTimeInput(parts[0]?.trim() || ""),
    fin: toTimeInput(parts[1]?.trim() || ""),
  }
}

function TimePicker({
  dia,
  defaultValue,
  disabled,
  onChange,
}: {
  dia: { key: string; label: string }
  defaultValue: string | null
  disabled: boolean
  onChange: (key: string, value: string | null) => void
}) {
  const parsed = parseRange(defaultValue)
  const [inicio, setInicio] = useState(parsed.inicio)
  const [fin, setFin] = useState(parsed.fin)

  function update(newInicio: string, newFin: string) {
    setInicio(newInicio)
    setFin(newFin)
    if (newInicio && newFin) {
      onChange(dia.key, `${fromTimeInput(newInicio)}-${fromTimeInput(newFin)}`)
    } else {
      onChange(dia.key, null)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{dia.label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="time"
          value={inicio}
          onChange={(e) => update(e.target.value, fin)}
          disabled={disabled}
          className="h-9 w-[110px] rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        <span className="text-xs text-muted-foreground">a</span>
        <input
          type="time"
          value={fin}
          min={inicio || undefined}
          onChange={(e) => update(inicio, e.target.value)}
          disabled={disabled || !inicio}
          className="h-9 w-[110px] rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
      </div>
    </div>
  )
}

function HorarioForm({
  cursoId,
  cursoLabel,
  horario,
  readOnly,
}: {
  cursoId: string
  cursoLabel: string
  horario: Record<string, string | null>
  readOnly: boolean
}) {
  const [state, formAction, pending] = useActionState(upsertHorarioAction, null)
  const [values, setValues] = useState<Record<string, string | null>>(horario)

  function handleDiaChange(key: string, value: string | null) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    const formData = new FormData()
    formData.set("cursoId", cursoId)
    for (const dia of DIAS) {
      formData.set(dia.key, values[dia.key] ?? "")
    }
    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <div className="rounded-lg border p-4">
      <h4 className="mb-3 font-medium">{cursoLabel}</h4>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DIAS.map((dia) => (
          <TimePicker
            key={dia.key}
            dia={dia}
            defaultValue={horario[dia.key]}
            disabled={readOnly}
            onChange={handleDiaChange}
          />
        ))}
      </div>
      {!readOnly && (
        <div className="mt-4 flex items-center gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={handleSubmit}>
            {pending ? "Guardando..." : "Guardar Horario"}
          </Button>
          {state && "error" in state && state.error && (
            <span className="text-sm text-destructive">{state.error}</span>
          )}
          {state && "success" in state && (
            <span className="text-sm text-green-600">Guardado</span>
          )}
        </div>
      )}
    </div>
  )
}

export function StepHorarios({
  agenda,
  readOnly,
}: {
  agenda: AgendaConRelaciones
  readOnly: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>1.1 Horarios de Clase</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {agenda.cursos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Primero agrega cursos en el paso anterior.
          </p>
        ) : (
          agenda.cursos.map((curso) => {
            const horario = curso.horarios[0] ?? {}
            const h = horario as Record<string, string | null>
            const horarioData = {
              lunes: h.lunes ?? null,
              martes: h.martes ?? null,
              miercoles: h.miercoles ?? null,
              jueves: h.jueves ?? null,
              viernes: h.viernes ?? null,
              sabado: h.sabado ?? null,
              domingo: h.domingo ?? null,
            }
            // Use horario id (or "new") in key to force remount when data is loaded/saved
            const horarioKey = `${curso.id}-${(horario as { id?: string }).id ?? "new"}`
            return (
              <HorarioForm
                key={horarioKey}
                cursoId={curso.id}
                cursoLabel={`${curso.numeroCurso} — ${curso.nombreCurso}`}
                horario={horarioData}
                readOnly={readOnly}
              />
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
