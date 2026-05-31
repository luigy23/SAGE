"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const ANY = "__any__"

export function HubPeriodoSelector({
  periodos,
}: {
  periodos: { nombre: string; estado: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [pending, startTransition] = useTransition()

  function onChange(v: string) {
    const params = new URLSearchParams(sp.toString())
    if (v === ANY) params.delete("periodo")
    else params.set("periodo", v)
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="flex items-end gap-2" data-pending={pending || undefined}>
      <div className="w-48">
        <Label className="text-xs text-muted-foreground">Periodo académico</Label>
        <Select value={sp.get("periodo") ?? ANY} onValueChange={onChange}>
          <SelectTrigger className="font-mono">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos</SelectItem>
            {periodos.map((p) => (
              <SelectItem key={p.nombre} value={p.nombre}>
                {p.nombre}
                {p.estado === "ABIERTO" && (
                  <span className="ml-1 text-xs text-green-600"> ●</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {pending && (
        <span className="text-xs text-muted-foreground pb-2">Actualizando…</span>
      )}
    </div>
  )
}
