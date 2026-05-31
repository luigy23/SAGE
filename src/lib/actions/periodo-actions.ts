"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { EstadoPeriodo, type Rol } from "@/generated/prisma/client"
import { registrarAuditoria } from "@/lib/audit"

async function ensureAdmin() {
  const session = await auth()
  const rol = session?.user?.rol
  if (!session?.user || (rol !== "ADMIN" && rol !== "SUPERADMIN")) {
    throw new Error("No autorizado. Se requieren privilegios de Administrador.")
  }
  return session.user
}

/**
 * Obtener todos los períodos académicos, ordenados por fecha de inicio descendente.
 */
export async function getPeriodos() {
  try {
    const periodos = await prisma.periodoAcademico.findMany({
      orderBy: { fechaInicio: "desc" },
    })
    return periodos
  } catch (error) {
    console.error("[getPeriodos] Error:", error)
    throw new Error("No se pudieron obtener los períodos académicos.")
  }
}

/**
 * Crear un nuevo período académico.
 * Si ya existe un período ABIERTO, el nuevo se crea como CERRADO para preservar
 * la invariante de unicidad de período activo.
 */
export async function crearPeriodo(data: {
  nombre: string
  fechaInicio: Date
  fechaFin: Date
}): Promise<{ success: true; advertencia?: string } | { error: string }> {
  const user = await ensureAdmin()

  try {
    const periodoAbierto = await prisma.periodoAcademico.findFirst({
      where: { estado: "ABIERTO" },
      select: { nombre: true },
    })

    const estadoInicial: EstadoPeriodo = periodoAbierto ? "CERRADO" : "ABIERTO"

    const periodo = await prisma.periodoAcademico.create({
      data: {
        nombre: data.nombre,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        estado: estadoInicial,
      },
    })

    await registrarAuditoria({
      actorId: user.id,
      actorRol: user.rol as Rol,
      actorNombre: user.name ?? user.email ?? user.id,
      entidad: "PERIODO",
      accion: "CREAR",
      recursoId: periodo.id,
      recursoDesc: `Período ${data.nombre}`,
      despues: { nombre: data.nombre, fechaInicio: data.fechaInicio, fechaFin: data.fechaFin },
    })

    revalidatePath("/admin/periodos")

    if (periodoAbierto) {
      return {
        success: true,
        advertencia: `El período "${data.nombre}" se creó como CERRADO porque "${periodoAbierto.nombre}" ya está activo. Cierra el actual antes de abrir el nuevo.`,
      }
    }
    return { success: true }
  } catch (error: any) {
    console.error("[crearPeriodo] Error:", error)
    if (error?.code === "P2002") {
      return { error: `Ya existe un período con el nombre "${data.nombre}".` }
    }
    return { error: "No se pudo crear el período académico." }
  }
}

// ─────────────────────────────────────────────────────
// Ventanas de diligenciamiento — configuradas por Admin
// ─────────────────────────────────────────────────────

/**
 * Configura la ventana de diligenciamiento del FO-19 (Agenda Semestral).
 * `desde` y `hasta` null limpian la ventana (sin restricción de fecha).
 */
export async function configurarVentanaAgendaAction(
  id: string,
  data: { desde: Date | null; hasta: Date | null }
): Promise<{ success: true } | { error: string }> {
  await ensureAdmin()

  if (data.desde && data.hasta && data.hasta <= data.desde) {
    return { error: "La fecha de cierre debe ser posterior a la fecha de apertura." }
  }

  try {
    await prisma.periodoAcademico.update({
      where: { id },
      data: { agendaDesde: data.desde, agendaHasta: data.hasta },
    })
    revalidatePath("/admin/periodos")
    return { success: true }
  } catch {
    return { error: "No se pudo configurar la ventana de agenda." }
  }
}

/**
 * Configura la ventana de diligenciamiento del FO-20 (Monitoreo).
 * `desde` y `hasta` null limpian la ventana.
 * La fecha de cierre puede ser posterior al fin del semestre (docentes entregan después).
 */
export async function configurarVentanaMonitoreoAction(
  id: string,
  data: { desde: Date | null; hasta: Date | null }
): Promise<{ success: true } | { error: string }> {
  await ensureAdmin()

  if (data.desde && data.hasta && data.hasta <= data.desde) {
    return { error: "La fecha de cierre debe ser posterior a la fecha de apertura." }
  }

  try {
    await prisma.periodoAcademico.update({
      where: { id },
      data: { monitoreoDesde: data.desde, monitoreoHasta: data.hasta },
    })
    revalidatePath("/admin/periodos")
    return { success: true }
  } catch {
    return { error: "No se pudo configurar la ventana de monitoreo." }
  }
}

/**
 * Cambiar el estado de un período académico (ABIERTO ↔ CERRADO).
 * Invariante: solo puede haber un período ABIERTO al mismo tiempo.
 */
export async function cambiarEstadoPeriodo(
  id: string,
  nuevoEstado: EstadoPeriodo
): Promise<{ success: true } | { error: string }> {
  const user = await ensureAdmin()

  try {
    const prev = await prisma.periodoAcademico.findUnique({
      where: { id },
      select: { nombre: true, estado: true },
    })

    if (nuevoEstado === "ABIERTO") {
      const existente = await prisma.periodoAcademico.findFirst({
        where: { estado: "ABIERTO", NOT: { id } },
        select: { nombre: true },
      })
      if (existente) {
        return {
          error: `No se puede abrir este período: "${existente.nombre}" ya está activo. Ciérralo primero.`,
        }
      }
    }

    await prisma.periodoAcademico.update({
      where: { id },
      data: { estado: nuevoEstado },
    })

    await registrarAuditoria({
      actorId: user.id,
      actorRol: user.rol as Rol,
      actorNombre: user.name ?? user.email ?? user.id,
      entidad: "PERIODO",
      accion: "CAMBIAR_ESTADO",
      recursoId: id,
      recursoDesc: `Período ${prev?.nombre ?? id}`,
      antes: { estado: prev?.estado },
      despues: { estado: nuevoEstado },
    })

    revalidatePath("/admin/periodos")
    return { success: true }
  } catch (error) {
    console.error("[cambiarEstadoPeriodo] Error:", error)
    return { error: "No se pudo actualizar el estado del período." }
  }
}
