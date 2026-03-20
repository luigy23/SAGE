"use client"

import { useActionState, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createAgendaAction } from "@/lib/actions/agenda"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

function generatePeriodos() {
  const currentYear = new Date().getFullYear()
  const periodos: string[] = []
  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    periodos.push(`${year}-1`)
    periodos.push(`${year}-2`)
  }
  return periodos
}

export default function NuevaAgendaPage() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createAgendaAction, null)
  const [periodo, setPeriodo] = useState("")
  const periodos = useMemo(() => generatePeriodos(), [])

  useEffect(() => {
    if (state?.success && state.agendaId) {
      router.push(`/agenda/${state.agendaId}`)
    }
  }, [state, router])

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-3xl font-bold">Nueva Agenda Semestral</h1>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Periodo</CardTitle>
          <CardDescription>
            Selecciona el periodo academico y la fecha de inicio para crear tu
            agenda semestral.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="periodo" value={periodo} />

            <div className="space-y-2">
              <Label>Periodo Academico</Label>
              <Select value={periodo} onValueChange={setPeriodo} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" name="fecha" type="date" required />
            </div>

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={pending || !periodo}>
                {pending ? "Creando..." : "Crear Agenda"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/agenda")}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
