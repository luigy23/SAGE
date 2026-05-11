"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ========================================
// Helpers
// ========================================

async function getAuthenticatedUser() {
  const session = await auth()
  if (!session?.user) return null
  return session.user
}

async function getOwnedBorradorMonitoreo(monitoreoId: string, userId: string) {
  const monitoreo = await prisma.monitoreo.findUnique({
    where: { id: monitoreoId },
  })
  if (!monitoreo || monitoreo.docenteId !== userId) {
    return { error: "Monitoreo no encontrado." }
  }
  if (monitoreo.estado !== "BORRADOR") {
    return { error: "No se puede modificar un monitoreo enviado." }
  }
  return { monitoreo }
}

// ========================================
// Crear Monitoreo desde Agenda ENVIADA
// ========================================

/**
 * Crea un Monitoreo BORRADOR a partir de una AgendaSemestral ENVIADA.
 * Pre-siembra un Reporte* por cada item de la agenda con
 * `horasEjecutadas = dedicacionPeriodo` (asume cumplimiento exacto;
 * el docente ajustará lo que sea distinto).
 */
export async function crearMonitoreoAction(agendaId: string) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const agenda = await prisma.agendaSemestral.findUnique({
    where: { id: agendaId },
    include: {
      cursos: true,
      otrasActividadesDocencia: true,
      actividadesInvestigacion: true,
      actividadesProyeccionSocial: true,
      actividadesGestion: true,
    },
  })

  if (!agenda || agenda.docenteId !== user.id) {
    return { error: "Agenda no encontrada." }
  }
  if (agenda.estado !== "ENVIADO") {
    return { error: "Solo se puede monitorear una agenda enviada." }
  }

  // Verificar que no exista ya un monitoreo para esta agenda
  const existente = await prisma.monitoreo.findUnique({
    where: { agendaId: agenda.id },
  })
  if (existente) {
    return { success: true, monitoreoId: existente.id }
  }

  const monitoreo = await prisma.monitoreo.create({
    data: {
      docenteId: agenda.docenteId,
      periodo: agenda.periodo,
      agendaId: agenda.id,
      estado: "BORRADOR",
      reportesDocencia: {
        create: agenda.cursos.map((c) => ({
          cursoAgendaId: c.id,
          horasEjecutadas: c.dedicacionPeriodo,
        })),
      },
      reportesActividadDocencia: {
        create: agenda.otrasActividadesDocencia.map((a) => ({
          actividadDocenciaId: a.id,
          horasEjecutadas: a.dedicacionPeriodo,
        })),
      },
      reportesInvestigacion: {
        create: agenda.actividadesInvestigacion.map((a) => ({
          actividadInvestigacionId: a.id,
          horasEjecutadas: a.dedicacionPeriodo,
        })),
      },
      reportesProyeccion: {
        create: agenda.actividadesProyeccionSocial.map((a) => ({
          actividadProyeccionSocialId: a.id,
          horasEjecutadas: a.dedicacionPeriodo,
        })),
      },
      reportesGestion: {
        create: agenda.actividadesGestion.map((a) => ({
          actividadGestionId: a.id,
          horasEjecutadas: a.dedicacionPeriodo,
        })),
      },
    },
  })

  revalidatePath("/monitoreo")
  return { success: true, monitoreoId: monitoreo.id }
}

// ========================================
// Update individual de un reporte (autosave por campo)
// ========================================

export type TipoReporte =
  | "docencia"
  | "actividadDocencia"
  | "investigacion"
  | "proyeccion"
  | "gestion"

/**
 * Actualiza horas ejecutadas y/o productos de un reporte individual.
 * Validación de ownership pasa por el monitoreo padre.
 */
export async function updateReporteAction(input: {
  reporteId: string
  tipo: TipoReporte
  horasEjecutadas: number
  productosEntregados: string | null
}) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const { reporteId, tipo, horasEjecutadas, productosEntregados } = input

  if (Number.isNaN(horasEjecutadas) || horasEjecutadas < 0) {
    return { error: "Las horas ejecutadas deben ser un número >= 0." }
  }

  const data = { horasEjecutadas, productosEntregados }
  let monitoreoId: string

  switch (tipo) {
    case "docencia": {
      const r = await prisma.reporteDocencia.findUnique({
        where: { id: reporteId },
        include: { monitoreo: true },
      })
      if (!r || r.monitoreo.docenteId !== user.id) {
        return { error: "Reporte no encontrado." }
      }
      if (r.monitoreo.estado !== "BORRADOR") {
        return { error: "No se puede modificar un monitoreo enviado." }
      }
      await prisma.reporteDocencia.update({ where: { id: reporteId }, data })
      monitoreoId = r.monitoreoId
      break
    }
    case "actividadDocencia": {
      const r = await prisma.reporteActividadDocencia.findUnique({
        where: { id: reporteId },
        include: { monitoreo: true },
      })
      if (!r || r.monitoreo.docenteId !== user.id) {
        return { error: "Reporte no encontrado." }
      }
      if (r.monitoreo.estado !== "BORRADOR") {
        return { error: "No se puede modificar un monitoreo enviado." }
      }
      await prisma.reporteActividadDocencia.update({
        where: { id: reporteId },
        data,
      })
      monitoreoId = r.monitoreoId
      break
    }
    case "investigacion": {
      const r = await prisma.reporteInvestigacion.findUnique({
        where: { id: reporteId },
        include: { monitoreo: true },
      })
      if (!r || r.monitoreo.docenteId !== user.id) {
        return { error: "Reporte no encontrado." }
      }
      if (r.monitoreo.estado !== "BORRADOR") {
        return { error: "No se puede modificar un monitoreo enviado." }
      }
      await prisma.reporteInvestigacion.update({
        where: { id: reporteId },
        data,
      })
      monitoreoId = r.monitoreoId
      break
    }
    case "proyeccion": {
      const r = await prisma.reporteProyeccion.findUnique({
        where: { id: reporteId },
        include: { monitoreo: true },
      })
      if (!r || r.monitoreo.docenteId !== user.id) {
        return { error: "Reporte no encontrado." }
      }
      if (r.monitoreo.estado !== "BORRADOR") {
        return { error: "No se puede modificar un monitoreo enviado." }
      }
      await prisma.reporteProyeccion.update({
        where: { id: reporteId },
        data,
      })
      monitoreoId = r.monitoreoId
      break
    }
    case "gestion": {
      const r = await prisma.reporteGestion.findUnique({
        where: { id: reporteId },
        include: { monitoreo: true },
      })
      if (!r || r.monitoreo.docenteId !== user.id) {
        return { error: "Reporte no encontrado." }
      }
      if (r.monitoreo.estado !== "BORRADOR") {
        return { error: "No se puede modificar un monitoreo enviado." }
      }
      await prisma.reporteGestion.update({ where: { id: reporteId }, data })
      monitoreoId = r.monitoreoId
      break
    }
    default:
      return { error: "Tipo de reporte inválido." }
  }

  revalidatePath(`/monitoreo/${monitoreoId}`)
  return { success: true }
}

// ========================================
// Enviar / Descartar
// ========================================

export async function enviarMonitoreoAction(monitoreoId: string) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const result = await getOwnedBorradorMonitoreo(monitoreoId, user.id)
  if ("error" in result) return result

  await prisma.monitoreo.update({
    where: { id: monitoreoId },
    data: { estado: "ENVIADO" },
  })

  revalidatePath(`/monitoreo/${monitoreoId}`)
  revalidatePath("/monitoreo")
  return { success: true }
}

export async function descartarMonitoreoAction(monitoreoId: string) {
  const user = await getAuthenticatedUser()
  if (!user) return { error: "No autenticado." }

  const result = await getOwnedBorradorMonitoreo(monitoreoId, user.id)
  if ("error" in result) return result

  await prisma.monitoreo.delete({ where: { id: monitoreoId } })

  revalidatePath("/monitoreo")
  return { success: true }
}
