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
import { aprobarSolicitudCambioPerfilAction } from "@/lib/actions/solicitud-perfil"

export function AprobarSolicitudPerfilButton({
  solicitudId,
  docenteName,
}: {
  solicitudId: string
  docenteName: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleAprobar() {
    startTransition(async () => {
      const res = await aprobarSolicitudCambioPerfilAction(solicitudId)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(`Solicitud de ${docenteName} aprobada`)
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
          <AlertDialogTitle>¿Aprobar esta solicitud?</AlertDialogTitle>
          <AlertDialogDescription>
            Los cambios propuestos se aplicarán al perfil de{" "}
            <span className="font-medium">{docenteName}</span>. Esta acción queda
            registrada en la auditoría.
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
