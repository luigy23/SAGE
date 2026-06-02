import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { CalendarRange } from "lucide-react"
import { derivarPeriodosDeContrato } from "@/lib/utils/vinculacion"

/**
 * Muestra los periodos académicos que cubre el contrato de un docente temporal
 * (ocasional / visitante / cátedra visitante), derivados del rango
 * `vinculacionDesde`–`vinculacionHasta`. Soporta contratos multi-semestre
 * (ej. ocasional de ~11 meses que trabaja en dos semestres).
 *
 * Server Component: consulta los periodos directamente. No renderiza nada si
 * el contrato no tiene rango de fechas.
 */
export async function PeriodosCubiertos({
  vinculacionDesde,
  vinculacionHasta,
  className,
}: {
  vinculacionDesde: Date | null | undefined
  vinculacionHasta: Date | null | undefined
  className?: string
}) {
  if (!vinculacionDesde || !vinculacionHasta) return null

  const periodos = await prisma.periodoAcademico.findMany({
    select: { nombre: true, fechaInicio: true, fechaFin: true },
    orderBy: { fechaInicio: "asc" },
  })

  const cubiertos = derivarPeriodosDeContrato(vinculacionDesde, vinculacionHasta, periodos)
  if (cubiertos.length === 0) return null

  const fmt = (d: Date) =>
    d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })

  return (
    <div
      className={
        "rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/30 " +
        (className ?? "")
      }
    >
      <div className="mb-2 flex items-center gap-2 font-medium text-blue-900 dark:text-blue-200">
        <CalendarRange className="h-4 w-4" />
        Semestres que cubre el contrato
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        Vinculación del {fmt(vinculacionDesde)} al {fmt(vinculacionHasta)}.
      </p>
      <div className="flex flex-wrap gap-2">
        {cubiertos.map((p) => (
          <Badge key={p.nombre} variant="secondary" className="font-mono">
            {p.nombre} · {p.semanasEnPeriodo} sem
          </Badge>
        ))}
      </div>
    </div>
  )
}
