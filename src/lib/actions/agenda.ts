"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { TipoActividad } from "@/lib/types/agenda"
import { validarVentanaAgenda } from "@/lib/actions/_utils/ventana-periodo"
import { registrarAuditoria } from "@/lib/audit"
import { esModalidadNoPlanta, assertPuedeGestionarDe } from "@/lib/auth/autoridad"
import type { Rol } from "@/generated/prisma/client"

// ========================================
// Helpers
// ========================================

async function getAuthenticatedUser() {
  const session = await auth()
  if (!session?.user) return null
  return session.user
}

async function getOwnedBorradorAgenda(agendaId: string, userId: string) {
  const agenda = await prisma.agendaSemestral.findUnique({
    where: { id: agendaId },
  })
  if (!agenda || agenda.docenteId !== userId) return { error: "Agenda no encontrada." }
  if (agenda.estado !== "BORRADOR") return { error: "No se puede modificar una agenda enviada." }
  return { agenda }
}

// ========================================
// Agenda CRUD
// ========================================

export async function createAgendaAction(_prevState: unknown, formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const periodo = formData.get("periodo") as string

  if (!periodo) {
    return { error: "El periodo es obligatorio." }
  }

  const existing = await prisma.agendaSemestral.findUnique({
    where: { docenteId_periodo: { docenteId: user.id, periodo } },
  })
  if (existing) {
    return { error: "Ya existe una agenda para este periodo." }
  }

  // Integridad referencial: guardamos también el id del período (FK), no solo el texto.
  const periodoRow = await prisma.periodoAcademico.findUnique({
    where: { nombre: periodo },
    select: { id: true },
  })

  const agenda = await prisma.agendaSemestral.create({
    data: {
      docenteId: user.id,
      periodo,
      periodoId: periodoRow?.id ?? null,
    },
  })

  revalidatePath("/agenda")
  return { success: true, agendaId: agenda.id }
}

export async function deleteAgendaAction(agendaId: string) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const result = await getOwnedBorradorAgenda(agendaId, user.id)
  if ("error" in result) return result

  await prisma.agendaSemestral.delete({ where: { id: agendaId } })

  revalidatePath("/agenda")
  return { success: true }
}

export async function enviarAgendaAction(agendaId: string) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const result = await getOwnedBorradorAgenda(agendaId, user.id)
  if ("error" in result) return result

  const ventanaError = await validarVentanaAgenda(result.agenda.periodo)
  if (ventanaError) return ventanaError

  await prisma.agendaSemestral.update({
    where: { id: agendaId },
    // Al (re)enviar se limpia la nota de la revisión anterior: es un envío fresco.
    data: { estado: "ENVIADO", observacionesAdmin: null },
  })

  await registrarAuditoria({
    actorId:     user.id,
    actorRol:    user.rol as Rol,
    actorNombre: user.name ?? user.email ?? user.id,
    entidad:     "AGENDA",
    accion:      "CAMBIAR_ESTADO",
    recursoId:   agendaId,
    recursoDesc: `Agenda ${result.agenda.periodo}`,
    antes:       { estado: "BORRADOR" },
    despues:     { estado: "ENVIADO" },
  })

  revalidatePath(`/agenda/${agendaId}`)
  revalidatePath("/agenda")
  return { success: true }
}

// ========================================
// CORREGIR — el docente (planta) reabre su agenda RECHAZADA (→ BORRADOR) para
// corregirla y reenviarla. Conserva el motivo del rechazo como referencia.
// La ventana de entrega se vuelve a exigir al reenviar.
// ========================================

export async function corregirAgendaAction(agendaId: string) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const agenda = await prisma.agendaSemestral.findUnique({
    where: { id: agendaId },
    select: {
      id: true,
      estado: true,
      periodo: true,
      docenteId: true,
      docente: { select: { modalidad: true, programa: true, facultad: true } },
    },
  })
  if (!agenda) return { error: "Agenda no encontrada." }
  if (agenda.estado !== "RECHAZADO") {
    return { error: "Solo se pueden corregir agendas en estado RECHAZADO." }
  }

  // Quién corrige: el propio docente (planta o No-Planta) reabre su agenda. Y, de
  // forma delegada, el jefe/decano con autoridad sobre el programa/facultad del
  // docente No-Planta (es quien también puede armarle la agenda).
  if (agenda.docenteId !== user.id) {
    if (!esModalidadNoPlanta(agenda.docente.modalidad)) {
      return { error: "No podés corregir una agenda que no es tuya." }
    }
    const actorRow = await prisma.docente.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        rol: true,
        estadoCuenta: true,
        cargoAdministrativo: true,
        tipoCargo: true,
        cargoAmbitoValor: true,
      },
    })
    if (!actorRow) return { error: "Usuario no encontrado." }
    const denied = assertPuedeGestionarDe(actorRow, {
      id: agenda.docenteId,
      programa: agenda.docente.programa,
      facultad: agenda.docente.facultad,
    })
    if (denied) return denied
  }

  await prisma.agendaSemestral.update({
    where: { id: agendaId },
    data: { estado: "BORRADOR" },
  })

  await registrarAuditoria({
    actorId:     user.id,
    actorRol:    user.rol as Rol,
    actorNombre: user.name ?? user.email ?? user.id,
    entidad:     "AGENDA",
    accion:      "CAMBIAR_ESTADO",
    recursoId:   agendaId,
    recursoDesc: `Agenda ${agenda.periodo}`,
    antes:       { estado: "RECHAZADO" },
    despues:     { estado: "BORRADOR" },
  })

  revalidatePath(`/agenda/${agendaId}`)
  revalidatePath("/agenda")
  revalidatePath(`/gestion/agendas/nueva/${agenda.docenteId}`)
  revalidatePath("/gestion/agendas")
  return { success: true }
}

// ========================================
// Cursos Agenda
// ========================================

export async function createCursoAgendaAction(_prevState: unknown, formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const agendaId = formData.get("agendaId") as string
  const result = await getOwnedBorradorAgenda(agendaId, user.id)
  if ("error" in result) return result

  const numeroCurso = formData.get("numeroCurso") as string
  const nombreCurso = formData.get("nombreCurso") as string

  if (!numeroCurso || !nombreCurso) {
    return { error: "Numero y nombre del curso son obligatorios." }
  }

  // FK al catálogo maestro — opcional. Si el caller no envía el campo o lo manda
  // vacío, queda null (curso ingresado a mano). Sostén del safeguard en /admin/cursos.
  const cursoMaestroIdRaw = formData.get("cursoMaestroId")
  const cursoMaestroId =
    typeof cursoMaestroIdRaw === "string" && cursoMaestroIdRaw.trim() !== ""
      ? cursoMaestroIdRaw.trim()
      : null

  await prisma.cursoAgenda.create({
    data: {
      agendaId,
      cursoMaestroId,
      numeroCurso,
      nombreCurso,
      sede: (formData.get("sede") as string) || null,
      horasPresenciales: Number(formData.get("horasPresenciales")) || 0,
      creditos: Number(formData.get("creditos")) || 0,
      semanas: Number(formData.get("semanas")) || 0,
      dedicacionPeriodo: Number(formData.get("dedicacionPeriodo")) || 0,
    },
  })

  revalidatePath(`/agenda/${agendaId}`)
  return { success: true }
}

export async function updateCursoAgendaAction(_prevState: unknown, formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const id = formData.get("id") as string
  const curso = await prisma.cursoAgenda.findUnique({
    where: { id },
    include: { agenda: true },
  })

  if (!curso || curso.agenda.docenteId !== user.id) {
    return { error: "Curso no encontrado." }
  }
  if (curso.agenda.estado !== "BORRADOR") {
    return { error: "No se puede modificar una agenda enviada." }
  }

  const numeroCurso = formData.get("numeroCurso") as string
  const nombreCurso = formData.get("nombreCurso") as string

  if (!numeroCurso || !nombreCurso) {
    return { error: "Numero y nombre del curso son obligatorios." }
  }

  // Permite reasociar (o desasociar) el CursoAgenda al catálogo maestro.
  // Si el caller omite el campo del FormData, NO tocamos el valor existente.
  // Si lo envía vacío, se interpreta como "limpiar relación" (null).
  const cursoMaestroIdRaw = formData.get("cursoMaestroId")
  let cursoMaestroIdData: { cursoMaestroId: string | null } | Record<string, never> = {}
  if (cursoMaestroIdRaw !== null) {
    cursoMaestroIdData = {
      cursoMaestroId:
        typeof cursoMaestroIdRaw === "string" && cursoMaestroIdRaw.trim() !== ""
          ? cursoMaestroIdRaw.trim()
          : null,
    }
  }

  await prisma.cursoAgenda.update({
    where: { id },
    data: {
      ...cursoMaestroIdData,
      numeroCurso,
      nombreCurso,
      sede: (formData.get("sede") as string) || null,
      horasPresenciales: Number(formData.get("horasPresenciales")) || 0,
      creditos: Number(formData.get("creditos")) || 0,
      semanas: Number(formData.get("semanas")) || 0,
      dedicacionPeriodo: Number(formData.get("dedicacionPeriodo")) || 0,
    },
  })

  revalidatePath(`/agenda/${curso.agendaId}`)
  return { success: true }
}

export async function deleteCursoAgendaAction(id: string) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const curso = await prisma.cursoAgenda.findUnique({
    where: { id },
    include: { agenda: true },
  })

  if (!curso || curso.agenda.docenteId !== user.id) {
    return { error: "Curso no encontrado." }
  }
  if (curso.agenda.estado !== "BORRADOR") {
    return { error: "No se puede modificar una agenda enviada." }
  }

  await prisma.cursoAgenda.delete({ where: { id } })

  revalidatePath(`/agenda/${curso.agendaId}`)
  return { success: true }
}

// ========================================
// Actividades (generico para los 4 tipos)
// ========================================

export async function createActividadAction(_prevState: unknown, formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const agendaId = formData.get("agendaId") as string
  const tipo = formData.get("tipo") as TipoActividad
  const nombre = formData.get("nombre") as string
  const descripcion = (formData.get("descripcion") as string) || null
  const dedicacionPeriodo = Number(formData.get("dedicacionPeriodo")) || 0

  const result = await getOwnedBorradorAgenda(agendaId, user.id)
  if ("error" in result) return result

  if (!nombre) return { error: "El nombre de la actividad es obligatorio." }

  const data = { agendaId, nombre, descripcion, dedicacionPeriodo }

  switch (tipo) {
    case "docencia":
      await prisma.actividadDocencia.create({ data })
      break
    case "investigacion":
      await prisma.actividadInvestigacion.create({ data })
      break
    case "proyeccion":
      await prisma.actividadProyeccionSocial.create({ data })
      break
    case "gestion":
      await prisma.actividadGestion.create({ data })
      break
    default:
      return { error: "Tipo de actividad invalido." }
  }

  revalidatePath(`/agenda/${agendaId}`)
  return { success: true }
}

export async function updateActividadAction(_prevState: unknown, formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const id = formData.get("id") as string
  const tipo = formData.get("tipo") as TipoActividad
  const nombre = formData.get("nombre") as string
  const descripcion = (formData.get("descripcion") as string) || null
  const dedicacionPeriodo = Number(formData.get("dedicacionPeriodo")) || 0

  if (!nombre) return { error: "El nombre de la actividad es obligatorio." }

  const data = { nombre, descripcion, dedicacionPeriodo }
  let agendaId: string

  switch (tipo) {
    case "docencia": {
      const act = await prisma.actividadDocencia.findUnique({ where: { id }, include: { agenda: true } })
      if (!act || act.agenda.docenteId !== user.id) return { error: "Actividad no encontrada." }
      if (act.agenda.estado !== "BORRADOR") return { error: "No se puede modificar una agenda enviada." }
      await prisma.actividadDocencia.update({ where: { id }, data })
      agendaId = act.agendaId
      break
    }
    case "investigacion": {
      const act = await prisma.actividadInvestigacion.findUnique({ where: { id }, include: { agenda: true } })
      if (!act || act.agenda.docenteId !== user.id) return { error: "Actividad no encontrada." }
      if (act.agenda.estado !== "BORRADOR") return { error: "No se puede modificar una agenda enviada." }
      await prisma.actividadInvestigacion.update({ where: { id }, data })
      agendaId = act.agendaId
      break
    }
    case "proyeccion": {
      const act = await prisma.actividadProyeccionSocial.findUnique({ where: { id }, include: { agenda: true } })
      if (!act || act.agenda.docenteId !== user.id) return { error: "Actividad no encontrada." }
      if (act.agenda.estado !== "BORRADOR") return { error: "No se puede modificar una agenda enviada." }
      await prisma.actividadProyeccionSocial.update({ where: { id }, data })
      agendaId = act.agendaId
      break
    }
    case "gestion": {
      const act = await prisma.actividadGestion.findUnique({ where: { id }, include: { agenda: true } })
      if (!act || act.agenda.docenteId !== user.id) return { error: "Actividad no encontrada." }
      if (act.agenda.estado !== "BORRADOR") return { error: "No se puede modificar una agenda enviada." }
      await prisma.actividadGestion.update({ where: { id }, data })
      agendaId = act.agendaId
      break
    }
    default:
      return { error: "Tipo de actividad invalido." }
  }

  revalidatePath(`/agenda/${agendaId}`)
  return { success: true }
}

export async function deleteActividadAction(id: string, tipo: TipoActividad) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  let agendaId: string

  switch (tipo) {
    case "docencia": {
      const act = await prisma.actividadDocencia.findUnique({ where: { id }, include: { agenda: true } })
      if (!act || act.agenda.docenteId !== user.id) return { error: "Actividad no encontrada." }
      if (act.agenda.estado !== "BORRADOR") return { error: "No se puede modificar una agenda enviada." }
      await prisma.actividadDocencia.delete({ where: { id } })
      agendaId = act.agendaId
      break
    }
    case "investigacion": {
      const act = await prisma.actividadInvestigacion.findUnique({ where: { id }, include: { agenda: true } })
      if (!act || act.agenda.docenteId !== user.id) return { error: "Actividad no encontrada." }
      if (act.agenda.estado !== "BORRADOR") return { error: "No se puede modificar una agenda enviada." }
      await prisma.actividadInvestigacion.delete({ where: { id } })
      agendaId = act.agendaId
      break
    }
    case "proyeccion": {
      const act = await prisma.actividadProyeccionSocial.findUnique({ where: { id }, include: { agenda: true } })
      if (!act || act.agenda.docenteId !== user.id) return { error: "Actividad no encontrada." }
      if (act.agenda.estado !== "BORRADOR") return { error: "No se puede modificar una agenda enviada." }
      await prisma.actividadProyeccionSocial.delete({ where: { id } })
      agendaId = act.agendaId
      break
    }
    case "gestion": {
      const act = await prisma.actividadGestion.findUnique({ where: { id }, include: { agenda: true } })
      if (!act || act.agenda.docenteId !== user.id) return { error: "Actividad no encontrada." }
      if (act.agenda.estado !== "BORRADOR") return { error: "No se puede modificar una agenda enviada." }
      await prisma.actividadGestion.delete({ where: { id } })
      agendaId = act.agendaId
      break
    }
    default:
      return { error: "Tipo de actividad invalido." }
  }

  revalidatePath(`/agenda/${agendaId}`)
  return { success: true }
}
