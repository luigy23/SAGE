"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { corregirAgendaAction } from "@/lib/actions/agenda"

/** Reabre una agenda RECHAZADA (→ BORRADOR) para que el docente la corrija y reenvíe. */
export function CorregirAgendaButton({ agendaId }: { agendaId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handle() {
    startTransition(async () => {
      const res = await corregirAgendaAction(agendaId)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success("Agenda reabierta. Corregila y volvé a enviarla.")
        router.refresh()
      }
    })
  }

  return (
    <Button size="sm" onClick={handle} disabled={pending} className="mt-3 gap-1.5">
      <Pencil className="h-3.5 w-3.5" />
      {pending ? "Abriendo..." : "Corregir y reenviar"}
    </Button>
  )
}
