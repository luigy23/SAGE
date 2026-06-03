"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { corregirProyectoAction } from "@/lib/actions/proyecto-actions"

/** Reabre un proyecto RECHAZADO (→ BORRADOR) para que el docente lo corrija y reenvíe. */
export function CorregirProyectoButton({ proyectoId }: { proyectoId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handle() {
    startTransition(async () => {
      const res = await corregirProyectoAction(proyectoId)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success("Proyecto reabierto. Corregilo y volvé a enviarlo.")
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
