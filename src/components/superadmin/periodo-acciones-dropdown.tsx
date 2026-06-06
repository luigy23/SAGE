"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  abrirPeriodoSuperadminAction,
  cerrarPeriodoSuperadminAction,
  eliminarPeriodoSuperadminAction,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Loader2, LockOpen, Lock, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  periodoId: string
  periodoNombre: string
  currentStatus: EstadoPeriodo
  canEdit: boolean
  onEdit: () => void
}

export function PeriodoAccionesDropdown({ periodoId, periodoNombre, currentStatus, canEdit, onEdit }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Mensaje de la 2ª etapa cuando el período tiene borradores que se descartarán.
  const [descartarMsg, setDescartarMsg] = useState<string | null>(null)
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

  function handleEliminar(descartarBorradores = false) {
    startTransition(async () => {
      const result = await eliminarPeriodoSuperadminAction(periodoId, { descartarBorradores })
      if ("needsConfirm" in result) {
        // 2ª etapa: el período tiene borradores. Mostrar advertencia reforzada.
        setDescartarMsg(result.mensaje)
        return
      }
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success(`Período "${periodoNombre}" eliminado.`)
        router.refresh()
      }
      cerrarDialogo()
    })
  }

  function cerrarDialogo() {
    setConfirmDelete(false)
    setDescartarMsg(null)
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

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={isPending}
          onClick={() => { setIsOpen(false); setConfirmDelete(true) }}
          className="text-red-700 focus:text-red-700 focus:bg-red-50 cursor-pointer"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar período
        </DropdownMenuItem>
      </DropdownMenuContent>

      <AlertDialog
        open={confirmDelete}
        onOpenChange={(open) => { if (!open) cerrarDialogo(); else setConfirmDelete(true) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {descartarMsg
                ? `¿Descartar borradores y eliminar "${periodoNombre}"?`
                : `¿Eliminar el período "${periodoNombre}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {descartarMsg ?? (
                <>
                  Esta acción es permanente. No se permite si hay agendas (FO-19) o monitoreos
                  (FO-20) <strong>enviados o aprobados</strong> — esos son registros oficiales.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleEliminar(descartarMsg !== null) }}
              disabled={isPending}
              className="bg-red-700 hover:bg-red-800 focus:ring-red-700"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {descartarMsg ? "Sí, descartar y eliminar" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  )
}
