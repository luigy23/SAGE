"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toggleEstadoCursoMaestro } from "@/lib/actions/curso-maestro-actions"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface CourseStatusToggleProps {
  cursoId: string
  currentEstado: boolean
}

export function CourseStatusToggle({ cursoId, currentEstado }: CourseStatusToggleProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      try {
        await toggleEstadoCursoMaestro(cursoId, checked)
        toast.success(checked ? "Curso activado." : "Curso desactivado.")
        router.refresh()
      } catch (error: any) {
        toast.error(error.message || "Error al actualizar el estado.")
      }
    })
  }

  if (isPending) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  }

  return (
    <Switch
      checked={currentEstado}
      onCheckedChange={handleToggle}
      aria-label={currentEstado ? "Desactivar curso" : "Activar curso"}
    />
  )
}
