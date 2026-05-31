"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cambiarEstadoPeriodo } from "@/lib/actions/periodo-actions"
import { EstadoPeriodo } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Loader2, LockOpen, Lock } from "lucide-react"
import { toast } from "sonner"

interface PeriodoStatusDropdownProps {
  periodoId: string
  currentStatus: EstadoPeriodo
}

export function PeriodoStatusDropdown({
  periodoId,
  currentStatus,
}: PeriodoStatusDropdownProps) {
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleStatusChange = (newStatus: EstadoPeriodo) => {
    if (newStatus === currentStatus) return

    startTransition(async () => {
      const result = await cambiarEstadoPeriodo(periodoId, newStatus)

      if ("error" in result) {
        toast.error(result.error)
        setIsOpen(false)
        return
      }

      toast.success(
        newStatus === "ABIERTO"
          ? "Período abierto. Los docentes pueden planificar agendas."
          : "Período cerrado. Las agendas quedan bloqueadas."
      )
      router.refresh()
      setIsOpen(false)
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
        <DropdownMenuLabel>Cambiar Estado</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={currentStatus === "ABIERTO" || isPending}
          onClick={() => handleStatusChange("ABIERTO")}
          className="text-green-600 focus:text-green-600 focus:bg-green-50 cursor-pointer"
        >
          <LockOpen className="mr-2 h-4 w-4" />
          Abrir Período
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={currentStatus === "CERRADO" || isPending}
          onClick={() => handleStatusChange("CERRADO")}
          className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
        >
          <Lock className="mr-2 h-4 w-4" />
          Cerrar Período
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
