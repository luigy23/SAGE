"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import { enviarAgendaAction } from "@/lib/actions/agenda"
import { formatModalidad } from "@/lib/validations/agenda-rules"
import {
  AgendaValidationPanel,
  agendaHasErrors,
} from "../agenda-validation-panel"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { Send } from "lucide-react"

export function StepResumen({
  agenda,
  readOnly,
}: {
  agenda: AgendaConRelaciones
  readOnly: boolean
}) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotalCursos = agenda.cursos.reduce(
    (s, c) => s + c.dedicacionPeriodo,
    0
  )
  const subtotalDocencia = agenda.otrasActividadesDocencia.reduce(
    (s, a) => s + a.dedicacionPeriodo,
    0
  )
  const total1 = subtotalCursos + subtotalDocencia
  const total2 = agenda.actividadesInvestigacion.reduce(
    (s, a) => s + a.dedicacionPeriodo,
    0
  )
  const total3 = agenda.actividadesProyeccionSocial.reduce(
    (s, a) => s + a.dedicacionPeriodo,
    0
  )
  const total4 = agenda.actividadesGestion.reduce(
    (s, a) => s + a.dedicacionPeriodo,
    0
  )
  const granTotal = total1 + total2 + total3 + total4
  const hasErrors = agendaHasErrors(agenda)

  async function handleEnviar() {
    setSending(true)
    setError(null)
    const result = await enviarAgendaAction(agenda.id)
    setSending(false)
    if ("error" in result && result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Validation panel */}
      <AgendaValidationPanel agenda={agenda} />

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Agenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Docente info */}
          <div>
            <h3 className="mb-2 font-semibold">Docente</h3>
            <p className="text-sm">
              {agenda.docente.nombre} — {agenda.docente.cedula}
            </p>
            <p className="text-sm text-muted-foreground">
              {agenda.docente.facultad} | {agenda.docente.programa} |{" "}
              {formatModalidad(agenda.docente.modalidad)}
            </p>
          </div>

          <Separator />

          {/* Cursos */}
          <div>
            <h3 className="mb-2 font-semibold">
              1.0 Cursos ({agenda.cursos.length})
            </h3>
            {agenda.cursos.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {agenda.cursos.map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <span>
                      {c.numeroCurso} — {c.nombreCurso}
                    </span>
                    <span className="text-muted-foreground">
                      {c.dedicacionPeriodo}h
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sin cursos</p>
            )}
            <p className="mt-1 text-sm font-medium">
              Subtotal Cursos: {subtotalCursos}h
            </p>
          </div>

          {/* Otras docencia */}
          <div>
            <h3 className="mb-2 font-semibold">
              1.2 Otras Act. Docencia ({agenda.otrasActividadesDocencia.length})
            </h3>
            {agenda.otrasActividadesDocencia.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {agenda.otrasActividadesDocencia.map((a) => (
                  <li key={a.id} className="flex justify-between">
                    <span>{a.nombre}</span>
                    <span className="text-muted-foreground">
                      {a.dedicacionPeriodo}h
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sin actividades</p>
            )}
            <p className="mt-1 text-sm font-medium">
              Subtotal Otras Docencia: {subtotalDocencia}h
            </p>
          </div>

          <Separator />

          {/* Totals table */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">Totales</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>TOTAL 1 — Docencia (Cursos + Otras)</span>
                <span className="font-medium">{total1}h</span>
              </div>
              <div className="flex justify-between">
                <span>TOTAL 2 — Investigacion</span>
                <span className="font-medium">{total2}h</span>
              </div>
              <div className="flex justify-between">
                <span>TOTAL 3 — Proyeccion Social</span>
                <span className="font-medium">{total3}h</span>
              </div>
              <div className="flex justify-between">
                <span>TOTAL 4 — Gestion</span>
                <span className="font-medium">{total4}h</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>GRAN TOTAL</span>
                <span>{granTotal}h</span>
              </div>
            </div>
          </div>

          {/* Enviar button */}
          {!readOnly && (
            <div className="space-y-2">
              {error && <p className="text-sm text-destructive">{error}</p>}

              {hasErrors && (
                <p className="text-sm text-destructive">
                  Corrige los errores de validación antes de enviar la agenda.
                </p>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={hasErrors}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Agenda
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Enviar agenda</AlertDialogTitle>
                    <AlertDialogDescription>
                      Una vez enviada, la agenda no podra ser modificada ni
                      eliminada. Asegurate de que toda la informacion es correcta.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleEnviar}
                      disabled={sending}
                    >
                      {sending ? "Enviando..." : "Confirmar Envio"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {readOnly && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950">
              <p className="font-medium text-green-700 dark:text-green-300">
                Esta agenda ya fue enviada y no puede ser modificada.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
