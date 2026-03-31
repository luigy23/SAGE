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

// ========================================
// Helpers
// ========================================

async function getAuthenticatedDocente() {
  const session = await auth()
  if (!session?.user?.id) return null

  const docente = await prisma.docente.findUnique({
    where: { id: session.user.id },
  })

  return docente
}

// ========================================
// upsertAgendaCompletaAction
// ========================================

/**
 * Server Action principal del wizard de Agenda Semestral.
 *
 * Flujo:
 * 1. Valida autenticación y obtiene el docente
 * 2. Valida datos contra el schema Zod (incluyendo maxHoras)
 * 3. Usa una transacción Prisma para:
 *    a) Crear o actualizar la AgendaSemestral
 *    b) Eliminar todos los hijos existentes (cursos, actividades, horarios)
 *    c) Crear los nuevos hijos con los datos del formulario
 * 4. Si enviar=true, cambia estado a ENVIADO
 */
export async function upsertAgendaCompletaAction(
  payload: AgendaWizardPayload
): Promise<{ success: true; agendaId: string } | { error: string }> {
  // 1. Autenticación
  const docente = await getAuthenticatedDocente()
  if (!docente) {
    return { error: "No autenticado. Inicia sesión e intenta de nuevo." }
  }

  const { periodo, enviar, data } = payload

  if (!periodo || periodo.trim() === "") {
    return { error: "El periodo académico es obligatorio." }
  }

  // 2. Validar con Zod
  const { maxHoras, esEstricto } = getMaxHoras(docente.modalidad)
  const schema = createAgendaSchema(maxHoras, esEstricto)
  const parseResult = schema.safeParse(data)

  if (!parseResult.success) {
    // Extraer el primer error legible
    const firstError = parseResult.error.issues[0]
    return {
      error: firstError?.message || "Error de validación en los datos del formulario.",
    }
  }

  const validData = parseResult.data as AgendaWizardFormData

  // Validación adicional: si se va a enviar, verificar horas para modalidades estrictas
  if (enviar) {
    const totalHoras = calcularTotalHoras(validData)
    if (esEstricto && totalHoras > maxHoras) {
      return {
        error: `No se puede enviar: el total de horas (${totalHoras}) supera el máximo (${maxHoras}h).`,
      }
    }
  }

  // 3. Transacción atómica
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 3a. Buscar agenda existente
      const existingAgenda = await tx.agendaSemestral.findUnique({
        where: {
          docenteId_periodo: {
            docenteId: docente.id,
            periodo,
          },
        },
      })

      // Verificar que no se edita una agenda ya enviada
      if (existingAgenda && existingAgenda.estado === "ENVIADO") {
        throw new Error("Esta agenda ya fue enviada y no puede modificarse.")
      }

      // 3b. Si existe, eliminar todos los hijos para recrearlos
      if (existingAgenda) {
        // Los horarios se eliminan en cascada con los cursos
        await tx.cursoAgenda.deleteMany({
          where: { agendaId: existingAgenda.id },
        })
        await tx.actividadDocencia.deleteMany({
          where: { agendaId: existingAgenda.id },
        })
        await tx.actividadInvestigacion.deleteMany({
          where: { agendaId: existingAgenda.id },
        })
        await tx.actividadProyeccionSocial.deleteMany({
          where: { agendaId: existingAgenda.id },
        })
        await tx.actividadGestion.deleteMany({
          where: { agendaId: existingAgenda.id },
        })
      }

      // 3c. Upsert de la agenda principal
      const agenda = existingAgenda
        ? await tx.agendaSemestral.update({
            where: { id: existingAgenda.id },
            data: {
              estado: enviar ? "ENVIADO" : "BORRADOR",
            },
          })
        : await tx.agendaSemestral.create({
            data: {
              docenteId: docente.id,
              periodo,
              estado: enviar ? "ENVIADO" : "BORRADOR",
            },
          })

      // 3d. Crear cursos con sus horarios anidados
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

        // Crear horario si hay al menos un día con valor
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

      // 3e. Crear otras actividades de docencia
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

      // 3f. Crear actividades de investigación
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

      // 3g. Crear actividades de proyección social
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

      // 3h. Crear actividades de gestión
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

// ========================================
// searchCursosGuardadosAction
// ========================================

/**
 * Busca cursos guardados del docente para autocompletado en el Combobox.
 * Retorna los cursos que coincidan con la búsqueda por nombre o número.
 */
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

// ========================================
// deleteAgendaBorradorAction
// ========================================

/**
 * Elimina una agenda en estado BORRADOR del periodo activo.
 * Se usa desde el botón "Descartar" de la página principal.
 */
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
