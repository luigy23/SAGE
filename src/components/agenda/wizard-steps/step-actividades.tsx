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
import { Plus, Pencil, Trash2 } from "lucide-react"

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
