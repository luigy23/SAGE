"use client"

import { useState } from "react"
import type { CursoGuardado } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
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
import { Search, Check } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Combobox de autocompletado para importar un curso desde los CursoGuardado del docente.
 *
 * Funcionalidad:
 * - Botón trigger que abre un popover con búsqueda
 * - Filtra cursos guardados por nombre o número de curso
 * - Al seleccionar, ejecuta onSelect con el CursoGuardado completo
 * - El componente padre (StepDocencia) usa setValue para rellenar todos los campos
 *
 * Nota: El campo nombreCurso también es un Input libre (se puede escribir manualmente).
 * Este Combobox es un atajo para importar datos de cursos ya guardados.
 */
export function CursoCombobox({
  cursosGuardados,
  selectedNombre,
  onSelect,
}: {
  cursosGuardados: CursoGuardado[]
  selectedNombre?: string
  onSelect: (curso: CursoGuardado) => void
}) {
  const [open, setOpen] = useState(false)

  function handleSelect(curso: CursoGuardado) {
    onSelect(curso)
    setOpen(false)
  }

  if (cursosGuardados.length === 0) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          title="Importar desde cursos guardados"
          aria-label="Buscar en cursos guardados"
        >
          <Search className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nombre o código..." />
          <CommandList>
            <CommandEmpty>
              No se encontraron cursos guardados.
            </CommandEmpty>
            <CommandGroup heading="Cursos guardados">
              {cursosGuardados.map((curso) => (
                <CommandItem
                  key={curso.id}
                  value={`${curso.numeroCurso} ${curso.nombreCurso}`}
                  onSelect={() => handleSelect(curso)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      selectedNombre === curso.nombreCurso
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {curso.numeroCurso} — {curso.nombreCurso}
                    </span>
                    {(curso.subgrupo || curso.sede) && (
                      <span className="text-xs text-muted-foreground">
                        {[curso.subgrupo, curso.sede]
                          .filter(Boolean)
                          .join(" | ")}
                      </span>
                    )}
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
