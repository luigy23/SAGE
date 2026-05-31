"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { Prisma } from "@/generated/prisma/client"
import type {
  AuditoriaFilters,
  AuditoriaPage,
  AuditoriaStats,
} from "@/lib/types/auditoria"

async function ensureSuperadmin() {
  const session = await auth()
  if (!session?.user || session.user.rol !== "SUPERADMIN") {
    throw new Error("No autorizado. Se requieren privilegios de SuperAdmin.")
  }
  return session.user
}

function buildWhere(f: AuditoriaFilters): Prisma.AuditoriaLogWhereInput {
  const where: Prisma.AuditoriaLogWhereInput = {}

  if (f.entidad) where.entidad = f.entidad
  if (f.accion) where.accion = f.accion
  if (f.actorId) where.actorId = f.actorId

  if (f.q) {
    where.OR = [
      { actorNombre: { contains: f.q, mode: "insensitive" } },
      { recursoDesc: { contains: f.q, mode: "insensitive" } },
    ]
  }

  if (f.desde || f.hasta) {
    where.creadoEn = {
      ...(f.desde ? { gte: new Date(f.desde) } : {}),
      ...(f.hasta ? { lte: new Date(`${f.hasta}T23:59:59.999Z`) } : {}),
    }
  }

  return where
}

export async function getAuditoriaLogs(filters: AuditoriaFilters): Promise<AuditoriaPage> {
  await ensureSuperadmin()

  const page = filters.page ?? 1
  const perPage = filters.perPage ?? 25
  const where = buildWhere(filters)

  const [total, items] = await Promise.all([
    prisma.auditoriaLog.count({ where }),
    prisma.auditoriaLog.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function getAuditoriaStats(): Promise<AuditoriaStats> {
  await ensureSuperadmin()

  const ahora = new Date()
  const inicioDia = new Date(ahora)
  inicioDia.setHours(0, 0, 0, 0)

  const inicioSemana = new Date(ahora)
  inicioSemana.setDate(ahora.getDate() - 7)
  inicioSemana.setHours(0, 0, 0, 0)

  const [totalHoy, totalSemana, porEntidadRaw, porAccionRaw] = await Promise.all([
    prisma.auditoriaLog.count({ where: { creadoEn: { gte: inicioDia } } }),
    prisma.auditoriaLog.count({ where: { creadoEn: { gte: inicioSemana } } }),
    prisma.auditoriaLog.groupBy({
      by: ["entidad"],
      _count: { entidad: true },
      orderBy: { _count: { entidad: "desc" } },
    }),
    prisma.auditoriaLog.groupBy({
      by: ["accion"],
      _count: { accion: true },
      orderBy: { _count: { accion: "desc" } },
    }),
  ])

  return {
    totalHoy,
    totalSemana,
    porEntidad: porEntidadRaw.map((r) => ({ entidad: r.entidad, count: r._count.entidad })),
    porAccion: porAccionRaw.map((r) => ({ accion: r.accion, count: r._count.accion })),
  }
}
