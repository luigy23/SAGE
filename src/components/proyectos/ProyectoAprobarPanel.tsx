"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import { FechaPicker } from "@/components/proyectos/FechaPicker"
import { RechazarProyectoDialog } from "@/components/proyectos/RechazarProyectoDialog"
import { aprobarProyectoAction } from "@/lib/actions/proyecto-actions"
import { periodosQueAbarca, type PeriodoRango } from "@/lib/utils/periodo"

/**
 * Zona de decisión (paso final, después de revisar la info del proyecto). El
 * revisor confirma/ajusta el tiempo de duración y aprueba — o rechaza. Las HORAS
 * no se asignan acá: cada docente las define en su propia agenda (FO-19).
 */
export function ProyectoAprobarPanel({
  proyectoId,
  creadorNombre,
  fechaInicioInicial,
  fechaFinInicial,
  periodos,
}: {
  proyectoId: string
  creadorNombre: string
  fechaInicioInicial?: string
  fechaFinInicial?: string
  periodos: PeriodoRango[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [fechaInicio, setFechaInicio] = useState<string | undefined>(fechaInicioInicial)
  const [fechaFin, setFechaFin] = useState<string | undefined>(fechaFinInicial)

  const semestres = useMemo(
    () => periodosQueAbarca(fechaInicio, fechaFin, periodos),
    [fechaInicio, fechaFin, periodos],
  )

  function handleAprobar() {
    startTransition(async () => {
      const res = await aprobarProyectoAction(proyectoId, { fechaInicio, fechaFin })
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success("Proyecto aprobado")
        router.refresh()
      }
    })
  }

  return (
    <Card className="border-green-600/40 bg-green-50/40 dark:bg-green-950/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle className="h-4 w-4 text-green-600" />
          Decisión: confirmar tiempo y aprobar
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Revisaste la información de arriba. Confirmá o ajustá el tiempo de duración y aprobá. Las
          horas no se asignan acá: cada docente las define en su agenda (FO-19).
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Tiempo del proyecto */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Tiempo del proyecto</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FechaPicker label="Inicio" value={fechaInicio} onChange={setFechaInicio} />
            <FechaPicker label="Fin" value={fechaFin} onChange={setFechaFin} />
          </div>
          {semestres.length > 0 ? (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Las fechas caen en{" "}
              <span className="font-medium text-foreground/80">
                {semestres.length === 1 ? "el semestre" : "los semestres"} {semestres.join(", ")}
              </span>
              .
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Elegí inicio y fin para ver los semestres que abarca.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <Button
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            onClick={handleAprobar}
            disabled={pending}
          >
            <CheckCircle className="h-4 w-4" />
            {pending ? "Aprobando..." : "Aprobar proyecto"}
          </Button>
          <RechazarProyectoDialog proyectoId={proyectoId} docenteName={creadorNombre} />
        </div>
      </CardContent>
    </Card>
  )
}
