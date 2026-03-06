"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createCursoGuardadoAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await auth()
  if (!session?.user) return { error: "No autenticado." }

  const numeroCurso = formData.get("numeroCurso") as string
  const nombreCurso = formData.get("nombreCurso") as string

  if (!numeroCurso || !nombreCurso) {
    return { error: "Numero y nombre del curso son obligatorios." }
  }

  await prisma.cursoGuardado.create({
    data: {
      docenteId: session.user.id,
      numeroCurso,
      nombreCurso,
      subgrupo: (formData.get("subgrupo") as string) || null,
      sede: (formData.get("sede") as string) || null,
      horasPresenciales: Number(formData.get("horasPresenciales")) || null,
      creditos: Number(formData.get("creditos")) || null,
      semanas: Number(formData.get("semanas")) || null,
    },
  })

  revalidatePath("/perfil")
  return { success: true }
}

export async function updateCursoGuardadoAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await auth()
  if (!session?.user) return { error: "No autenticado." }

  const id = formData.get("id") as string
  const numeroCurso = formData.get("numeroCurso") as string
  const nombreCurso = formData.get("nombreCurso") as string

  if (!numeroCurso || !nombreCurso) {
    return { error: "Numero y nombre del curso son obligatorios." }
  }

  const curso = await prisma.cursoGuardado.findUnique({ where: { id } })
  if (!curso || curso.docenteId !== session.user.id) {
    return { error: "Curso no encontrado." }
  }

  await prisma.cursoGuardado.update({
    where: { id },
    data: {
      numeroCurso,
      nombreCurso,
      subgrupo: (formData.get("subgrupo") as string) || null,
      sede: (formData.get("sede") as string) || null,
      horasPresenciales: Number(formData.get("horasPresenciales")) || null,
      creditos: Number(formData.get("creditos")) || null,
      semanas: Number(formData.get("semanas")) || null,
    },
  })

  revalidatePath("/perfil")
  return { success: true }
}

export async function deleteCursoGuardadoAction(id: string) {
  const session = await auth()
  if (!session?.user) return { error: "No autenticado." }

  const curso = await prisma.cursoGuardado.findUnique({ where: { id } })
  if (!curso || curso.docenteId !== session.user.id) {
    return { error: "Curso no encontrado." }
  }

  await prisma.cursoGuardado.delete({ where: { id } })

  revalidatePath("/perfil")
  return { success: true }
}
