import type {
  Monitoreo,
  Docente,
  ReporteDocencia,
  ReporteActividadDocencia,
  ReporteInvestigacion,
  ReporteProyeccion,
  ReporteGestion,
} from "@/generated/prisma/client"

import type { AgendaConRelaciones } from "./agenda"

export type MonitoreoConRelaciones = Monitoreo & {
  docente: Docente
  agenda: AgendaConRelaciones
  reportesDocencia: ReporteDocencia[]
  reportesActividadDocencia: ReporteActividadDocencia[]
  reportesInvestigacion: ReporteInvestigacion[]
  reportesProyeccion: ReporteProyeccion[]
  reportesGestion: ReporteGestion[]
}

/**
 * Estado visual de un reporte respecto a lo planificado.
 * - igual    → ejecutó exactamente lo planificado
 * - menos    → ejecutó menos horas (subejecución, requiere justificación)
 * - mas      → ejecutó más horas (sobreejecución)
 */
export type EstadoEjecucion = "igual" | "menos" | "mas"

export function compararEjecucion(
  planificadas: number,
  ejecutadas: number,
  tolerancia = 0.5,
): EstadoEjecucion {
  const diff = ejecutadas - planificadas
  if (Math.abs(diff) <= tolerancia) return "igual"
  return diff < 0 ? "menos" : "mas"
}
