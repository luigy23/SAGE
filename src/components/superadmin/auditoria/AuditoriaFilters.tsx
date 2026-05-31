"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { TipoEntidad, AccionAuditoria } from "@/lib/types/auditoria"
import { ETIQUETAS_ENTIDAD, ETIQUETAS_ACCION } from "@/lib/types/auditoria"

const ENTIDADES: TipoEntidad[] = [
  "PARAMETRO_GLOBAL",
  "PARAMETROS_MODALIDAD",
  "USUARIO_ROL",
  "USUARIO_ESTADO",
  "PERIODO",
  "AGENDA",
  "MONITOREO",
  "CURSO_MAESTRO",
]

const ACCIONES: AccionAuditoria[] = [
  "CREAR",
  "ACTUALIZAR",
  "CAMBIAR_ROL",
  "CAMBIAR_ESTADO",
  "REHABILITAR",
]

export function AuditoriaFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const update = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(sp.toString())
      params.delete("page")
      if (value) params.set(key, value)
      else params.delete(key)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, sp],
  )

  const hasFilters =
    sp.has("q") ||
    sp.has("entidad") ||
    sp.has("accion") ||
    sp.has("desde") ||
    sp.has("hasta")

  function clearAll() {
    router.replace(pathname, { scroll: false })
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Buscar por actor o recurso..."
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => update("q", e.target.value || undefined)}
          className="h-9"
        />
      </div>

      <Select
        value={sp.get("entidad") ?? "todas"}
        onValueChange={(v) => update("entidad", v === "todas" ? undefined : v)}
      >
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue placeholder="Tipo de entidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas las entidades</SelectItem>
          {ENTIDADES.map((e) => (
            <SelectItem key={e} value={e}>
              {ETIQUETAS_ENTIDAD[e]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={sp.get("accion") ?? "todas"}
        onValueChange={(v) => update("accion", v === "todas" ? undefined : v)}
      >
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder="Acción" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas las acciones</SelectItem>
          {ACCIONES.map((a) => (
            <SelectItem key={a} value={a}>
              {ETIQUETAS_ACCION[a]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={sp.get("desde") ?? ""}
          onChange={(e) => update("desde", e.target.value || undefined)}
          className="h-9 w-[140px]"
          title="Desde"
        />
        <span className="text-muted-foreground text-sm">—</span>
        <Input
          type="date"
          value={sp.get("hasta") ?? ""}
          onChange={(e) => update("hasta", e.target.value || undefined)}
          className="h-9 w-[140px]"
          title="Hasta"
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-9 gap-1.5">
          <X className="h-3.5 w-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
