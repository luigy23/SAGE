"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { TipoActividad } from "@/lib/types/agenda"

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

  const agenda = await prisma.agendaSemestral.create({
    data: {
      docenteId: user.id,
      periodo,
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

  await prisma.agendaSemestral.update({
    where: { id: agendaId },
    data: { estado: "ENVIADO" },
  })

  revalidatePath(`/agenda/${agendaId}`)
  revalidatePath("/agenda")
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

  await prisma.cursoAgenda.create({
    data: {
      agendaId,
      numeroCurso,
      nombreCurso,
      subgrupo: (formData.get("subgrupo") as string) || null,
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

  await prisma.cursoAgenda.update({
    where: { id },
    data: {
      numeroCurso,
      nombreCurso,
      subgrupo: (formData.get("subgrupo") as string) || null,
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

export async function importCursosFromGuardadosAction(
  agendaId: string,
  cursoGuardadoIds: string[]
) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const result = await getOwnedBorradorAgenda(agendaId, user.id)
  if ("error" in result) return result

  if (cursoGuardadoIds.length === 0) {
    return { error: "Selecciona al menos un curso para importar." }
  }

  const cursosGuardados = await prisma.cursoGuardado.findMany({
    where: {
      id: { in: cursoGuardadoIds },
      docenteId: user.id,
    },
  })

  await prisma.cursoAgenda.createMany({
    data: cursosGuardados.map((cg) => ({
      agendaId,
      numeroCurso: cg.numeroCurso,
      nombreCurso: cg.nombreCurso,
      subgrupo: cg.subgrupo,
      sede: cg.sede,
      horasPresenciales: cg.horasPresenciales ?? 0,
      creditos: cg.creditos ?? 0,
      semanas: cg.semanas ?? 0,
      dedicacionPeriodo: 0,
    })),
  })

  revalidatePath(`/agenda/${agendaId}`)
  return { success: true }
}

// ========================================
// Horarios
// ========================================

export async function upsertHorarioAction(_prevState: unknown, formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const cursoId = formData.get("cursoId") as string
  const curso = await prisma.cursoAgenda.findUnique({
    where: { id: cursoId },
    include: { agenda: true },
  })

  if (!curso || curso.agenda.docenteId !== user.id) {
    return { error: "Curso no encontrado." }
  }
  if (curso.agenda.estado !== "BORRADOR") {
    return { error: "No se puede modificar una agenda enviada." }
  }

  const horarioData = {
    lunes: (formData.get("lunes") as string) || null,
    martes: (formData.get("martes") as string) || null,
    miercoles: (formData.get("miercoles") as string) || null,
    jueves: (formData.get("jueves") as string) || null,
    viernes: (formData.get("viernes") as string) || null,
    sabado: (formData.get("sabado") as string) || null,
    domingo: (formData.get("domingo") as string) || null,
  }

  const existing = await prisma.horarioCurso.findFirst({
    where: { cursoId },
  })

  if (existing) {
    await prisma.horarioCurso.update({
      where: { id: existing.id },
      data: horarioData,
    })
  } else {
    await prisma.horarioCurso.create({
      data: { cursoId, ...horarioData },
    })
  }

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
