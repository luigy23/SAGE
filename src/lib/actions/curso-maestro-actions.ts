"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { TipoCurso } from "@/generated/prisma/client"

/**
 * Solo administradores pueden gestionar el catálogo maestro.
 */
async function ensureAdmin() {
  const session = await auth()
  if (!session?.user || session.user.rol !== "ADMIN") {
    throw new Error("No autorizado. Se requieren privilegios de Administrador.")
  }
}

/**
 * Obtener todos los cursos del catálogo maestro.
 * No requiere ensureAdmin porque los docentes también consultan el catálogo
 * al crear sus agendas (FO-19).
 */
export async function getCursosMaestros() {
  try {
    const cursos = await prisma.cursoMaestro.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        creditos: true,
        tipo: true,
        estado: true,
        createdAt: true,
      },
    })
    return cursos
  } catch (error) {
    console.error("[getCursosMaestros] Error:", error)
    throw new Error("No se pudieron obtener los cursos del catálogo.")
  }
}

/**
 * Crear un nuevo curso en el catálogo maestro.
 * Solo ADMIN puede ejecutar esta acción.
 */
export async function crearCursoMaestro(data: {
  codigo: string
  nombre: string
  creditos: number
  tipo: TipoCurso
}) {
  await ensureAdmin()

  try {
    await prisma.cursoMaestro.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        creditos: data.creditos,
        tipo: data.tipo,
      },
    })

    revalidatePath("/admin/cursos")
    return { success: true }
  } catch (error: any) {
    console.error("[crearCursoMaestro] Error:", error)

    // Prisma P2002: unique constraint violation (codigo duplicado)
    if (error?.code === "P2002") {
      throw new Error(`Ya existe un curso con el código "${data.codigo}".`)
    }

    throw new Error("No se pudo crear el curso.")
  }
}

/**
 * Alternar el estado activo/inactivo de un curso.
 * Solo ADMIN puede ejecutar esta acción.
 */
export async function toggleEstadoCursoMaestro(cursoId: string, nuevoEstado: boolean) {
  await ensureAdmin()

  try {
    await prisma.cursoMaestro.update({
      where: { id: cursoId },
      data: { estado: nuevoEstado },
    })

    revalidatePath("/admin/cursos")
    return { success: true }
  } catch (error) {
    console.error("[toggleEstadoCursoMaestro] Error:", error)
    throw new Error("No se pudo actualizar el estado del curso.")
  }
}
