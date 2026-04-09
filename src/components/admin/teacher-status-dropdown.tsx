"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cambiarEstadoDocente } from "@/lib/actions/admin-actions"
import { EstadoCuenta } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Loader2, CheckCircle, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"

interface TeacherStatusDropdownProps {
  docenteId: string
  currentStatus: EstadoCuenta
}

export function TeacherStatusDropdown({
  docenteId,
  currentStatus,
}: TeacherStatusDropdownProps) {
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleStatusChange = (newStatus: EstadoCuenta) => {
    if (newStatus === currentStatus) return

    startTransition(async () => {
      try {
        await cambiarEstadoDocente(docenteId, newStatus)
        toast.success(`Estado actualizado a ${newStatus}`)
        router.refresh()
      } catch (error: any) {
        toast.error(error.message || "Error al actualizar el estado")
      } finally {
        setIsOpen(false)
      }
    })
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
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
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          disabled={currentStatus === "ACTIVO" || isPending}
          onClick={() => handleStatusChange("ACTIVO")}
          className="text-green-600 focus:text-green-600 focus:bg-green-50 cursor-pointer"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Aprobar (ACTIVO)
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={currentStatus === "PENDIENTE" || isPending}
          onClick={() => handleStatusChange("PENDIENTE")}
          className="text-yellow-600 focus:text-yellow-600 focus:bg-yellow-50 cursor-pointer"
        >
          <Clock className="mr-2 h-4 w-4" />
          Marcar como PENDIENTE
        </DropdownMenuItem>
        
        <DropdownMenuItem
          disabled={currentStatus === "INACTIVO" || isPending}
          onClick={() => handleStatusChange("INACTIVO")}
          className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Suspender (INACTIVO)
        </DropdownMenuItem>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}
