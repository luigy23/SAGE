"use client"

import { useActionState, useEffect, useRef } from "react"
import type { CursoAgenda } from "@/generated/prisma/client"
import {
  createCursoAgendaAction,
  updateCursoAgendaAction,
} from "@/lib/actions/agenda"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ActionResult = { error: string } | { success: boolean } | null

export function CursoAgendaForm({
  agendaId,
  curso,
  onClose,
}: {
  agendaId: string
  curso?: CursoAgenda
  onClose: () => void
}) {
  const [createState, createAction, createPending] = useActionState(
    createCursoAgendaAction as (state: ActionResult, payload: FormData) => Promise<ActionResult>,
    null as ActionResult
  )
  const [updateState, updateAction, updatePending] = useActionState(
    updateCursoAgendaAction as (state: ActionResult, payload: FormData) => Promise<ActionResult>,
    null as ActionResult
  )

  const state = curso ? updateState : createState
  const formAction = curso ? updateAction : createAction
  const pending = curso ? updatePending : createPending
  const prevState = useRef(state)

  useEffect(() => {
    if (state !== prevState.current && state && "success" in state && state.success) {
      onClose()
    }
    prevState.current = state
  }, [state, onClose])

  return (
    <form action={formAction} className="space-y-4">
      {curso && <input type="hidden" name="id" value={curso.id} />}
      <input type="hidden" name="agendaId" value={agendaId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="numeroCurso">Numero del Curso</Label>
          <Input
            id="numeroCurso"
            name="numeroCurso"
            defaultValue={curso?.numeroCurso ?? ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nombreCurso">Nombre del Curso</Label>
          <Input
            id="nombreCurso"
            name="nombreCurso"
            defaultValue={curso?.nombreCurso ?? ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subgrupo">Subgrupo</Label>
          <Input
            id="subgrupo"
            name="subgrupo"
            defaultValue={curso?.subgrupo ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sede">Sede</Label>
          <Input
            id="sede"
            name="sede"
            defaultValue={curso?.sede ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horasPresenciales">Horas Presenciales</Label>
          <Input
            id="horasPresenciales"
            name="horasPresenciales"
            type="number"
            min={0}
            defaultValue={curso?.horasPresenciales ?? 0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="creditos">Creditos</Label>
          <Input
            id="creditos"
            name="creditos"
            type="number"
            min={0}
            defaultValue={curso?.creditos ?? 0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="semanas">Semanas</Label>
          <Input
            id="semanas"
            name="semanas"
            type="number"
            min={0}
            defaultValue={curso?.semanas ?? 0}
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
            defaultValue={curso?.dedicacionPeriodo ?? 0}
          />
        </div>
      </div>

      {state && "error" in state && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : curso ? "Actualizar" : "Agregar"}
        </Button>
      </div>
    </form>
  )
}
