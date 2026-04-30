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
import { Input } from "@/components/ui/input"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { rehabilitarAgenda } from "@/lib/actions/superadmin-actions"

export function RehabilitarAgendaDialog({
  agendaId,
  docenteName,
  periodo,
}: {
  agendaId: string
  docenteName: string
  periodo: string
}) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [confirm, setConfirm] = useState("")
  const [pending, startTransition] = useTransition()

  const expectedConfirm = `REHABILITAR ${periodo}`
  const canSubmit =
    motivo.trim().length >= 10 && confirm === expectedConfirm

  function handleSubmit() {
    startTransition(async () => {
      const res = await rehabilitarAgenda(agendaId, motivo, observaciones || null)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(`Agenda de ${docenteName} (${periodo}) rehabilitada`)
        setOpen(false)
        setMotivo("")
        setObservaciones("")
        setConfirm("")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Rehabilitar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Rehabilitar Agenda
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{docenteName}</span> — Periodo{" "}
            <span className="font-mono">{periodo}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm dark:border-yellow-800 dark:bg-yellow-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
            <div className="text-yellow-900 dark:text-yellow-200">
              <p className="font-medium">Acción auditada</p>
              <p className="text-xs mt-1">
                La agenda volverá a <span className="font-mono">BORRADOR</span> y el docente podrá editarla.
                El motivo, fecha y tu identidad quedarán registrados permanentemente.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo <span className="text-destructive">*</span>{" "}
              <span className="text-xs text-muted-foreground">(mínimo 10 caracteres)</span>
            </Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Solicitud del docente vía correo del 28/04/2026 para corregir horas de Investigación."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">
              Observaciones adicionales{" "}
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Para confirmar, escribe{" "}
              <code className="rounded bg-muted px-1 text-xs">{expectedConfirm}</code>
            </Label>
            <Input
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={expectedConfirm}
            />
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
            {pending ? "Rehabilitando..." : "Rehabilitar agenda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
