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
import { CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { aprobarProyectoAction } from "@/lib/actions/proyecto-actions"

export function AprobarProyectoButton({
  proyectoId,
  docenteName,
}: {
  proyectoId: string
  docenteName: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleAprobar() {
    startTransition(async () => {
      const res = await aprobarProyectoAction(proyectoId)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(`Proyecto de ${docenteName} aprobado`)
        router.refresh()
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          disabled={pending}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Aprobar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Aprobar este proyecto?</AlertDialogTitle>
          <AlertDialogDescription>
            El proyecto de{" "}
            <span className="font-medium">{docenteName}</span> pasará a estado{" "}
            <span className="font-mono">APROBADO</span> y se activará la flag
            de proyectos activos en el docente. Esta acción queda registrada
            en la auditoría.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-green-600 hover:bg-green-700"
            onClick={handleAprobar}
            disabled={pending}
          >
            {pending ? "Aprobando..." : "Sí, aprobar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
