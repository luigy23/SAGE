"use client"

import { useState, useMemo } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Check, ListChecks, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type CategoriaActividadFiltro =
  | "DOCENCIA"
  | "INVESTIGACION"
  | "PROYECCION_SOCIAL"
  | "GESTION"

export type ActividadCatalogoOption = {
  id: string
  categoria: CategoriaActividadFiltro
  nombre: string
  descripcion: string | null
  topeSemestralH: number | null
  topePorUnidad: "NINGUNA" | "COHORTE" | "ESTUDIANTE" | "PROYECTO" | "FACULTAD" | "SEDE"
  unidadMax: number | null
  topeSemanalHPorUnidad: number | null
  cantidadMaxSimultaneos: number | null
  restriccionTemporalAnos: number | null
  aplicaUnoPorFacultad: boolean
  aplicaUnoPorSede: boolean
  requiereResolucionRector: boolean
  requiereProyectoAprobado: boolean
  articuloOrigen: string | null
}

const UNIDAD_LABEL: Record<ActividadCatalogoOption["topePorUnidad"], string> = {
  NINGUNA: "",
  COHORTE: "cohorte",
  ESTUDIANTE: "estudiante",
  PROYECTO: "proyecto",
  FACULTAD: "facultad",
  SEDE: "sede",
}

/**
 * Genera badges con las restricciones de una actividad para que el docente las vea de un vistazo.
 */
export function ActividadRestriccionesBadges({
  actividad,
}: {
  actividad: ActividadCatalogoOption
}) {
  const badges: { label: string; variant?: "default" | "secondary" | "outline" | "destructive" }[] = []

  if (actividad.topeSemestralH !== null) {
    badges.push({
      label: `Máx ${actividad.topeSemestralH}h/sem`,
      variant: "secondary",
    })
  }
  if (actividad.topeSemanalHPorUnidad !== null && actividad.topePorUnidad !== "NINGUNA") {
    badges.push({
      label: `${actividad.topeSemanalHPorUnidad} h/sem por ${UNIDAD_LABEL[actividad.topePorUnidad]}`,
      variant: "secondary",
    })
  }
  if (actividad.unidadMax !== null && actividad.topePorUnidad !== "NINGUNA") {
    badges.push({
      label: `Máx ${actividad.unidadMax} ${UNIDAD_LABEL[actividad.topePorUnidad]}${actividad.unidadMax > 1 ? "s" : ""}`,
      variant: "outline",
    })
  }
  if (actividad.cantidadMaxSimultaneos !== null) {
    badges.push({
      label: `Máx ${actividad.cantidadMaxSimultaneos} simultáneos`,
      variant: "outline",
    })
  }
  if (actividad.aplicaUnoPorFacultad) {
    badges.push({ label: "1 por Facultad", variant: "outline" })
  }
  if (actividad.aplicaUnoPorSede) {
    badges.push({ label: "1 por Sede", variant: "outline" })
  }
  if (actividad.requiereProyectoAprobado) {
    badges.push({ label: "Requiere proyecto aprobado", variant: "outline" })
  }
  if (actividad.requiereResolucionRector) {
    badges.push({ label: "Requiere resolución del Rector", variant: "outline" })
  }
  if (actividad.restriccionTemporalAnos !== null) {
    badges.push({
      label: `Máx ${actividad.restriccionTemporalAnos} año${actividad.restriccionTemporalAnos > 1 ? "s" : ""}`,
      variant: "outline",
    })
  }

  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b, i) => (
        <Badge key={i} variant={b.variant ?? "outline"} className="text-[10px] font-normal">
          {b.label}
        </Badge>
      ))}
    </div>
  )
}

/**
 * Selector prominente de actividad del catálogo Art. 11 del Acuerdo 048.
 * Filtrado por categoría (DOCENCIA, INVESTIGACION, PROYECCION_SOCIAL, GESTION).
 */
export function ActividadCatalogoSelector({
  catalogo,
  categoria,
  selectedNombre,
  onSelect,
  onClear,
}: {
  catalogo: ActividadCatalogoOption[]
  categoria: CategoriaActividadFiltro
  selectedNombre?: string
  onSelect: (actividad: ActividadCatalogoOption) => void
  onClear?: () => void
}) {
  const [open, setOpen] = useState(false)

  const filtered = useMemo(
    () => catalogo.filter((a) => a.categoria === categoria),
    [catalogo, categoria]
  )

  const selected = filtered.find((a) => a.nombre === selectedNombre)

  function handleSelect(actividad: ActividadCatalogoOption) {
    onSelect(actividad)
    setOpen(false)
  }

  if (selected) {
    return (
      <div className="rounded-md border bg-primary/5 p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{selected.nombre}</p>
                {selected.articuloOrigen && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {selected.articuloOrigen}
                  </p>
                )}
              </div>
            </div>
            {selected.descripcion && (
              <p className="text-xs text-muted-foreground pl-6">
                {selected.descripcion}
              </p>
            )}
            <div className="pl-6">
              <ActividadRestriccionesBadges actividad={selected} />
            </div>
          </div>
          {onClear && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={onClear}
              title="Cambiar actividad"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 border-dashed"
        >
          <Search className="h-4 w-4" />
          <span className="truncate text-muted-foreground">
            Buscar actividad del catálogo (Art. 11)...
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nombre..." />
          <CommandList>
            <CommandEmpty>
              No se encontraron actividades en esta categoría.
            </CommandEmpty>
            <CommandGroup heading={`Catálogo Art. 11 (${filtered.length})`}>
              {filtered.map((act) => (
                <CommandItem
                  key={act.id}
                  value={act.nombre}
                  onSelect={() => handleSelect(act)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      selectedNombre === act.nombre ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-sm">{act.nombre}</span>
                    <div className="flex flex-wrap gap-1">
                      {act.topeSemestralH !== null && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {act.topeSemestralH}h/sem
                        </Badge>
                      )}
                      {act.topeSemanalHPorUnidad !== null && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {act.topeSemanalHPorUnidad} h/sem · {UNIDAD_LABEL[act.topePorUnidad]}
                        </Badge>
                      )}
                      {act.requiereProyectoAprobado && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          requiere proyecto
                        </Badge>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
