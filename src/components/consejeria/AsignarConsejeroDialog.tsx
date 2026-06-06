"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { asignarConsejeroAction } from "@/lib/actions/consejeria-actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { Check, ChevronsUpDown, Loader2, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export type DocenteAsignable = {
  id: string
  nombre: string
  programa: string
  facultad: string
}

export type CohorteAsignable = { cohorte: string; maxSemestres: number }

interface Props {
  docentes: DocenteAsignable[]
  /** Cohortes disponibles por programa (exclusividad ya resuelta en servidor). */
  cohortesPorPrograma: Record<string, CohorteAsignable[]>
  /** Decano/Superadmin ven el programa de cada docente; el jefe no lo necesita. */
  mostrarPrograma: boolean
}

export function AsignarConsejeroDialog({ docentes, cohortesPorPrograma, mostrarPrograma }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [docenteId, setDocenteId] = useState<string>("")
  const [cohorte, setCohorte] = useState<string>("")
  const [semestres, setSemestres] = useState<string>("")

  const docente = useMemo(() => docentes.find((d) => d.id === docenteId) ?? null, [docentes, docenteId])
  const cohortesDisponibles = docente ? cohortesPorPrograma[docente.programa] ?? [] : []
  const cohorteSel = cohortesDisponibles.find((c) => c.cohorte === cohorte) ?? null
  const maxSemestres = cohorteSel?.maxSemestres ?? 0

  function reset() {
    setDocenteId("")
    setCohorte("")
    setSemestres("")
    setPickerOpen(false)
  }

  function seleccionarDocente(id: string) {
    setDocenteId(id)
    setCohorte("")
    setSemestres("")
    setPickerOpen(false)
  }

  function seleccionarCohorte(c: string) {
    setCohorte(c)
    const max = (docente ? cohortesPorPrograma[docente.programa] ?? [] : []).find((x) => x.cohorte === c)?.maxSemestres ?? 0
    setSemestres(String(max)) // por defecto, la vida restante completa
  }

  function handleAsignar() {
    if (!docenteId || !cohorte || !semestres) return
    startTransition(async () => {
      const result = await asignarConsejeroAction({
        docenteId,
        cohorte,
        semestres: Number(semestres),
      })
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(`${docente?.nombre} asignado como consejero de la cohorte ${cohorte}.`)
      router.refresh()
      reset()
      setOpen(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) reset() }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Asignar consejero
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar consejero</DialogTitle>
          <DialogDescription>
            Asigná un docente como consejero de una cohorte. Solo aparecen cohortes vigentes
            sin consejero en el programa del docente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Docente */}
          <div className="space-y-1.5">
            <Label>Docente</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {docente ? docente.nombre : "Seleccionar docente…"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por nombre…" />
                  <CommandList>
                    <CommandEmpty>No hay docentes en tu ámbito.</CommandEmpty>
                    <CommandGroup>
                      {docentes.map((d) => (
                        <CommandItem
                          key={d.id}
                          value={`${d.nombre} ${d.programa}`}
                          onSelect={() => seleccionarDocente(d.id)}
                        >
                          <Check className={cn("mr-2 h-4 w-4", d.id === docenteId ? "opacity-100" : "opacity-0")} />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{d.nombre}</span>
                            {mostrarPrograma && (
                              <span className="truncate text-xs text-muted-foreground">{d.programa}</span>
                            )}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Cohorte */}
          <div className="space-y-1.5">
            <Label>Cohorte</Label>
            <Select value={cohorte} onValueChange={seleccionarCohorte} disabled={!docente}>
              <SelectTrigger>
                <SelectValue placeholder={!docente ? "Elegí un docente primero" : "Seleccionar cohorte…"} />
              </SelectTrigger>
              <SelectContent>
                {cohortesDisponibles.map((c) => (
                  <SelectItem key={c.cohorte} value={c.cohorte}>
                    {c.cohorte} · hasta {c.maxSemestres} sem
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {docente && cohortesDisponibles.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay cohortes libres en {docente.programa} para este período.
              </p>
            )}
          </div>

          {/* Duración */}
          <div className="space-y-1.5">
            <Label>Duración del compromiso</Label>
            <Select value={semestres} onValueChange={setSemestres} disabled={!cohorteSel}>
              <SelectTrigger>
                <SelectValue placeholder="Semestres…" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxSemestres }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} semestre{n > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAsignar}
            disabled={isPending || !docenteId || !cohorte || !semestres}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Asignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
