"use client"

import { useState } from "react"
import type { AgendaConRelaciones, TipoActividad } from "@/lib/types/agenda"
import { deleteActividadAction } from "@/lib/actions/agenda"
import { ActividadForm } from "../actividad-form"
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
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react"
import {
  getAgendaLimits,
  getAgendaTotals,
} from "@/lib/validations/agenda-rules"

interface ActividadData {
  id: string
  nombre: string
  descripcion: string | null
  dedicacionPeriodo: number
}

export function StepActividades({
  agenda,
  tipo,
  titulo,
  actividades,
  readOnly,
}: {
  agenda: AgendaConRelaciones
  tipo: TipoActividad
  titulo: string
  actividades: ActividadData[]
  readOnly: boolean
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ActividadData | undefined>()

  function handleCreate() {
    setEditing(undefined)
    setDialogOpen(true)
  }

  function handleEdit(act: ActividadData) {
    setEditing(act)
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar esta actividad?")) return
    await deleteActividadAction(id, tipo)
  }

  const subtotal = actividades.reduce(
    (sum, a) => sum + a.dedicacionPeriodo,
    0
  )

  const limits = getAgendaLimits(agenda.docente)
  const totals = getAgendaTotals(agenda)

  // Per-type warnings
  const tipWarnings: string[] = []

  if (tipo === "gestion" && !agenda.docente.cargoAdministrativo && totals.horasGestion > limits.maxGestion) {
    tipWarnings.push(
      `Las horas de gestión (${totals.horasGestion}h) exceden el 20% permitido (${limits.maxGestion}h). Art. 10.`
    )
  }

  if (
    (tipo === "investigacion" || tipo === "proyeccion") &&
    agenda.docente.modalidad === "CATEDRA" &&
    limits.maxInvProySocialCatedra !== null
  ) {
    const invProySocial = totals.horasInvestigacion + totals.horasProyeccionSocial
    if (invProySocial > limits.maxInvProySocialCatedra) {
      tipWarnings.push(
        `Investigación + Proyección Social (${invProySocial}h) exceden el máximo para catedráticos (${limits.maxInvProySocialCatedra}h). Art. 3, Parágrafo 2.`
      )
    }
  }

  if (tipo === "investigacion" && agenda.docente.doctorado && totals.horasInvestigacion === 0 && actividades.length === 0) {
    tipWarnings.push(
      "Los docentes con doctorado deben participar en actividades de investigación. Art. 4, Parágrafo 3."
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{titulo}</CardTitle>
          {!readOnly && (
            <Button size="sm" onClick={handleCreate}>
              <Plus className="mr-1 h-4 w-4" />
              Agregar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {actividades.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay actividades agregadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead className="text-right">Ded. Periodo</TableHead>
                  {!readOnly && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {actividades.map((act) => (
                  <TableRow key={act.id}>
                    <TableCell className="font-medium">{act.nombre}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {act.descripcion || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {act.dedicacionPeriodo}
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(act)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(act.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell colSpan={2} className="text-right">
                    Subtotal:
                  </TableCell>
                  <TableCell className="text-right">{subtotal}</TableCell>
                  {!readOnly && <TableCell />}
                </TableRow>
              </TableBody>
            </Table>
          )}

          {tipWarnings.length > 0 && (
            <div className="mt-4 space-y-2">
              {tipWarnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Actividad" : "Agregar Actividad"}
            </DialogTitle>
          </DialogHeader>
          <ActividadForm
            agendaId={agenda.id}
            tipo={tipo}
            actividad={editing}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
