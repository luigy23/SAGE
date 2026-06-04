"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import { FechaPicker } from "@/components/proyectos/FechaPicker"
import { aprobarProyectoAction } from "@/lib/actions/proyecto-actions"
import { TOPE_POR_ROL } from "@/lib/schemas/proyecto-schema"
import { periodosQueAbarca, type PeriodoRango } from "@/lib/utils/periodo"

const ROL_LABEL: Record<string, string> = {
  INVESTIGADOR_PRINCIPAL: "Investigador Principal",
  COINVESTIGADOR: "Coinvestigador",
  COORDINADOR: "Coordinador",
  COGESTOR: "Cogestor",
}

export type ParticipanteAprobar = {
  docenteId: string
  nombre: string
  rol: string
}

/**
 * Panel inline de revisión: el jefe/decano asigna las horas de cada participante
 * (con su tope) y confirma/ajusta las fechas del proyecto (que muestran los
 * semestres que abarca) ANTES de aprobar. Reemplaza el viejo botón-modal.
 */
export function ProyectoAprobarPanel({
  proyectoId,
  participantes,
  topes,
  fechaInicioInicial,
  fechaFinInicial,
  periodos,
}: {
  proyectoId: string
  participantes: ParticipanteAprobar[]
  topes?: Record<string, number>
  fechaInicioInicial?: string
  fechaFinInicial?: string
  periodos: PeriodoRango[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const topePorRol = (rol: string) => topes?.[rol] ?? TOPE_POR_ROL[rol] ?? 0

  const [horas, setHoras] = useState<Record<string, string>>(() =>
    Object.fromEntries(participantes.map((p) => [p.docenteId, String(topePorRol(p.rol))])),
  )
  const [fechaInicio, setFechaInicio] = useState<string | undefined>(fechaInicioInicial)
  const [fechaFin, setFechaFin] = useState<string | undefined>(fechaFinInicial)

  const semestres = useMemo(
    () => periodosQueAbarca(fechaInicio, fechaFin, periodos),
    [fechaInicio, fechaFin, periodos],
  )

  function handleAprobar() {
    const payload = {
      horas: participantes.map((p) => ({
        docenteId: p.docenteId,
        horas: Number(horas[p.docenteId]),
      })),
      fechaInicio,
      fechaFin,
    }
    startTransition(async () => {
      const res = await aprobarProyectoAction(proyectoId, payload)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success("Proyecto aprobado")
        router.refresh()
      }
    })
  }

  return (
    <Card className="border-green-600/30 bg-green-50/30 dark:bg-green-950/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle className="h-4 w-4 text-green-600" />
          Asignar horas y tiempo para aprobar
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Define las horas de cada participante (sin pasar del tope de su rol) y el tiempo del
          proyecto. Recién entonces podrás aprobarlo.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Horas por participante */}
        <div className="space-y-3">
          {participantes.map((p) => {
            const tope = topePorRol(p.rol)
            return (
              <div key={p.docenteId} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROL_LABEL[p.rol] ?? p.rol} · tope {tope} h
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={tope}
                  className="w-24"
                  value={horas[p.docenteId] ?? ""}
                  onChange={(e) =>
                    setHoras((prev) => ({ ...prev, [p.docenteId]: e.target.value }))
                  }
                />
              </div>
            )
          })}
        </div>

        {/* Tiempo del proyecto */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Tiempo del proyecto</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FechaPicker label="Inicio" value={fechaInicio} onChange={setFechaInicio} />
            <FechaPicker label="Fin" value={fechaFin} onChange={setFechaFin} />
          </div>
          {semestres.length > 0 ? (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Abarca{" "}
              <span className="font-medium text-foreground/80">
                {semestres.length} semestre{semestres.length !== 1 ? "s" : ""}
              </span>
              : {semestres.join(", ")}.
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Elige inicio y fin para ver los semestres que abarca.
            </p>
          )}
        </div>

        <Button
          className="gap-1.5 bg-green-600 hover:bg-green-700"
          onClick={handleAprobar}
          disabled={pending}
        >
          <CheckCircle className="h-4 w-4" />
          {pending ? "Aprobando..." : "Aprobar y asignar"}
        </Button>
      </CardContent>
    </Card>
  )
}
