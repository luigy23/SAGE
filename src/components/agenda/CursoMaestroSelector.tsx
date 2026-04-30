"use client"

import { useState } from "react"
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
import { Search, Check, BookOpen, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type CursoMaestroOption = {
  id: string
  codigo: string
  nombre: string
  creditos: number
  tipo: "TEORICO" | "TEORICO_PRACTICO" | "PRACTICO"
  facultad: string | null
  componente: string | null
  horasSemT: number | null
  horasSemP: number | null
  horasSemI: number | null
}

const TIPO_LABEL: Record<CursoMaestroOption["tipo"], string> = {
  TEORICO: "Teórico",
  TEORICO_PRACTICO: "Teórico-Práctico",
  PRACTICO: "Práctico",
}

const TIPO_COLOR: Record<CursoMaestroOption["tipo"], string> = {
  TEORICO: "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40",
  TEORICO_PRACTICO: "border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40",
  PRACTICO: "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40",
}

export function CursoMaestroSelector({
  cursosMaestros,
  selectedCodigo,
  onSelect,
  onClear,
}: {
  cursosMaestros: CursoMaestroOption[]
  selectedCodigo?: string
  onSelect: (curso: CursoMaestroOption) => void
  onClear?: () => void
}) {
  const [open, setOpen] = useState(false)

  const selected = cursosMaestros.find((c) => c.codigo === selectedCodigo)

  function handleSelect(curso: CursoMaestroOption) {
    onSelect(curso)
    setOpen(false)
  }

  if (selected) {
    const horasSem =
      (selected.horasSemT ?? 0) + (selected.horasSemP ?? 0)
    return (
      <div className="rounded-md border bg-primary/5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <BookOpen className="h-4 w-4 text-primary shrink-0" />
              <span className="font-mono text-xs font-semibold text-primary">
                {selected.codigo}
              </span>
              <Badge variant="outline" className={cn("text-xs", TIPO_COLOR[selected.tipo])}>
                {TIPO_LABEL[selected.tipo]}
              </Badge>
              {selected.facultad && (
                <Badge variant="outline" className="text-xs">
                  {selected.facultad}
                </Badge>
              )}
            </div>
            <p className="font-medium text-sm">{selected.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {selected.creditos} créd. · {horasSem} hrs presenciales/sem · {selected.horasSemI ?? 0} hrs indep./sem
            </p>
          </div>
          {onClear && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={onClear}
              title="Cambiar curso"
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
            Buscar curso del catálogo oficial...
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por código, nombre o facultad..." />
          <CommandList>
            <CommandEmpty>
              No se encontraron cursos. Comuníquese con el administrador para que agregue el curso al catálogo.
            </CommandEmpty>
            <CommandGroup heading={`Catálogo Oficial (${cursosMaestros.length})`}>
              {cursosMaestros.map((curso) => {
                const horasSem = (curso.horasSemT ?? 0) + (curso.horasSemP ?? 0)
                return (
                  <CommandItem
                    key={curso.id}
                    value={`${curso.codigo} ${curso.nombre} ${curso.facultad ?? ""}`}
                    onSelect={() => handleSelect(curso)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        selectedCodigo === curso.codigo ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold">{curso.codigo}</span>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TIPO_COLOR[curso.tipo])}>
                          {TIPO_LABEL[curso.tipo]}
                        </Badge>
                      </div>
                      <span className="text-sm">{curso.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        {curso.creditos} créd. · {horasSem} hrs/sem
                        {curso.facultad && ` · ${curso.facultad}`}
                      </span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
