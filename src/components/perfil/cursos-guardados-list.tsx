"use client"

import { useState } from "react"
import type { CursoGuardado } from "@/generated/prisma/client"
import { deleteCursoGuardadoAction } from "@/lib/actions/cursos-guardados"
import { CursoGuardadoForm } from "./curso-guardado-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"

export function CursosGuardadosList({
  cursos,
}: {
  cursos: CursoGuardado[]
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCurso, setEditingCurso] = useState<CursoGuardado | undefined>()

  function handleCreate() {
    setEditingCurso(undefined)
    setDialogOpen(true)
  }

  function handleEdit(curso: CursoGuardado) {
    setEditingCurso(curso)
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm("Estas seguro de eliminar este curso?")) return
    await deleteCursoGuardadoAction(id)
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cursos Guardados</CardTitle>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar Curso
          </Button>
        </CardHeader>
        <CardContent>
          {cursos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tienes cursos guardados. Agrega cursos para reutilizarlos en
              tus agendas semestrales.
            </p>
          ) : (
            <div className="space-y-3">
              {cursos.map((curso) => (
                <div
                  key={curso.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {curso.numeroCurso} — {curso.nombreCurso}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[
                        curso.subgrupo && `Subgrupo: ${curso.subgrupo}`,
                        curso.sede && `Sede: ${curso.sede}`,
                        curso.creditos && `${curso.creditos} creditos`,
                        curso.horasPresenciales &&
                          `${curso.horasPresenciales}h presenciales`,
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(curso)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(curso.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCurso ? "Editar Curso" : "Agregar Curso"}
            </DialogTitle>
          </DialogHeader>
          <CursoGuardadoForm
            curso={editingCurso}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
