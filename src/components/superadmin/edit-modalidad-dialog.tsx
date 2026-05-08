"use client"

import { useState, useTransition } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { updateParametrosModalidad } from "@/lib/actions/superadmin-actions"

type ParametroModalidad = {
  id: string
  modalidad: string
  sedeAplicable: string | null
  horasSemanalMax: number
  /** null = derivado en runtime (horasSemanalMax × semanasPeriodo). */
  horasSemestralMax: number | null
  horasSemestralEstricto: boolean
  minDocencia: number | null
  minDocenciaConProyectos: number | null
  maxInvProySocSemanal: number | null
  activo: boolean
}

function nullableNumber(s: string): number | null {
  if (s.trim() === "") return null
  const n = parseFloat(s)
  return Number.isNaN(n) ? null : n
}

export function EditModalidadDialog({ parametro }: { parametro: ParametroModalidad }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [horasSemanalMax, setHorasSemanalMax] = useState(parametro.horasSemanalMax.toString())
  const [horasSemestralMax, setHorasSemestralMax] = useState(parametro.horasSemestralMax?.toString() ?? "")
  const [estricto, setEstricto] = useState(parametro.horasSemestralEstricto)
  const [minDocencia, setMinDocencia] = useState(parametro.minDocencia?.toString() ?? "")
  const [minDocenciaProy, setMinDocenciaProy] = useState(parametro.minDocenciaConProyectos?.toString() ?? "")
  const [maxInvPs, setMaxInvPs] = useState(parametro.maxInvProySocSemanal?.toString() ?? "")
  const [activo, setActivo] = useState(parametro.activo)

  function handleSave() {
    startTransition(async () => {
      const res = await updateParametrosModalidad(parametro.id, {
        horasSemanalMax: parseInt(horasSemanalMax, 10),
        horasSemestralMax:
          horasSemestralMax.trim() === "" ? null : parseInt(horasSemestralMax, 10),
        horasSemestralEstricto: estricto,
        minDocencia: minDocencia.trim() === "" ? null : parseInt(minDocencia, 10),
        minDocenciaConProyectos: minDocenciaProy.trim() === "" ? null : parseInt(minDocenciaProy, 10),
        maxInvProySocSemanal: nullableNumber(maxInvPs),
        activo,
      })
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(`${parametro.modalidad}${parametro.sedeAplicable ? ` / ${parametro.sedeAplicable}` : ""} actualizado`)
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {parametro.modalidad}
            {parametro.sedeAplicable && ` — ${parametro.sedeAplicable}`}
          </DialogTitle>
          <DialogDescription>
            Acuerdo 048/2018 — Art. 3, Art. 4. Vacío = no aplica esta regla.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hsem">Horas/sem máx.</Label>
            <Input id="hsem" type="number" value={horasSemanalMax} onChange={(e) => setHorasSemanalMax(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hsemestre">Horas/semestre máx.</Label>
            <Input
              id="hsemestre"
              type="number"
              placeholder="(derivado: h/sem × semanas)"
              value={horasSemestralMax}
              onChange={(e) => setHorasSemestralMax(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Vacío = se calcula como horas semanales × semanas del período (Art. 4c/4d/4e/4f).
              Solo PLANTA TC/MT lo tienen fijo por norma (Art. 4a/4b).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mindoc">Mín. docencia</Label>
            <Input id="mindoc" type="number" placeholder="(vacío)" value={minDocencia} onChange={(e) => setMinDocencia(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mindoc-proy">Mín. docencia con proy.</Label>
            <Input id="mindoc-proy" type="number" placeholder="(vacío)" value={minDocenciaProy} onChange={(e) => setMinDocenciaProy(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="maxinvps">Máx Inv+PS semanal (catedráticos)</Label>
            <Input id="maxinvps" type="number" placeholder="(vacío)" value={maxInvPs} onChange={(e) => setMaxInvPs(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch id="estricto" checked={estricto} onCheckedChange={setEstricto} />
            <Label htmlFor="estricto" className="cursor-pointer">
              Bloqueo estricto al envío
            </Label>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch id="activo" checked={activo} onCheckedChange={setActivo} />
            <Label htmlFor="activo" className="cursor-pointer">
              Regla activa
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
