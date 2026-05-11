"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { crearMonitoreoAction } from "@/lib/actions/monitoreo"
import { Button } from "@/components/ui/button"
import { Loader2, Play } from "lucide-react"

/**
 * Botón "Iniciar Monitoreo" sobre una agenda ENVIADA.
 * Crea el Monitoreo + pre-siembra reportes y redirige al detalle.
 */
export function StartMonitoreoButton({ agendaId }: { agendaId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleStart() {
    startTransition(async () => {
      const result = await crearMonitoreoAction(agendaId)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      router.push(`/monitoreo/${result.monitoreoId}`)
    })
  }

  return (
    <Button
      onClick={handleStart}
      disabled={isPending}
      className="w-full gap-2"
      size="sm"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {isPending ? "Creando..." : "Iniciar Monitoreo"}
    </Button>
  )
}
