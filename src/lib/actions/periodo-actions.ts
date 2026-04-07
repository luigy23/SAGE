"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { EstadoPeriodo } from "@/generated/prisma/client"

/**
 * Solo administradores pueden gestionar períodos académicos.
 */
async function ensureAdmin() {
  const session = await auth()
  if (!session?.user || session.user.rol !== "ADMIN") {
    throw new Error("No autorizado. Se requieren privilegios de Administrador.")
  }
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
 * Solo ADMIN puede ejecutar esta acción.
 */
export async function crearPeriodo(data: {
  nombre: string
  fechaInicio: Date
  fechaFin: Date
}) {
  await ensureAdmin()

  try {
    await prisma.periodoAcademico.create({
      data: {
        nombre: data.nombre,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
      },
    })

    revalidatePath("/admin/periodos")
    return { success: true }
  } catch (error: any) {
    console.error("[crearPeriodo] Error:", error)

    // Prisma P2002: unique constraint violation (nombre duplicado)
    if (error?.code === "P2002") {
      throw new Error(`Ya existe un período con el nombre "${data.nombre}".`)
    }

    throw new Error("No se pudo crear el período académico.")
  }
}

/**
 * Cambiar el estado de un período académico (ABIERTO ↔ CERRADO).
 * Solo ADMIN puede ejecutar esta acción.
 */
export async function cambiarEstadoPeriodo(id: string, nuevoEstado: EstadoPeriodo) {
  await ensureAdmin()

  try {
    await prisma.periodoAcademico.update({
      where: { id },
      data: { estado: nuevoEstado },
    })

    revalidatePath("/admin/periodos")
    return { success: true }
  } catch (error) {
    console.error("[cambiarEstadoPeriodo] Error:", error)
    throw new Error("No se pudo actualizar el estado del período.")
  }
}
