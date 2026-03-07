"use client"

import Link from "next/link"
import type { AgendaSemestral } from "@/generated/prisma/client"
import { deleteAgendaAction } from "@/lib/actions/agenda"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Calendar, Pencil, Trash2, Eye, Plus } from "lucide-react"

export function AgendaList({ agendas }: { agendas: AgendaSemestral[] }) {
  async function handleDelete(id: string) {
    const result = await deleteAgendaAction(id)
    if ("error" in result) alert(result.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Mis Agendas</h2>
        <Button asChild>
          <Link href="/agenda/nueva">
            <Plus className="mr-1 h-4 w-4" />
            Nueva Agenda
          </Link>
        </Button>
      </div>

      {agendas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No tienes agendas creadas. Crea una nueva agenda para comenzar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agendas.map((agenda) => (
            <Card key={agenda.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{agenda.periodo}</CardTitle>
                <Badge
                  variant={
                    agenda.estado === "ENVIADO" ? "default" : "secondary"
                  }
                >
                  {agenda.estado}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Fecha: {new Date(agenda.fecha).toLocaleDateString("es-CO")}
                </p>
                <div className="flex gap-2">
                  {agenda.estado === "BORRADOR" ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/agenda/${agenda.id}`}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Editar
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Eliminar agenda
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminara la agenda del periodo{" "}
                              <strong>{agenda.periodo}</strong> y todos sus
                              datos. Esta accion no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => handleDelete(agenda.id)}
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/agenda/${agenda.id}`}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Ver
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
