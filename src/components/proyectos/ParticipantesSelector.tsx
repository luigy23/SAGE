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
import { Input } from "@/components/ui/input"
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
  /** Horas propuestas (≤ tope del rol). El revisor las confirma al aprobar. */
  horas?: number | null
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
  topes,
}: {
  value: DocenteParticipante[]
  onChange: (v: DocenteParticipante[]) => void
  tipo: "INVESTIGACION" | "PROYECCION_SOCIAL" | undefined
  /** IDs que no se pueden agregar (ej. el creador y los ya agregados). */
  excluirIds: string[]
  /** Tope de horas por rol (para mostrar el máximo en el input). Opcional. */
  topes?: Record<string, number>
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

  function cambiarHoras(id: string, horas: number | null) {
    onChange(value.map((p) => (p.id === id ? { ...p, horas } : p)))
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
                  <SelectTrigger className="h-9 w-[180px]">
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
                <div className="flex flex-col">
                  <Input
                    type="number"
                    min={0}
                    max={topes?.[p.rol]}
                    placeholder="Horas"
                    value={p.horas ?? ""}
                    onChange={(e) =>
                      cambiarHoras(p.id, e.target.value === "" ? null : Number(e.target.value))
                    }
                    className="h-9 w-24"
                    title="Horas propuestas (el revisor confirma)"
                  />
                  {topes?.[p.rol] != null && (
                    <span className="mt-0.5 text-[10px] text-muted-foreground">máx {topes[p.rol]}h</span>
                  )}
                </div>
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

      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          // Al abrir, precargar la lista de docentes activos (sin filtro).
          if (o) buscar("")
        }}
      >
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
              <CommandEmpty>No se encontraron docentes activos.</CommandEmpty>
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
