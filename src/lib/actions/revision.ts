"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import type { Prisma } from "@/generated/prisma/client"
import type { RevisionFilters, RevisionPage } from "@/lib/types/revision"

// =====================================================================
// Guard común — ADMIN o SUPERADMIN
// =====================================================================

async function ensureAdmin() {
  const session = await auth()
  const rol = session?.user?.rol
  if (!session?.user || (rol !== "ADMIN" && rol !== "SUPERADMIN")) {
    throw new Error("No autorizado. Se requiere ADMIN o SUPERADMIN.")
  }
  return session.user
}

// =====================================================================
// WHERE builders
// =====================================================================

function buildDocenteWhere(f: RevisionFilters): Prisma.DocenteWhereInput | undefined {
  const where: Prisma.DocenteWhereInput = {}
  if (f.modalidad) where.modalidad = f.modalidad
  if (f.sede) where.sedeBase = f.sede
  if (f.facultad) where.facultad = { contains: f.facultad, mode: "insensitive" }
  if (f.programa) where.programa = { contains: f.programa, mode: "insensitive" }
  if (f.q) {
    where.OR = [
      { nombre: { contains: f.q, mode: "insensitive" } },
      { cedula: { contains: f.q } },
      { email: { contains: f.q, mode: "insensitive" } },
    ]
  }
  return Object.keys(where).length > 0 ? where : undefined
}

function buildOrderBy(
  f: RevisionFilters,
): Prisma.AgendaSemestralOrderByWithRelationInput[] {
  const dir = f.orderDir ?? "desc"
  if (f.orderBy === "docente") return [{ docente: { nombre: dir } }]
  if (f.orderBy === "createdAt") return [{ createdAt: dir }]
  return [{ updatedAt: dir }]
}

// =====================================================================
// LIST — Agendas
// =====================================================================

export type AgendaRow = {
  id: string
  periodo: string
  estado: string
  rehabilitada: boolean
  rehabilitadaCount: number
  ultimaRehabilitacion: Date | null
  updatedAt: Date
  createdAt: Date
  docente: {
    id: string
    nombre: string
    email: string
    cedula: string
    modalidad: string
    sedeBase: string
    facultad: string
    programa: string
  }
}

export async function listAgendasParaRevisar(
  filters: RevisionFilters,
): Promise<RevisionPage<AgendaRow>> {
  await ensureAdmin()
  const page = filters.page ?? 1
  const perPage = filters.perPage ?? 20

  const where: Prisma.AgendaSemestralWhereInput = {
    estado:
      !filters.estado || filters.estado === "TODAS" ? undefined : filters.estado,
    periodo: filters.periodo ?? undefined,
    rehabilitada:
      filters.rehabilitadas === "true"
        ? true
        : filters.rehabilitadas === "false"
          ? false
          : undefined,
    docente: buildDocenteWhere(filters),
  }

  const [total, items] = await Promise.all([
    prisma.agendaSemestral.count({ where }),
    prisma.agendaSemestral.findMany({
      where,
      orderBy: buildOrderBy(filters),
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        periodo: true,
        estado: true,
        rehabilitada: true,
        rehabilitadaCount: true,
        ultimaRehabilitacion: true,
        updatedAt: true,
        createdAt: true,
        docente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            cedula: true,
            modalidad: true,
            sedeBase: true,
            facultad: true,
            programa: true,
          },
        },
      },
    }),
  ])

  return {
    items: items as AgendaRow[],
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

// =====================================================================
// LIST — Monitoreos
// =====================================================================

export type MonitoreoRow = {
  id: string
  periodo: string
  estado: string
  rehabilitada: boolean
  rehabilitadaCount: number
  ultimaRehabilitacion: Date | null
  updatedAt: Date
  createdAt: Date
  agendaId: string
  docente: AgendaRow["docente"]
}

export async function listMonitoreosParaRevisar(
  filters: RevisionFilters,
): Promise<RevisionPage<MonitoreoRow>> {
  await ensureAdmin()
  const page = filters.page ?? 1
  const perPage = filters.perPage ?? 20

  const where: Prisma.MonitoreoWhereInput = {
    estado:
      !filters.estado || filters.estado === "TODAS" ? undefined : filters.estado,
    periodo: filters.periodo ?? undefined,
    rehabilitada:
      filters.rehabilitadas === "true"
        ? true
        : filters.rehabilitadas === "false"
          ? false
          : undefined,
    docente: buildDocenteWhere(filters),
  }

  const dir = filters.orderDir ?? "desc"
  const orderBy: Prisma.MonitoreoOrderByWithRelationInput[] =
    filters.orderBy === "docente"
      ? [{ docente: { nombre: dir } }]
      : filters.orderBy === "createdAt"
        ? [{ createdAt: dir }]
        : [{ updatedAt: dir }]

  const [total, items] = await Promise.all([
    prisma.monitoreo.count({ where }),
    prisma.monitoreo.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        periodo: true,
        estado: true,
        rehabilitada: true,
        rehabilitadaCount: true,
        ultimaRehabilitacion: true,
        updatedAt: true,
        createdAt: true,
        agendaId: true,
        docente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            cedula: true,
            modalidad: true,
            sedeBase: true,
            facultad: true,
            programa: true,
          },
        },
      },
    }),
  ])

  return {
    items: items as MonitoreoRow[],
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

// =====================================================================
// GET detalle + historial
// =====================================================================

export async function getAgendaParaRevision(agendaId: string) {
  await ensureAdmin()
  const agenda = await prisma.agendaSemestral.findUnique({
    where: { id: agendaId },
    include: {
      docente: {
        select: {
          id: true,
          nombre: true,
          email: true,
          cedula: true,
          celular: true,
          modalidad: true,
          sedeBase: true,
          facultad: true,
          programa: true,
        },
      },
      rehabilitaciones: { orderBy: { fecha: "desc" } },
    },
  })
  if (!agenda) return null

  // Resolver nombres de los rehabilitadores y ediciones admin
  const [rehabilitadores, ediciones] = await Promise.all([
    agenda.rehabilitaciones.length > 0
      ? prisma.docente.findMany({
          where: { id: { in: agenda.rehabilitaciones.map((r) => r.rehabilitadoPor) } },
          select: { id: true, nombre: true, rol: true },
        })
      : Promise.resolve([]),
    prisma.edicionAdministrativa.findMany({
      where: { tipo: "AGENDA", recursoId: agendaId },
      orderBy: { fecha: "desc" },
    }),
  ])

  const editoresIds = Array.from(new Set(ediciones.map((e) => e.editorId)))
  const editores =
    editoresIds.length > 0
      ? await prisma.docente.findMany({
          where: { id: { in: editoresIds } },
          select: { id: true, nombre: true, rol: true },
        })
      : []

  return { agenda, rehabilitadores, ediciones, editores }
}

export async function getMonitoreoParaRevision(monitoreoId: string) {
  await ensureAdmin()
  const monitoreo = await prisma.monitoreo.findUnique({
    where: { id: monitoreoId },
    include: {
      docente: {
        select: {
          id: true,
          nombre: true,
          email: true,
          cedula: true,
          celular: true,
          modalidad: true,
          sedeBase: true,
          facultad: true,
          programa: true,
        },
      },
      rehabilitaciones: { orderBy: { fecha: "desc" } },
    },
  })
  if (!monitoreo) return null

  const [rehabilitadores, ediciones] = await Promise.all([
    monitoreo.rehabilitaciones.length > 0
      ? prisma.docente.findMany({
          where: { id: { in: monitoreo.rehabilitaciones.map((r) => r.rehabilitadoPor) } },
          select: { id: true, nombre: true, rol: true },
        })
      : Promise.resolve([]),
    prisma.edicionAdministrativa.findMany({
      where: { tipo: "MONITOREO", recursoId: monitoreoId },
      orderBy: { fecha: "desc" },
    }),
  ])

  const editoresIds = Array.from(new Set(ediciones.map((e) => e.editorId)))
  const editores =
    editoresIds.length > 0
      ? await prisma.docente.findMany({
          where: { id: { in: editoresIds } },
          select: { id: true, nombre: true, rol: true },
        })
      : []

  return { monitoreo, rehabilitadores, ediciones, editores }
}

// =====================================================================
// REHABILITAR
// =====================================================================

export async function rehabilitarAgendaAction(
  agendaId: string,
  motivo: string,
  observaciones?: string | null,
) {
  const user = await ensureAdmin()

  if (!motivo || motivo.trim().length < 10) {
    return { error: "El motivo es obligatorio y debe tener al menos 10 caracteres." }
  }

  const agenda = await prisma.agendaSemestral.findUnique({
    where: { id: agendaId },
    select: { id: true, estado: true, periodo: true },
  })
  if (!agenda) return { error: "Agenda no encontrada." }
  if (agenda.estado === "BORRADOR") {
    return { error: "Esta agenda ya está en estado BORRADOR." }
  }

  await prisma.$transaction(async (tx) => {
    await tx.rehabilitacionAgenda.create({
      data: {
        agendaId,
        rehabilitadoPor: user.id,
        motivo: motivo.trim(),
        observaciones: observaciones?.trim() || null,
        estadoOriginal: agenda.estado,
      },
    })
    await tx.agendaSemestral.update({
      where: { id: agendaId },
      data: {
        estado: "BORRADOR",
        rehabilitada: true,
        rehabilitadaCount: { increment: 1 },
        ultimaRehabilitacion: new Date(),
      },
    })
  })

  revalidatePath("/admin/revision/agendas")
  revalidatePath(`/admin/revision/agendas/${agendaId}`)
  revalidatePath("/agenda")
  return { success: true }
}

export async function rehabilitarMonitoreoAction(
  monitoreoId: string,
  motivo: string,
  observaciones?: string | null,
) {
  const user = await ensureAdmin()

  if (!motivo || motivo.trim().length < 10) {
    return { error: "El motivo es obligatorio y debe tener al menos 10 caracteres." }
  }

  const monitoreo = await prisma.monitoreo.findUnique({
    where: { id: monitoreoId },
    select: { id: true, estado: true, periodo: true },
  })
  if (!monitoreo) return { error: "Monitoreo no encontrado." }
  if (monitoreo.estado === "BORRADOR") {
    return { error: "Este monitoreo ya está en estado BORRADOR." }
  }

  await prisma.$transaction(async (tx) => {
    await tx.rehabilitacionMonitoreo.create({
      data: {
        monitoreoId,
        rehabilitadoPor: user.id,
        motivo: motivo.trim(),
        observaciones: observaciones?.trim() || null,
        estadoOriginal: monitoreo.estado,
      },
    })
    await tx.monitoreo.update({
      where: { id: monitoreoId },
      data: {
        estado: "BORRADOR",
        rehabilitada: true,
        rehabilitadaCount: { increment: 1 },
        ultimaRehabilitacion: new Date(),
      },
    })
  })

  revalidatePath("/admin/revision/monitoreos")
  revalidatePath(`/admin/revision/monitoreos/${monitoreoId}`)
  revalidatePath("/monitoreo")
  return { success: true }
}

// =====================================================================
// Overview counts (hub)
// =====================================================================

export async function getRevisionCounts() {
  await ensureAdmin()
  const [agendasPendientes, monitoreosPendientes, agendasRehab, monitoreosRehab] =
    await Promise.all([
      prisma.agendaSemestral.count({ where: { estado: "ENVIADO" } }),
      prisma.monitoreo.count({ where: { estado: "ENVIADO" } }),
      prisma.agendaSemestral.count({ where: { rehabilitada: true } }),
      prisma.monitoreo.count({ where: { rehabilitada: true } }),
    ])
  return { agendasPendientes, monitoreosPendientes, agendasRehab, monitoreosRehab }
}
