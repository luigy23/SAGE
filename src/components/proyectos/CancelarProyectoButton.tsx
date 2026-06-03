"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"
import { toast } from "sonner"
import {
  eliminarProyectoAction,
  retirarProyectoAction,
} from "@/lib/actions/proyecto-actions"

export function CancelarProyectoButton({
  proyectoId,
  estado,
}: {
  proyectoId: string
  estado: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const esBorrador = estado === "BORRADOR"

  function handleCancelar() {
    startTransition(async () => {
      // Borrador → eliminar (definitivo). Enviado → retirar (vuelve a borrador).
      const res = esBorrador
        ? await eliminarProyectoAction(proyectoId)
        : await retirarProyectoAction(proyectoId)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(esBorrador ? "Borrador eliminado" : "Proyecto retirado a borrador")
        router.push("/proyectos")
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          disabled={pending}
        >
          <XCircle className="h-3.5 w-3.5" />
          {esBorrador ? "Eliminar borrador" : "Retirar"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {esBorrador ? "¿Eliminar este borrador?" : "¿Retirar este proyecto?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {esBorrador
              ? "El proyecto se eliminará definitivamente y no podrás recuperarlo."
              : "El proyecto volverá a borrador para que puedas corregirlo y reenviarlo."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleCancelar}
            disabled={pending}
          >
            {pending ? "Procesando..." : esBorrador ? "Sí, eliminar" : "Sí, retirar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
