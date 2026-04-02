"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteAgendaBorradorAction } from "@/lib/actions/agenda-wizard"
import { Button } from "@/components/ui/button"
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
import { Trash2, Loader2 } from "lucide-react"

/**
 * Botón para descartar un borrador de agenda.
 *
 * Client component aislado porque necesita:
 * - useTransition para manejar el estado pendiente
 * - AlertDialog para confirmación antes de eliminar
 * - toast para notificaciones
 *
 * Llama al server action deleteAgendaBorradorAction(periodo).
 */
export function DiscardDraftButton({ periodo }: { periodo: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDiscard() {
    startTransition(async () => {
      const result = await deleteAgendaBorradorAction(periodo)

      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Borrador descartado exitosamente.")
        router.refresh()
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {isPending ? "Descartando..." : "Descartar Borrador"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Descartar borrador?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente el borrador de la agenda del periodo{" "}
            <strong>{periodo}</strong> y todos sus datos (cursos, actividades,
            horarios). Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDiscard}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Eliminando..." : "Sí, Descartar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
