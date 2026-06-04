"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Unlock } from "lucide-react"
import { liberarCompromisoAction } from "@/lib/actions/consejeria-actions"

/** Botón (autoridad) para liberar un compromiso de consejería antes de tiempo. */
export function LiberarCohorteButton({ compromisoId }: { compromisoId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await liberarCompromisoAction(compromisoId)
          if ("error" in res) {
            toast.error(res.error)
          } else {
            toast.success("Cohorte liberada")
            router.refresh()
          }
        })
      }
    >
      <Unlock className="h-3 w-3" />
      Liberar
    </Button>
  )
}
