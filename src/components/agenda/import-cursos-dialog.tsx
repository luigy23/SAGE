"use client"

import { useState } from "react"
import type { CursoGuardado } from "@/generated/prisma/client"
import { importCursosFromGuardadosAction } from "@/lib/actions/agenda"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ImportCursosDialog({
  agendaId,
  cursosGuardados,
  open,
  onOpenChange,
}: {
  agendaId: string
  cursosGuardados: CursoGuardado[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function toggleCurso(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleImport() {
    if (selected.size === 0) {
      setError("Selecciona al menos un curso.")
      return
    }
    setPending(true)
    setError(null)
    const result = await importCursosFromGuardadosAction(
      agendaId,
      Array.from(selected)
    )
    setPending(false)
    if ("error" in result && result.error) {
      setError(result.error)
    } else {
      setSelected(new Set())
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Cursos Guardados</DialogTitle>
        </DialogHeader>

        {cursosGuardados.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tienes cursos guardados en tu perfil. Agrega cursos desde la
            seccion de perfil primero.
          </p>
        ) : (
          <div className="space-y-3">
            {cursosGuardados.map((curso) => (
              <div
                key={curso.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Checkbox
                  id={`import-${curso.id}`}
                  checked={selected.has(curso.id)}
                  onCheckedChange={() => toggleCurso(curso.id)}
                />
                <Label
                  htmlFor={`import-${curso.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <span className="font-medium">
                    {curso.numeroCurso} — {curso.nombreCurso}
                  </span>
                  {(curso.subgrupo || curso.sede) && (
                    <span className="ml-2 text-muted-foreground">
                      {[curso.subgrupo, curso.sede].filter(Boolean).join(" | ")}
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {cursosGuardados.length > 0 && (
            <Button onClick={handleImport} disabled={pending}>
              {pending ? "Importando..." : `Importar (${selected.size})`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
