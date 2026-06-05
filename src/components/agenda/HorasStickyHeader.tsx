"use client"

import { useWatch } from "react-hook-form"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Sticky header que muestra el progreso de horas SEMESTRALES en tiempo real.
 *
 * Suma directamente `dedicacionPeriodo` de cada item (ya está en horas semestrales).
 *
 * Lógica de colores:
 * - Normal (dentro del límite): fondo secundario
 * - Exceso bloqueante (granTotal > horasTotalesPeriodo): fondo destructive
 * - Advertencia (granTotal > horasTotalesPeriodo pero modalidad no estricta): amarillo
 */
export function HorasStickyHeader({
  horasTotalesPeriodo,
  esEstricto,
  periodo,
  sinTope = false,
}: {
  horasTotalesPeriodo: number
  esEstricto: boolean
  periodo: string
  /** INVITADO sin horas autorizadas aún: no hay tope semestral que mostrar/exigir. */
  sinTope?: boolean
}) {
  // useWatch escucha cambios reactivamente sin causar re-render del form completo
  const cursos = useWatch<AgendaWizardFormData, "cursos">({ name: "cursos" }) || []
  const otrasDocencia = useWatch<AgendaWizardFormData, "otrasActividadesDocencia">({ name: "otrasActividadesDocencia" }) || []
  const investigacion = useWatch<AgendaWizardFormData, "actividadesInvestigacion">({ name: "actividadesInvestigacion" }) || []
  const proyeccion = useWatch<AgendaWizardFormData, "actividadesProyeccionSocial">({ name: "actividadesProyeccionSocial" }) || []
  const gestion = useWatch<AgendaWizardFormData, "actividadesGestion">({ name: "actividadesGestion" }) || []

  const sumPeriodo = (items: { dedicacionPeriodo?: number }[]) =>
    items.reduce((acc, item) => acc + (Number(item?.dedicacionPeriodo) || 0), 0)

  const totalSemestral =
    sumPeriodo(cursos) +
    sumPeriodo(otrasDocencia) +
    sumPeriodo(investigacion) +
    sumPeriodo(proyeccion) +
    sumPeriodo(gestion)

  // Redondear a 1 decimal para display limpio
  const totalHoras = Math.round(totalSemestral * 10) / 10

  const porcentaje = sinTope ? 0 : Math.min((totalHoras / horasTotalesPeriodo) * 100, 100)
  const excedido = !sinTope && totalHoras > horasTotalesPeriodo

  type Estado = "normal" | "advertencia" | "exceso"
  let estado: Estado = "normal"
  if (excedido && esEstricto) estado = "exceso"
  else if (excedido && !esEstricto) estado = "advertencia"

  const containerClasses = cn(
    "relative block w-full mb-6 rounded-lg border px-4 py-3 shadow-sm transition-colors duration-300 print:hidden",
    {
      "bg-card border-border text-card-foreground": estado === "normal",
      "bg-destructive/10 border-destructive/30": estado === "exceso",
      "bg-yellow-500/10 border-yellow-500/30": estado === "advertencia",
    }
  )

  const textClasses = cn("text-sm font-semibold tabular-nums", {
    "text-secondary-foreground": estado === "normal",
    "text-destructive": estado === "exceso",
    "text-yellow-700 dark:text-yellow-400": estado === "advertencia",
  })

  const barClasses = cn("h-2 rounded-full transition-all duration-500 ease-out", {
    "bg-primary": estado === "normal" && porcentaje < 80,
    "bg-yellow-500": estado === "normal" && porcentaje >= 80,
    "bg-destructive": estado === "exceso",
    "bg-yellow-500 dark:bg-yellow-400": estado === "advertencia",
  })

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between gap-4">
        {/* Título y periodo */}
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span>FO-19 Agenda Semestral</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
            {periodo}
          </span>
        </div>

        {/* Contador de horas */}
        <div className="flex items-center gap-2">
          {estado === "normal" && totalHoras > 0 && (
            <CheckCircle className="h-4 w-4 text-primary" />
          )}
          {estado === "exceso" && (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          {estado === "advertencia" && (
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          )}
          <span className={textClasses}>
            {sinTope
              ? `${totalHoras} hrs · sin tope asignado`
              : `${totalHoras} / ${horasTotalesPeriodo} hrs/semestre`}
          </span>
        </div>
      </div>

      {/* Barra de progreso — oculta cuando no hay tope de referencia */}
      {!sinTope && (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={barClasses}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      )}

      {/* Invitado sin horas autorizadas: aún no hay tope (Art. 4f) */}
      {sinTope && (
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">
          ℹ️ Aún no se han asignado las horas del invitado. Puedes diligenciar la agenda; el tope lo
          fijará tu decano / Consejo Académico al revisarla (Art. 4f, Acuerdo 048).
        </p>
      )}

      {/* Mensajes de estado */}
      {estado === "exceso" && (
        <p className="mt-1.5 text-xs font-medium text-destructive">
          ⛔ La dedicación supera el máximo permitido del semestre. Debe reducir horas para poder enviar.
        </p>
      )}
      {estado === "advertencia" && (
        <p className="mt-1.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
          ⚠️ Advertencia: La dedicación supera el techo de referencia del semestre. Puede enviar, pero se recomienda verificar.
        </p>
      )}
    </div>
  )
}
