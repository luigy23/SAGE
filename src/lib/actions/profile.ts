"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function updateProfileAction(_prevState: unknown, formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "No autenticado." }

  const nombre = formData.get("nombre") as string
  const celular = formData.get("celular") as string
  const facultad = formData.get("facultad") as string
  const programa = formData.get("programa") as string

  if (!nombre || !facultad || !programa) {
    return { error: "Nombre, facultad y programa son obligatorios." }
  }

  await prisma.docente.update({
    where: { id: session.user.id },
    data: {
      nombre,
      celular: celular || null,
      facultad,
      programa,
    },
  })

  redirect("/perfil")
}
