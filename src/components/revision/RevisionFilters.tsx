"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"

const MODALIDADES = [
  "PLANTA_TC",
  "PLANTA_MT",
  "OCASIONAL_TC",
  "OCASIONAL_MT",
  "CATEDRA",
  "VISITANTE",
  "INVITADO",
]
const SEDES = ["NEIVA", "PITALITO", "GARZON", "LA_PLATA"]
const ESTADOS = ["BORRADOR", "ENVIADO", "APROBADO", "RECHAZADO", "TODAS"]

const ANY = "__any__"

export function RevisionFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [pending, startTransition] = useTransition()

  const [q, setQ] = useState(sp.get("q") ?? "")

  // Mantener input sincronizado si los searchParams cambian (ej: clear)
  useEffect(() => {
    setQ(sp.get("q") ?? "")
  }, [sp])

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString())
    if (!value || value === "" || value === ANY) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    // Reset page al cambiar cualquier filtro
    if (key !== "page") params.delete("page")
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  // Debounce de la búsqueda
  useEffect(() => {
    const current = sp.get("q") ?? ""
    if (q === current) return
    const t = setTimeout(() => updateParam("q", q || null), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const hasFilters =
    sp.get("q") ||
    sp.get("periodo") ||
    sp.get("modalidad") ||
    sp.get("sede") ||
    sp.get("estado") ||
    sp.get("rehabilitadas")

  function clearAll() {
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }

  return (
    <div className="space-y-3" data-pending={pending || undefined}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <Label htmlFor="rev-search" className="text-xs text-muted-foreground">
            Buscar docente
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="rev-search"
              placeholder="Nombre, cédula o email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs text-muted-foreground">Periodo</Label>
          <Input
            placeholder="2026-1"
            defaultValue={sp.get("periodo") ?? ""}
            onBlur={(e) => updateParam("periodo", e.target.value.trim() || null)}
            className="font-mono"
          />
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs text-muted-foreground">Estado</Label>
          <Select
            value={sp.get("estado") ?? "ENVIADO"}
            onValueChange={(v) => updateParam("estado", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs text-muted-foreground">Modalidad</Label>
          <Select
            value={sp.get("modalidad") ?? ANY}
            onValueChange={(v) => updateParam("modalidad", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Todas</SelectItem>
              {MODALIDADES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs text-muted-foreground">Sede</Label>
          <Select
            value={sp.get("sede") ?? ANY}
            onValueChange={(v) => updateParam("sede", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Todas</SelectItem>
              {SEDES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{pending ? "Aplicando filtros…" : "Filtros activos"}</span>
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-7">
            <X className="mr-1 h-3 w-3" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
