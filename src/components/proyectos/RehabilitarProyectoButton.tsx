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
import { Undo2 } from "lucide-react"
import { toast } from "sonner"
import { rehabilitarProyectoAction } from "@/lib/actions/proyecto-actions"

/** Revisor: deshace una aprobación (APROBADO → BORRADOR) para que se ajuste de nuevo. */
export function RehabilitarProyectoButton({ proyectoId }: { proyectoId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handle() {
    startTransition(async () => {
      const res = await rehabilitarProyectoAction(proyectoId)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success("Aprobación deshecha. El proyecto volvió a borrador.")
        router.refresh()
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={pending}>
          <Undo2 className="h-3.5 w-3.5" />
          Rehabilitar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Deshacer la aprobación?</AlertDialogTitle>
          <AlertDialogDescription>
            El proyecto volverá a BORRADOR y se desactivarán los proyectos activos de
            sus participantes hasta que se apruebe de nuevo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction onClick={handle} disabled={pending}>
            {pending ? "Procesando..." : "Sí, rehabilitar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
