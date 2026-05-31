"use client"

import { useTransition } from "react"
import { cambiarRolUsuario } from "@/lib/actions/superadmin-actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GraduationCap, Shield, ShieldCheck, ChevronDown, Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import type { Rol } from "@/generated/prisma/client"

const ROLES_CONFIG = [
  {
    value: "DOCENTE" as Rol,
    label: "Docente",
    icon: GraduationCap,
    description: "Diligencia FO-19 y FO-20",
  },
  {
    value: "ADMIN" as Rol,
    label: "Admin",
    icon: Shield,
    description: "Gestiona períodos, docentes y catálogos",
  },
  {
    value: "SUPERADMIN" as Rol,
    label: "Superadmin",
    icon: ShieldCheck,
    description: "Acceso total — reglas y rehabilitación",
    requiresConfirm: true,
  },
]

const TRIGGER_STYLE: Record<Rol, string> = {
  SUPERADMIN: "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
  ADMIN:      "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  DOCENTE:    "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
}

export function UsuarioRoleSelector({
  usuarioId,
  rol,
}: {
  usuarioId: string
  rol: Rol
  /** @deprecated — ya no se usa, se queda para no romper callers existentes */
  variant?: "default" | "secondary" | "outline"
}) {
  const [isPending, startTransition] = useTransition()

  const handleChange = (nuevoRol: Rol) => {
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
      const res = await cambiarRolUsuario(usuarioId, nuevoRol)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(`Rol actualizado a ${nuevoRol}`)
      }
    })
  }

  const current = ROLES_CONFIG.find((r) => r.value === rol)!
  const Icon = current.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isPending}>
        <Button
          variant="outline"
          size="sm"
          className={`h-7 gap-1.5 px-2.5 text-xs font-medium border ${TRIGGER_STYLE[rol]}`}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
          {current.label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Cambiar rol
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES_CONFIG.map((r) => {
          const RIcon = r.icon
          const isCurrent = r.value === rol
          return (
            <DropdownMenuItem
              key={r.value}
              onClick={() => handleChange(r.value)}
              className="flex items-start gap-2.5 py-2 cursor-pointer"
              disabled={isCurrent}
            >
              <RIcon className={`h-4 w-4 mt-0.5 shrink-0 ${isCurrent ? "text-foreground" : "text-muted-foreground"}`} />
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className={`text-sm leading-none ${isCurrent ? "font-semibold" : "font-medium"}`}>
                  {r.label}
                </span>
                <span className="text-xs text-muted-foreground leading-snug">{r.description}</span>
              </div>
              {isCurrent && <Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
