"use client"

import { useActionState, useEffect, useRef } from "react"
import type { CursoGuardado } from "@/generated/prisma/client"
import {
  createCursoGuardadoAction,
  updateCursoGuardadoAction,
} from "@/lib/actions/cursos-guardados"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CursoGuardadoForm({
  curso,
  onClose,
}: {
  curso?: CursoGuardado
  onClose: () => void
}) {
  const action = curso ? updateCursoGuardadoAction : createCursoGuardadoAction
  const [state, formAction, pending] = useActionState(action, null)
  const prevState = useRef(state)

  useEffect(() => {
    if (state !== prevState.current && state && "success" in state) {
      onClose()
    }
    prevState.current = state
  }, [state, onClose])

  return (
    <form action={formAction} className="space-y-4">
      {curso && <input type="hidden" name="id" value={curso.id} />}

      {state?.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="numeroCurso">Numero del curso *</Label>
          <Input
            id="numeroCurso"
            name="numeroCurso"
            defaultValue={curso?.numeroCurso || ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nombreCurso">Nombre del curso *</Label>
          <Input
            id="nombreCurso"
            name="nombreCurso"
            defaultValue={curso?.nombreCurso || ""}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subgrupo">Subgrupo</Label>
          <Input
            id="subgrupo"
            name="subgrupo"
            defaultValue={curso?.subgrupo || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sede">Sede</Label>
          <Input
            id="sede"
            name="sede"
            defaultValue={curso?.sede || ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="horasPresenciales">Horas presenciales</Label>
          <Input
            id="horasPresenciales"
            name="horasPresenciales"
            type="number"
            defaultValue={curso?.horasPresenciales ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="creditos">Creditos</Label>
          <Input
            id="creditos"
            name="creditos"
            type="number"
            defaultValue={curso?.creditos ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="semanas">Semanas</Label>
          <Input
            id="semanas"
            name="semanas"
            type="number"
            defaultValue={curso?.semanas ?? ""}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : curso ? "Actualizar" : "Crear Curso"}
        </Button>
      </div>
    </form>
  )
}
