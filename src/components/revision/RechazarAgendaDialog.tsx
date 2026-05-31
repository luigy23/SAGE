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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { XCircle } from "lucide-react"
import { toast } from "sonner"
import { rechazarAgendaAction } from "@/lib/actions/revision"

export function RechazarAgendaDialog({
  agendaId,
  docenteName,
  periodo,
  triggerSize = "sm",
}: {
  agendaId: string
  docenteName: string
  periodo: string
  triggerSize?: "sm" | "default"
}) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [pending, startTransition] = useTransition()

  const canSubmit = motivo.trim().length >= 10

  function handleSubmit() {
    startTransition(async () => {
      const res = await rechazarAgendaAction(agendaId, motivo)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(`Agenda de ${docenteName} (${periodo}) rechazada`)
        setOpen(false)
        setMotivo("")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={triggerSize}
          className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          <XCircle className="h-3.5 w-3.5" />
          Rechazar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <XCircle className="h-5 w-5" />
            Rechazar Agenda
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{docenteName}</span> — Periodo{" "}
            <span className="font-mono">{periodo}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950">
            <p className="font-medium text-red-900 dark:text-red-200">Estado final</p>
            <p className="mt-1 text-xs text-red-800 dark:text-red-300">
              La agenda pasará a <span className="font-mono">RECHAZADO</span>. El docente
              verá el motivo de rechazo. Solo se puede revertir usando{" "}
              <span className="font-medium">Rehabilitar</span>.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo de rechazo <span className="text-destructive">*</span>{" "}
              <span className="text-xs text-muted-foreground">(mínimo 10 caracteres)</span>
            </Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Las horas de docencia superan el tope máximo para la modalidad. Corrija y reenvíe."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {motivo.trim().length}/10 mínimo
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!canSubmit || pending}
          >
            {pending ? "Rechazando..." : "Rechazar agenda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
