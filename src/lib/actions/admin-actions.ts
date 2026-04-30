"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { EstadoCuenta } from "@/generated/prisma/client"

/**
 * Solo administradores pueden ejecutar estas acciones.
 */
async function ensureAdmin() {
  const session = await auth()
  // SUPERADMIN hereda permisos de ADMIN.
  const rol = session?.user?.rol
  if (!session?.user || (rol !== "ADMIN" && rol !== "SUPERADMIN")) {
    throw new Error("No autorizado. Se requieren privilegios de Administrador.")
  }
}

/**
 * Obtener todos los docentes (Admin dashboard)
 */
export async function getDocentesAdmin() {
  await ensureAdmin()

  try {
    const docentes = await prisma.docente.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nombre: true,
        cedula: true,
        email: true,
        modalidad: true,
        sedeBase: true,
        estadoCuenta: true,
        createdAt: true,
      },
    })
    return docentes
  } catch (error) {
    console.error("[getDocentesAdmin] Error:", error)
    throw new Error("No se pudieron obtener los docentes.")
  }
}

/**
 * Cambiar el estado de cuenta de un docente
 */
export async function cambiarEstadoDocente(docenteId: string, nuevoEstado: EstadoCuenta) {
  await ensureAdmin()

  try {
    await prisma.docente.update({
      where: { id: docenteId },
      data: { estadoCuenta: nuevoEstado },
    })
    
    // Revalidar la vista de admin
    revalidatePath("/admin/docentes")
    return { success: true }
  } catch (error) {
    console.error("[cambiarEstadoDocente] Error:", error)
    throw new Error("No se pudo actualizar el estado del docente.")
  }
}
