"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import {
  createAgendaSchema,
  calcularTotalHoras,
  type AgendaWizardPayload,
  type AgendaWizardFormData,
} from "@/lib/schemas/agenda-schema"
import { getMaxHoras } from "@/lib/utils/periodo"

async function getAuthenticatedDocente() {
  const session = await auth()
  if (!session?.user?.id) return null

  const docente = await prisma.docente.findUnique({
    where: { id: session.user.id },
  })

  return docente
}

export async function upsertAgendaCompletaAction(
  payload: AgendaWizardPayload
): Promise<{ success: true; agendaId: string } | { error: string }> {
  
  const docente = await getAuthenticatedDocente()
  if (!docente) {
    return { error: "No autenticado. Inicia sesión e intenta de nuevo." }
  }

  const { periodo, enviar, data } = payload

  if (!periodo || periodo.trim() === "") {
    return { error: "El periodo académico es obligatorio." }
  }

  const { maxHoras, esEstricto } = getMaxHoras(docente.modalidad)
  
  // NUEVO: Empaquetamos las banderas del docente
  const flags = {
    doctorado: docente.doctorado,
    cargoAdministrativo: docente.cargoAdministrativo,
    proyectosActivos: docente.proyectosActivos,
  }

  // Pasamos las banderas al validador
  const schema = createAgendaSchema(maxHoras, esEstricto, flags)
  const parseResult = schema.safeParse(data)

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return {
      error: firstError?.message || "Error de validación en los datos del formulario.",
    }
  }

  const validData = parseResult.data as AgendaWizardFormData

  if (enviar) {
    const totalHoras = calcularTotalHoras(validData)
    if (esEstricto && totalHoras > maxHoras) {
      return {
        error: `No se puede enviar: el total de horas (${totalHoras}) supera el máximo (${maxHoras}h).`,
      }
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingAgenda = await tx.agendaSemestral.findUnique({
        where: {
          docenteId_periodo: {
            docenteId: docente.id,
            periodo,
          },
        },
      })

      if (existingAgenda && existingAgenda.estado === "ENVIADO") {
        throw new Error("Esta agenda ya fue enviada y no puede modificarse.")
      }

      if (existingAgenda) {
        await tx.cursoAgenda.deleteMany({ where: { agendaId: existingAgenda.id } })
        await tx.actividadDocencia.deleteMany({ where: { agendaId: existingAgenda.id } })
        await tx.actividadInvestigacion.deleteMany({ where: { agendaId: existingAgenda.id } })
        await tx.actividadProyeccionSocial.deleteMany({ where: { agendaId: existingAgenda.id } })
        await tx.actividadGestion.deleteMany({ where: { agendaId: existingAgenda.id } })
      }

      const agenda = existingAgenda
        ? await tx.agendaSemestral.update({
            where: { id: existingAgenda.id },
            data: { estado: enviar ? "ENVIADO" : "BORRADOR" },
          })
        : await tx.agendaSemestral.create({
            data: {
              docenteId: docente.id,
              periodo,
              estado: enviar ? "ENVIADO" : "BORRADOR",
            },
          })

      for (const curso of validData.cursos) {
        const createdCurso = await tx.cursoAgenda.create({
          data: {
            agendaId: agenda.id,
            numeroCurso: curso.numeroCurso,
            nombreCurso: curso.nombreCurso,
            subgrupo: curso.subgrupo || null,
            sede: curso.sede || null,
            horasPresenciales: curso.horasPresenciales,
            creditos: curso.creditos,
            semanas: curso.semanas,
            dedicacionPeriodo: curso.dedicacionPeriodo,
          },
        })

        const h = curso.horarios
        const tieneHorario = [
          h.lunes, h.martes, h.miercoles, h.jueves,
          h.viernes, h.sabado, h.domingo,
        ].some((v) => v !== null && v !== undefined)

        if (tieneHorario) {
          await tx.horarioCurso.create({
            data: {
              cursoId: createdCurso.id,
              lunes: h.lunes ?? null,
              martes: h.martes ?? null,
              miercoles: h.miercoles ?? null,
              jueves: h.jueves ?? null,
              viernes: h.viernes ?? null,
              sabado: h.sabado ?? null,
              domingo: h.domingo ?? null,
            },
          })
        }
      }

      if (validData.otrasActividadesDocencia.length > 0) {
        await tx.actividadDocencia.createMany({
          data: validData.otrasActividadesDocencia.map((act) => ({
            agendaId: agenda.id,
            nombre: act.nombre,
            descripcion: act.descripcion || null,
            dedicacionPeriodo: act.dedicacionPeriodo,
          })),
        })
      }

      if (validData.actividadesInvestigacion.length > 0) {
        await tx.actividadInvestigacion.createMany({
          data: validData.actividadesInvestigacion.map((act) => ({
            agendaId: agenda.id,
            nombre: act.nombre,
            descripcion: act.descripcion || null,
            dedicacionPeriodo: act.dedicacionPeriodo,
          })),
        })
      }

      if (validData.actividadesProyeccionSocial.length > 0) {
        await tx.actividadProyeccionSocial.createMany({
          data: validData.actividadesProyeccionSocial.map((act) => ({
            agendaId: agenda.id,
            nombre: act.nombre,
            descripcion: act.descripcion || null,
            dedicacionPeriodo: act.dedicacionPeriodo,
          })),
        })
      }

      if (validData.actividadesGestion.length > 0) {
        await tx.actividadGestion.createMany({
          data: validData.actividadesGestion.map((act) => ({
            agendaId: agenda.id,
            nombre: act.nombre,
            descripcion: act.descripcion || null,
            dedicacionPeriodo: act.dedicacionPeriodo,
          })),
        })
      }

      return agenda
    })

    revalidatePath("/agenda")
    return { success: true, agendaId: result.id }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado al guardar la agenda."
    return { error: message }
  }
}

export async function searchCursosGuardadosAction(query: string) {
  const session = await auth()
  if (!session?.user?.id) return []

  const cursos = await prisma.cursoGuardado.findMany({
    where: {
      docenteId: session.user.id,
      OR: [
        { nombreCurso: { contains: query, mode: "insensitive" } },
        { numeroCurso: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { nombreCurso: "asc" },
  })

  return cursos
}

export async function deleteAgendaBorradorAction(periodo: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "No autenticado." }
  }

  const agenda = await prisma.agendaSemestral.findUnique({
    where: {
      docenteId_periodo: {
        docenteId: session.user.id,
        periodo,
      },
    },
  })

  if (!agenda) {
    return { error: "No se encontró la agenda." }
  }

  if (agenda.estado !== "BORRADOR") {
    return { error: "Solo se pueden descartar agendas en estado borrador." }
  }

  await prisma.agendaSemestral.delete({
    where: { id: agenda.id },
  })

  revalidatePath("/agenda")
  return { success: true }
}