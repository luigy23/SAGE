"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { cambiarEstadoCuenta } from "@/lib/actions/superadmin-actions"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, ShieldOff, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface UsuarioAdminActionsProps {
  usuarioId: string
  currentStatus: string
}

export function UsuarioAdminActions({ usuarioId, currentStatus }: UsuarioAdminActionsProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handle = (newStatus: string) => {
    startTransition(async () => {
      try {
        const result = await cambiarEstadoCuenta(usuarioId, newStatus as any)
        if (result && "error" in result) {
          toast.error(result.error)
        } else {
          toast.success("Estado actualizado correctamente")
          router.refresh()
        }
      } catch (e: any) {
        toast.error(e.message || "Error al actualizar el estado")
      }
    })
  }

  if (isPending) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  }

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus === "PENDIENTE" && (
        <>
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handle("ACTIVO")}>
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            Aprobar
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handle("RECHAZADO")}>
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            Rechazar
          </Button>
        </>
      )}
      {currentStatus === "ACTIVO" && (
        <Button size="sm" variant="destructive" onClick={() => handle("INACTIVO")}>
          <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
          Suspender cuenta
        </Button>
      )}
      {currentStatus === "INACTIVO" && (
        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handle("ACTIVO")}>
          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
          Reactivar cuenta
        </Button>
      )}
      {currentStatus === "RECHAZADO" && (
        <Button size="sm" variant="outline" onClick={() => handle("PENDIENTE")}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Dar 2da oportunidad
        </Button>
      )}
    </div>
  )
}
