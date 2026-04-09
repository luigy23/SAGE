"use client"

import { useFormContext, useWatch } from "react-hook-form"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Sticky header que muestra el progreso de horas en tiempo real.
 *
 * Usa useWatch() para escuchar cambios en todos los arrays del formulario
 * y sumar dinámicamente el campo dedicacionPeriodo de cada item.
 *
 * Lógica de colores:
 * - Normal (dentro del límite): fondo secundario
 * - Exceso bloqueante (TCP/TCO > 40, MTP/MTC > 20): fondo destructive
 * - Advertencia CATEDRA (> 40 pero no bloquea): fondo amarillo
 */
export function HorasStickyHeader({
  maxHoras,
  esEstricto,
  periodo,
}: {
  maxHoras: number
  esEstricto: boolean
  periodo: string
}) {
  // useWatch escucha cambios reactivamente sin causar re-render del form completo
  const cursos = useWatch<AgendaWizardFormData, "cursos">({ name: "cursos" }) || []
  const otrasDocencia = useWatch<AgendaWizardFormData, "otrasActividadesDocencia">({ name: "otrasActividadesDocencia" }) || []
  const investigacion = useWatch<AgendaWizardFormData, "actividadesInvestigacion">({ name: "actividadesInvestigacion" }) || []
  const proyeccion = useWatch<AgendaWizardFormData, "actividadesProyeccionSocial">({ name: "actividadesProyeccionSocial" }) || []
  const gestion = useWatch<AgendaWizardFormData, "actividadesGestion">({ name: "actividadesGestion" }) || []

  // ==========================================
  // Normalización: convertir horas semestrales → horas semanales
  // Cursos: dividir por su campo 'semanas' propio
  // Actividades: dividir por 22 semanas (máximo Acuerdo 048)
  // ==========================================
  const SEMANAS_DEFAULT = 22

  const sumCursosWeekly = (items: { dedicacionPeriodo?: number; semanas?: number }[]) =>
    items.reduce((acc, item) => {
      const dedicacion = Number(item?.dedicacionPeriodo) || 0
      const semanas = Number(item?.semanas) || SEMANAS_DEFAULT
      return acc + (semanas > 0 ? dedicacion / semanas : 0)
    }, 0)

  const sumActividadesWeekly = (items: { dedicacionPeriodo?: number }[]) =>
    items.reduce((acc, item) => {
      const dedicacion = Number(item?.dedicacionPeriodo) || 0
      return acc + (dedicacion / SEMANAS_DEFAULT)
    }, 0)

  const totalHorasSemanales =
    sumCursosWeekly(cursos) +
    sumActividadesWeekly(otrasDocencia) +
    sumActividadesWeekly(investigacion) +
    sumActividadesWeekly(proyeccion) +
    sumActividadesWeekly(gestion)

  // Redondear a 1 decimal para display limpio
  const totalHoras = Math.round(totalHorasSemanales * 10) / 10

  // Calcular porcentaje para la barra de progreso (capped at 100%)
  const porcentaje = Math.min((totalHoras / maxHoras) * 100, 100)
  const excedido = totalHoras > maxHoras

  // Determinar estado visual
  type Estado = "normal" | "advertencia" | "exceso"
  let estado: Estado = "normal"
  if (excedido && esEstricto) estado = "exceso"
  else if (excedido && !esEstricto) estado = "advertencia"

  // Clases condicionales según estado
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
            {totalHoras} / {maxHoras} hrs/semana
          </span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={barClasses}
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {/* Mensajes de estado */}
      {estado === "exceso" && (
        <p className="mt-1.5 text-xs font-medium text-destructive">
          ⛔ La dedicación supera el máximo permitido. Debe reducir horas para poder enviar.
        </p>
      )}
      {estado === "advertencia" && (
        <p className="mt-1.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
          ⚠️ Advertencia: Revisar carga horaria de Cátedra. Puede enviar, pero se recomienda verificar.
        </p>
      )}
    </div>
  )
}
