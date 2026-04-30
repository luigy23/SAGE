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
import { cambiarRolUsuario } from "@/lib/actions/superadmin-actions"
import type { Rol } from "@/generated/prisma/client"

const ROLES: Rol[] = ["DOCENTE", "ADMIN", "SUPERADMIN"]

export function UsuarioRoleSelector({
  usuarioId,
  rol,
  variant,
}: {
  usuarioId: string
  rol: Rol
  variant: "default" | "secondary" | "outline"
}) {
  const [pending, startTransition] = useTransition()

  function handleChange(nuevoRol: string) {
    if (nuevoRol === rol) return
    if (
      nuevoRol === "SUPERADMIN" &&
      !confirm(
        "¿Promover este usuario a SUPERADMIN? Tendrá acceso total a reglas paramétricas y rehabilitación de agendas."
      )
    ) {
      return
    }
    startTransition(async () => {
      const res = await cambiarRolUsuario(usuarioId, nuevoRol as Rol)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(`Rol cambiado a ${nuevoRol}`)
      }
    })
  }

  return (
    <Select value={rol} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="h-8 w-[140px] border-none p-0 focus:ring-0 focus:ring-offset-0">
        <SelectValue>
          <Badge variant={variant} className="text-xs">
            {rol}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
