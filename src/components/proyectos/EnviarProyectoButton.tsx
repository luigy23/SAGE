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
import { Send } from "lucide-react"
import { toast } from "sonner"
import { enviarProyectoAction } from "@/lib/actions/proyecto-actions"

export function EnviarProyectoButton({ proyectoId }: { proyectoId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleEnviar() {
    startTransition(async () => {
      const res = await enviarProyectoAction(proyectoId)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success("Proyecto enviado a revisión")
        router.refresh()
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" className="gap-1.5" disabled={pending}>
          <Send className="h-3.5 w-3.5" />
          Enviar a revisión
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Enviar proyecto a revisión?</AlertDialogTitle>
          <AlertDialogDescription>
            El proyecto pasará al estado{" "}
            <span className="font-mono">ENVIADO</span> y un administrador lo
            revisará. No podrás editarlo hasta que sea procesado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleEnviar} disabled={pending}>
            {pending ? "Enviando..." : "Sí, enviar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
