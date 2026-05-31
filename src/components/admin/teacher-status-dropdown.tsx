"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { cambiarEstadoDocente } from "@/lib/actions/admin-actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Loader2, CheckCircle, XCircle, ShieldOff, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface TeacherStatusDropdownProps {
  docenteId: string
  currentStatus: string
}

export function TeacherStatusDropdown({ docenteId, currentStatus }: TeacherStatusDropdownProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      try {
        const result = await cambiarEstadoDocente(docenteId, newStatus as any)
        if (result && "error" in result) {
          toast.error(result.error)
        } else {
          toast.success("Estado actualizado correctamente")
          router.refresh()
        }
      } catch (error: any) {
        toast.error(error.message || "Error al actualizar el estado")
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
          <span className="sr-only">Abrir menú</span>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {currentStatus === "PENDIENTE" && (
          <>
            <DropdownMenuItem
              onClick={() => handleStatusChange("ACTIVO")}
              className="text-green-600 focus:text-green-600 focus:bg-green-50 cursor-pointer"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Aprobar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStatusChange("RECHAZADO")}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar
            </DropdownMenuItem>
          </>
        )}

        {currentStatus === "ACTIVO" && (
          <DropdownMenuItem
            onClick={() => handleStatusChange("INACTIVO")}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
          >
            <ShieldOff className="mr-2 h-4 w-4" />
            Suspender
          </DropdownMenuItem>
        )}

        {currentStatus === "INACTIVO" && (
          <DropdownMenuItem
            onClick={() => handleStatusChange("ACTIVO")}
            className="text-green-600 focus:text-green-600 focus:bg-green-50 cursor-pointer"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Reactivar
          </DropdownMenuItem>
        )}

        {currentStatus === "RECHAZADO" && (
          <DropdownMenuItem
            onClick={() => handleStatusChange("PENDIENTE")}
            className="text-blue-600 focus:text-blue-600 focus:bg-blue-50 cursor-pointer"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Dar 2da oportunidad
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
