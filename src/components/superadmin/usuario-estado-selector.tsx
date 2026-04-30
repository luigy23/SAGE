"use client"

import { useTransition } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cambiarEstadoCuenta } from "@/lib/actions/superadmin-actions"
import type { EstadoCuenta } from "@/generated/prisma/client"

const ESTADOS: EstadoCuenta[] = ["PENDIENTE", "ACTIVO", "INACTIVO"]

const VARIANT: Record<EstadoCuenta, "default" | "secondary" | "outline" | "destructive"> = {
  PENDIENTE: "secondary",
  ACTIVO: "default",
  INACTIVO: "destructive",
}

export function UsuarioEstadoSelector({
  usuarioId,
  estado,
}: {
  usuarioId: string
  estado: EstadoCuenta
}) {
  const [pending, startTransition] = useTransition()

  function handleChange(nuevoEstado: string) {
    if (nuevoEstado === estado) return
    startTransition(async () => {
      const res = await cambiarEstadoCuenta(usuarioId, nuevoEstado as EstadoCuenta)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(`Estado cambiado a ${nuevoEstado}`)
      }
    })
  }

  return (
    <Select value={estado} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="h-8 w-[130px] border-none p-0 focus:ring-0 focus:ring-offset-0">
        <SelectValue>
          <Badge variant={VARIANT[estado]} className="text-xs">
            {estado}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ESTADOS.map((e) => (
          <SelectItem key={e} value={e}>
            {e}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
