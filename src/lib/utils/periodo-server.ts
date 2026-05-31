import "server-only"
import { prisma } from "@/lib/prisma"

/**
 * Devuelve el nombre del período académico activo (ABIERTO).
 * Server-only — nunca debe llegar al bundle del cliente porque importa Prisma/pg.
 *
 * Retorna `null` cuando no hay ningún período ABIERTO.
 * Los callers deben manejar este caso explícitamente — no existe fallback silencioso.
 */
export async function getPeriodoActivo(): Promise<string | null> {
  const periodo = await prisma.periodoAcademico.findFirst({
    where: { estado: "ABIERTO" },
    orderBy: { fechaInicio: "desc" },
    select: { nombre: true },
  })
  return periodo?.nombre ?? null
}

/**
 * Devuelve el período activo junto con sus fechas, semanas calculadas y ventanas de
 * diligenciamiento. Úsalo en páginas de docentes para decidir qué mostrar.
 */
export async function getPeriodoActivoConFechas(): Promise<{
  nombre: string
  fechaInicio: Date
  fechaFin: Date
  semanasCalculadas: number
  agendaDesde: Date | null
  agendaHasta: Date | null
  monitoreoDesde: Date | null
  monitoreoHasta: Date | null
} | null> {
  const periodo = await prisma.periodoAcademico.findFirst({
    where: { estado: "ABIERTO" },
    orderBy: { fechaInicio: "desc" },
    select: {
      nombre: true,
      fechaInicio: true,
      fechaFin: true,
      agendaDesde: true,
      agendaHasta: true,
      monitoreoDesde: true,
      monitoreoHasta: true,
    },
  })
  if (!periodo) return null
  const ms = periodo.fechaFin.getTime() - periodo.fechaInicio.getTime()
  const semanasCalculadas = Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)))
  return { ...periodo, semanasCalculadas }
}
