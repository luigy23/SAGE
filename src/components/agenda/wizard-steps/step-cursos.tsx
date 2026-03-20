"use client"

import { useState } from "react"
import type { CursoAgenda, CursoGuardado } from "@/generated/prisma/client"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import {
  deleteCursoAgendaAction,
  saveCursosToProfileAction,
} from "@/lib/actions/agenda"
import { CursoAgendaForm } from "../curso-agenda-form"
import { ImportCursosDialog } from "../import-cursos-dialog"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Download, Save } from "lucide-react"
import { AgendaValidationPanel } from "../agenda-validation-panel"

export function StepCursos({
  agenda,
  cursosGuardados,
  readOnly,
}: {
  agenda: AgendaConRelaciones
  cursosGuardados: CursoGuardado[]
  readOnly: boolean
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingCurso, setEditingCurso] = useState<CursoAgenda | undefined>()
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  function handleCreate() {
    setEditingCurso(undefined)
    setDialogOpen(true)
  }

  function handleEdit(curso: CursoAgenda) {
    setEditingCurso(curso)
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este curso?")) return
    await deleteCursoAgendaAction(id)
  }

  async function handleSaveToProfile() {
    setSaving(true)
    setSaveMsg(null)
    const result = await saveCursosToProfileAction(agenda.id)
    setSaving(false)
    if ("error" in result && result.error) {
      setSaveMsg(result.error)
    } else if ("count" in result) {
      setSaveMsg(`${result.count} curso(s) guardado(s) en tu perfil.`)
    }
  }

  const subtotal = agenda.cursos.reduce(
    (sum, c) => sum + c.dedicacionPeriodo,
    0
  )

  return (
    <>
      <AgendaValidationPanel agenda={agenda} compact />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>1.0 Cursos Asignados</CardTitle>
          {!readOnly && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <Download className="mr-1 h-4 w-4" />
                Importar
              </Button>
              <Button size="sm" onClick={handleCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Agregar
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {agenda.cursos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay cursos agregados. Agrega cursos manualmente o importa
              desde tus cursos guardados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Curso</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Subgrupo</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead className="text-right">Hrs. Pres.</TableHead>
                    <TableHead className="text-right">Creditos</TableHead>
                    <TableHead className="text-right">Semanas</TableHead>
                    <TableHead className="text-right">Ded. Periodo</TableHead>
                    {!readOnly && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agenda.cursos.map((curso) => (
                    <TableRow key={curso.id}>
                      <TableCell className="font-medium">
                        {curso.numeroCurso}
                      </TableCell>
                      <TableCell>{curso.nombreCurso}</TableCell>
                      <TableCell>{curso.subgrupo || "—"}</TableCell>
                      <TableCell>{curso.sede || "—"}</TableCell>
                      <TableCell className="text-right">
                        {curso.horasPresenciales}
                      </TableCell>
                      <TableCell className="text-right">
                        {curso.creditos}
                      </TableCell>
                      <TableCell className="text-right">
                        {curso.semanas}
                      </TableCell>
                      <TableCell className="text-right">
                        {curso.dedicacionPeriodo}
                      </TableCell>
                      {!readOnly && (
                        <TableCell>
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
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell colSpan={7} className="text-right">
                      Subtotal Cursos:
                    </TableCell>
                    <TableCell className="text-right">{subtotal}</TableCell>
                    {!readOnly && <TableCell />}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {agenda.cursos.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveToProfile}
                disabled={saving}
              >
                <Save className="mr-1 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar cursos en mi perfil"}
              </Button>
              {saveMsg && (
                <span className="text-sm text-muted-foreground">{saveMsg}</span>
              )}
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
          <CursoAgendaForm
            agendaId={agenda.id}
            curso={editingCurso}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ImportCursosDialog
        agendaId={agenda.id}
        cursosGuardados={cursosGuardados}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </>
  )
}
