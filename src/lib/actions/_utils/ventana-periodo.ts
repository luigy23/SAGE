import { prisma } from "@/lib/prisma"

/** Valida que `now` esté dentro de la ventana de envío de agendas del período. */
export async function validarVentanaAgenda(
  periodo: string
): Promise<{ error: string } | null> {
  const periodoRow = await prisma.periodoAcademico.findFirst({
    where: { nombre: periodo },
    select: { agendaDesde: true, agendaHasta: true },
  })
  if (!periodoRow) return null // si no hay período configurado, no bloqueamos
  const now = new Date()
  if (periodoRow.agendaDesde && now < periodoRow.agendaDesde)
    return { error: "La ventana de envío de agendas aún no ha abierto." }
  if (periodoRow.agendaHasta && now > periodoRow.agendaHasta)
    return { error: "La ventana de envío de agendas ya cerró." }
  return null
}

/** Valida que `now` esté dentro de la ventana de envío de monitoreos del período. */
export async function validarVentanaMonitoreo(
  periodo: string
): Promise<{ error: string } | null> {
  const periodoRow = await prisma.periodoAcademico.findFirst({
    where: { nombre: periodo },
    select: { monitoreoDesde: true, monitoreoHasta: true },
  })
  if (!periodoRow) return null
  const now = new Date()
  if (periodoRow.monitoreoDesde && now < periodoRow.monitoreoDesde)
    return { error: "La ventana de envío de monitoreos aún no ha abierto." }
  if (periodoRow.monitoreoHasta && now > periodoRow.monitoreoHasta)
    return { error: "La ventana de envío de monitoreos ya cerró." }
  return null
}
