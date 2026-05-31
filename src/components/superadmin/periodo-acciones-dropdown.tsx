"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  abrirPeriodoSuperadminAction,
  cerrarPeriodoSuperadminAction,
} from "@/lib/actions/superadmin-periodo-actions"
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
import { MoreHorizontal, Loader2, LockOpen, Lock, Pencil } from "lucide-react"
import { toast } from "sonner"

interface Props {
  periodoId: string
  currentStatus: EstadoPeriodo
  canEdit: boolean
  onEdit: () => void
}

export function PeriodoAccionesDropdown({ periodoId, currentStatus, canEdit, onEdit }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  function handleAbrir() {
    startTransition(async () => {
      const result = await abrirPeriodoSuperadminAction(periodoId)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Período abierto. El semestre está ahora activo.")
        router.refresh()
      }
      setIsOpen(false)
    })
  }

  function handleCerrar() {
    startTransition(async () => {
      const result = await cerrarPeriodoSuperadminAction(periodoId)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Período cerrado.")
        router.refresh()
      }
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
        <DropdownMenuLabel>Acciones del Período</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {canEdit && (
          <DropdownMenuItem
            onClick={() => { setIsOpen(false); onEdit() }}
            className="cursor-pointer"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar fechas
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          disabled={currentStatus === "ABIERTO" || isPending}
          onClick={handleAbrir}
          className="text-green-600 focus:text-green-600 focus:bg-green-50 cursor-pointer"
        >
          <LockOpen className="mr-2 h-4 w-4" />
          Abrir semestre
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={currentStatus === "CERRADO" || isPending}
          onClick={handleCerrar}
          className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
        >
          <Lock className="mr-2 h-4 w-4" />
          Cerrar semestre
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
