import "server-only"
import { prisma } from "@/lib/prisma"

/**
 * Devuelve el nombre del período académico activo (ABIERTO).
 * Server-only — nunca debe llegar al bundle del cliente porque importa Prisma/pg.
 *
 * Si hay varios abiertos, retorna el más reciente por fechaInicio.
 * Si ninguno está abierto, hace fallback a un cálculo basado en mes
 * para no romper la app — pero ese caso no debería ocurrir en producción.
 */
export async function getPeriodoActivo(): Promise<string> {
  const periodo = await prisma.periodoAcademico.findFirst({
    where: { estado: "ABIERTO" },
    orderBy: { fechaInicio: "desc" },
    select: { nombre: true },
  })

  if (periodo) return periodo.nombre

  // Fallback: ningún período abierto en DB → derivar por mes
  const hoy = new Date()
  const año = hoy.getFullYear()
  const mes = hoy.getMonth() + 1
  const semestre = mes <= 6 ? 1 : 2
  return `${año}-${semestre}`
}
