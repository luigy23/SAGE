"use client"

import { useState, useTransition } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPlus, X } from "lucide-react"
import { buscarDocentesAction } from "@/lib/actions/proyecto-actions"
import { ROLES_POR_TIPO } from "@/lib/schemas/proyecto-schema"

const ROL_LABEL: Record<string, string> = {
  INVESTIGADOR_PRINCIPAL: "Investigador Principal",
  COINVESTIGADOR: "Coinvestigador",
  COORDINADOR: "Coordinador",
  COGESTOR: "Cogestor",
}

export type DocenteParticipante = {
  id: string
  nombre: string
  cedula: string
  programa: string
  rol: string
}

type DocenteBusqueda = {
  id: string
  nombre: string
  cedula: string
  programa: string
  facultad: string
  modalidad: string
}

export function ParticipantesSelector({
  value,
  onChange,
  tipo,
  excluirIds,
}: {
  value: DocenteParticipante[]
  onChange: (v: DocenteParticipante[]) => void
  tipo: "INVESTIGACION" | "PROYECCION_SOCIAL" | undefined
  /** IDs que no se pueden agregar (ej. el creador y los ya agregados). */
  excluirIds: string[]
}) {
  const [open, setOpen] = useState(false)
  const [resultados, setResultados] = useState<DocenteBusqueda[]>([])
  const [, startTransition] = useTransition()

  const roles = tipo ? ROLES_POR_TIPO[tipo] : []
  const rolPorDefecto = roles[roles.length - 1] ?? "" // el no-líder (coinvestigador/cogestor)

  function buscar(q: string) {
    startTransition(async () => {
      setResultados(await buscarDocentesAction(q))
    })
  }

  function agregar(d: DocenteBusqueda) {
    if (value.some((p) => p.id === d.id) || excluirIds.includes(d.id)) return
    onChange([
      ...value,
      { id: d.id, nombre: d.nombre, cedula: d.cedula, programa: d.programa, rol: rolPorDefecto },
    ])
    setOpen(false)
    setResultados([])
  }

  function quitar(id: string) {
    onChange(value.filter((p) => p.id !== id))
  }

  function cambiarRol(id: string, rol: string) {
    onChange(value.map((p) => (p.id === id ? { ...p, rol } : p)))
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  C.C. {p.cedula} · {p.programa}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={p.rol} onValueChange={(v) => cambiarRol(p.id, v)}>
                  <SelectTrigger className="h-9 w-[200px]">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROL_LABEL[r] ?? r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => quitar(p.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={!tipo}>
            <UserPlus className="h-4 w-4" />
            Agregar participante
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por cédula o nombre..."
              onValueChange={buscar}
            />
            <CommandList>
              <CommandEmpty>Escribí al menos 2 caracteres.</CommandEmpty>
              <CommandGroup heading="Docentes (activos, no cátedra)">
                {resultados
                  .filter((d) => !value.some((p) => p.id === d.id) && !excluirIds.includes(d.id))
                  .map((d) => (
                    <CommandItem key={d.id} value={d.id} onSelect={() => agregar(d)}>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{d.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          C.C. {d.cedula} · {d.programa}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {!tipo && (
        <p className="text-xs text-muted-foreground">
          Seleccioná primero el tipo de proyecto para definir los roles.
        </p>
      )}
    </div>
  )
}
