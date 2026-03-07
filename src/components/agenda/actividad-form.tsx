"use client"

import { useActionState, useEffect, useRef } from "react"
import {
  createActividadAction,
  updateActividadAction,
} from "@/lib/actions/agenda"
import type { TipoActividad } from "@/lib/types/agenda"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ActionResult = { error: string } | { success: boolean } | null

interface ActividadData {
  id: string
  nombre: string
  descripcion: string | null
  dedicacionPeriodo: number
}

export function ActividadForm({
  agendaId,
  tipo,
  actividad,
  onClose,
}: {
  agendaId: string
  tipo: TipoActividad
  actividad?: ActividadData
  onClose: () => void
}) {
  const [createState, createAction, createPending] = useActionState(
    createActividadAction as (state: ActionResult, payload: FormData) => Promise<ActionResult>,
    null as ActionResult
  )
  const [updateState, updateAction, updatePending] = useActionState(
    updateActividadAction as (state: ActionResult, payload: FormData) => Promise<ActionResult>,
    null as ActionResult
  )

  const state = actividad ? updateState : createState
  const formAction = actividad ? updateAction : createAction
  const pending = actividad ? updatePending : createPending
  const prevState = useRef(state)

  useEffect(() => {
    if (state !== prevState.current && state && "success" in state && state.success) {
      onClose()
    }
    prevState.current = state
  }, [state, onClose])

  return (
    <form action={formAction} className="space-y-4">
      {actividad && <input type="hidden" name="id" value={actividad.id} />}
      <input type="hidden" name="agendaId" value={agendaId} />
      <input type="hidden" name="tipo" value={tipo} />

      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          name="nombre"
          defaultValue={actividad?.nombre ?? ""}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripcion</Label>
        <Textarea
          id="descripcion"
          name="descripcion"
          defaultValue={actividad?.descripcion ?? ""}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dedicacionPeriodo">Dedicacion Periodo (horas)</Label>
        <Input
          id="dedicacionPeriodo"
          name="dedicacionPeriodo"
          type="number"
          min={0}
          step="0.5"
          defaultValue={actividad?.dedicacionPeriodo ?? 0}
        />
      </div>

      {state && "error" in state && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : actividad ? "Actualizar" : "Agregar"}
        </Button>
      </div>
    </form>
  )
}
