"use client"

import { useTransition } from "react"
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
import { aprobarMonitoreoAction } from "@/lib/actions/revision"

export function AprobarMonitoreoButton({
  monitoreoId,
  docenteName,
  periodo,
}: {
  monitoreoId: string
  docenteName: string
  periodo: string
}) {
  const [pending, startTransition] = useTransition()

  function handleAprobar() {
    startTransition(async () => {
      const res = await aprobarMonitoreoAction(monitoreoId)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(`Monitoreo de ${docenteName} (${periodo}) aprobado`)
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
          <AlertDialogTitle>¿Aprobar este monitoreo?</AlertDialogTitle>
          <AlertDialogDescription>
            El monitoreo de <span className="font-medium">{docenteName}</span> para el
            período <span className="font-mono">{periodo}</span> pasará a estado{" "}
            <span className="font-medium text-green-700">APROBADO</span>.
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
