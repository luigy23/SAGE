"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { UserPlus } from "lucide-react"
import { getModalidadLabel } from "@/lib/utils/modalidad"

export type DocenteAgendaOpcion = {
  id: string
  nombre: string
  modalidad: Parameters<typeof getModalidadLabel>[0]
  programa: string
  agenda: { id: string; estado: string } | null
}

const ESTADO_CLASE: Record<string, string> = {
  APROBADO: "border-green-500 text-green-700",
  ENVIADO: "border-yellow-500 text-yellow-700",
  RECHAZADO: "border-red-500 text-red-700",
  BORRADOR: "",
}

/**
 * Selector de docente para crear/continuar su agenda de forma delegada.
 * Reemplaza el viejo panel de "solo No-Planta": aquí la autoridad elige a
 * CUALQUIER docente de su ámbito (planta y No-Planta) y va a su formulario.
 */
export function CrearAgendaDocentePicker({ docentes }: { docentes: DocenteAgendaOpcion[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Crear agenda para un docente
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Buscar docente por nombre…" />
          <CommandList>
            <CommandEmpty>No hay docentes en tu ámbito.</CommandEmpty>
            <CommandGroup>
              {docentes.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`${d.nombre} ${d.programa}`}
                  onSelect={() => {
                    setOpen(false)
                    router.push(`/gestion/agendas/nueva/${d.id}`)
                  }}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{d.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {getModalidadLabel(d.modalidad)} · {d.programa}
                    </p>
                  </div>
                  {d.agenda ? (
                    <Badge variant="outline" className={`shrink-0 ${ESTADO_CLASE[d.agenda.estado] ?? ""}`}>
                      {d.agenda.estado}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">Sin agenda</Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
