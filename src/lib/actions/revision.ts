"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import type { Prisma, Modalidad, Sede, Rol } from "@/generated/prisma/client"
import type { RevisionFilters, RevisionPage } from "@/lib/types/revision"
import { registrarAuditoriaStrict } from "@/lib/audit"

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
    modalidad: Modalidad
    sedeBase: Sede
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
  const [rehabilitadores, ediciones, auditLogs] = await Promise.all([
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
    prisma.auditoriaLog.findMany({
      where: { entidad: "AGENDA", recursoId: agendaId, accion: { in: ["CAMBIAR_ESTADO"] } },
      orderBy: { creadoEn: "asc" },
      select: { id: true, creadoEn: true, actorNombre: true, actorRol: true, antes: true, despues: true, observaciones: true },
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

  return { agenda, rehabilitadores, ediciones, editores, auditLogs }
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

  const [rehabilitadores, ediciones, auditLogs] = await Promise.all([
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
    prisma.auditoriaLog.findMany({
      where: { entidad: "MONITOREO", recursoId: monitoreoId, accion: { in: ["CAMBIAR_ESTADO"] } },
      orderBy: { creadoEn: "asc" },
      select: { id: true, creadoEn: true, actorNombre: true, actorRol: true, antes: true, despues: true, observaciones: true },
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

  return { monitoreo, rehabilitadores, ediciones, editores, auditLogs }
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
    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "AGENDA",
        accion: "REHABILITAR",
        recursoId: agendaId,
        recursoDesc: `Agenda ${agenda.periodo}`,
        antes: { estado: agenda.estado },
        despues: { estado: "BORRADOR" },
        observaciones: motivo.trim(),
      },
      tx,
    )
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
    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "MONITOREO",
        accion: "REHABILITAR",
        recursoId: monitoreoId,
        recursoDesc: `Monitoreo ${monitoreo.periodo}`,
        antes: { estado: monitoreo.estado },
        despues: { estado: "BORRADOR" },
        observaciones: motivo.trim(),
      },
      tx,
    )
  })

  revalidatePath("/admin/revision/monitoreos")
  revalidatePath(`/admin/revision/monitoreos/${monitoreoId}`)
  revalidatePath("/monitoreo")
  return { success: true }
}

// =====================================================================
// APROBAR / RECHAZAR
// =====================================================================

export async function aprobarAgendaAction(agendaId: string) {
  const user = await ensureAdmin()

  const agenda = await prisma.agendaSemestral.findUnique({
    where: { id: agendaId },
    select: {
      id: true,
      estado: true,
      periodo: true,
      docente: { select: { programa: true } },
      otrasActividadesDocencia: { select: { nombre: true } },
      actividadesInvestigacion: { select: { nombre: true } },
      actividadesProyeccionSocial: { select: { nombre: true } },
      actividadesGestion: { select: { nombre: true } },
    },
  })
  if (!agenda) return { error: "Agenda no encontrada." }
  if (agenda.estado !== "ENVIADO") {
    return { error: "Solo se pueden aprobar agendas en estado ENVIADO." }
  }

  // -------------------------------------------------------------------
  // Tope exclusivo "1 docente por programa" — bloquea aprobación si otro
  // docente del mismo programa ya tiene APROBADA la misma actividad en el
  // mismo período. Aplica a cualquier actividad del catálogo flagueada con
  // `aplicaUnoPorPrograma: true` (ej. "Comité Autoevaluación y
  // Acreditación del Programa").
  // -------------------------------------------------------------------
  const conflicto = await _buscarConflictoProgramaUnico(
    agenda.id,
    agenda.periodo,
    agenda.docente.programa,
    {
      DOCENCIA: agenda.otrasActividadesDocencia.map((a) => a.nombre),
      INVESTIGACION: agenda.actividadesInvestigacion.map((a) => a.nombre),
      PROYECCION_SOCIAL: agenda.actividadesProyeccionSocial.map((a) => a.nombre),
      GESTION: agenda.actividadesGestion.map((a) => a.nombre),
    },
  )
  if (conflicto) {
    return {
      error: `No se puede aprobar: el docente ${conflicto.docenteNombre} del programa ${agenda.docente.programa} ya tiene aprobada la actividad "${conflicto.actividadNombre}" en el período ${agenda.periodo}.`,
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.agendaSemestral.update({
      where: { id: agendaId },
      data: { estado: "APROBADO" },
    })
    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "AGENDA",
        accion: "CAMBIAR_ESTADO",
        recursoId: agendaId,
        recursoDesc: `Agenda ${agenda.periodo}`,
        antes: { estado: "ENVIADO" },
        despues: { estado: "APROBADO" },
      },
      tx,
    )
  })

  revalidatePath("/admin/revision/agendas")
  revalidatePath(`/admin/revision/agendas/${agendaId}`)
  revalidatePath(`/agenda/${agendaId}`)
  revalidatePath("/agenda")
  return { success: true }
}

export async function rechazarAgendaAction(agendaId: string, motivo: string) {
  const user = await ensureAdmin()

  if (!motivo || motivo.trim().length < 10) {
    return { error: "El motivo es obligatorio y debe tener al menos 10 caracteres." }
  }

  const agenda = await prisma.agendaSemestral.findUnique({
    where: { id: agendaId },
    select: { id: true, estado: true, periodo: true },
  })
  if (!agenda) return { error: "Agenda no encontrada." }
  if (agenda.estado !== "ENVIADO") {
    return { error: "Solo se pueden rechazar agendas en estado ENVIADO." }
  }

  await prisma.$transaction(async (tx) => {
    await tx.agendaSemestral.update({
      where: { id: agendaId },
      data: { estado: "RECHAZADO", observacionesAdmin: motivo.trim() },
    })
    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "AGENDA",
        accion: "CAMBIAR_ESTADO",
        recursoId: agendaId,
        recursoDesc: `Agenda ${agenda.periodo}`,
        antes: { estado: "ENVIADO" },
        despues: { estado: "RECHAZADO" },
        observaciones: motivo.trim(),
      },
      tx,
    )
  })

  revalidatePath("/admin/revision/agendas")
  revalidatePath(`/admin/revision/agendas/${agendaId}`)
  revalidatePath(`/agenda/${agendaId}`)
  revalidatePath("/agenda")
  return { success: true }
}

export async function aprobarMonitoreoAction(monitoreoId: string) {
  const user = await ensureAdmin()

  const monitoreo = await prisma.monitoreo.findUnique({
    where: { id: monitoreoId },
    select: { id: true, estado: true, periodo: true },
  })
  if (!monitoreo) return { error: "Monitoreo no encontrado." }
  if (monitoreo.estado !== "ENVIADO") {
    return { error: "Solo se pueden aprobar monitoreos en estado ENVIADO." }
  }

  await prisma.$transaction(async (tx) => {
    await tx.monitoreo.update({
      where: { id: monitoreoId },
      data: { estado: "APROBADO" },
    })
    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "MONITOREO",
        accion: "CAMBIAR_ESTADO",
        recursoId: monitoreoId,
        recursoDesc: `Monitoreo ${monitoreo.periodo}`,
        antes: { estado: "ENVIADO" },
        despues: { estado: "APROBADO" },
      },
      tx,
    )
  })

  revalidatePath("/admin/revision/monitoreos")
  revalidatePath(`/admin/revision/monitoreos/${monitoreoId}`)
  revalidatePath(`/monitoreo/${monitoreoId}`)
  revalidatePath("/monitoreo")
  return { success: true }
}

export async function rechazarMonitoreoAction(monitoreoId: string, motivo: string) {
  const user = await ensureAdmin()

  if (!motivo || motivo.trim().length < 10) {
    return { error: "El motivo es obligatorio y debe tener al menos 10 caracteres." }
  }

  const monitoreo = await prisma.monitoreo.findUnique({
    where: { id: monitoreoId },
    select: { id: true, estado: true, periodo: true },
  })
  if (!monitoreo) return { error: "Monitoreo no encontrado." }
  if (monitoreo.estado !== "ENVIADO") {
    return { error: "Solo se pueden rechazar monitoreos en estado ENVIADO." }
  }

  await prisma.$transaction(async (tx) => {
    await tx.monitoreo.update({
      where: { id: monitoreoId },
      data: { estado: "RECHAZADO", observacionesAdmin: motivo.trim() },
    })
    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "MONITOREO",
        accion: "CAMBIAR_ESTADO",
        recursoId: monitoreoId,
        recursoDesc: `Monitoreo ${monitoreo.periodo}`,
        antes: { estado: "ENVIADO" },
        despues: { estado: "RECHAZADO" },
        observaciones: motivo.trim(),
      },
      tx,
    )
  })

  revalidatePath("/admin/revision/monitoreos")
  revalidatePath(`/admin/revision/monitoreos/${monitoreoId}`)
  revalidatePath(`/monitoreo/${monitoreoId}`)
  revalidatePath("/monitoreo")
  return { success: true }
}

// =====================================================================
// Overview counts (hub)
// =====================================================================

export async function getRevisionCounts(periodo?: string | null) {
  await ensureAdmin()
  const filtroPeriodo = periodo ? { periodo } : {}

  const [
    agendasEnviadas,
    agendasAprobadas,
    agendasRechazadas,
    monitoreosEnviados,
    monitoreosAprobados,
    monitoreosRechazados,
    perfilesPendientes,
    proyectosPendientes,
  ] = await Promise.all([
    prisma.agendaSemestral.count({ where: { ...filtroPeriodo, estado: "ENVIADO" } }),
    prisma.agendaSemestral.count({ where: { ...filtroPeriodo, estado: "APROBADO" } }),
    prisma.agendaSemestral.count({ where: { ...filtroPeriodo, estado: "RECHAZADO" } }),
    prisma.monitoreo.count({ where: { ...filtroPeriodo, estado: "ENVIADO" } }),
    prisma.monitoreo.count({ where: { ...filtroPeriodo, estado: "APROBADO" } }),
    prisma.monitoreo.count({ where: { ...filtroPeriodo, estado: "RECHAZADO" } }),
    prisma.solicitudCambioPerfil.count({ where: { estado: "ENVIADO" } }),
    prisma.proyectoDocente.count({ where: { estado: "ENVIADO" } }),
  ])

  return {
    agendas: {
      enviadas: agendasEnviadas,
      aprobadas: agendasAprobadas,
      rechazadas: agendasRechazadas,
    },
    monitoreos: {
      enviados: monitoreosEnviados,
      aprobados: monitoreosAprobados,
      rechazados: monitoreosRechazados,
    },
    perfilesPendientes,
    proyectosPendientes,
  }
}

// =====================================================================
// Helper privado: detectar conflicto de exclusividad por programa
// =====================================================================

type ConflictoProgramaUnico = {
  actividadNombre: string
  docenteNombre: string
}

async function _buscarConflictoProgramaUnico(
  agendaId: string,
  periodo: string,
  programa: string,
  nombresPorCategoria: {
    DOCENCIA: string[]
    INVESTIGACION: string[]
    PROYECCION_SOCIAL: string[]
    GESTION: string[]
  },
): Promise<ConflictoProgramaUnico | null> {
  const flagueadas = await prisma.catalogoActividad.findMany({
    where: { aplicaUnoPorPrograma: true },
    select: { nombre: true, categoria: true },
  })
  if (flagueadas.length === 0) return null

  const setPorCat: Record<string, Set<string>> = {
    DOCENCIA: new Set(),
    INVESTIGACION: new Set(),
    PROYECCION_SOCIAL: new Set(),
    GESTION: new Set(),
  }
  for (const f of flagueadas) setPorCat[f.categoria]?.add(f.nombre)

  const aRevisarDocencia = nombresPorCategoria.DOCENCIA.filter((n) =>
    setPorCat.DOCENCIA.has(n),
  )
  const aRevisarInvest = nombresPorCategoria.INVESTIGACION.filter((n) =>
    setPorCat.INVESTIGACION.has(n),
  )
  const aRevisarProy = nombresPorCategoria.PROYECCION_SOCIAL.filter((n) =>
    setPorCat.PROYECCION_SOCIAL.has(n),
  )
  const aRevisarGest = nombresPorCategoria.GESTION.filter((n) =>
    setPorCat.GESTION.has(n),
  )

  const baseAgendaWhere = {
    id: { not: agendaId },
    periodo,
    estado: "APROBADO" as const,
    docente: { programa },
  }

  if (aRevisarDocencia.length > 0) {
    const c = await prisma.actividadDocencia.findFirst({
      where: { nombre: { in: aRevisarDocencia }, agenda: baseAgendaWhere },
      select: { nombre: true, agenda: { select: { docente: { select: { nombre: true } } } } },
    })
    if (c) return { actividadNombre: c.nombre, docenteNombre: c.agenda.docente.nombre }
  }
  if (aRevisarInvest.length > 0) {
    const c = await prisma.actividadInvestigacion.findFirst({
      where: { nombre: { in: aRevisarInvest }, agenda: baseAgendaWhere },
      select: { nombre: true, agenda: { select: { docente: { select: { nombre: true } } } } },
    })
    if (c) return { actividadNombre: c.nombre, docenteNombre: c.agenda.docente.nombre }
  }
  if (aRevisarProy.length > 0) {
    const c = await prisma.actividadProyeccionSocial.findFirst({
      where: { nombre: { in: aRevisarProy }, agenda: baseAgendaWhere },
      select: { nombre: true, agenda: { select: { docente: { select: { nombre: true } } } } },
    })
    if (c) return { actividadNombre: c.nombre, docenteNombre: c.agenda.docente.nombre }
  }
  if (aRevisarGest.length > 0) {
    const c = await prisma.actividadGestion.findFirst({
      where: { nombre: { in: aRevisarGest }, agenda: baseAgendaWhere },
      select: { nombre: true, agenda: { select: { docente: { select: { nombre: true } } } } },
    })
    if (c) return { actividadNombre: c.nombre, docenteNombre: c.agenda.docente.nombre }
  }
  return null
}
